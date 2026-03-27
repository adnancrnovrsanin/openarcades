// Wall Flip — a gravity-flipping endless runner
// Pure Canvas + Web Audio, zero dependencies

;(function () {
  "use strict"

  // ─── Canvas setup ──────────────────────────────────────────────────
  var canvas = document.getElementById("game")
  var ctx = canvas.getContext("2d")
  var W, H // logical size (updated on resize)

  function resize() {
    W = canvas.width = canvas.clientWidth
    H = canvas.height = canvas.clientHeight
  }
  window.addEventListener("resize", resize)
  resize()

  // ─── Constants ─────────────────────────────────────────────────────
  var WALL_THICKNESS = 0.06 // fraction of H
  var PLAYER_X_FRAC = 0.18 // player x position as fraction of W
  var PLAYER_SIZE_FRAC = 0.028 // player size as fraction of H
  var GRAVITY = 2800 // px/s²
  var FLIP_VELOCITY = 900 // px/s (initial velocity on flip)
  var BASE_SPEED = 260 // px/s obstacle scroll speed
  var MAX_SPEED = 700
  var SPEED_RAMP = 4 // px/s per second of play
  var OBS_MIN_GAP = 0.28 // min gap between floor/ceiling obstacle as fraction of corridor
  var OBS_MAX_GAP = 0.55
  var OBS_WIDTH_MIN = 0.03
  var OBS_WIDTH_MAX = 0.07
  var OBS_HEIGHT_MIN = 0.15
  var OBS_HEIGHT_MAX = 0.42
  var SPAWN_DIST_MIN = 180
  var SPAWN_DIST_MAX = 360
  var PARTICLE_COUNT = 12
  var TRAIL_LENGTH = 14
  var MAX_DELTA = 0.05 // cap delta at 50 ms to avoid jumps
  var NEAR_MISS_DIST = 18

  // ─── Colors ────────────────────────────────────────────────────────
  var CLR_BG = "#0a0a1a"
  var CLR_WALL = "#1a1a2e"
  var CLR_WALL_EDGE = "#2d2d5e"
  var CLR_PLAYER = "#00e5ff"
  var CLR_PLAYER_GLOW = "rgba(0,229,255,0.25)"
  var CLR_OBS = "#ff2d55"
  var CLR_OBS_GLOW = "rgba(255,45,85,0.3)"
  var CLR_TRAIL = "rgba(0,229,255,0.12)"
  var CLR_PARTICLE = "#ffcc00"
  var CLR_SCORE = "#ffffff"
  var CLR_HI_SCORE = "#8888aa"
  var CLR_TEXT = "#ffffff"
  var CLR_TEXT_DIM = "#6666aa"
  var CLR_NEAR_MISS = "#ffcc00"

  // ─── Audio (Web Audio API, synthesised) ────────────────────────────
  var audioCtx = null

  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      } catch (e) {
        /* audio unsupported */
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      try {
        audioCtx.resume()
      } catch (e) {
        /* ignore resume errors */
      }
    }
  }

  function playTone(freq, dur, vol, type) {
    if (!audioCtx) return
    try {
      var osc = audioCtx.createOscillator()
      var gain = audioCtx.createGain()
      osc.type = type || "square"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(vol || 0.08, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + dur
      )
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + dur)
    } catch (e) {
      /* ignore audio errors */
    }
  }

  function sfxFlip() {
    playTone(520, 0.1, 0.1, "sine")
    playTone(780, 0.08, 0.06, "sine")
  }

  function sfxScore() {
    playTone(880, 0.08, 0.06, "sine")
    playTone(1100, 0.1, 0.05, "sine")
  }

  function sfxDie() {
    playTone(180, 0.3, 0.12, "sawtooth")
    playTone(90, 0.4, 0.1, "sawtooth")
  }

  function sfxNearMiss() {
    playTone(1200, 0.06, 0.04, "sine")
  }

  // ─── State ─────────────────────────────────────────────────────────
  var STATE_MENU = 0
  var STATE_PLAY = 1
  var STATE_DEAD = 2

  var state = STATE_MENU
  var score = 0
  var highScore = 0
  var displayScore = 0
  var elapsed = 0 // seconds of play
  var speed = BASE_SPEED
  var shakeTimer = 0
  var shakeIntensity = 0
  var nearMissTimer = 0
  var nearMissCombo = 0
  var flashTimer = 0

  // Player
  var player = {
    x: 0,
    y: 0,
    vy: 0,
    size: 20,
    onCeiling: false, // false = gravity down (floor), true = gravity up (ceiling)
    rotation: 0,
    alive: true,
  }

  // Corridor bounds (updated in resize/init)
  var wallTop = 0
  var wallBot = 0

  // Obstacles
  var obstacles = []
  var distToNextSpawn = 0
  var obstacleGroupId = 0

  // Particles
  var particles = []

  // Trail
  var trail = []

  // Stars (background decoration)
  var stars = []

  // ─── Helpers ───────────────────────────────────────────────────────
  function rand(a, b) {
    return a + Math.random() * (b - a)
  }
  function lerp(a, b, t) {
    return a + (b - a) * t
  }
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v
  }

  function initStars() {
    stars = []
    for (var i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(0.5, 1.8),
        speed: rand(15, 60),
        alpha: rand(0.15, 0.45),
      })
    }
  }

  // ─── Init / Reset ─────────────────────────────────────────────────
  function initGame() {
    wallTop = Math.round(H * WALL_THICKNESS)
    wallBot = Math.round(H * (1 - WALL_THICKNESS))

    var corridorH = wallBot - wallTop
    player.size = Math.max(12, Math.round(H * PLAYER_SIZE_FRAC))
    player.x = Math.round(W * PLAYER_X_FRAC)
    player.y = wallBot - player.size
    player.vy = 0
    player.onCeiling = false
    player.rotation = 0
    player.alive = true

    score = 0
    displayScore = 0
    elapsed = 0
    speed = BASE_SPEED
    shakeTimer = 0
    shakeIntensity = 0
    nearMissTimer = 0
    nearMissCombo = 0
    flashTimer = 0

    obstacles = []
    particles = []
    trail = []
    distToNextSpawn = SPAWN_DIST_MIN
    obstacleGroupId = 0

    initStars()
  }

  // ─── Obstacle spawning ────────────────────────────────────────────
  function spawnObstacle() {
    var corridorH = wallBot - wallTop
    var obsW = Math.round(W * rand(OBS_WIDTH_MIN, OBS_WIDTH_MAX))
    var obsH = Math.round(corridorH * rand(OBS_HEIGHT_MIN, OBS_HEIGHT_MAX))

    // Each spawn gets a unique group ID so gap pairs score as one
    var group = ++obstacleGroupId

    // decide: from floor, ceiling, or both (gap pair)
    var r = Math.random()
    var difficulty = clamp(elapsed / 60, 0, 1) // 0→1 over 60s

    if (r < 0.35 + difficulty * 0.15) {
      // floor obstacle
      obstacles.push({
        x: W + 20,
        y: wallBot - obsH,
        w: obsW,
        h: obsH,
        scored: false,
        group: group,
      })
    } else if (r < 0.65 + difficulty * 0.1) {
      // ceiling obstacle
      obstacles.push({
        x: W + 20,
        y: wallTop,
        w: obsW,
        h: obsH,
        scored: false,
        group: group,
      })
    } else {
      // gap pair — obstacle from both sides with a gap
      var gap = corridorH * lerp(OBS_MAX_GAP, OBS_MIN_GAP, difficulty)
      var gapY = wallTop + rand(obsH, corridorH - gap - obsH)
      // top part
      var topH = gapY - wallTop
      if (topH > 10) {
        obstacles.push({
          x: W + 20,
          y: wallTop,
          w: obsW,
          h: topH,
          scored: false,
          group: group,
        })
      }
      // bottom part
      var botY = gapY + gap
      var botH = wallBot - botY
      if (botH > 10) {
        obstacles.push({
          x: W + 20,
          y: botY,
          w: obsW,
          h: botH,
          scored: false,
          group: group,
        })
      }
    }

    // next spawn distance decreases with difficulty
    distToNextSpawn = lerp(SPAWN_DIST_MAX, SPAWN_DIST_MIN, difficulty)
    distToNextSpawn *= rand(0.8, 1.3)
  }

  // ─── Particles ─────────────────────────────────────────────────────
  function emitParticles(x, y, color, count) {
    for (var i = 0; i < (count || PARTICLE_COUNT); i++) {
      particles.push({
        x: x,
        y: y,
        vx: rand(-200, 200),
        vy: rand(-200, 200),
        life: rand(0.2, 0.5),
        maxLife: 0.5,
        r: rand(2, 5),
        color: color || CLR_PARTICLE,
      })
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────
  function handleInput() {
    ensureAudio()

    if (state === STATE_MENU) {
      state = STATE_PLAY
      initGame()
      return
    }
    if (state === STATE_DEAD) {
      // small delay before restart to avoid accidental restart
      if (elapsed > 0.3) {
        state = STATE_PLAY
        initGame()
      }
      return
    }
    if (state === STATE_PLAY && player.alive) {
      flipGravity()
    }
  }

  function flipGravity() {
    player.onCeiling = !player.onCeiling
    player.vy = player.onCeiling ? -FLIP_VELOCITY : FLIP_VELOCITY
    sfxFlip()
    emitParticles(player.x, player.y + player.size / 2, CLR_PLAYER, 6)
  }

  // Keyboard
  document.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault()
      handleInput()
    }
  })

  // Mouse/Touch
  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault()
    handleInput()
  })

  // Prevent default touch behavior
  canvas.addEventListener("touchstart", function (e) {
    e.preventDefault()
  }, { passive: false })

  // ─── Collision ─────────────────────────────────────────────────────
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
  }

  // ─── Update ────────────────────────────────────────────────────────
  function update(dt) {
    if (state === STATE_MENU) {
      updateStars(dt)
      // Bobbing preview player
      player.y =
        (wallTop + wallBot) / 2 +
        Math.sin(elapsed * 2) * (wallBot - wallTop) * 0.15
      elapsed += dt
      return
    }

    if (state === STATE_DEAD) {
      elapsed += dt
      shakeTimer = Math.max(0, shakeTimer - dt)
      updateParticles(dt)
      updateStars(dt)
      // Animate display score toward final
      displayScore = lerp(displayScore, score, Math.min(1, dt * 10))
      return
    }

    // ── Playing ──
    elapsed += dt
    speed = Math.min(MAX_SPEED, BASE_SPEED + SPEED_RAMP * elapsed)

    // Gravity & movement
    var gDir = player.onCeiling ? -1 : 1
    player.vy += GRAVITY * gDir * dt
    player.y += player.vy * dt

    // Clamp to corridor
    var corridorTop = wallTop
    var corridorBot = wallBot - player.size
    if (player.y <= corridorTop) {
      player.y = corridorTop
      player.vy = 0
    }
    if (player.y >= corridorBot) {
      player.y = corridorBot
      player.vy = 0
    }

    // Rotation (tilt toward movement direction)
    var targetRot = clamp(player.vy / 600, -0.5, 0.5)
    player.rotation = lerp(player.rotation, targetRot, Math.min(1, dt * 12))

    // Trail
    trail.push({ x: player.x, y: player.y + player.size / 2 })
    if (trail.length > TRAIL_LENGTH) trail.shift()

    // Scroll obstacles
    var scrollDist = speed * dt
    distToNextSpawn -= scrollDist

    for (var i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= scrollDist

      // Score: passed player (once per group)
      if (
        !obstacles[i].scored &&
        obstacles[i].x + obstacles[i].w < player.x
      ) {
        var g = obstacles[i].group
        // Mark all obstacles in the same group as scored
        for (var j = 0; j < obstacles.length; j++) {
          if (obstacles[j].group === g) obstacles[j].scored = true
        }
        score++
        displayScore = score
        if (score % 10 === 0) sfxScore()
      }

      // Near miss detection
      if (!obstacles[i].nearMissed) {
        var ox = obstacles[i].x
        var oy = obstacles[i].y
        var ow = obstacles[i].w
        var oh = obstacles[i].h
        var px = player.x
        var py = player.y
        var ps = player.size

        // Check if player is very close but not overlapping
        var expandedOverlap = rectsOverlap(
          px - NEAR_MISS_DIST,
          py - NEAR_MISS_DIST,
          ps + NEAR_MISS_DIST * 2,
          ps + NEAR_MISS_DIST * 2,
          ox,
          oy,
          ow,
          oh
        )
        var actualOverlap = rectsOverlap(px, py, ps, ps, ox, oy, ow, oh)

        if (expandedOverlap && !actualOverlap) {
          obstacles[i].nearMissed = true
          nearMissTimer = 0.6
          nearMissCombo++
          sfxNearMiss()
        }
      }

      // Remove off-screen
      if (obstacles[i].x + obstacles[i].w < -20) {
        obstacles.splice(i, 1)
      }
    }

    // Spawn new obstacles
    if (distToNextSpawn <= 0) {
      spawnObstacle()
    }

    // Collision detection
    var px = player.x
    var py = player.y
    var ps = player.size
    for (var i = 0; i < obstacles.length; i++) {
      if (
        rectsOverlap(
          px,
          py,
          ps,
          ps,
          obstacles[i].x,
          obstacles[i].y,
          obstacles[i].w,
          obstacles[i].h
        )
      ) {
        die()
        return
      }
    }

    // Timers
    shakeTimer = Math.max(0, shakeTimer - dt)
    nearMissTimer = Math.max(0, nearMissTimer - dt)
    if (nearMissTimer === 0 && nearMissCombo > 0) nearMissCombo = 0
    flashTimer = Math.max(0, flashTimer - dt)

    // Update particles & stars
    updateParticles(dt)
    updateStars(dt)
  }

  function die() {
    player.alive = false
    state = STATE_DEAD
    elapsed = 0 // reset for dead-state timer
    shakeTimer = 0.3
    shakeIntensity = 8
    flashTimer = 0.12

    if (score > highScore) {
      highScore = score
      try {
        localStorage.setItem("wallflip_hi", String(highScore))
      } catch (e) {
        /* storage unavailable (e.g. sandboxed iframe) */
      }
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            { type: "wallflip_highscore", score: highScore },
            "*"
          )
        }
      } catch (e) {
        /* postMessage unavailable */
      }
    }

    sfxDie()
    emitParticles(
      player.x + player.size / 2,
      player.y + player.size / 2,
      CLR_OBS,
      20
    )
    emitParticles(
      player.x + player.size / 2,
      player.y + player.size / 2,
      CLR_PLAYER,
      10
    )
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
      if (p.life <= 0) particles.splice(i, 1)
    }
  }

  function updateStars(dt) {
    for (var i = 0; i < stars.length; i++) {
      stars[i].x -= stars[i].speed * dt
      if (stars[i].x < -5) {
        stars[i].x = W + 5
        stars[i].y = Math.random() * H
      }
    }
  }

  // ─── Draw ──────────────────────────────────────────────────────────
  function draw() {
    ctx.save()

    // Screen shake
    if (shakeTimer > 0) {
      var sx = (Math.random() - 0.5) * shakeIntensity * 2
      var sy = (Math.random() - 0.5) * shakeIntensity * 2
      ctx.translate(sx, sy)
    }

    // Background
    ctx.fillStyle = CLR_BG
    ctx.fillRect(-10, -10, W + 20, H + 20)

    // Stars
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i]
      ctx.globalAlpha = s.alpha
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Walls
    drawWalls()

    // Grid lines (subtle corridor texture)
    drawGrid()

    if (state === STATE_MENU) {
      drawMenuPlayer()
      drawMenuUI()
      ctx.restore()
      return
    }

    // Obstacles
    drawObstacles()

    // Trail
    drawTrail()

    // Player
    drawPlayer()

    // Particles
    drawParticles()

    // Flash overlay on death
    if (flashTimer > 0) {
      ctx.globalAlpha = flashTimer / 0.12 * 0.3
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }

    // HUD
    drawHUD()

    // Near miss indicator
    if (nearMissTimer > 0) {
      drawNearMiss()
    }

    // Game over overlay
    if (state === STATE_DEAD) {
      drawGameOver()
    }

    ctx.restore()
  }

  function drawWalls() {
    // Top wall
    ctx.fillStyle = CLR_WALL
    ctx.fillRect(0, 0, W, wallTop)
    ctx.fillStyle = CLR_WALL_EDGE
    ctx.fillRect(0, wallTop - 2, W, 2)

    // Bottom wall
    ctx.fillStyle = CLR_WALL
    ctx.fillRect(0, wallBot, W, H - wallBot)
    ctx.fillStyle = CLR_WALL_EDGE
    ctx.fillRect(0, wallBot, W, 2)
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(255,255,255,0.02)"
    ctx.lineWidth = 1
    var spacing = 40
    // Vertical lines (scrolling)
    var offset = state === STATE_PLAY ? (elapsed * speed * 0.3) % spacing : (elapsed * 30) % spacing
    for (var x = -offset; x < W; x += spacing) {
      ctx.beginPath()
      ctx.moveTo(x, wallTop)
      ctx.lineTo(x, wallBot)
      ctx.stroke()
    }
    // Horizontal lines
    for (var y = wallTop; y <= wallBot; y += spacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
  }

  function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i]
      // Glow
      ctx.fillStyle = CLR_OBS_GLOW
      ctx.fillRect(o.x - 3, o.y - 3, o.w + 6, o.h + 6)
      // Body
      ctx.fillStyle = CLR_OBS
      ctx.fillRect(o.x, o.y, o.w, o.h)
      // Highlight edge
      ctx.fillStyle = "rgba(255,255,255,0.15)"
      ctx.fillRect(o.x, o.y, o.w, 2)
      ctx.fillRect(o.x, o.y, 2, o.h)
    }
  }

  function drawTrail() {
    for (var i = 0; i < trail.length; i++) {
      var t = i / trail.length
      ctx.globalAlpha = t * 0.3
      ctx.fillStyle = CLR_TRAIL
      var r = player.size * 0.3 * t
      ctx.beginPath()
      ctx.arc(trail[i].x + player.size / 2, trail[i].y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function drawPlayer() {
    var cx = player.x + player.size / 2
    var cy = player.y + player.size / 2

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(player.rotation)

    // Glow
    ctx.shadowColor = CLR_PLAYER
    ctx.shadowBlur = 18
    ctx.fillStyle = CLR_PLAYER_GLOW
    ctx.fillRect(
      -player.size / 2 - 4,
      -player.size / 2 - 4,
      player.size + 8,
      player.size + 8
    )

    // Body
    ctx.fillStyle = CLR_PLAYER
    ctx.fillRect(
      -player.size / 2,
      -player.size / 2,
      player.size,
      player.size
    )

    // Inner highlight
    ctx.fillStyle = "rgba(255,255,255,0.35)"
    ctx.fillRect(
      -player.size / 2 + 2,
      -player.size / 2 + 2,
      player.size * 0.4,
      player.size * 0.4
    )

    ctx.shadowBlur = 0
    ctx.restore()
  }

  function drawMenuPlayer() {
    var cx = W / 2
    var cy = player.y + player.size / 2

    ctx.save()
    ctx.translate(cx, cy)

    // Glow
    ctx.shadowColor = CLR_PLAYER
    ctx.shadowBlur = 24
    ctx.fillStyle = CLR_PLAYER
    var s = player.size * 1.5
    ctx.fillRect(-s / 2, -s / 2, s, s)

    ctx.shadowBlur = 0
    ctx.restore()
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i]
      var alpha = clamp(p.life / p.maxLife, 0, 1)
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function drawHUD() {
    if (state !== STATE_PLAY) return

    var fontSize = Math.max(20, Math.round(H * 0.045))
    ctx.font = "bold " + fontSize + "px monospace"
    ctx.textAlign = "center"

    // Score
    ctx.fillStyle = CLR_SCORE
    ctx.globalAlpha = 0.85
    ctx.fillText(Math.round(displayScore), W / 2, wallTop - 12)
    ctx.globalAlpha = 1

    // Speed indicator (subtle)
    var speedPct = Math.round(
      ((speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)) * 100
    )
    if (speedPct > 0) {
      ctx.font = Math.round(fontSize * 0.45) + "px monospace"
      ctx.fillStyle = CLR_TEXT_DIM
      ctx.globalAlpha = 0.5
      ctx.fillText("×" + (speed / BASE_SPEED).toFixed(1), W / 2, wallTop - 12 + fontSize * 0.7)
      ctx.globalAlpha = 1
    }
  }

  function drawNearMiss() {
    var fontSize = Math.max(14, Math.round(H * 0.03))
    ctx.font = "bold " + fontSize + "px monospace"
    ctx.textAlign = "center"
    ctx.globalAlpha = nearMissTimer / 0.6
    ctx.fillStyle = CLR_NEAR_MISS

    var label = "CLOSE!"
    if (nearMissCombo > 2) label = "×" + nearMissCombo + " CLOSE!"

    ctx.fillText(label, player.x + player.size / 2, player.y - 16)
    ctx.globalAlpha = 1
  }

  function drawMenuUI() {
    ctx.textAlign = "center"

    // Title
    var titleSize = Math.max(32, Math.round(H * 0.08))
    ctx.font = "bold " + titleSize + "px monospace"
    ctx.fillStyle = CLR_PLAYER
    ctx.shadowColor = CLR_PLAYER
    ctx.shadowBlur = 20
    ctx.fillText("WALL FLIP", W / 2, H * 0.3)
    ctx.shadowBlur = 0

    // Subtitle
    var subSize = Math.max(14, Math.round(H * 0.025))
    ctx.font = subSize + "px monospace"
    ctx.fillStyle = CLR_TEXT_DIM

    // Blinking prompt
    var blink = Math.sin(elapsed * 4) > 0
    if (blink) {
      ctx.fillText("TAP / CLICK / SPACE TO START", W / 2, H * 0.72)
    }

    // High score
    if (highScore > 0) {
      ctx.font = Math.round(subSize * 0.9) + "px monospace"
      ctx.fillStyle = CLR_HI_SCORE
      ctx.fillText("BEST: " + highScore, W / 2, H * 0.8)
    }

    // Controls hint
    ctx.font = Math.round(subSize * 0.75) + "px monospace"
    ctx.fillStyle = CLR_TEXT_DIM
    ctx.globalAlpha = 0.5
    ctx.fillText("FLIP GRAVITY TO SURVIVE", W / 2, H * 0.58)
    ctx.globalAlpha = 1
  }

  function drawGameOver() {
    // Dim overlay
    ctx.fillStyle = "rgba(10,10,26,0.7)"
    ctx.fillRect(0, 0, W, H)

    ctx.textAlign = "center"

    // Game Over text
    var titleSize = Math.max(28, Math.round(H * 0.065))
    ctx.font = "bold " + titleSize + "px monospace"
    ctx.fillStyle = CLR_OBS
    ctx.fillText("GAME OVER", W / 2, H * 0.35)

    // Score
    var scoreSize = Math.max(20, Math.round(H * 0.05))
    ctx.font = "bold " + scoreSize + "px monospace"
    ctx.fillStyle = CLR_SCORE
    ctx.fillText("SCORE: " + Math.round(displayScore), W / 2, H * 0.46)

    // High score
    ctx.font = Math.round(scoreSize * 0.7) + "px monospace"
    ctx.fillStyle = CLR_HI_SCORE
    ctx.fillText("BEST: " + highScore, W / 2, H * 0.54)

    // New best indicator
    if (score === highScore && score > 0) {
      ctx.fillStyle = CLR_NEAR_MISS
      ctx.font = "bold " + Math.round(scoreSize * 0.6) + "px monospace"
      ctx.fillText("★ NEW BEST ★", W / 2, H * 0.6)
    }

    // Restart prompt
    var subSize = Math.max(13, Math.round(H * 0.022))
    ctx.font = subSize + "px monospace"
    ctx.fillStyle = CLR_TEXT_DIM
    var blink = Math.sin(elapsed * 5) > 0
    if (blink && elapsed > 0.3) {
      ctx.fillText("TAP / CLICK / SPACE TO RESTART", W / 2, H * 0.72)
    }
  }

  // ─── Game Loop ─────────────────────────────────────────────────────
  var lastTime = 0

  function loop(timestamp) {
    // Compute delta
    if (lastTime === 0) lastTime = timestamp
    var dt = (timestamp - lastTime) / 1000
    lastTime = timestamp

    // Cap delta to prevent giant jumps
    if (dt > MAX_DELTA) dt = MAX_DELTA

    // Handle resize mid-game
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      resize()
      wallTop = Math.round(H * WALL_THICKNESS)
      wallBot = Math.round(H * (1 - WALL_THICKNESS))
      player.size = Math.max(12, Math.round(H * PLAYER_SIZE_FRAC))
      player.x = Math.round(W * PLAYER_X_FRAC)
      initStars()
    }

    update(dt)
    draw()

    requestAnimationFrame(loop)
  }

  // ─── Boot ──────────────────────────────────────────────────────────
  // Load high score
  try {
    var saved = localStorage.getItem("wallflip_hi")
    if (saved) highScore = parseInt(saved, 10) || 0
  } catch (e) {
    /* storage unavailable */
  }

  initGame()
  requestAnimationFrame(loop)
})()
