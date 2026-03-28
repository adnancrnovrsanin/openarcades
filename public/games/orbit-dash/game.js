// Orbit Dash — vanilla Canvas + Web Audio arcade game
// Chain jumps between orbiting nodes. Survive as long as you can.

;(function () {
  "use strict"

  // ─── Canvas Setup ──────────────────────────────────────────
  var canvas = document.getElementById("game")
  var ctx = canvas.getContext("2d")
  var W, H, CX, CY, MIN_DIM

  function resize() {
    W = canvas.width = window.innerWidth
    H = canvas.height = window.innerHeight
    CX = W / 2
    CY = H / 2
    MIN_DIM = Math.min(W, H)
  }
  resize()
  window.addEventListener("resize", resize)

  // ─── Constants ─────────────────────────────────────────────
  var BASE_ORBIT_SPEED = 1.8        // radians per second
  var LAUNCH_SPEED_MULT = 5.5       // launch speed = orbitRadius * this
  var NODE_RADIUS = 16              // visual radius of nodes
  var PLAYER_RADIUS = 8             // visual radius of player
  var CAPTURE_RADIUS_MULT = 5.0     // how close to capture a node
  var BASE_ORBIT_RADIUS = 70        // orbit circle radius
  var MIN_NODE_DIST = 110           // minimum distance between nodes
  var MAX_NODE_DIST_MULT = 2.2      // max dist = orbitRadius * this
  var SPEED_RAMP = 0.025            // speed increase per successful jump
  var MAX_ORBIT_SPEED = 5.0         // ceiling for orbit speed
  var TRAIL_LENGTH = 18             // player trail length
  var MAX_DELTA = 100               // ms, cap frame delta
  var COMBO_WINDOW = 1.2            // seconds for perfect timing bonus
  var MISS_TIMEOUT = 5.0            // seconds before declaring a miss

  // ─── Colors ────────────────────────────────────────────────
  var BG_COLOR = "#0a0a1e"
  var NODE_COLOR = "#00e5ff"
  var NODE_GLOW = "rgba(0, 229, 255, 0.3)"
  var NODE_NEXT_COLOR = "#ff6e40"
  var PLAYER_COLOR = "#ffffff"
  var PLAYER_GLOW = "rgba(255, 255, 255, 0.5)"
  var ORBIT_RING_COLOR = "rgba(0, 229, 255, 0.12)"
  var TEXT_COLOR = "#ffffff"
  var TEXT_SHADOW = "rgba(0, 229, 255, 0.6)"
  var COMBO_COLOR = "#ffeb3b"
  var PERFECT_COLOR = "#76ff03"
  var PARTICLE_COLORS = ["#00e5ff", "#ff6e40", "#ffeb3b", "#76ff03", "#e040fb"]

  // ─── Audio ─────────────────────────────────────────────────
  var audioCtx = null

  function initAudio() {
    if (audioCtx) return
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      audioCtx = null
    }
  }

  function playTone(freq, dur, type, vol, detune) {
    if (!audioCtx) return
    try {
      var osc = audioCtx.createOscillator()
      var gain = audioCtx.createGain()
      osc.type = type || "sine"
      osc.frequency.value = freq
      if (detune) osc.detune.value = detune
      gain.gain.setValueAtTime(vol || 0.15, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + dur)
    } catch (e) { /* ignore audio errors */ }
  }

  function sfxLaunch() {
    playTone(440, 0.12, "sine", 0.18)
    playTone(660, 0.08, "sine", 0.12, 5)
  }

  function sfxCapture() {
    playTone(880, 0.15, "sine", 0.2)
    playTone(1100, 0.1, "triangle", 0.12, 10)
  }

  function sfxPerfect() {
    playTone(1200, 0.2, "sine", 0.18)
    playTone(1500, 0.15, "triangle", 0.15, 8)
    playTone(1800, 0.1, "sine", 0.1)
  }

  function sfxDeath() {
    playTone(200, 0.4, "sawtooth", 0.2)
    playTone(120, 0.5, "square", 0.1, -10)
  }

  function sfxCombo() {
    playTone(1000, 0.12, "sine", 0.15)
    playTone(1320, 0.12, "triangle", 0.1)
  }

  // ─── Stars (background decoration) ────────────────────────
  var stars = []
  function initStars() {
    stars = []
    for (var i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * 2000 - 500,
        y: Math.random() * 2000 - 500,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random() * 0.4 + 0.1,
        blink: Math.random() * Math.PI * 2,
        blinkSpeed: Math.random() * 1.5 + 0.5,
      })
    }
  }
  initStars()

  function drawStars(dt) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i]
      s.blink += s.blinkSpeed * dt
      var alpha = s.a * (0.5 + 0.5 * Math.sin(s.blink))
      ctx.beginPath()
      ctx.arc(s.x % W, s.y % H, s.r, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(255,255,255," + alpha + ")"
      ctx.fill()
    }
  }

  // ─── Particles ─────────────────────────────────────────────
  var particles = []

  function spawnParticles(x, y, count, color, speed, life) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2
      var spd = (Math.random() * 0.7 + 0.3) * (speed || 120)
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        r: Math.random() * 3 + 1,
        life: (life || 0.6) * (Math.random() * 0.5 + 0.5),
        maxLife: life || 0.6,
        color: color || PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      })
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.97
      p.vy *= 0.97
      p.life -= dt
      if (p.life <= 0) {
        particles.splice(i, 1)
      }
    }
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i]
      var alpha = Math.max(0, p.life / p.maxLife)
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // ─── Floating text popups ──────────────────────────────────
  var popups = []

  function spawnPopup(x, y, text, color, size) {
    popups.push({
      x: x,
      y: y,
      text: text,
      color: color || TEXT_COLOR,
      size: size || 20,
      life: 1.0,
      maxLife: 1.0,
      vy: -60,
    })
  }

  function updatePopups(dt) {
    for (var i = popups.length - 1; i >= 0; i--) {
      var p = popups[i]
      p.y += p.vy * dt
      p.vy *= 0.95
      p.life -= dt
      if (p.life <= 0) popups.splice(i, 1)
    }
  }

  function drawPopups() {
    for (var i = 0; i < popups.length; i++) {
      var p = popups[i]
      var alpha = Math.max(0, p.life / p.maxLife)
      ctx.globalAlpha = alpha
      ctx.font = "bold " + p.size + "px Arial, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 8
      ctx.fillText(p.text, p.x, p.y)
      ctx.shadowBlur = 0
    }
    ctx.globalAlpha = 1
  }

  // ─── Screen shake ──────────────────────────────────────────
  var shakeTime = 0
  var shakeIntensity = 0

  function triggerShake(intensity, duration) {
    shakeIntensity = intensity
    shakeTime = duration
  }

  // ─── Game State ────────────────────────────────────────────
  var STATE_MENU = 0
  var STATE_PLAY = 1
  var STATE_DEAD = 2

  var state = STATE_MENU
  var score = 0
  var highScore = 0
  var combo = 0
  var bestCombo = 0
  var orbitSpeed = BASE_ORBIT_SPEED
  var orbitRadius = BASE_ORBIT_RADIUS

  // Camera offset for smooth scrolling
  var camX = 0
  var camY = 0
  var camTargetX = 0
  var camTargetY = 0

  // Nodes
  var nodes = []
  var currentNodeIndex = 0
  var targetNodeIndex = 1

  // Player
  var player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,         // current orbit angle
    orbiting: true,    // currently orbiting a node
    trail: [],
    timeSinceLaunch: 0,
  }

  // ─── Node generation ──────────────────────────────────────
  function generateNode(fromNode) {
    var dist = MIN_NODE_DIST + Math.random() * (MAX_NODE_DIST_MULT * orbitRadius)
    var baseAngle = 0

    if (nodes.length >= 2) {
      // Bias direction to move generally "forward" (right-ish and varied)
      var prev = nodes[nodes.length - 2]
      var dx = fromNode.x - prev.x
      var dy = fromNode.y - prev.y
      baseAngle = Math.atan2(dy, dx)
    } else {
      baseAngle = Math.random() * Math.PI * 2
    }

    var finalAngle = baseAngle + (Math.random() - 0.5) * Math.PI * 1.2
    return {
      x: fromNode.x + Math.cos(finalAngle) * dist,
      y: fromNode.y + Math.sin(finalAngle) * dist,
      r: NODE_RADIUS,
      pulse: Math.random() * Math.PI * 2,
      captured: false,
    }
  }

  function initNodes() {
    nodes = []
    // First node at center
    nodes.push({
      x: CX,
      y: CY,
      r: NODE_RADIUS,
      pulse: 0,
      captured: true,
    })
    // Generate a few ahead
    for (var i = 0; i < 4; i++) {
      nodes.push(generateNode(nodes[nodes.length - 1]))
    }
  }

  // ─── Game initialization ──────────────────────────────────
  function resetGame() {
    score = 0
    combo = 0
    orbitSpeed = BASE_ORBIT_SPEED
    orbitRadius = BASE_ORBIT_RADIUS
    particles = []
    popups = []
    shakeTime = 0

    initNodes()
    currentNodeIndex = 0
    targetNodeIndex = 1

    var startNode = nodes[0]
    player.x = startNode.x + orbitRadius
    player.y = startNode.y
    player.vx = 0
    player.vy = 0
    player.angle = 0
    player.orbiting = true
    player.trail = []
    player.timeSinceLaunch = 0

    camX = 0
    camY = 0
    camTargetX = 0
    camTargetY = 0

    state = STATE_PLAY
  }

  // ─── Player launch ────────────────────────────────────────
  function launchPlayer() {
    if (!player.orbiting) return

    var node = nodes[currentNodeIndex]
    // Tangential launch direction
    var dx = player.x - node.x
    var dy = player.y - node.y
    var dist = Math.sqrt(dx * dx + dy * dy)
    if (dist === 0) dist = 1

    // Launch in the direction toward the target node, blended with tangential
    var target = nodes[targetNodeIndex]
    var tdx = target.x - player.x
    var tdy = target.y - player.y
    var tDist = Math.sqrt(tdx * tdx + tdy * tdy)
    if (tDist === 0) tDist = 1

    // Tangential direction (perpendicular to radius, in orbit direction)
    var tangentX = -dy / dist
    var tangentY = dx / dist

    // Direction toward target
    var toTargetX = tdx / tDist
    var toTargetY = tdy / tDist

    // Blend: mostly aimed toward target with tangential component
    var blend = 0.55
    var launchDirX = tangentX * (1 - blend) + toTargetX * blend
    var launchDirY = tangentY * (1 - blend) + toTargetY * blend
    var ldLen = Math.sqrt(launchDirX * launchDirX + launchDirY * launchDirY)
    if (ldLen === 0) ldLen = 1
    launchDirX /= ldLen
    launchDirY /= ldLen

    var speed = orbitRadius * LAUNCH_SPEED_MULT
    player.vx = launchDirX * speed
    player.vy = launchDirY * speed
    player.orbiting = false
    player.timeSinceLaunch = 0

    sfxLaunch()
    spawnParticles(player.x, player.y, 8, PLAYER_COLOR, 80, 0.4)
  }

  // ─── Input handling ────────────────────────────────────────
  function handleInput() {
    initAudio()
    if (state === STATE_MENU) {
      resetGame()
    } else if (state === STATE_PLAY) {
      launchPlayer()
    } else if (state === STATE_DEAD) {
      state = STATE_MENU
    }
  }

  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault()
    handleInput()
  })
  document.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault()
      handleInput()
    }
  })

  // ─── Update logic ─────────────────────────────────────────
  function update(dt) {
    if (state !== STATE_PLAY) return

    // Update shake
    if (shakeTime > 0) shakeTime -= dt

    // Orbit
    if (player.orbiting) {
      var node = nodes[currentNodeIndex]
      player.angle += orbitSpeed * dt
      player.x = node.x + Math.cos(player.angle) * orbitRadius
      player.y = node.y + Math.sin(player.angle) * orbitRadius
    } else {
      // Free flight
      player.x += player.vx * dt
      player.y += player.vy * dt
      player.timeSinceLaunch += dt

      // Check capture on target node
      var target = nodes[targetNodeIndex]
      var dx = player.x - target.x
      var dy = player.y - target.y
      var dist = Math.sqrt(dx * dx + dy * dy)
      var captureR = NODE_RADIUS * CAPTURE_RADIUS_MULT

      if (dist < captureR) {
        // Captured!
        target.captured = true
        player.orbiting = true
        currentNodeIndex = targetNodeIndex
        targetNodeIndex = currentNodeIndex + 1

        // Calculate orbit angle from current position
        player.angle = Math.atan2(player.y - target.y, player.x - target.x)

        // Scoring
        var timeTaken = player.timeSinceLaunch
        var isPerfect = timeTaken < COMBO_WINDOW
        combo++
        if (combo > bestCombo) bestCombo = combo

        var pointsBase = 10
        var comboMult = Math.min(combo, 10)
        var points = pointsBase * comboMult
        if (isPerfect) points = Math.floor(points * 1.5)
        score += points

        // Difficulty ramp
        orbitSpeed = Math.min(MAX_ORBIT_SPEED, orbitSpeed + SPEED_RAMP)

        // Feedback
        sfxCapture()
        spawnParticles(target.x, target.y, 15, NODE_COLOR, 150, 0.5)

        if (isPerfect) {
          sfxPerfect()
          spawnPopup(target.x, target.y - 30, "PERFECT!", PERFECT_COLOR, 24)
          spawnParticles(target.x, target.y, 10, PERFECT_COLOR, 100, 0.4)
        } else if (combo >= 3) {
          sfxCombo()
          spawnPopup(target.x, target.y - 30, combo + "x COMBO", COMBO_COLOR, 20)
        } else {
          spawnPopup(target.x, target.y - 30, "+" + points, TEXT_COLOR, 18)
        }

        // Generate more nodes ahead
        while (nodes.length - targetNodeIndex < 4) {
          nodes.push(generateNode(nodes[nodes.length - 1]))
        }

        // Purge old nodes far behind
        while (currentNodeIndex > 3) {
          nodes.splice(0, 1)
          currentNodeIndex--
          targetNodeIndex--
        }
      }

      // Miss detection - too far from target or timeout
      if (player.timeSinceLaunch > MISS_TIMEOUT) {
        die()
        return
      }

      // Also die if very far from target
      var targetFar = nodes[targetNodeIndex]
      var fdx = player.x - targetFar.x
      var fdy = player.y - targetFar.y
      var farDist = Math.sqrt(fdx * fdx + fdy * fdy)
      if (farDist > MAX_NODE_DIST_MULT * orbitRadius * 3) {
        die()
        return
      }
    }

    // Trail
    player.trail.unshift({ x: player.x, y: player.y })
    if (player.trail.length > TRAIL_LENGTH) player.trail.pop()

    // Camera smoothly follows midpoint between player and current/target node
    var focusNode = player.orbiting ? nodes[currentNodeIndex] : nodes[targetNodeIndex]
    camTargetX = -(focusNode.x + player.x) / 2 + CX
    camTargetY = -(focusNode.y + player.y) / 2 + CY
    camX += (camTargetX - camX) * 3.5 * dt
    camY += (camTargetY - camY) * 3.5 * dt

    // Update particles and popups
    updateParticles(dt)
    updatePopups(dt)

    // Pulse nodes
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].pulse += dt * 3
    }
  }

  function die() {
    state = STATE_DEAD
    if (score > highScore) highScore = score
    sfxDeath()
    triggerShake(8, 0.3)
    spawnParticles(player.x, player.y, 30, "#ff1744", 200, 0.8)
    spawnParticles(player.x, player.y, 15, "#ff9100", 150, 0.6)
  }

  // ─── Rendering ─────────────────────────────────────────────
  function draw() {
    // Clear
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, W, H)

    // Stars (no camera offset - parallax effect)
    drawStars(0.016)

    // Apply camera + shake
    ctx.save()
    var sx = 0, sy = 0
    if (shakeTime > 0) {
      sx = (Math.random() - 0.5) * shakeIntensity * 2
      sy = (Math.random() - 0.5) * shakeIntensity * 2
    }
    ctx.translate(camX + sx, camY + sy)

    if (state === STATE_PLAY || state === STATE_DEAD) {
      drawGame()
    }

    ctx.restore()

    // HUD (screen-space)
    if (state === STATE_MENU) {
      drawMenu()
    } else if (state === STATE_PLAY) {
      drawHUD()
    } else if (state === STATE_DEAD) {
      drawDeathScreen()
    }
  }

  function drawGame() {
    // Draw orbit ring for current node
    if (player.orbiting) {
      var cNode = nodes[currentNodeIndex]
      ctx.beginPath()
      ctx.arc(cNode.x, cNode.y, orbitRadius, 0, Math.PI * 2)
      ctx.strokeStyle = ORBIT_RING_COLOR
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Draw connecting line to target (dashed guide)
    if (state === STATE_PLAY && targetNodeIndex < nodes.length) {
      var from = nodes[currentNodeIndex]
      var to = nodes[targetNodeIndex]
      ctx.beginPath()
      ctx.setLineDash([6, 8])
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.strokeStyle = "rgba(255, 110, 64, 0.35)"
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw nodes
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i]
      var isTarget = (i === targetNodeIndex)
      var isCurrent = (i === currentNodeIndex)
      var pulseScale = 1 + Math.sin(n.pulse) * 0.12

      // Target nodes render bigger for visibility
      var displayR = isTarget ? n.r * 1.5 * pulseScale : n.r * pulseScale

      // Target pulsing ring (large, eye-catching)
      if (isTarget) {
        var ringPulse = 1 + Math.sin(n.pulse * 1.5) * 0.3
        ctx.beginPath()
        ctx.arc(n.x, n.y, displayR * 3 * ringPulse, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(255, 110, 64, " + (0.25 + Math.sin(n.pulse * 1.5) * 0.15) + ")"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Glow
      var glowR = isTarget ? displayR * 5 : n.r * 3 * pulseScale
      var gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR)
      if (isTarget) {
        gradient.addColorStop(0, "rgba(255, 110, 64, 0.6)")
        gradient.addColorStop(0.4, "rgba(255, 110, 64, 0.2)")
        gradient.addColorStop(1, "rgba(255,110,64,0)")
      } else {
        gradient.addColorStop(0, NODE_GLOW)
        gradient.addColorStop(1, "rgba(0,229,255,0)")
      }
      ctx.beginPath()
      ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      // Node body
      ctx.beginPath()
      ctx.arc(n.x, n.y, displayR, 0, Math.PI * 2)
      if (isTarget) {
        ctx.fillStyle = NODE_NEXT_COLOR
        ctx.shadowColor = NODE_NEXT_COLOR
        ctx.shadowBlur = 20
      } else if (isCurrent) {
        ctx.fillStyle = NODE_COLOR
        ctx.shadowColor = NODE_COLOR
      } else {
        ctx.fillStyle = n.captured ? "rgba(0,229,255,0.4)" : "rgba(0,229,255,0.6)"
        ctx.shadowColor = NODE_COLOR
      }
      ctx.shadowBlur = isTarget ? 20 : 12
      ctx.fill()
      ctx.shadowBlur = 0

      // Inner highlight
      ctx.beginPath()
      ctx.arc(n.x - displayR * 0.2, n.y - displayR * 0.2, displayR * 0.35, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(255,255,255,0.3)"
      ctx.fill()
    }

    // Draw player trail
    for (var i = 0; i < player.trail.length; i++) {
      var t = player.trail[i]
      var alpha = 1 - i / player.trail.length
      ctx.beginPath()
      ctx.arc(t.x, t.y, PLAYER_RADIUS * alpha * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(255,255,255," + (alpha * 0.4) + ")"
      ctx.fill()
    }

    // Draw player
    // Glow
    var pGrad = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, PLAYER_RADIUS * 3)
    pGrad.addColorStop(0, PLAYER_GLOW)
    pGrad.addColorStop(1, "rgba(255,255,255,0)")
    ctx.beginPath()
    ctx.arc(player.x, player.y, PLAYER_RADIUS * 3, 0, Math.PI * 2)
    ctx.fillStyle = pGrad
    ctx.fill()

    // Body
    ctx.beginPath()
    ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = PLAYER_COLOR
    ctx.shadowColor = PLAYER_COLOR
    ctx.shadowBlur = 15
    ctx.fill()
    ctx.shadowBlur = 0

    // Inner dot
    ctx.beginPath()
    ctx.arc(player.x - 2, player.y - 2, PLAYER_RADIUS * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(200,230,255,0.6)"
    ctx.fill()

    // Particles and popups
    drawParticles()
    drawPopups()
  }

  function drawMenu() {
    // Overlay
    ctx.fillStyle = "rgba(10, 10, 30, 0.7)"
    ctx.fillRect(0, 0, W, H)

    // Title
    var titleSize = Math.max(32, Math.floor(MIN_DIM * 0.08))
    ctx.font = "bold " + titleSize + "px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.shadowColor = TEXT_SHADOW
    ctx.shadowBlur = 20
    ctx.fillStyle = TEXT_COLOR
    ctx.fillText("ORBIT DASH", CX, CY - MIN_DIM * 0.12)
    ctx.shadowBlur = 0

    // Decorative orbit ring around title
    ctx.beginPath()
    ctx.arc(CX, CY - MIN_DIM * 0.12, titleSize * 1.8, 0, Math.PI * 2)
    ctx.strokeStyle = "rgba(0, 229, 255, 0.15)"
    ctx.lineWidth = 2
    ctx.stroke()

    // Orbiting dot on title ring
    var menuTime = performance.now() / 1000
    var dotAngle = menuTime * 2
    var dotX = CX + Math.cos(dotAngle) * titleSize * 1.8
    var dotY = CY - MIN_DIM * 0.12 + Math.sin(dotAngle) * titleSize * 1.8
    ctx.beginPath()
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2)
    ctx.fillStyle = NODE_COLOR
    ctx.shadowColor = NODE_COLOR
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.shadowBlur = 0

    // Subtitle
    var subSize = Math.max(14, Math.floor(MIN_DIM * 0.025))
    ctx.font = subSize + "px Arial, sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.6)"
    ctx.fillText("Chain jumps between orbiting nodes", CX, CY + MIN_DIM * 0.02)

    // Prompt
    var promptAlpha = 0.5 + 0.5 * Math.sin(menuTime * 3)
    ctx.globalAlpha = promptAlpha
    var promptSize = Math.max(16, Math.floor(MIN_DIM * 0.03))
    ctx.font = "bold " + promptSize + "px Arial, sans-serif"
    ctx.fillStyle = TEXT_COLOR
    ctx.fillText("TAP / CLICK / SPACE", CX, CY + MIN_DIM * 0.12)
    ctx.globalAlpha = 1

    // High score
    if (highScore > 0) {
      var hsSize = Math.max(14, Math.floor(MIN_DIM * 0.025))
      ctx.font = hsSize + "px Arial, sans-serif"
      ctx.fillStyle = COMBO_COLOR
      ctx.fillText("HIGH SCORE: " + highScore, CX, CY + MIN_DIM * 0.22)
    }

    // Controls hint
    var hintSize = Math.max(11, Math.floor(MIN_DIM * 0.018))
    ctx.font = hintSize + "px Arial, sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.35)"
    ctx.fillText("Orbit around nodes \u2022 Launch with perfect timing \u2022 Chain combos", CX, H - 30)
  }

  function drawHUD() {
    // Off-screen arrow pointing to target node
    if (targetNodeIndex < nodes.length) {
      var target = nodes[targetNodeIndex]
      // Convert target world position to screen position
      var screenX = target.x + camX
      var screenY = target.y + camY
      var margin = 50
      var isOffScreen = screenX < margin || screenX > W - margin || screenY < margin || screenY > H - margin

      if (isOffScreen) {
        // Draw arrow at edge of screen pointing toward target
        var dirX = screenX - CX
        var dirY = screenY - CY
        var dirLen = Math.sqrt(dirX * dirX + dirY * dirY)
        if (dirLen > 0) {
          dirX /= dirLen
          dirY /= dirLen
        }
        // Clamp to screen edge
        var arrowDist = Math.min(CX - margin, CY - margin)
        var ax = CX + dirX * arrowDist
        var ay = CY + dirY * arrowDist
        // Clamp within bounds
        ax = Math.max(margin, Math.min(W - margin, ax))
        ay = Math.max(margin, Math.min(H - margin, ay))

        var arrowAngle = Math.atan2(dirY, dirX)
        var arrowSize = Math.max(14, MIN_DIM * 0.025)
        var pulseAlpha = 0.6 + 0.4 * Math.sin(performance.now() / 1000 * 4)

        ctx.save()
        ctx.translate(ax, ay)
        ctx.rotate(arrowAngle)

        // Arrow glow
        ctx.shadowColor = NODE_NEXT_COLOR
        ctx.shadowBlur = 12

        // Arrow triangle
        ctx.beginPath()
        ctx.moveTo(arrowSize, 0)
        ctx.lineTo(-arrowSize * 0.6, -arrowSize * 0.6)
        ctx.lineTo(-arrowSize * 0.3, 0)
        ctx.lineTo(-arrowSize * 0.6, arrowSize * 0.6)
        ctx.closePath()
        ctx.globalAlpha = pulseAlpha
        ctx.fillStyle = NODE_NEXT_COLOR
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1

        ctx.restore()
      }
    }

    // Score
    var scoreSize = Math.max(24, Math.floor(MIN_DIM * 0.05))
    ctx.font = "bold " + scoreSize + "px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.shadowColor = TEXT_SHADOW
    ctx.shadowBlur = 10
    ctx.fillStyle = TEXT_COLOR
    ctx.fillText(score, CX, 16)
    ctx.shadowBlur = 0

    // Combo indicator
    if (combo >= 2) {
      var comboSize = Math.max(14, Math.floor(MIN_DIM * 0.025))
      ctx.font = "bold " + comboSize + "px Arial, sans-serif"
      ctx.fillStyle = COMBO_COLOR
      ctx.fillText(combo + "x COMBO", CX, 16 + scoreSize + 4)
    }

    // Speed indicator (small)
    var speedPct = Math.floor(((orbitSpeed - BASE_ORBIT_SPEED) / (MAX_ORBIT_SPEED - BASE_ORBIT_SPEED)) * 100)
    if (speedPct > 0) {
      var spdSize = Math.max(10, Math.floor(MIN_DIM * 0.016))
      ctx.font = spdSize + "px Arial, sans-serif"
      ctx.textAlign = "right"
      ctx.fillStyle = "rgba(255,255,255,0.4)"
      ctx.fillText("SPEED +" + speedPct + "%", W - 12, 12)
    }
  }

  function drawDeathScreen() {
    // Darken
    ctx.fillStyle = "rgba(10, 10, 30, 0.6)"
    ctx.fillRect(0, 0, W, H)

    // Game Over
    var goSize = Math.max(28, Math.floor(MIN_DIM * 0.07))
    ctx.font = "bold " + goSize + "px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#ff1744"
    ctx.shadowColor = "#ff1744"
    ctx.shadowBlur = 15
    ctx.fillText("GAME OVER", CX, CY - MIN_DIM * 0.1)
    ctx.shadowBlur = 0

    // Score
    var scSize = Math.max(20, Math.floor(MIN_DIM * 0.04))
    ctx.font = "bold " + scSize + "px Arial, sans-serif"
    ctx.fillStyle = TEXT_COLOR
    ctx.fillText("SCORE: " + score, CX, CY + MIN_DIM * 0.01)

    // High score
    var hsSize = Math.max(16, Math.floor(MIN_DIM * 0.03))
    ctx.font = hsSize + "px Arial, sans-serif"
    ctx.fillStyle = COMBO_COLOR
    if (score === highScore && score > 0) {
      ctx.fillText("\u2605 NEW HIGH SCORE! \u2605", CX, CY + MIN_DIM * 0.07)
    } else {
      ctx.fillText("HIGH SCORE: " + highScore, CX, CY + MIN_DIM * 0.07)
    }

    // Best combo
    if (bestCombo >= 2) {
      ctx.font = hsSize + "px Arial, sans-serif"
      ctx.fillStyle = "rgba(255,255,255,0.5)"
      ctx.fillText("BEST COMBO: " + bestCombo + "x", CX, CY + MIN_DIM * 0.12)
    }

    // Restart prompt
    var menuTime = performance.now() / 1000
    var promptAlpha = 0.5 + 0.5 * Math.sin(menuTime * 3)
    ctx.globalAlpha = promptAlpha
    var rpSize = Math.max(14, Math.floor(MIN_DIM * 0.025))
    ctx.font = "bold " + rpSize + "px Arial, sans-serif"
    ctx.fillStyle = TEXT_COLOR
    ctx.fillText("TAP TO CONTINUE", CX, CY + MIN_DIM * 0.2)
    ctx.globalAlpha = 1
  }

  // ─── Main loop ─────────────────────────────────────────────
  var lastTime = 0

  function loop(timestamp) {
    requestAnimationFrame(loop)

    var rawDelta = timestamp - lastTime
    lastTime = timestamp
    if (rawDelta > MAX_DELTA) rawDelta = MAX_DELTA
    var dt = rawDelta / 1000

    // Avoid huge first frame
    if (dt <= 0 || dt > 0.2) dt = 0.016

    update(dt)
    draw()
  }

  requestAnimationFrame(function (ts) {
    lastTime = ts
    loop(ts)
  })
})()
