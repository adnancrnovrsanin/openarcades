// Cube Dash — a simplified Geometry Dash-inspired endless runner
// Pure Canvas + Web Audio, zero dependencies

;(function () {
  "use strict"

  // ─── Canvas setup ──────────────────────────────────────────────────
  var canvas = document.getElementById("game")
  var ctx = canvas.getContext("2d")
  var W, H

  function resize() {
    W = canvas.width = canvas.clientWidth
    H = canvas.height = canvas.clientHeight
  }
  window.addEventListener("resize", resize)
  resize()

  // ─── Constants ─────────────────────────────────────────────────────
  var GROUND_FRAC = 0.75 // ground Y as fraction of H
  var PLAYER_X_FRAC = 0.18 // player x position as fraction of W
  var PLAYER_SIZE_FRAC = 0.045 // player size as fraction of H
  var GRAVITY = 2600 // px/s²
  var JUMP_VELOCITY = -820 // px/s (negative = up)
  var BASE_SPEED = 300 // px/s scroll speed
  var MAX_SPEED = 700
  var SPEED_RAMP = 3.5 // px/s per second of play
  var SPAWN_DIST_MIN = 220
  var SPAWN_DIST_MAX = 420
  var PARTICLE_COUNT = 14
  var MAX_DELTA = 0.05 // cap delta at 50ms
  var GRID_SPACING = 50
  var MAX_JUMPS = 2

  // ─── Colors ────────────────────────────────────────────────────────
  var CLR_BG = "#0a0a1a"
  var CLR_GROUND = "#1a1a2e"
  var CLR_GROUND_LINE = "#4a4ae0"
  var CLR_PLAYER = "#00e5ff"
  var CLR_PLAYER_GLOW = "rgba(0,229,255,0.3)"
  var CLR_SPIKE = "#ff2d55"
  var CLR_SPIKE_GLOW = "rgba(255,45,85,0.3)"
  var CLR_BLOCK = "#ff6b35"
  var CLR_BLOCK_GLOW = "rgba(255,107,53,0.3)"
  var CLR_PARTICLE = "#ffcc00"
  var CLR_GRID = "rgba(74,74,224,0.08)"
  var CLR_STAR = "rgba(255,255,255,0.4)"

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
        audioCtx.resume().catch(function () {
          /* ignore resume errors */
        })
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

  function sfxJump() {
    playTone(520, 0.08, 0.07, "square")
    playTone(680, 0.06, 0.05, "sine")
  }

  function sfxDoubleJump() {
    playTone(700, 0.07, 0.07, "square")
    playTone(920, 0.06, 0.05, "sine")
  }

  function sfxScore() {
    playTone(880, 0.1, 0.06, "sine")
    playTone(1100, 0.08, 0.04, "sine")
  }

  function sfxDie() {
    playTone(180, 0.3, 0.12, "sawtooth")
    playTone(90, 0.4, 0.1, "sawtooth")
  }

  // ─── Game states ──────────────────────────────────────────────────
  var STATE_MENU = 0
  var STATE_PLAY = 1
  var STATE_DEAD = 2
  var state = STATE_MENU

  // ─── Game objects ─────────────────────────────────────────────────
  var groundY = 0
  var playerSize = 0

  var player = {
    x: 0,
    y: 0,
    vy: 0,
    rotation: 0,
    grounded: true,
    alive: true,
    jumpsLeft: MAX_JUMPS,
  }

  var obstacles = []
  var distToNextSpawn = 0
  var particles = []

  var score = 0
  var highScore = 0
  var distance = 0
  var speed = BASE_SPEED
  var elapsed = 0
  var shakeTimer = 0
  var shakeIntensity = 0
  var flashTimer = 0

  // Stars (background decoration)
  var stars = []

  // Grid offset for scrolling grid
  var gridOffset = 0

  // ─── Stars ────────────────────────────────────────────────────────
  function initStars() {
    stars = []
    for (var i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * groundY,
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 30 + 10,
      })
    }
  }

  function updateStars(dt) {
    for (var i = 0; i < stars.length; i++) {
      stars[i].x -= stars[i].speed * dt
      if (stars[i].x < -5) {
        stars[i].x = W + 5
        stars[i].y = Math.random() * groundY
      }
    }
  }

  // ─── Game init ────────────────────────────────────────────────────
  function initGame() {
    groundY = Math.round(H * GROUND_FRAC)
    playerSize = Math.max(16, Math.round(H * PLAYER_SIZE_FRAC))

    player.x = Math.round(W * PLAYER_X_FRAC)
    player.y = groundY - playerSize
    player.vy = 0
    player.rotation = 0
    player.grounded = true
    player.alive = true
    player.jumpsLeft = MAX_JUMPS

    score = 0
    distance = 0
    elapsed = 0
    speed = BASE_SPEED
    shakeTimer = 0
    shakeIntensity = 0
    flashTimer = 0

    obstacles = []
    particles = []
    distToNextSpawn = SPAWN_DIST_MIN

    initStars()
  }

  // ─── Obstacle spawning ────────────────────────────────────────────
  // Obstacle types: "spike" (triangle), "block" (platform rectangle)
  // Blocks are landable platforms; only spikes kill.
  function spawnObstacle() {
    var r = Math.random()
    var difficulty = clamp(elapsed / 60, 0, 1) // 0→1 over 60s

    if (r < 0.3) {
      // Single spike
      var spikeH = Math.round(playerSize * (0.8 + difficulty * 0.4))
      var spikeW = Math.round(spikeH * 0.9)
      obstacles.push({
        type: "spike",
        x: W + 20,
        y: groundY - spikeH,
        w: spikeW,
        h: spikeH,
      })
    } else if (r < 0.45) {
      // Block (platform to land on or jump over)
      var blockH = Math.round(playerSize * (0.7 + difficulty * 0.4))
      var blockW = Math.round(playerSize * (0.8 + Math.random() * 0.6))
      obstacles.push({
        type: "block",
        x: W + 20,
        y: groundY - blockH,
        w: blockW,
        h: blockH,
      })
    } else if (r < 0.6) {
      // Double spike (two spikes with small gap)
      var dSpikeH = Math.round(playerSize * (0.7 + difficulty * 0.3))
      var dSpikeW = Math.round(dSpikeH * 0.9)
      var gap = Math.round(dSpikeW * (0.6 + Math.random() * 0.4))
      obstacles.push({
        type: "spike",
        x: W + 20,
        y: groundY - dSpikeH,
        w: dSpikeW,
        h: dSpikeH,
      })
      obstacles.push({
        type: "spike",
        x: W + 20 + dSpikeW + gap,
        y: groundY - dSpikeH,
        w: dSpikeW,
        h: dSpikeH,
      })
    } else if (r < 0.72) {
      // Spike + block combo
      var cSpikeH = Math.round(playerSize * (0.7 + difficulty * 0.3))
      var cSpikeW = Math.round(cSpikeH * 0.9)
      var cBlockH = Math.round(playerSize * (0.7 + difficulty * 0.3))
      var cBlockW = Math.round(playerSize * 0.8)
      var cGap = Math.round(playerSize * (1.2 + Math.random() * 0.6))
      obstacles.push({
        type: "spike",
        x: W + 20,
        y: groundY - cSpikeH,
        w: cSpikeW,
        h: cSpikeH,
      })
      obstacles.push({
        type: "block",
        x: W + 20 + cSpikeW + cGap,
        y: groundY - cBlockH,
        w: cBlockW,
        h: cBlockH,
      })
    } else if (r < 0.86) {
      // Spike on block (block platform with spike on top — must clear both)
      var sbBlockH = Math.round(playerSize * 0.7)
      var sbBlockW = Math.round(playerSize * 0.9)
      var sbSpikeH = Math.round(playerSize * (0.6 + difficulty * 0.3))
      var sbSpikeW = Math.round(sbSpikeH * 0.9)
      obstacles.push({
        type: "block",
        x: W + 20,
        y: groundY - sbBlockH,
        w: sbBlockW,
        h: sbBlockH,
      })
      obstacles.push({
        type: "spike",
        x: W + 20 + (sbBlockW - sbSpikeW) / 2,
        y: groundY - sbBlockH - sbSpikeH,
        w: sbSpikeW,
        h: sbSpikeH,
      })
    } else {
      // Block → spike → block (land on block, double-jump over spike, land on next)
      var bgBlockH = Math.round(playerSize * 0.5)
      var bgBlockW = Math.round(playerSize * 1.2)
      var bgSpikeH = Math.round(playerSize * (0.7 + difficulty * 0.2))
      var bgSpikeW = Math.round(bgSpikeH * 0.9)
      var bgGap = Math.round(playerSize * 0.9)
      obstacles.push({
        type: "block",
        x: W + 20,
        y: groundY - bgBlockH,
        w: bgBlockW,
        h: bgBlockH,
      })
      obstacles.push({
        type: "spike",
        x: W + 20 + bgBlockW + bgGap,
        y: groundY - bgSpikeH,
        w: bgSpikeW,
        h: bgSpikeH,
      })
      obstacles.push({
        type: "block",
        x: W + 20 + bgBlockW + bgGap + bgSpikeW + bgGap,
        y: groundY - bgBlockH,
        w: bgBlockW,
        h: bgBlockH,
      })
    }

    // Next spawn distance decreases with difficulty
    distToNextSpawn = lerp(SPAWN_DIST_MAX, SPAWN_DIST_MIN, difficulty)
    distToNextSpawn *= 0.8 + Math.random() * 0.5
  }

  // ─── Particles ────────────────────────────────────────────────────
  function emitParticles(x, y, color, count) {
    for (var i = 0; i < (count || PARTICLE_COUNT); i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 400,
        vy: (Math.random() - 0.5) * 400,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.5,
        size: 2 + Math.random() * 3,
        color: color,
      })
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 400 * dt // gravity on particles
      p.life -= dt
      if (p.life <= 0) particles.splice(i, 1)
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v
  }

  function lerp(a, b, t) {
    return a + (b - a) * t
  }

  // Collision: rect vs rect
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
  }

  // Collision: point in triangle (for spike collision)
  function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
    var d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2)
    var d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3)
    var d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1)
    var hasNeg = d1 < 0 || d2 < 0 || d3 < 0
    var hasPos = d1 > 0 || d2 > 0 || d3 > 0
    return !(hasNeg && hasPos)
  }

  // Spike collision (triangle vs rect)
  function spikeHitsPlayer(obs, px, py, ps) {
    // Triangle vertices: bottom-left, top-center, bottom-right
    var tx1 = obs.x
    var ty1 = obs.y + obs.h
    var tx2 = obs.x + obs.w / 2
    var ty2 = obs.y
    var tx3 = obs.x + obs.w
    var ty3 = obs.y + obs.h

    // Check if any corner of the player rect is inside the triangle
    if (pointInTriangle(px, py, tx1, ty1, tx2, ty2, tx3, ty3)) return true
    if (pointInTriangle(px + ps, py, tx1, ty1, tx2, ty2, tx3, ty3)) return true
    if (pointInTriangle(px, py + ps, tx1, ty1, tx2, ty2, tx3, ty3)) return true
    if (pointInTriangle(px + ps, py + ps, tx1, ty1, tx2, ty2, tx3, ty3))
      return true

    // Also check bounding box with slight shrink for fairness
    var shrink = ps * 0.15
    return rectsOverlap(
      px + shrink,
      py + shrink,
      ps - shrink * 2,
      ps - shrink * 2,
      obs.x + obs.w * 0.2,
      obs.y,
      obs.w * 0.6,
      obs.h
    )
  }

  // ─── Input ────────────────────────────────────────────────────────
  var jumpPressed = false

  function handleInput() {
    ensureAudio()

    if (state === STATE_MENU) {
      state = STATE_PLAY
      initGame()
      return
    }

    if (state === STATE_DEAD) {
      if (elapsed > 0.5) {
        state = STATE_PLAY
        initGame()
      }
      return
    }

    if (state === STATE_PLAY && player.jumpsLeft > 0) {
      jumpPressed = true
    }
  }

  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault()
    handleInput()
  })
  document.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.key === " " || e.code === "ArrowUp") {
      e.preventDefault()
      handleInput()
    }
  })

  // ─── Update ───────────────────────────────────────────────────────
  function update(dt) {
    if (state === STATE_MENU) return
    if (state === STATE_DEAD) {
      elapsed += dt
      updateParticles(dt)
      updateStars(dt)
      shakeTimer = Math.max(0, shakeTimer - dt)
      flashTimer = Math.max(0, flashTimer - dt)
      return
    }

    elapsed += dt

    // Speed ramp
    speed = Math.min(MAX_SPEED, BASE_SPEED + SPEED_RAMP * elapsed)

    // Distance score (1 point per ~30px traveled)
    distance += speed * dt
    score = Math.floor(distance / 30)
    if (score > 0 && score % 50 === 0 && Math.floor((distance - speed * dt) / 30) % 50 !== 0) {
      sfxScore()
    }

    // Jump
    if (jumpPressed && player.jumpsLeft > 0) {
      var isAirJump = !player.grounded
      player.vy = JUMP_VELOCITY
      player.grounded = false
      player.jumpsLeft--
      jumpPressed = false
      if (isAirJump) {
        sfxDoubleJump()
        emitParticles(
          player.x + playerSize / 2,
          player.y + playerSize,
          CLR_PARTICLE,
          8
        )
      } else {
        sfxJump()
        emitParticles(
          player.x + playerSize / 2,
          groundY,
          CLR_PLAYER,
          6
        )
      }
    }
    jumpPressed = false

    // Gravity
    if (!player.grounded) {
      player.vy += GRAVITY * dt
    }
    player.y += player.vy * dt

    // Ground collision
    if (player.y + playerSize >= groundY) {
      player.y = groundY - playerSize
      player.vy = 0
      player.grounded = true
      player.jumpsLeft = MAX_JUMPS
    } else {
      // Not on ground — will be re-set if landing on a block
      player.grounded = false
    }

    // Scroll obstacles
    var scrollDist = speed * dt
    distToNextSpawn -= scrollDist
    gridOffset = (gridOffset + scrollDist) % GRID_SPACING

    for (var i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= scrollDist

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
    var ps = playerSize
    for (var i = 0; i < obstacles.length; i++) {
      var obs = obstacles[i]

      if (obs.type === "spike") {
        if (spikeHitsPlayer(obs, px, py, ps)) {
          die()
          return
        }
      } else {
        // Block: landable platform — landing on top is safe, side hits kill
        var playerRight = px + ps
        var playerBottom = py + ps
        var blockLeft = obs.x
        var blockRight = obs.x + obs.w
        var blockTop = obs.y

        var hOverlap = playerRight > blockLeft + 2 && px < blockRight - 2
        var vOverlap = playerBottom >= blockTop && py < obs.y + obs.h

        if (hOverlap && vOverlap) {
          var prevBottom = playerBottom - player.vy * dt
          if (prevBottom <= blockTop + 6) {
            // Landing on top of block
            player.y = blockTop - ps
            py = player.y
            player.vy = 0
            player.grounded = true
            player.jumpsLeft = MAX_JUMPS
          } else {
            // Side / bottom hit
            die()
            return
          }
        }
      }
    }

    // Rotation (spin while in air, snap when grounded)
    if (!player.grounded) {
      player.rotation += dt * 8
    } else {
      var target = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2)
      player.rotation = lerp(player.rotation, target, Math.min(1, dt * 20))
    }

    // Timers
    shakeTimer = Math.max(0, shakeTimer - dt)
    flashTimer = Math.max(0, flashTimer - dt)

    // Update particles & stars
    updateParticles(dt)
    updateStars(dt)
  }

  function die() {
    player.alive = false
    state = STATE_DEAD
    elapsed = 0
    shakeTimer = 0.3
    shakeIntensity = 8
    flashTimer = 0.12

    if (score > highScore) {
      highScore = score
      try {
        localStorage.setItem("cubedash_hi", String(highScore))
      } catch (e) {
        /* storage unavailable (e.g. sandboxed iframe) */
      }
    }

    sfxDie()
    emitParticles(
      player.x + playerSize / 2,
      player.y + playerSize / 2,
      CLR_SPIKE,
      20
    )
    emitParticles(
      player.x + playerSize / 2,
      player.y + playerSize / 2,
      CLR_PLAYER,
      10
    )
  }

  // ─── Draw ─────────────────────────────────────────────────────────
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
    ctx.fillStyle = CLR_STAR
    for (var i = 0; i < stars.length; i++) {
      ctx.beginPath()
      ctx.arc(stars[i].x, stars[i].y, stars[i].size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Scrolling grid (above ground only)
    ctx.strokeStyle = CLR_GRID
    ctx.lineWidth = 1
    for (var gx = -gridOffset; gx < W; gx += GRID_SPACING) {
      ctx.beginPath()
      ctx.moveTo(gx, 0)
      ctx.lineTo(gx, groundY)
      ctx.stroke()
    }
    for (var gy = 0; gy < groundY; gy += GRID_SPACING) {
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(W, gy)
      ctx.stroke()
    }

    // Ground
    ctx.fillStyle = CLR_GROUND
    ctx.fillRect(0, groundY, W, H - groundY)

    // Ground line (glowing)
    ctx.shadowColor = CLR_GROUND_LINE
    ctx.shadowBlur = 8
    ctx.strokeStyle = CLR_GROUND_LINE
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    ctx.lineTo(W, groundY)
    ctx.stroke()
    ctx.shadowBlur = 0

    // Obstacles
    for (var i = 0; i < obstacles.length; i++) {
      var obs = obstacles[i]

      if (obs.type === "spike") {
        // Glow
        ctx.shadowColor = CLR_SPIKE_GLOW
        ctx.shadowBlur = 10
        ctx.fillStyle = CLR_SPIKE
        ctx.beginPath()
        ctx.moveTo(obs.x, obs.y + obs.h) // bottom-left
        ctx.lineTo(obs.x + obs.w / 2, obs.y) // top-center
        ctx.lineTo(obs.x + obs.w, obs.y + obs.h) // bottom-right
        ctx.closePath()
        ctx.fill()
        ctx.shadowBlur = 0

        // Outline
        ctx.strokeStyle = "#ff5577"
        ctx.lineWidth = 1
        ctx.stroke()
      } else {
        // Block (platform)
        ctx.shadowColor = CLR_BLOCK_GLOW
        ctx.shadowBlur = 8
        ctx.fillStyle = CLR_BLOCK
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h)
        ctx.shadowBlur = 0

        // Outline
        ctx.strokeStyle = "#ff8855"
        ctx.lineWidth = 1
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h)

        // Platform indicator (green top line)
        ctx.strokeStyle = "#66ff88"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(obs.x, obs.y)
        ctx.lineTo(obs.x + obs.w, obs.y)
        ctx.stroke()
      }
    }

    // Player
    if (state !== STATE_DEAD || Math.floor(elapsed * 10) % 2 === 0) {
      ctx.save()
      ctx.translate(
        player.x + playerSize / 2,
        player.y + playerSize / 2
      )
      ctx.rotate(player.rotation)

      // Glow
      ctx.shadowColor = CLR_PLAYER_GLOW
      ctx.shadowBlur = 15
      ctx.fillStyle = CLR_PLAYER
      ctx.fillRect(
        -playerSize / 2,
        -playerSize / 2,
        playerSize,
        playerSize
      )
      ctx.shadowBlur = 0

      // Outline
      ctx.strokeStyle = "#66f0ff"
      ctx.lineWidth = 1.5
      ctx.strokeRect(
        -playerSize / 2,
        -playerSize / 2,
        playerSize,
        playerSize
      )

      // Inner square accent
      var inner = playerSize * 0.4
      ctx.strokeStyle = "rgba(255,255,255,0.3)"
      ctx.lineWidth = 1
      ctx.strokeRect(-inner / 2, -inner / 2, inner, inner)

      ctx.restore()
    }

    // Jump indicator dots (below player)
    if (state === STATE_PLAY) {
      var dotR = Math.max(2, playerSize * 0.08)
      var dotGap = dotR * 3
      var dotBaseX = player.x + playerSize / 2 - dotGap / 2
      var dotY = player.y + playerSize + dotR * 3
      if (dotY > groundY - dotR) dotY = groundY - dotR
      for (var ji = 0; ji < MAX_JUMPS; ji++) {
        ctx.beginPath()
        ctx.arc(dotBaseX + ji * dotGap, dotY, dotR, 0, Math.PI * 2)
        if (ji < player.jumpsLeft) {
          ctx.fillStyle = CLR_PLAYER
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.15)"
        }
        ctx.fill()
      }
    }

    // Particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i]
      var alpha = clamp(p.life / p.maxLife, 0, 1)
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }
    ctx.globalAlpha = 1

    // Flash overlay (on death)
    if (flashTimer > 0) {
      ctx.fillStyle = "rgba(255,255,255," + (flashTimer / 0.12) * 0.3 + ")"
      ctx.fillRect(-10, -10, W + 20, H + 20)
    }

    // HUD
    drawHUD()

    ctx.restore()
  }

  function drawHUD() {
    var fontSize = Math.max(16, Math.round(H * 0.04))

    if (state === STATE_MENU) {
      // Title
      ctx.fillStyle = CLR_PLAYER
      ctx.font = "bold " + Math.round(fontSize * 2.5) + "px monospace"
      ctx.textAlign = "center"
      ctx.shadowColor = CLR_PLAYER_GLOW
      ctx.shadowBlur = 20
      ctx.fillText("CUBE DASH", W / 2, H * 0.3)
      ctx.shadowBlur = 0

      // Subtitle
      ctx.fillStyle = "#aaa"
      ctx.font = Math.round(fontSize * 0.9) + "px monospace"
      ctx.fillText("Tap / Click / Space to jump (x2!)", W / 2, H * 0.3 + fontSize * 2)

      // Draw a demo player cube
      ctx.save()
      ctx.translate(W / 2, H * 0.55)
      ctx.rotate(Math.PI / 6)
      ctx.shadowColor = CLR_PLAYER_GLOW
      ctx.shadowBlur = 20
      ctx.fillStyle = CLR_PLAYER
      var demoSize = Math.round(H * 0.06)
      ctx.fillRect(-demoSize / 2, -demoSize / 2, demoSize, demoSize)
      ctx.shadowBlur = 0
      ctx.strokeStyle = "#66f0ff"
      ctx.lineWidth = 2
      ctx.strokeRect(-demoSize / 2, -demoSize / 2, demoSize, demoSize)
      ctx.restore()

      // High score
      if (highScore > 0) {
        ctx.fillStyle = "#888"
        ctx.font = fontSize + "px monospace"
        ctx.textAlign = "center"
        ctx.fillText("Best: " + highScore, W / 2, H * 0.55 + demoSize)
      }
      return
    }

    // Score (top-right)
    ctx.fillStyle = "#fff"
    ctx.font = "bold " + fontSize + "px monospace"
    ctx.textAlign = "right"
    ctx.fillText(String(score), W - 16, fontSize + 12)

    // High score label
    if (highScore > 0) {
      ctx.fillStyle = "#666"
      ctx.font = Math.round(fontSize * 0.65) + "px monospace"
      ctx.fillText("Best: " + highScore, W - 16, fontSize * 2 + 12)
    }

    if (state === STATE_DEAD) {
      ctx.fillStyle = CLR_SPIKE
      ctx.font = "bold " + Math.round(fontSize * 2) + "px monospace"
      ctx.textAlign = "center"
      ctx.fillText("CRASH!", W / 2, H * 0.35)

      ctx.fillStyle = "#fff"
      ctx.font = Math.round(fontSize * 1.2) + "px monospace"
      ctx.fillText("Score: " + score, W / 2, H * 0.35 + fontSize * 2)

      if (score >= highScore && score > 0) {
        ctx.fillStyle = CLR_PARTICLE
        ctx.font = Math.round(fontSize * 0.8) + "px monospace"
        ctx.fillText("NEW BEST!", W / 2, H * 0.35 + fontSize * 3.2)
      }

      if (elapsed > 0.5) {
        ctx.fillStyle = "#aaa"
        ctx.font = Math.round(fontSize * 0.7) + "px monospace"
        ctx.fillText(
          "Tap to retry",
          W / 2,
          H * 0.35 + fontSize * 4.5
        )
      }
    }
  }

  // ─── Game loop ────────────────────────────────────────────────────
  var lastTime = 0

  function loop(ts) {
    var dt = (ts - lastTime) / 1000
    lastTime = ts

    // Cap delta
    if (dt > MAX_DELTA) dt = MAX_DELTA
    if (dt <= 0) {
      requestAnimationFrame(loop)
      return
    }

    // Handle resize
    if (
      canvas.width !== canvas.clientWidth ||
      canvas.height !== canvas.clientHeight
    ) {
      resize()
      initGame()
    }

    update(dt)
    draw()

    requestAnimationFrame(loop)
  }

  // ─── Boot ─────────────────────────────────────────────────────────
  try {
    var saved = localStorage.getItem("cubedash_hi")
    if (saved) highScore = parseInt(saved, 10) || 0
  } catch (e) {
    /* storage unavailable */
  }

  initGame()
  requestAnimationFrame(loop)
})()
