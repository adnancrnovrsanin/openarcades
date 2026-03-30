// Tetris — classic block-stacking puzzle game
// Pure Canvas + Web Audio, zero dependencies

;(function () {
  "use strict"

  // ─── Canvas Setup ──────────────────────────────────────────────────
  var canvas = document.getElementById("game")
  var ctx = canvas.getContext("2d")
  var W, H

  function resize() {
    W = canvas.width = canvas.clientWidth
    H = canvas.height = canvas.clientHeight
  }
  window.addEventListener("resize", function () {
    resize()
    calcLayout()
  })
  resize()

  // ─── Constants ─────────────────────────────────────────────────────
  var COLS = 10
  var ROWS = 20
  var HIDDEN_ROWS = 2 // rows above visible area for spawning
  var TOTAL_ROWS = ROWS + HIDDEN_ROWS
  var PREVIEW_COUNT = 3 // number of next pieces to show
  var LOCK_DELAY = 500 // ms before piece locks after landing
  var LOCK_MOVE_LIMIT = 15 // max lock-delay resets from movement
  var DAS_DELAY = 167 // ms before auto-repeat starts
  var ARR_DELAY = 33 // ms between auto-repeat moves
  var SOFT_DROP_FACTOR = 20 // gravity multiplier for soft drop
  var LINES_PER_LEVEL = 10

  // Gravity speeds per level (ms per row drop), NES-style curve
  var LEVEL_SPEEDS = [
    800, 717, 633, 550, 467, 383, 300, 217, 133, 100,
    83, 83, 83, 67, 67, 67, 50, 50, 50, 33
  ]
  function getSpeed(level) {
    if (level >= LEVEL_SPEEDS.length) return 17
    return LEVEL_SPEEDS[level]
  }

  // ─── Colors ────────────────────────────────────────────────────────
  var CLR = {
    bg: "#0a0a1a",
    boardBg: "#12122a",
    boardBorder: "#2a2a4a",
    gridLine: "rgba(255,255,255,0.03)",
    ghost: "rgba(255,255,255,0.12)",
    text: "#ffffff",
    textDim: "#8888aa",
    textMuted: "#555577",
    panelBg: "rgba(18,18,42,0.85)",
    panelBorder: "#2a2a4a",
    labelColor: "#00e5ff",
    btnBg: "#2a2a4a",
    btnHover: "#3a3a6a",
    btnText: "#ffffff",
    overlay: "rgba(10,10,26,0.82)",
    // Tetromino colors (vibrant arcade palette)
    I: "#00e5ff",
    O: "#ffcc00",
    T: "#b44dff",
    S: "#44dd44",
    Z: "#ff2d55",
    J: "#4488ff",
    L: "#ff6b35"
  }

  // Darker shade for 3D-block effect
  function darken(hex, amt) {
    var r = parseInt(hex.slice(1, 3), 16)
    var g = parseInt(hex.slice(3, 5), 16)
    var b = parseInt(hex.slice(5, 7), 16)
    r = Math.max(0, r - amt)
    g = Math.max(0, g - amt)
    b = Math.max(0, b - amt)
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }

  // Lighter shade for highlight
  function lighten(hex, amt) {
    var r = parseInt(hex.slice(1, 3), 16)
    var g = parseInt(hex.slice(3, 5), 16)
    var b = parseInt(hex.slice(5, 7), 16)
    r = Math.min(255, r + amt)
    g = Math.min(255, g + amt)
    b = Math.min(255, b + amt)
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }

  // ─── Tetromino Definitions ─────────────────────────────────────────
  // Each piece defined as 4 rotation states, each an array of [row, col] offsets
  var PIECES = {
    I: {
      color: "I",
      rotations: [
        [[0,0],[0,1],[0,2],[0,3]],
        [[0,2],[1,2],[2,2],[3,2]],
        [[2,0],[2,1],[2,2],[2,3]],
        [[0,1],[1,1],[2,1],[3,1]]
      ]
    },
    O: {
      color: "O",
      rotations: [
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]],
        [[0,0],[0,1],[1,0],[1,1]]
      ]
    },
    T: {
      color: "T",
      rotations: [
        [[0,1],[1,0],[1,1],[1,2]],
        [[0,0],[1,0],[1,1],[2,0]],
        [[0,0],[0,1],[0,2],[1,1]],
        [[0,1],[1,0],[1,1],[2,1]]
      ]
    },
    S: {
      color: "S",
      rotations: [
        [[0,1],[0,2],[1,0],[1,1]],
        [[0,0],[1,0],[1,1],[2,1]],
        [[1,1],[1,2],[2,0],[2,1]],
        [[0,0],[1,0],[1,1],[2,1]]
      ]
    },
    Z: {
      color: "Z",
      rotations: [
        [[0,0],[0,1],[1,1],[1,2]],
        [[0,1],[1,0],[1,1],[2,0]],
        [[1,0],[1,1],[2,1],[2,2]],
        [[0,1],[1,0],[1,1],[2,0]]
      ]
    },
    J: {
      color: "J",
      rotations: [
        [[0,0],[1,0],[1,1],[1,2]],
        [[0,0],[0,1],[1,0],[2,0]],
        [[0,0],[0,1],[0,2],[1,2]],
        [[0,1],[1,1],[2,0],[2,1]]
      ]
    },
    L: {
      color: "L",
      rotations: [
        [[0,2],[1,0],[1,1],[1,2]],
        [[0,0],[1,0],[2,0],[2,1]],
        [[0,0],[0,1],[0,2],[1,0]],
        [[0,0],[0,1],[1,1],[2,1]]
      ]
    }
  }
  var PIECE_NAMES = ["I", "O", "T", "S", "Z", "J", "L"]

  // SRS wall-kick data (standard rotation system)
  var KICKS_JLSTZ = [
    // 0→1, 1→2, 2→3, 3→0
    [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]]
  ]
  var KICKS_I = [
    [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    [[0,0],[1,0],[-2,0],[1,-2],[-2,1]]
  ]

  // ─── Audio ─────────────────────────────────────────────────────────
  var audioCtx = null

  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      } catch (e) { /* audio unsupported */ }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      try {
        audioCtx.resume().catch(function () {})
      } catch (e) { /* ignore */ }
    }
  }

  function playTone(freq, dur, vol, type) {
    if (!audioCtx) return
    try {
      var osc = audioCtx.createOscillator()
      var gain = audioCtx.createGain()
      osc.type = type || "square"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(vol || 0.06, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + dur)
    } catch (e) { /* ignore */ }
  }

  function sfxMove() { playTone(220, 0.04, 0.04, "square") }
  function sfxRotate() { playTone(330, 0.05, 0.05, "square") }
  function sfxDrop() { playTone(160, 0.1, 0.07, "triangle") }
  function sfxLock() { playTone(120, 0.08, 0.06, "triangle") }
  function sfxHold() { playTone(440, 0.06, 0.04, "sine") }

  function sfxLineClear(count) {
    if (count === 4) {
      // Tetris! — triumphant chord
      playTone(523, 0.15, 0.07, "square")
      setTimeout(function () { playTone(659, 0.15, 0.07, "square") }, 50)
      setTimeout(function () { playTone(784, 0.2, 0.08, "square") }, 100)
    } else {
      playTone(440, 0.08, 0.06, "square")
      setTimeout(function () { playTone(550, 0.1, 0.06, "square") }, 40)
    }
  }

  function sfxGameOver() {
    playTone(200, 0.2, 0.06, "sawtooth")
    setTimeout(function () { playTone(150, 0.3, 0.06, "sawtooth") }, 150)
    setTimeout(function () { playTone(100, 0.5, 0.07, "sawtooth") }, 300)
  }

  function sfxLevelUp() {
    playTone(600, 0.1, 0.06, "square")
    setTimeout(function () { playTone(750, 0.1, 0.06, "square") }, 80)
    setTimeout(function () { playTone(900, 0.15, 0.07, "square") }, 160)
  }

  // ─── Random Bag Generator (7-bag) ─────────────────────────────────
  var bag = []

  function fillBag() {
    var pieces = PIECE_NAMES.slice()
    // Fisher-Yates shuffle
    for (var i = pieces.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1))
      var tmp = pieces[i]
      pieces[i] = pieces[j]
      pieces[j] = tmp
    }
    bag = bag.concat(pieces)
  }

  function nextPieceFromBag() {
    while (bag.length < PREVIEW_COUNT + 1) fillBag()
    return bag.shift()
  }

  // ─── Game State ────────────────────────────────────────────────────
  var board = [] // TOTAL_ROWS x COLS, null or color key
  var current = null // { type, rotation, row, col }
  var holdPiece = null
  var holdUsed = false
  var score = 0
  var level = 0
  var linesCleared = 0
  var bestScore = 0
  var gameState = "menu" // "menu" | "playing" | "paused" | "gameover"
  var gravityTimer = 0
  var lockTimer = 0
  var lockMoves = 0
  var isLocking = false
  var clearingLines = [] // rows being cleared (for animation)
  var clearAnimTimer = 0
  var CLEAR_ANIM_DURATION = 250 // ms

  // DAS (delayed auto shift) state
  var dasDirection = 0 // -1 left, 0 none, 1 right
  var dasTimer = 0
  var dasActive = false
  var softDropping = false

  // Touch controls state
  var touchControls = []
  var touchActiveBtn = null

  // Load best score from localStorage
  try {
    var saved = localStorage.getItem("tetris_best")
    if (saved) bestScore = parseInt(saved, 10) || 0
  } catch (e) { /* ignore */ }

  function saveBest() {
    try { localStorage.setItem("tetris_best", String(bestScore)) } catch (e) { /* ignore */ }
  }

  // ─── Board Helpers ─────────────────────────────────────────────────
  function createBoard() {
    board = []
    for (var r = 0; r < TOTAL_ROWS; r++) {
      board[r] = []
      for (var c = 0; c < COLS; c++) {
        board[r][c] = null
      }
    }
  }

  function getCells(type, rotation, row, col) {
    var shape = PIECES[type].rotations[rotation]
    var cells = []
    for (var i = 0; i < shape.length; i++) {
      cells.push([row + shape[i][0], col + shape[i][1]])
    }
    return cells
  }

  function isValid(type, rotation, row, col) {
    var cells = getCells(type, rotation, row, col)
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i][0]
      var c = cells[i][1]
      if (c < 0 || c >= COLS || r >= TOTAL_ROWS) return false
      if (r < 0) continue // allow above board
      if (board[r][c] !== null) return false
    }
    return true
  }

  function placePiece() {
    if (!current) return
    var cells = getCells(current.type, current.rotation, current.row, current.col)
    var colorKey = PIECES[current.type].color
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i][0]
      var c = cells[i][1]
      if (r >= 0 && r < TOTAL_ROWS) {
        board[r][c] = colorKey
      }
    }
  }

  function getGhostRow() {
    if (!current) return 0
    var r = current.row
    while (isValid(current.type, current.rotation, r + 1, current.col)) {
      r++
    }
    return r
  }

  // ─── Line Clearing ────────────────────────────────────────────────
  function findFullLines() {
    var full = []
    for (var r = 0; r < TOTAL_ROWS; r++) {
      var isFull = true
      for (var c = 0; c < COLS; c++) {
        if (board[r][c] === null) { isFull = false; break }
      }
      if (isFull) full.push(r)
    }
    return full
  }

  function removeLines(rows) {
    // Sort descending so we remove from bottom up
    rows.sort(function (a, b) { return b - a })
    for (var i = 0; i < rows.length; i++) {
      board.splice(rows[i], 1)
    }
    // Add empty rows at top
    for (var j = 0; j < rows.length; j++) {
      var emptyRow = []
      for (var c = 0; c < COLS; c++) emptyRow.push(null)
      board.unshift(emptyRow)
    }
  }

  // Scoring: NES-style multiplier
  var LINE_SCORES = [0, 100, 300, 500, 800]

  function addLineScore(count) {
    score += LINE_SCORES[count] * (level + 1)
    linesCleared += count
    var newLevel = Math.floor(linesCleared / LINES_PER_LEVEL)
    if (newLevel > level) {
      level = newLevel
      sfxLevelUp()
    }
  }

  // ─── Piece Spawning ───────────────────────────────────────────────
  function spawnPiece(typeName) {
    var type = typeName || nextPieceFromBag()
    var rotation = 0
    // Spawn centered, 1 row into the hidden area
    var col = Math.floor((COLS - getWidth(type, rotation)) / 2)
    var row = 0 // top of the hidden rows

    current = { type: type, rotation: rotation, row: row, col: col }
    gravityTimer = 0
    lockTimer = 0
    lockMoves = 0
    isLocking = false
    holdUsed = false

    // Check game over: if spawn position is invalid
    if (!isValid(type, rotation, row, col)) {
      current = null
      gameOver()
    }
  }

  function getWidth(type, rotation) {
    var shape = PIECES[type].rotations[rotation]
    var minC = 99, maxC = -1
    for (var i = 0; i < shape.length; i++) {
      if (shape[i][1] < minC) minC = shape[i][1]
      if (shape[i][1] > maxC) maxC = shape[i][1]
    }
    return maxC - minC + 1
  }

  // ─── Movement & Rotation ──────────────────────────────────────────
  function movePiece(dr, dc) {
    if (!current) return false
    if (isValid(current.type, current.rotation, current.row + dr, current.col + dc)) {
      current.row += dr
      current.col += dc
      // Reset lock delay on successful move (if piece is on ground)
      if (isLocking && lockMoves < LOCK_MOVE_LIMIT) {
        lockTimer = 0
        lockMoves++
      }
      return true
    }
    return false
  }

  function rotatePiece(direction) {
    if (!current) return false
    if (current.type === "O") return false // O doesn't rotate
    var oldRot = current.rotation
    var newRot = (oldRot + direction + 4) % 4
    var kicks = current.type === "I" ? KICKS_I : KICKS_JLSTZ
    var kickData = direction === 1 ? kicks[oldRot] : kicks[newRot]

    for (var i = 0; i < kickData.length; i++) {
      var dc = kickData[i][0] * direction
      var dr = -kickData[i][1] * direction
      if (isValid(current.type, newRot, current.row + dr, current.col + dc)) {
        current.rotation = newRot
        current.row += dr
        current.col += dc
        if (isLocking && lockMoves < LOCK_MOVE_LIMIT) {
          lockTimer = 0
          lockMoves++
        }
        return true
      }
    }
    return false
  }

  function hardDrop() {
    if (!current) return
    var dropped = 0
    while (isValid(current.type, current.rotation, current.row + 1, current.col)) {
      current.row++
      dropped++
    }
    score += dropped * 2
    lockPiece()
    sfxDrop()
  }

  function lockPiece() {
    if (!current) return
    placePiece()
    sfxLock()

    // Clear old piece before spawning / starting clear animation
    current = null
    isLocking = false

    // Check for line clears
    var full = findFullLines()
    if (full.length > 0) {
      clearingLines = full
      clearAnimTimer = 0
      sfxLineClear(full.length)
    } else {
      spawnPiece()
    }
  }

  function holdCurrentPiece() {
    if (!current || holdUsed) return
    ensureAudio()
    sfxHold()
    var type = current.type
    if (holdPiece) {
      var oldHold = holdPiece
      holdPiece = type
      spawnPiece(oldHold)
    } else {
      holdPiece = type
      spawnPiece()
    }
    holdUsed = true
  }

  // ─── Game Flow ─────────────────────────────────────────────────────
  function startGame() {
    createBoard()
    bag = []
    current = null
    holdPiece = null
    holdUsed = false
    score = 0
    level = 0
    linesCleared = 0
    clearingLines = []
    clearAnimTimer = 0
    dasDirection = 0
    dasTimer = 0
    dasActive = false
    softDropping = false
    gameState = "playing"
    spawnPiece()
    ensureAudio()
  }

  function gameOver() {
    gameState = "gameover"
    if (score > bestScore) {
      bestScore = score
      saveBest()
    }
    sfxGameOver()
  }

  function togglePause() {
    if (gameState === "playing") {
      gameState = "paused"
    } else if (gameState === "paused") {
      gameState = "playing"
    }
  }

  // ─── Game Loop ─────────────────────────────────────────────────────
  var lastTime = 0

  function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop)
    var dt = timestamp - lastTime
    lastTime = timestamp
    if (dt > 100) dt = 100 // cap delta

    if (gameState === "playing") {
      updatePlaying(dt)
    }

    draw()
  }

  function updatePlaying(dt) {
    // Line clear animation
    if (clearingLines.length > 0) {
      clearAnimTimer += dt
      if (clearAnimTimer >= CLEAR_ANIM_DURATION) {
        addLineScore(clearingLines.length)
        removeLines(clearingLines)
        clearingLines = []
        clearAnimTimer = 0
        spawnPiece()
      }
      return // pause gameplay during clear animation
    }

    if (!current) return

    // DAS (auto-repeat horizontal movement)
    if (dasDirection !== 0) {
      dasTimer += dt
      if (!dasActive) {
        if (dasTimer >= DAS_DELAY) {
          dasActive = true
          dasTimer = 0
          movePiece(0, dasDirection)
        }
      } else {
        while (dasTimer >= ARR_DELAY) {
          dasTimer -= ARR_DELAY
          if (!movePiece(0, dasDirection)) break
        }
      }
    }

    // Gravity
    var speed = getSpeed(level)
    if (softDropping) speed = Math.min(speed, 1000 / SOFT_DROP_FACTOR)

    gravityTimer += dt
    while (gravityTimer >= speed) {
      gravityTimer -= speed
      if (!movePiece(1, 0)) {
        // Piece can't move down — start or continue lock delay
        if (!isLocking) {
          isLocking = true
          lockTimer = 0
        }
        break
      } else {
        if (softDropping) score += 1
        // Piece moved down successfully, reset lock state if it was locking
        if (isLocking) {
          isLocking = false
          lockTimer = 0
        }
      }
    }

    // Lock delay
    if (isLocking) {
      lockTimer += dt
      if (lockTimer >= LOCK_DELAY) {
        lockPiece()
      }
    }
  }

  // ─── Layout Calculations ──────────────────────────────────────────
  var layout = {}

  function calcLayout() {
    var padding = Math.max(8, W * 0.02)

    // Board dimensions — fit within canvas
    var availH = H - padding * 2
    var availW = W - padding * 2

    // Reserve space for side panels (roughly 30% each side on wider screens)
    var sidePanelFrac = W > 500 ? 0.22 : 0.15
    var boardMaxW = availW * (1 - sidePanelFrac * 2)
    var boardMaxH = availH

    var cellSize
    if (boardMaxW / COLS < boardMaxH / ROWS) {
      cellSize = Math.floor(boardMaxW / COLS)
    } else {
      cellSize = Math.floor(boardMaxH / ROWS)
    }
    cellSize = Math.max(cellSize, 12)

    var boardW = cellSize * COLS
    var boardH = cellSize * ROWS
    var boardX = Math.floor((W - boardW) / 2)
    var boardY = Math.floor((H - boardH) / 2)

    // Ensure board is vertically centered with some top margin for header
    var headerH = Math.max(30, H * 0.04)
    if (boardY < headerH + padding) {
      boardY = headerH + padding
    }

    // Side panel dimensions
    var panelW = Math.max(60, Math.floor((boardX - padding * 2) * 0.9))
    var miniCellSize = Math.max(8, Math.floor(cellSize * 0.6))

    layout = {
      cellSize: cellSize,
      boardX: boardX,
      boardY: boardY,
      boardW: boardW,
      boardH: boardH,
      padding: padding,
      panelW: panelW,
      miniCellSize: miniCellSize,
      headerH: headerH,
      leftPanelX: Math.max(padding, boardX - panelW - padding),
      rightPanelX: boardX + boardW + padding,
      fontSize: Math.max(11, Math.floor(cellSize * 0.55)),
      labelSize: Math.max(9, Math.floor(cellSize * 0.4)),
      titleSize: Math.max(14, Math.floor(cellSize * 0.7))
    }

    // Recalculate touch controls layout
    calcTouchControls()
  }

  // ─── Touch Controls ───────────────────────────────────────────────
  function calcTouchControls() {
    touchControls = []
    // Only show touch controls on narrow screens (likely mobile)
    if (W > 600) return

    var btnSize = Math.max(36, Math.floor(W * 0.1))
    var gap = Math.max(6, Math.floor(btnSize * 0.2))
    var bottomY = H - btnSize - gap * 2
    var centerX = W / 2

    // Left side: ← →
    touchControls.push({ id: "left",    x: gap,            y: bottomY, w: btnSize, h: btnSize, label: "←" })
    touchControls.push({ id: "right",   x: gap + btnSize + gap, y: bottomY, w: btnSize, h: btnSize, label: "→" })

    // Center: rotate + down
    touchControls.push({ id: "rotate",  x: centerX - btnSize / 2, y: bottomY - btnSize - gap, w: btnSize, h: btnSize, label: "↻" })
    touchControls.push({ id: "down",    x: centerX - btnSize / 2, y: bottomY, w: btnSize, h: btnSize, label: "↓" })

    // Right side: hard drop + hold
    touchControls.push({ id: "drop",    x: W - gap - btnSize, y: bottomY, w: btnSize, h: btnSize, label: "⤓" })
    touchControls.push({ id: "hold",    x: W - gap - btnSize * 2 - gap, y: bottomY, w: btnSize, h: btnSize, label: "H" })
  }

  // ─── Drawing ──────────────────────────────────────────────────────
  function draw() {
    ctx.fillStyle = CLR.bg
    ctx.fillRect(0, 0, W, H)

    if (gameState === "menu") {
      drawMenu()
      return
    }

    drawBoard()
    drawGhost()
    drawCurrentPiece()
    drawLeftPanel()
    drawRightPanel()
    drawTouchControls()

    if (clearingLines.length > 0) {
      drawClearAnimation()
    }

    if (gameState === "paused") {
      drawOverlay("PAUSED", "Press P or tap to resume")
    }

    if (gameState === "gameover") {
      drawGameOver()
    }
  }

  // ─── Draw: Menu Screen ────────────────────────────────────────────
  function drawMenu() {
    var cx = W / 2
    var cy = H / 2

    // Title
    ctx.fillStyle = CLR.labelColor
    ctx.font = "bold " + Math.max(28, Math.floor(W * 0.07)) + "px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("TETRIS", cx, cy - H * 0.18)

    // Decorative pieces
    drawMenuPieces(cx, cy - H * 0.05)

    // Start prompt
    var blink = Math.sin(Date.now() * 0.004) > 0
    if (blink) {
      ctx.fillStyle = CLR.text
      ctx.font = Math.max(14, Math.floor(W * 0.03)) + "px Arial, sans-serif"
      ctx.fillText("Press ENTER or tap to start", cx, cy + H * 0.12)
    }

    // Best score
    if (bestScore > 0) {
      ctx.fillStyle = CLR.textDim
      ctx.font = Math.max(11, Math.floor(W * 0.025)) + "px Arial, sans-serif"
      ctx.fillText("Best: " + bestScore.toLocaleString(), cx, cy + H * 0.2)
    }

    // Controls hint
    ctx.fillStyle = CLR.textMuted
    ctx.font = Math.max(10, Math.floor(W * 0.018)) + "px Arial, sans-serif"
    var hintY = cy + H * 0.28
    var lineH = Math.max(14, Math.floor(W * 0.025))
    ctx.fillText("← → Move  ·  ↑ Rotate  ·  ↓ Soft Drop", cx, hintY)
    ctx.fillText("Space Hard Drop  ·  C Hold  ·  P Pause", cx, hintY + lineH)
  }

  function drawMenuPieces(cx, cy) {
    var size = Math.max(10, Math.floor(W * 0.022))
    var pieces = ["T", "I", "O", "S"]
    var colors = [CLR.T, CLR.I, CLR.O, CLR.S]
    var offsets = [-3, -1, 1, 2.5]

    for (var p = 0; p < pieces.length; p++) {
      var shape = PIECES[pieces[p]].rotations[0]
      var baseX = cx + offsets[p] * size * 2.5
      for (var i = 0; i < shape.length; i++) {
        var x = baseX + shape[i][1] * size
        var y = cy + shape[i][0] * size
        drawBlock(x, y, size - 1, colors[p])
      }
    }
  }

  // ─── Draw: Board ──────────────────────────────────────────────────
  function drawBoard() {
    var bx = layout.boardX
    var by = layout.boardY
    var cs = layout.cellSize

    // Board background
    ctx.fillStyle = CLR.boardBg
    ctx.fillRect(bx - 1, by - 1, layout.boardW + 2, layout.boardH + 2)

    // Grid lines
    ctx.strokeStyle = CLR.gridLine
    ctx.lineWidth = 1
    for (var c = 1; c < COLS; c++) {
      ctx.beginPath()
      ctx.moveTo(bx + c * cs, by)
      ctx.lineTo(bx + c * cs, by + layout.boardH)
      ctx.stroke()
    }
    for (var r = 1; r < ROWS; r++) {
      ctx.beginPath()
      ctx.moveTo(bx, by + r * cs)
      ctx.lineTo(bx + layout.boardW, by + r * cs)
      ctx.stroke()
    }

    // Placed blocks (skip hidden rows)
    for (var row = HIDDEN_ROWS; row < TOTAL_ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        if (board[row][col] !== null) {
          var x = bx + col * cs
          var y = by + (row - HIDDEN_ROWS) * cs
          drawBlock(x, y, cs - 1, CLR[board[row][col]])
        }
      }
    }

    // Board border
    ctx.strokeStyle = CLR.boardBorder
    ctx.lineWidth = 2
    ctx.strokeRect(bx - 1, by - 1, layout.boardW + 2, layout.boardH + 2)
  }

  // ─── Draw: Ghost Piece ────────────────────────────────────────────
  function drawGhost() {
    if (!current || gameState !== "playing") return
    var ghostRow = getGhostRow()
    if (ghostRow === current.row) return

    var cells = getCells(current.type, current.rotation, ghostRow, current.col)
    var bx = layout.boardX
    var by = layout.boardY
    var cs = layout.cellSize

    for (var i = 0; i < cells.length; i++) {
      var r = cells[i][0] - HIDDEN_ROWS
      var c = cells[i][1]
      if (r < 0) continue
      var x = bx + c * cs
      var y = by + r * cs
      ctx.strokeStyle = CLR[PIECES[current.type].color]
      ctx.globalAlpha = 0.3
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, cs - 3, cs - 3)
      ctx.globalAlpha = 1
    }
  }

  // ─── Draw: Current Piece ──────────────────────────────────────────
  function drawCurrentPiece() {
    if (!current) return
    var cells = getCells(current.type, current.rotation, current.row, current.col)
    var bx = layout.boardX
    var by = layout.boardY
    var cs = layout.cellSize
    var color = CLR[PIECES[current.type].color]

    for (var i = 0; i < cells.length; i++) {
      var r = cells[i][0] - HIDDEN_ROWS
      var c = cells[i][1]
      if (r < 0) continue
      var x = bx + c * cs
      var y = by + r * cs
      drawBlock(x, y, cs - 1, color)
    }
  }

  // ─── Draw: Block (3D beveled look) ────────────────────────────────
  function drawBlock(x, y, size, color) {
    var bevel = Math.max(2, Math.floor(size * 0.15))

    // Main face
    ctx.fillStyle = color
    ctx.fillRect(x, y, size, size)

    // Top/left highlight
    ctx.fillStyle = lighten(color, 40)
    ctx.fillRect(x, y, size, bevel)
    ctx.fillRect(x, y, bevel, size)

    // Bottom/right shadow
    ctx.fillStyle = darken(color, 60)
    ctx.fillRect(x, y + size - bevel, size, bevel)
    ctx.fillRect(x + size - bevel, y, bevel, size)

    // Inner shine
    ctx.fillStyle = "rgba(255,255,255,0.08)"
    ctx.fillRect(x + bevel, y + bevel, size - bevel * 2, size - bevel * 2)
  }

  // ─── Draw: Left Panel (Hold + Score) ──────────────────────────────
  function drawLeftPanel() {
    var px = layout.leftPanelX
    var py = layout.boardY
    var pw = layout.panelW
    var fs = layout.fontSize
    var ls = layout.labelSize
    var mcs = layout.miniCellSize

    // Hold piece
    drawPanelLabel(px, py, pw, "HOLD", ls)
    var holdBoxY = py + ls + 8
    var holdBoxH = mcs * 4 + 16
    drawPanelBox(px, holdBoxY, pw, holdBoxH)
    if (holdPiece) {
      drawMiniPiece(holdPiece, 0, px + pw / 2, holdBoxY + holdBoxH / 2, mcs, holdUsed ? 0.4 : 1)
    }

    // Score
    var scoreY = holdBoxY + holdBoxH + 20
    drawPanelLabel(px, scoreY, pw, "SCORE", ls)
    ctx.fillStyle = CLR.text
    ctx.font = "bold " + fs + "px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(score.toLocaleString(), px + pw / 2, scoreY + ls + fs + 4)

    // Level
    var levelY = scoreY + ls + fs + 20
    drawPanelLabel(px, levelY, pw, "LEVEL", ls)
    ctx.fillStyle = CLR.text
    ctx.font = "bold " + fs + "px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(String(level), px + pw / 2, levelY + ls + fs + 4)

    // Lines
    var linesY = levelY + ls + fs + 20
    drawPanelLabel(px, linesY, pw, "LINES", ls)
    ctx.fillStyle = CLR.text
    ctx.font = "bold " + fs + "px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(String(linesCleared), px + pw / 2, linesY + ls + fs + 4)

    // Best
    var bestY = linesY + ls + fs + 20
    drawPanelLabel(px, bestY, pw, "BEST", ls)
    ctx.fillStyle = CLR.textDim
    ctx.font = fs + "px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(bestScore.toLocaleString(), px + pw / 2, bestY + ls + fs + 4)
  }

  // ─── Draw: Right Panel (Next Pieces) ──────────────────────────────
  function drawRightPanel() {
    var px = layout.rightPanelX
    var py = layout.boardY
    var pw = layout.panelW
    var ls = layout.labelSize
    var mcs = layout.miniCellSize

    drawPanelLabel(px, py, pw, "NEXT", ls)

    var boxY = py + ls + 8
    var pieceH = mcs * 3.5 + 8

    for (var i = 0; i < PREVIEW_COUNT; i++) {
      if (i >= bag.length) break
      var pieceType = bag[i]
      var yOffset = boxY + i * pieceH
      drawPanelBox(px, yOffset, pw, pieceH - 4)
      drawMiniPiece(pieceType, 0, px + pw / 2, yOffset + (pieceH - 4) / 2, mcs, 1)
    }
  }

  // ─── Draw: Panel Helpers ──────────────────────────────────────────
  function drawPanelLabel(x, y, w, text, size) {
    ctx.fillStyle = CLR.labelColor
    ctx.font = "bold " + size + "px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText(text, x + w / 2, y)
  }

  function drawPanelBox(x, y, w, h) {
    ctx.fillStyle = CLR.panelBg
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = CLR.panelBorder
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)
  }

  function drawMiniPiece(type, rotation, cx, cy, cellSize, alpha) {
    var shape = PIECES[type].rotations[rotation]
    var color = CLR[PIECES[type].color]
    // Find bounding box center
    var minR = 99, maxR = -1, minC = 99, maxC = -1
    for (var i = 0; i < shape.length; i++) {
      if (shape[i][0] < minR) minR = shape[i][0]
      if (shape[i][0] > maxR) maxR = shape[i][0]
      if (shape[i][1] < minC) minC = shape[i][1]
      if (shape[i][1] > maxC) maxC = shape[i][1]
    }
    var pw = (maxC - minC + 1) * cellSize
    var ph = (maxR - minR + 1) * cellSize
    var ox = cx - pw / 2
    var oy = cy - ph / 2

    ctx.globalAlpha = alpha
    for (var j = 0; j < shape.length; j++) {
      var x = ox + (shape[j][1] - minC) * cellSize
      var y = oy + (shape[j][0] - minR) * cellSize
      drawBlock(x, y, cellSize - 1, color)
    }
    ctx.globalAlpha = 1
  }

  // ─── Draw: Line Clear Animation ───────────────────────────────────
  function drawClearAnimation() {
    var progress = clearAnimTimer / CLEAR_ANIM_DURATION
    var bx = layout.boardX
    var by = layout.boardY
    var cs = layout.cellSize

    for (var i = 0; i < clearingLines.length; i++) {
      var r = clearingLines[i] - HIDDEN_ROWS
      if (r < 0) continue
      var y = by + r * cs

      // Flash effect
      ctx.fillStyle = "rgba(255,255,255," + (0.6 * (1 - progress)) + ")"
      ctx.fillRect(bx, y, layout.boardW, cs)

      // Shrink blocks from center
      var shrink = progress
      for (var c = 0; c < COLS; c++) {
        if (board[clearingLines[i]][c] !== null) {
          var bx2 = bx + c * cs
          var renderW = cs * (1 - shrink) - 1
          if (renderW <= 0) continue
          var offset = (cs - renderW) / 2
          ctx.globalAlpha = 1 - progress
          drawBlock(bx2 + offset, y + offset, renderW, CLR[board[clearingLines[i]][c]])
          ctx.globalAlpha = 1
        }
      }
    }
  }

  // ─── Draw: Touch Controls ─────────────────────────────────────────
  function drawTouchControls() {
    if (touchControls.length === 0) return
    if (gameState !== "playing") return

    for (var i = 0; i < touchControls.length; i++) {
      var btn = touchControls[i]
      var isActive = touchActiveBtn === btn.id
      ctx.fillStyle = isActive ? CLR.btnHover : CLR.btnBg
      ctx.globalAlpha = 0.7
      roundRect(btn.x, btn.y, btn.w, btn.h, 8, true, false)
      ctx.globalAlpha = 1

      ctx.fillStyle = CLR.btnText
      ctx.font = "bold " + Math.floor(btn.h * 0.45) + "px Arial, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2)
    }
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    if (fill) ctx.fill()
    if (stroke) ctx.stroke()
  }

  // ─── Draw: Overlays ───────────────────────────────────────────────
  function drawOverlay(title, subtitle) {
    ctx.fillStyle = CLR.overlay
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = CLR.text
    ctx.font = "bold " + layout.titleSize + "px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(title, W / 2, H / 2 - 16)
    if (subtitle) {
      ctx.fillStyle = CLR.textDim
      ctx.font = layout.labelSize + "px Arial, sans-serif"
      ctx.fillText(subtitle, W / 2, H / 2 + 16)
    }
  }

  function drawGameOver() {
    ctx.fillStyle = CLR.overlay
    ctx.fillRect(0, 0, W, H)

    var cx = W / 2
    var cy = H / 2

    ctx.fillStyle = "#ff2d55"
    ctx.font = "bold " + layout.titleSize + "px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("GAME OVER", cx, cy - H * 0.08)

    ctx.fillStyle = CLR.text
    ctx.font = layout.fontSize + "px Arial, sans-serif"
    ctx.fillText("Score: " + score.toLocaleString(), cx, cy + 4)

    if (score === bestScore && score > 0) {
      ctx.fillStyle = CLR.labelColor
      ctx.font = "bold " + layout.labelSize + "px Arial, sans-serif"
      ctx.fillText("★ NEW BEST! ★", cx, cy + H * 0.05)
    }

    var blink = Math.sin(Date.now() * 0.004) > 0
    if (blink) {
      ctx.fillStyle = CLR.textDim
      ctx.font = layout.labelSize + "px Arial, sans-serif"
      ctx.fillText("Press ENTER or tap to restart", cx, cy + H * 0.12)
    }
  }

  // ─── Input: Keyboard ──────────────────────────────────────────────
  var keysDown = {}

  document.addEventListener("keydown", function (e) {
    // Prevent default for game keys to stop scrolling etc.
    var gameKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyC", "KeyP", "Enter", "KeyZ", "KeyX"]
    if (gameKeys.indexOf(e.code) !== -1) {
      e.preventDefault()
    }

    if (keysDown[e.code]) return // ignore key repeat from OS
    keysDown[e.code] = true

    ensureAudio()

    // Menu / Game Over
    if (gameState === "menu" || gameState === "gameover") {
      if (e.code === "Enter" || e.code === "Space") {
        startGame()
      }
      return
    }

    // Paused
    if (gameState === "paused") {
      if (e.code === "KeyP" || e.code === "Escape") {
        togglePause()
      }
      return
    }

    // Playing
    if (gameState === "playing") {
      switch (e.code) {
        case "ArrowLeft":
          if (movePiece(0, -1)) sfxMove()
          dasDirection = -1
          dasTimer = 0
          dasActive = false
          break
        case "ArrowRight":
          if (movePiece(0, 1)) sfxMove()
          dasDirection = 1
          dasTimer = 0
          dasActive = false
          break
        case "ArrowUp":
        case "KeyX":
          if (rotatePiece(1)) sfxRotate()
          break
        case "KeyZ":
          if (rotatePiece(-1)) sfxRotate()
          break
        case "ArrowDown":
          softDropping = true
          break
        case "Space":
          hardDrop()
          break
        case "KeyC":
        case "ShiftLeft":
        case "ShiftRight":
          holdCurrentPiece()
          break
        case "KeyP":
        case "Escape":
          togglePause()
          break
      }
    }
  })

  document.addEventListener("keyup", function (e) {
    keysDown[e.code] = false

    if (e.code === "ArrowLeft" && dasDirection === -1) {
      dasDirection = 0
      dasTimer = 0
      dasActive = false
    }
    if (e.code === "ArrowRight" && dasDirection === 1) {
      dasDirection = 0
      dasTimer = 0
      dasActive = false
    }
    if (e.code === "ArrowDown") {
      softDropping = false
    }
  })

  // Reset input state when window loses focus to prevent stuck keys
  function resetInputState() {
    keysDown = {}
    dasDirection = 0
    dasTimer = 0
    dasActive = false
    softDropping = false
    touchActiveBtn = null
  }
  window.addEventListener("blur", resetInputState)
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) resetInputState()
  })

  // ─── Input: Pointer / Touch ───────────────────────────────────────
  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault()
    ensureAudio()

    // Menu / Game Over — tap to start/restart
    if (gameState === "menu" || gameState === "gameover") {
      startGame()
      return
    }

    // Paused — tap to resume
    if (gameState === "paused") {
      togglePause()
      return
    }

    // Check touch controls
    if (touchControls.length > 0) {
      var rect = canvas.getBoundingClientRect()
      var px = (e.clientX - rect.left) * (W / rect.width)
      var py = (e.clientY - rect.top) * (H / rect.height)

      for (var i = 0; i < touchControls.length; i++) {
        var btn = touchControls[i]
        if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
          touchActiveBtn = btn.id
          handleTouchButton(btn.id, true)
          return
        }
      }
    }
  })

  canvas.addEventListener("pointerup", function (e) {
    if (touchActiveBtn) {
      handleTouchButton(touchActiveBtn, false)
      touchActiveBtn = null
    }
  })

  canvas.addEventListener("pointerleave", function () {
    if (touchActiveBtn) {
      handleTouchButton(touchActiveBtn, false)
      touchActiveBtn = null
    }
  })

  function handleTouchButton(id, isDown) {
    if (gameState !== "playing") return
    if (isDown) {
      switch (id) {
        case "left":
          if (movePiece(0, -1)) sfxMove()
          dasDirection = -1
          dasTimer = 0
          dasActive = false
          break
        case "right":
          if (movePiece(0, 1)) sfxMove()
          dasDirection = 1
          dasTimer = 0
          dasActive = false
          break
        case "rotate":
          if (rotatePiece(1)) sfxRotate()
          break
        case "down":
          softDropping = true
          break
        case "drop":
          hardDrop()
          break
        case "hold":
          holdCurrentPiece()
          break
      }
    } else {
      // Release
      if (id === "left" && dasDirection === -1) {
        dasDirection = 0
        dasTimer = 0
        dasActive = false
      }
      if (id === "right" && dasDirection === 1) {
        dasDirection = 0
        dasTimer = 0
        dasActive = false
      }
      if (id === "down") {
        softDropping = false
      }
    }
  }

  // ─── Start ─────────────────────────────────────────────────────────
  calcLayout()
  requestAnimationFrame(gameLoop)
})()
