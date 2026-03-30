// Minesweeper — classic puzzle game
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
    layoutBoard()
  })
  resize()

  // ─── Difficulty Presets ────────────────────────────────────────────
  var DIFFICULTIES = {
    beginner:     { label: "Beginner",     cols: 9,  rows: 9,  mines: 10 },
    intermediate: { label: "Intermediate", cols: 16, rows: 16, mines: 40 },
    expert:       { label: "Expert",       cols: 30, rows: 16, mines: 99 }
  }
  var DIFFICULTY_KEYS = ["beginner", "intermediate", "expert"]

  // ─── Colors ────────────────────────────────────────────────────────
  var CLR = {
    bg:           "#0a0a1a",
    headerBg:     "#12122a",
    cellHidden:   "#3a3a6a",
    cellHover:    "#4a4a8a",
    cellRevealed: "#1a1a2e",
    cellFlagged:  "#3a3a6a",
    cellMine:     "#ff2d55",
    cellWrong:    "#ff6b35",
    cellSafe:     "#2a4a2a",
    border:       "#2a2a4a",
    gridLine:     "#252545",
    text:         "#ffffff",
    textDim:      "#8888aa",
    textMuted:    "#555577",
    mineCounter:  "#ff2d55",
    timer:        "#00e5ff",
    btnBg:        "#2a2a4a",
    btnHover:     "#3a3a6a",
    btnActive:    "#4a4a8a",
    btnText:      "#ffffff",
    smiley:       "#ffcc00",
    flag:         "#ff2d55",
    mine:         "#ffffff",
    // Number colors by count (1-8)
    num: [
      null,
      "#4488ff", // 1 blue
      "#44bb44", // 2 green
      "#ff4444", // 3 red
      "#8844cc", // 4 dark blue
      "#cc4444", // 5 maroon
      "#44aaaa", // 6 teal
      "#333333", // 7 black
      "#888888"  // 8 gray
    ]
  }

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

  function playTone(freq, dur, type, vol) {
    if (!audioCtx) return
    try {
      var osc = audioCtx.createOscillator()
      var gain = audioCtx.createGain()
      osc.type = type || "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(vol || 0.08, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + dur)
    } catch (e) { /* ignore */ }
  }

  function sfxReveal() {
    playTone(600, 0.06, "sine", 0.05)
  }
  function sfxFloodReveal() {
    playTone(800, 0.12, "sine", 0.06)
    setTimeout(function () { playTone(1000, 0.08, "sine", 0.04) }, 40)
  }
  function sfxFlag() {
    playTone(500, 0.08, "triangle", 0.07)
    setTimeout(function () { playTone(700, 0.06, "triangle", 0.05) }, 60)
  }
  function sfxUnflag() {
    playTone(400, 0.1, "triangle", 0.06)
  }
  function sfxExplosion() {
    playTone(120, 0.4, "sawtooth", 0.12)
    setTimeout(function () { playTone(80, 0.5, "sawtooth", 0.1) }, 100)
    setTimeout(function () { playTone(50, 0.6, "sawtooth", 0.08) }, 250)
  }
  function sfxWin() {
    playTone(523, 0.12, "sine", 0.08)
    setTimeout(function () { playTone(659, 0.12, "sine", 0.08) }, 100)
    setTimeout(function () { playTone(784, 0.12, "sine", 0.08) }, 200)
    setTimeout(function () { playTone(1047, 0.25, "sine", 0.1) }, 300)
  }
  function sfxClick() {
    playTone(800, 0.03, "square", 0.03)
  }

  // ─── Game State ────────────────────────────────────────────────────
  var STATE_MENU = 0
  var STATE_PLAYING = 1
  var STATE_WON = 2
  var STATE_LOST = 3

  var CELL_HIDDEN = 0
  var CELL_REVEALED = 1
  var CELL_FLAGGED = 2

  var difficulty = "beginner"
  var state = STATE_MENU
  var board = null       // 2D array: { mine, adjacent, state }
  var cols = 0
  var rows = 0
  var mineCount = 0
  var flagCount = 0
  var revealedCount = 0
  var firstClick = true
  var timer = 0
  var timerRunning = false
  var timerStart = 0
  var explodedCell = null // { r, c } of the mine that was clicked

  // ─── Layout Metrics ────────────────────────────────────────────────
  var headerH = 0
  var cellSize = 0
  var boardX = 0
  var boardY = 0
  var boardW = 0
  var boardH = 0
  var menuBtns = []
  var restartBtn = { x: 0, y: 0, w: 0, h: 0 }
  var diffBtns = []

  // ─── Mouse/Touch State ─────────────────────────────────────────────
  var mouseX = -1
  var mouseY = -1
  var hoverR = -1
  var hoverC = -1

  // ─── Board Creation ────────────────────────────────────────────────

  /** Create empty board grid */
  function createBoard(r, c) {
    var b = []
    for (var i = 0; i < r; i++) {
      var row = []
      for (var j = 0; j < c; j++) {
        row.push({ mine: false, adjacent: 0, state: CELL_HIDDEN })
      }
      b.push(row)
    }
    return b
  }

  /** Place mines randomly, avoiding safeR/safeC and its 8 neighbors */
  function placeMines(b, r, c, count, safeR, safeC) {
    var positions = []
    for (var i = 0; i < r; i++) {
      for (var j = 0; j < c; j++) {
        if (Math.abs(i - safeR) <= 1 && Math.abs(j - safeC) <= 1) continue
        positions.push({ r: i, c: j })
      }
    }
    // Fisher-Yates shuffle
    for (var k = positions.length - 1; k > 0; k--) {
      var m = Math.floor(Math.random() * (k + 1))
      var tmp = positions[k]
      positions[k] = positions[m]
      positions[m] = tmp
    }
    var placed = Math.min(count, positions.length)
    for (var p = 0; p < placed; p++) {
      b[positions[p].r][positions[p].c].mine = true
    }
    return placed
  }

  /** Calculate adjacent mine counts for all cells */
  function calcAdjacent(b, r, c) {
    for (var i = 0; i < r; i++) {
      for (var j = 0; j < c; j++) {
        if (b[i][j].mine) { b[i][j].adjacent = -1; continue }
        var count = 0
        for (var di = -1; di <= 1; di++) {
          for (var dj = -1; dj <= 1; dj++) {
            if (di === 0 && dj === 0) continue
            var ni = i + di, nj = j + dj
            if (ni >= 0 && ni < r && nj >= 0 && nj < c && b[ni][nj].mine) count++
          }
        }
        b[i][j].adjacent = count
      }
    }
  }

  // ─── Game Actions ──────────────────────────────────────────────────

  function startGame(diff) {
    difficulty = diff
    var d = DIFFICULTIES[diff]
    cols = d.cols
    rows = d.rows
    mineCount = d.mines
    flagCount = 0
    revealedCount = 0
    firstClick = true
    timer = 0
    timerRunning = false
    explodedCell = null
    board = createBoard(rows, cols)
    state = STATE_PLAYING
    layoutBoard()
  }

  function restartGame() {
    startGame(difficulty)
  }

  /** Reveal a cell; on first click, place mines avoiding this cell */
  function revealCell(r, c) {
    if (state !== STATE_PLAYING) return
    if (r < 0 || r >= rows || c < 0 || c >= cols) return
    var cell = board[r][c]
    if (cell.state === CELL_FLAGGED) return
    if (cell.state === CELL_REVEALED) return

    // First click: place mines now (guaranteed safe opening)
    if (firstClick) {
      firstClick = false
      placeMines(board, rows, cols, mineCount, r, c)
      calcAdjacent(board, rows, cols)
      timerRunning = true
      timerStart = Date.now()
    }

    if (cell.mine) {
      // Game over — hit a mine
      cell.state = CELL_REVEALED
      explodedCell = { r: r, c: c }
      state = STATE_LOST
      timerRunning = false
      revealAllMines()
      sfxExplosion()
      return
    }

    // Flood-fill reveal for empty cells
    floodReveal(r, c)
    checkWin()

    if (state === STATE_WON) {
      sfxWin()
    } else if (board[r][c].adjacent === 0) {
      sfxFloodReveal()
    } else {
      sfxReveal()
    }
  }

  /** Chord reveal: if a revealed numbered cell has exactly N flags around it,
      reveal all non-flagged neighbors. Classic middle-click/double-click behavior. */
  function chordReveal(r, c) {
    if (state !== STATE_PLAYING) return
    var cell = board[r][c]
    if (cell.state !== CELL_REVEALED || cell.adjacent <= 0) return

    var flagsAround = 0
    for (var di = -1; di <= 1; di++) {
      for (var dj = -1; dj <= 1; dj++) {
        if (di === 0 && dj === 0) continue
        var ni = r + di, nj = c + dj
        if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
          if (board[ni][nj].state === CELL_FLAGGED) flagsAround++
        }
      }
    }

    if (flagsAround !== cell.adjacent) return

    for (var di2 = -1; di2 <= 1; di2++) {
      for (var dj2 = -1; dj2 <= 1; dj2++) {
        if (di2 === 0 && dj2 === 0) continue
        var ni2 = r + di2, nj2 = c + dj2
        if (ni2 >= 0 && ni2 < rows && nj2 >= 0 && nj2 < cols) {
          revealCell(ni2, nj2)
        }
      }
    }
  }

  /** Recursive flood reveal of empty (0-adjacent) cells */
  function floodReveal(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return
    var cell = board[r][c]
    if (cell.state === CELL_REVEALED) return
    if (cell.state === CELL_FLAGGED) return
    if (cell.mine) return

    cell.state = CELL_REVEALED
    revealedCount++

    if (cell.adjacent === 0) {
      for (var di = -1; di <= 1; di++) {
        for (var dj = -1; dj <= 1; dj++) {
          if (di === 0 && dj === 0) continue
          floodReveal(r + di, c + dj)
        }
      }
    }
  }

  /** Toggle flag on a hidden cell */
  function toggleFlag(r, c) {
    if (state !== STATE_PLAYING) return
    if (r < 0 || r >= rows || c < 0 || c >= cols) return
    var cell = board[r][c]
    if (cell.state === CELL_REVEALED) return

    if (cell.state === CELL_FLAGGED) {
      cell.state = CELL_HIDDEN
      flagCount--
      sfxUnflag()
    } else {
      cell.state = CELL_FLAGGED
      flagCount++
      sfxFlag()
    }
  }

  /** Reveal all mines on game over */
  function revealAllMines() {
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < cols; j++) {
        var cell = board[i][j]
        if (cell.mine && cell.state !== CELL_FLAGGED) {
          cell.state = CELL_REVEALED
        }
        // Mark incorrect flags
        if (!cell.mine && cell.state === CELL_FLAGGED) {
          cell.wrongFlag = true
        }
      }
    }
  }

  /** Check if player has won (all non-mine cells revealed) */
  function checkWin() {
    if (revealedCount === rows * cols - mineCount) {
      state = STATE_WON
      timerRunning = false
      // Auto-flag remaining mines
      for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
          if (board[i][j].mine && board[i][j].state !== CELL_FLAGGED) {
            board[i][j].state = CELL_FLAGGED
            flagCount++
          }
        }
      }
    }
  }

  // ─── Layout Calculation ────────────────────────────────────────────

  function layoutBoard() {
    if (state === STATE_MENU) {
      layoutMenu()
      return
    }

    // Header area: difficulty buttons + status bar
    headerH = Math.max(80, H * 0.1)
    var availW = W - 20 // 10px padding each side
    var availH = H - headerH - 20

    // Calculate cell size to fit the board
    var cw = Math.floor(availW / cols)
    var ch = Math.floor(availH / rows)
    cellSize = Math.min(cw, ch, 48) // cap at 48px for readability
    cellSize = Math.max(cellSize, 16) // minimum 16px

    boardW = cellSize * cols
    boardH = cellSize * rows
    boardX = Math.floor((W - boardW) / 2)
    boardY = Math.floor(headerH + (H - headerH - boardH) / 2)

    // Difficulty buttons in header
    layoutDiffButtons()
    layoutRestartButton()
  }

  function layoutMenu() {
    var btnW = Math.min(280, W * 0.7)
    var btnH = 52
    var gap = 16
    var totalH = DIFFICULTY_KEYS.length * (btnH + gap) - gap
    var startY = Math.floor((H - totalH) / 2) + 60

    menuBtns = []
    for (var i = 0; i < DIFFICULTY_KEYS.length; i++) {
      var key = DIFFICULTY_KEYS[i]
      var d = DIFFICULTIES[key]
      menuBtns.push({
        key: key,
        label: d.label + " (" + d.cols + "×" + d.rows + ", " + d.mines + " mines)",
        x: Math.floor((W - btnW) / 2),
        y: startY + i * (btnH + gap),
        w: btnW,
        h: btnH
      })
    }
  }

  function layoutDiffButtons() {
    var btnH = 28
    var btnW = 90
    var gap = 8
    var totalW = DIFFICULTY_KEYS.length * (btnW + gap) - gap
    var startX = Math.floor((W - totalW) / 2)
    var y = 8

    diffBtns = []
    for (var i = 0; i < DIFFICULTY_KEYS.length; i++) {
      diffBtns.push({
        key: DIFFICULTY_KEYS[i],
        label: DIFFICULTIES[DIFFICULTY_KEYS[i]].label,
        x: startX + i * (btnW + gap),
        y: y,
        w: btnW,
        h: btnH
      })
    }
  }

  function layoutRestartButton() {
    var size = 36
    restartBtn = {
      x: Math.floor(W / 2 - size / 2),
      y: 40,
      w: size,
      h: size
    }
  }

  // ─── Rendering ─────────────────────────────────────────────────────

  function render() {
    ctx.fillStyle = CLR.bg
    ctx.fillRect(0, 0, W, H)

    if (state === STATE_MENU) {
      renderMenu()
    } else {
      renderHeader()
      renderBoard()
    }
  }

  function renderMenu() {
    // Title
    ctx.fillStyle = CLR.smiley
    ctx.font = "bold " + Math.min(48, W * 0.08) + "px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("💣 Minesweeper", W / 2, H * 0.2)

    // Subtitle
    ctx.fillStyle = CLR.textDim
    ctx.font = Math.min(18, W * 0.035) + "px sans-serif"
    ctx.fillText("Select difficulty to begin", W / 2, H * 0.2 + 50)

    // Difficulty buttons
    for (var i = 0; i < menuBtns.length; i++) {
      var btn = menuBtns[i]
      var hover = pointInRect(mouseX, mouseY, btn)
      ctx.fillStyle = hover ? CLR.btnHover : CLR.btnBg
      roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8)
      ctx.fill()

      ctx.fillStyle = CLR.btnText
      ctx.font = "bold 16px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2)
    }

    // Controls hint
    ctx.fillStyle = CLR.textMuted
    ctx.font = "13px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("Left-click: reveal  ·  Right-click: flag  ·  Middle-click: chord", W / 2, H - 30)
  }

  function renderHeader() {
    // Header background
    ctx.fillStyle = CLR.headerBg
    ctx.fillRect(0, 0, W, headerH)

    // Difficulty tabs
    for (var i = 0; i < diffBtns.length; i++) {
      var btn = diffBtns[i]
      var isActive = btn.key === difficulty
      var hover = pointInRect(mouseX, mouseY, btn)
      ctx.fillStyle = isActive ? CLR.btnActive : hover ? CLR.btnHover : CLR.btnBg
      roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 6)
      ctx.fill()

      ctx.fillStyle = isActive ? CLR.btnText : CLR.textDim
      ctx.font = (isActive ? "bold " : "") + "13px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2)
    }

    // Status bar: mine counter | smiley/restart | timer
    var statusY = 44
    var statusH = 32

    // Mine counter (left)
    var remaining = mineCount - flagCount
    ctx.fillStyle = CLR.mineCounter
    ctx.font = "bold 22px monospace"
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    var counterX = Math.max(boardX, 20)
    ctx.fillText("💣 " + padNum(remaining), counterX, statusY + statusH / 2)

    // Timer (right)
    var elapsed = getElapsedTime()
    ctx.fillStyle = CLR.timer
    ctx.font = "bold 22px monospace"
    ctx.textAlign = "right"
    var timerX = Math.min(boardX + boardW, W - 20)
    ctx.fillText("⏱ " + padNum(elapsed), timerX, statusY + statusH / 2)

    // Restart button (center smiley)
    var rb = restartBtn
    var smileyHover = pointInRect(mouseX, mouseY, rb)
    ctx.fillStyle = smileyHover ? CLR.btnHover : CLR.btnBg
    roundRect(ctx, rb.x, rb.y, rb.w, rb.h, 8)
    ctx.fill()

    ctx.font = "22px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    var face = "🙂"
    if (state === STATE_WON) face = "😎"
    else if (state === STATE_LOST) face = "💀"
    ctx.fillText(face, rb.x + rb.w / 2, rb.y + rb.h / 2)
  }

  function renderBoard() {
    // Board border
    ctx.fillStyle = CLR.border
    ctx.fillRect(boardX - 2, boardY - 2, boardW + 4, boardH + 4)

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var cell = board[r][c]
        var x = boardX + c * cellSize
        var y = boardY + r * cellSize
        var isHover = (r === hoverR && c === hoverC)

        renderCell(cell, x, y, r, c, isHover)
      }
    }

    // Keyboard focus indicator
    if (kbMode && state === STATE_PLAYING) {
      var fx = boardX + focusC * cellSize
      var fy = boardY + focusR * cellSize
      ctx.strokeStyle = CLR.smiley
      ctx.lineWidth = 2
      roundRect(ctx, fx + 1, fy + 1, cellSize - 2, cellSize - 2, 3)
      ctx.stroke()
    }
  }

  function renderCell(cell, x, y, r, c, isHover) {
    var pad = 1 // gap between cells
    var cx = x + pad
    var cy = y + pad
    var cw = cellSize - pad * 2
    var ch = cellSize - pad * 2
    var fontSize = Math.max(10, Math.floor(cellSize * 0.5))

    if (cell.state === CELL_HIDDEN) {
      // Unrevealed cell
      ctx.fillStyle = isHover && state === STATE_PLAYING ? CLR.cellHover : CLR.cellHidden
      roundRect(ctx, cx, cy, cw, ch, 3)
      ctx.fill()

      // 3D raised effect
      if (cellSize >= 20) {
        ctx.fillStyle = "rgba(255,255,255,0.06)"
        ctx.fillRect(cx, cy, cw, 2)
        ctx.fillRect(cx, cy, 2, ch)
        ctx.fillStyle = "rgba(0,0,0,0.15)"
        ctx.fillRect(cx, cy + ch - 2, cw, 2)
        ctx.fillRect(cx + cw - 2, cy, 2, ch)
      }
    } else if (cell.state === CELL_FLAGGED) {
      // Flagged cell
      if (cell.wrongFlag) {
        // Wrong flag shown after game over
        ctx.fillStyle = CLR.cellWrong
        roundRect(ctx, cx, cy, cw, ch, 3)
        ctx.fill()
        drawX(cx, cy, cw, ch)
      } else {
        ctx.fillStyle = CLR.cellHidden
        roundRect(ctx, cx, cy, cw, ch, 3)
        ctx.fill()
        // Draw flag
        drawFlag(cx, cy, cw, ch, fontSize)
      }
    } else if (cell.state === CELL_REVEALED) {
      if (cell.mine) {
        // Mine cell
        var isExploded = explodedCell && explodedCell.r === r && explodedCell.c === c
        ctx.fillStyle = isExploded ? CLR.cellMine : CLR.cellRevealed
        roundRect(ctx, cx, cy, cw, ch, 3)
        ctx.fill()
        drawMine(cx, cy, cw, ch, fontSize)
      } else {
        // Revealed safe cell
        ctx.fillStyle = state === STATE_WON ? CLR.cellSafe : CLR.cellRevealed
        roundRect(ctx, cx, cy, cw, ch, 3)
        ctx.fill()

        if (cell.adjacent > 0) {
          ctx.fillStyle = CLR.num[cell.adjacent] || CLR.text
          ctx.font = "bold " + fontSize + "px monospace"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(cell.adjacent.toString(), cx + cw / 2, cy + ch / 2 + 1)
        }
      }
    }
  }

  // ─── Drawing Helpers ───────────────────────────────────────────────

  function drawFlag(cx, cy, cw, ch, fontSize) {
    var mx = cx + cw / 2
    var my = cy + ch / 2
    var scale = fontSize / 16

    // Pole
    ctx.strokeStyle = "#cccccc"
    ctx.lineWidth = Math.max(1, 1.5 * scale)
    ctx.beginPath()
    ctx.moveTo(mx, my - 6 * scale)
    ctx.lineTo(mx, my + 6 * scale)
    ctx.stroke()

    // Flag triangle
    ctx.fillStyle = CLR.flag
    ctx.beginPath()
    ctx.moveTo(mx, my - 6 * scale)
    ctx.lineTo(mx + 6 * scale, my - 2 * scale)
    ctx.lineTo(mx, my + 2 * scale)
    ctx.closePath()
    ctx.fill()

    // Base
    ctx.fillStyle = "#cccccc"
    ctx.fillRect(mx - 3 * scale, my + 5 * scale, 6 * scale, 1.5 * scale)
  }

  function drawMine(cx, cy, cw, ch, fontSize) {
    var mx = cx + cw / 2
    var my = cy + ch / 2
    var r = fontSize * 0.35

    // Body
    ctx.fillStyle = CLR.mine
    ctx.beginPath()
    ctx.arc(mx, my, r, 0, Math.PI * 2)
    ctx.fill()

    // Spikes
    ctx.strokeStyle = CLR.mine
    ctx.lineWidth = Math.max(1, r * 0.25)
    for (var a = 0; a < 8; a++) {
      var angle = (a / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(mx + Math.cos(angle) * r * 0.6, my + Math.sin(angle) * r * 0.6)
      ctx.lineTo(mx + Math.cos(angle) * r * 1.5, my + Math.sin(angle) * r * 1.5)
      ctx.stroke()
    }

    // Glint
    ctx.fillStyle = "rgba(0,0,0,0.4)"
    ctx.beginPath()
    ctx.arc(mx - r * 0.25, my - r * 0.25, r * 0.25, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawX(cx, cy, cw, ch) {
    var pad = cw * 0.25
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx + pad, cy + pad)
    ctx.lineTo(cx + cw - pad, cy + ch - pad)
    ctx.moveTo(cx + cw - pad, cy + pad)
    ctx.lineTo(cx + pad, cy + ch - pad)
    ctx.stroke()
  }

  function roundRect(c, x, y, w, h, r) {
    if (r > w / 2) r = w / 2
    if (r > h / 2) r = h / 2
    c.beginPath()
    c.moveTo(x + r, y)
    c.arcTo(x + w, y, x + w, y + h, r)
    c.arcTo(x + w, y + h, x, y + h, r)
    c.arcTo(x, y + h, x, y, r)
    c.arcTo(x, y, x + w, y, r)
    c.closePath()
  }

  function padNum(n) {
    var s = Math.abs(n).toString()
    while (s.length < 3) s = "0" + s
    return n < 0 ? "-" + s : " " + s
  }

  function getElapsedTime() {
    if (!timerRunning && timer === 0) return 0
    if (timerRunning) {
      timer = Math.floor((Date.now() - timerStart) / 1000)
    }
    return Math.min(timer, 999)
  }

  function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h
  }

  // ─── Input Handling ────────────────────────────────────────────────

  function getCellFromPoint(px, py) {
    if (px < boardX || px >= boardX + boardW) return null
    if (py < boardY || py >= boardY + boardH) return null
    var c = Math.floor((px - boardX) / cellSize)
    var r = Math.floor((py - boardY) / cellSize)
    if (r < 0 || r >= rows || c < 0 || c >= cols) return null
    return { r: r, c: c }
  }

  canvas.addEventListener("pointermove", function (e) {
    var rect = canvas.getBoundingClientRect()
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width)
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height)

    if (state !== STATE_MENU) {
      var pos = getCellFromPoint(mouseX, mouseY)
      hoverR = pos ? pos.r : -1
      hoverC = pos ? pos.c : -1
    }
  })

  canvas.addEventListener("pointerleave", function () {
    mouseX = -1
    mouseY = -1
    hoverR = -1
    hoverC = -1
  })

  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault()
    ensureAudio()

    // If a long-press just fired a flag, skip this event
    if (longPressFired) {
      longPressFired = false
      return
    }

    var rect = canvas.getBoundingClientRect()
    var px = (e.clientX - rect.left) * (canvas.width / rect.width)
    var py = (e.clientY - rect.top) * (canvas.height / rect.height)

    if (state === STATE_MENU) {
      handleMenuClick(px, py)
      return
    }

    // Check header buttons
    if (handleHeaderClick(px, py)) return

    // Board interaction
    var pos = getCellFromPoint(px, py)
    if (!pos) return

    // Right-click or ctrl+click → flag
    if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
      toggleFlag(pos.r, pos.c)
      return
    }

    // Middle-click → chord reveal
    if (e.button === 1) {
      chordReveal(pos.r, pos.c)
      return
    }

    // Left-click → reveal or chord (if already revealed)
    if (e.button === 0) {
      var cell = board[pos.r][pos.c]
      if (cell.state === CELL_REVEALED && cell.adjacent > 0) {
        chordReveal(pos.r, pos.c)
      } else {
        revealCell(pos.r, pos.c)
      }
    }
  })

  // Prevent context menu on right-click
  canvas.addEventListener("contextmenu", function (e) {
    e.preventDefault()
  })

  // ─── Keyboard Support ──────────────────────────────────────────────
  // Arrow keys to move focus, Space/Enter to reveal, F to flag

  var focusR = 0
  var focusC = 0
  var kbMode = false // activated when arrow keys used

  document.addEventListener("keydown", function (e) {
    if (state === STATE_MENU) {
      // Quick start with number keys
      if (e.key === "1") { startGame("beginner"); return }
      if (e.key === "2") { startGame("intermediate"); return }
      if (e.key === "3") { startGame("expert"); return }
      if (e.key === "Enter" || e.key === " ") {
        startGame("beginner")
        return
      }
      return
    }

    var handled = true
    switch (e.key) {
      case "ArrowUp":
        kbMode = true
        focusR = Math.max(0, focusR - 1)
        hoverR = focusR; hoverC = focusC
        break
      case "ArrowDown":
        kbMode = true
        focusR = Math.min(rows - 1, focusR + 1)
        hoverR = focusR; hoverC = focusC
        break
      case "ArrowLeft":
        kbMode = true
        focusC = Math.max(0, focusC - 1)
        hoverR = focusR; hoverC = focusC
        break
      case "ArrowRight":
        kbMode = true
        focusC = Math.min(cols - 1, focusC + 1)
        hoverR = focusR; hoverC = focusC
        break
      case " ":
      case "Enter":
        ensureAudio()
        if (state === STATE_WON || state === STATE_LOST) {
          restartGame()
        } else if (kbMode) {
          var cell = board[focusR][focusC]
          if (cell.state === CELL_REVEALED && cell.adjacent > 0) {
            chordReveal(focusR, focusC)
          } else {
            revealCell(focusR, focusC)
          }
        }
        break
      case "f":
      case "F":
        ensureAudio()
        if (kbMode) toggleFlag(focusR, focusC)
        break
      case "r":
      case "R":
        ensureAudio()
        restartGame()
        break
      case "1":
        startGame("beginner")
        break
      case "2":
        startGame("intermediate")
        break
      case "3":
        startGame("expert")
        break
      case "Escape":
        state = STATE_MENU
        layoutBoard()
        break
      default:
        handled = false
    }
    if (handled) e.preventDefault()
  })

  function handleMenuClick(px, py) {
    for (var i = 0; i < menuBtns.length; i++) {
      if (pointInRect(px, py, menuBtns[i])) {
        sfxClick()
        startGame(menuBtns[i].key)
        return
      }
    }
  }

  function handleHeaderClick(px, py) {
    // Restart button
    if (pointInRect(px, py, restartBtn)) {
      sfxClick()
      restartGame()
      return true
    }

    // Difficulty buttons
    for (var i = 0; i < diffBtns.length; i++) {
      if (pointInRect(px, py, diffBtns[i])) {
        sfxClick()
        startGame(diffBtns[i].key)
        return true
      }
    }

    return false
  }

  // ─── Long-press for flag on touch devices ──────────────────────────
  var longPressTimer = null
  var longPressPos = null
  var longPressFired = false
  var LONG_PRESS_MS = 400

  canvas.addEventListener("touchstart", function (e) {
    if (state !== STATE_PLAYING) return
    if (e.touches.length !== 1) return
    var touch = e.touches[0]
    var rect = canvas.getBoundingClientRect()
    var px = (touch.clientX - rect.left) * (canvas.width / rect.width)
    var py = (touch.clientY - rect.top) * (canvas.height / rect.height)
    var pos = getCellFromPoint(px, py)
    if (!pos) return

    longPressFired = false
    longPressPos = pos
    longPressTimer = setTimeout(function () {
      if (longPressPos) {
        ensureAudio()
        toggleFlag(longPressPos.r, longPressPos.c)
        longPressFired = true // suppress the subsequent pointerdown reveal
        longPressPos = null
      }
    }, LONG_PRESS_MS)
  }, { passive: true })

  canvas.addEventListener("touchend", function () {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    longPressPos = null
  }, { passive: true })

  canvas.addEventListener("touchmove", function () {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    longPressPos = null
  }, { passive: true })

  // ─── Game Loop ─────────────────────────────────────────────────────

  function loop() {
    render()
    requestAnimationFrame(loop)
  }

  // ─── Initialize ────────────────────────────────────────────────────
  layoutBoard()
  loop()
})()
