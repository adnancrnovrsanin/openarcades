// Seat the Weirdos — vanilla Canvas + Web Audio strategy/humor game
// Place quirky passengers into bus seats and survive the ride!

;(function () {
  "use strict"

  // ─── Canvas Setup ──────────────────────────────────────────
  var canvas = document.getElementById("game")
  var ctx = canvas.getContext("2d")
  var W, H

  function resize() {
    W = canvas.width = window.innerWidth
    H = canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener("resize", resize)

  // ─── Constants ─────────────────────────────────────────────
  var MAX_DELTA = 100
  var BUS_ROWS = 4
  var BUS_COLS = 2
  var TOTAL_SEATS = BUS_ROWS * BUS_COLS
  var RIDE_DURATION = 18 // seconds
  var EVENT_INTERVAL = 1.8 // seconds between interaction checks
  var MAX_CHAOS = 100

  // ─── Colors ────────────────────────────────────────────────
  var BG = "#1a1a2e"
  var BUS_BG = "#2a2a4a"
  var BUS_BORDER = "#4a4a6a"
  var SEAT_EMPTY = "#3a3a5a"
  var SEAT_HOVER = "#5a5a8a"
  var SEAT_PLACED = "#4a6a4a"
  var AISLE_COLOR = "#252540"
  var TEXT_WHITE = "#ffffff"
  var TEXT_DIM = "#8888aa"
  var CHAOS_LOW = "#44dd88"
  var CHAOS_MID = "#ddaa44"
  var CHAOS_HIGH = "#dd4444"
  var TITLE_COLOR = "#ffcc00"
  var SUBTITLE_COLOR = "#88aaff"
  var BUTTON_BG = "#44aa66"
  var BUTTON_HOVER = "#55cc77"
  var BUTTON_TEXT = "#ffffff"
  var CARD_BG = "#2e2e4e"
  var CARD_SELECTED = "#4e4e8e"
  var CARD_BORDER = "#5a5a8a"

  // ─── Audio ─────────────────────────────────────────────────
  var audioCtx = null

  function initAudio() {
    if (audioCtx) {
      if (audioCtx.state === "suspended") {
        try { audioCtx.resume() } catch (e) { /* ignore */ }
      }
      return
    }
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      audioCtx = null
    }
  }

  function playTone(freq, dur, type, vol) {
    if (!audioCtx) return
    try {
      var osc = audioCtx.createOscillator()
      var gain = audioCtx.createGain()
      osc.type = type || "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(vol || 0.1, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + dur)
    } catch (e) { /* ignore */ }
  }

  function sfxPlace() { playTone(520, 0.12, "sine", 0.12); playTone(780, 0.1, "sine", 0.08) }
  function sfxRemove() { playTone(320, 0.15, "triangle", 0.1) }
  function sfxStart() { playTone(440, 0.15, "sine", 0.1); setTimeout(function() { playTone(660, 0.15, "sine", 0.1) }, 100); setTimeout(function() { playTone(880, 0.2, "sine", 0.12) }, 200) }
  function sfxChaos() { playTone(200 + Math.random() * 200, 0.2, "sawtooth", 0.06) }
  function sfxCalm() { playTone(600 + Math.random() * 200, 0.3, "sine", 0.06) }
  function sfxGameOver() { playTone(440, 0.3, "sawtooth", 0.1); setTimeout(function() { playTone(330, 0.3, "sawtooth", 0.1) }, 200); setTimeout(function() { playTone(220, 0.5, "sawtooth", 0.12) }, 400) }
  function sfxWin() { playTone(523, 0.15, "sine", 0.1); setTimeout(function() { playTone(659, 0.15, "sine", 0.1) }, 120); setTimeout(function() { playTone(784, 0.15, "sine", 0.1) }, 240); setTimeout(function() { playTone(1047, 0.3, "sine", 0.12) }, 360) }
  function sfxClick() { playTone(800, 0.05, "square", 0.05) }

  // ─── Passenger Archetypes ──────────────────────────────────
  var ARCHETYPES = [
    { name: "The Snorer",      emoji: "\uD83D\uDE34", color: "#7986CB", trait: "snorer",      desc: "Falls asleep instantly. Legendary snoring." },
    { name: "The Chatterbox",  emoji: "\uD83D\uDDE3\uFE0F", color: "#FFB74D", trait: "chatterbox",  desc: "Won't stop talking. Ever. About anything." },
    { name: "The Foodie",      emoji: "\uD83C\uDF54", color: "#FFD54F", trait: "foodie",      desc: "Eating something extremely pungent." },
    { name: "The DJ",          emoji: "\uD83C\uDFB5", color: "#F06292", trait: "dj",          desc: "Blasting music from a tiny speaker." },
    { name: "Cat Lady",        emoji: "\uD83D\uDC31", color: "#A5D6A7", trait: "cat",         desc: "Brought three cats in a tote bag." },
    { name: "Dog Guy",         emoji: "\uD83D\uDC36", color: "#BCAAA4", trait: "dog",         desc: "Has an excitable golden retriever." },
    { name: "The Germaphobe",  emoji: "\uD83E\uDD27", color: "#80DEEA", trait: "germaphobe",  desc: "Sanitizes everything. Judges everyone." },
    { name: "The Professor",   emoji: "\uD83D\uDCDA", color: "#66BB6A", trait: "professor",   desc: "Reading advanced quantum mechanics." },
    { name: "The Knitter",     emoji: "\uD83E\uDDF6", color: "#CE93D8", trait: "knitter",     desc: "Radiates calm. Knitting a cozy scarf." },
    { name: "Conspiracy Guy",  emoji: "\uD83D\uDC7D", color: "#9575CD", trait: "conspiracy",  desc: "The birds aren't real. Let me explain..." },
    { name: "The Tourist",     emoji: "\uD83D\uDCF8", color: "#4FC3F7", trait: "tourist",     desc: "Flash photography on a BUS. Really." },
    { name: "The Baby",        emoji: "\uD83D\uDC76", color: "#F8BBD0", trait: "baby",        desc: "Could be an angel. Or a siren." },
    { name: "Drama Queen",     emoji: "\uD83D\uDE31", color: "#EF5350", trait: "drama",       desc: "Everything is a personal attack." },
    { name: "The Yogi",        emoji: "\uD83E\uDDD8", color: "#4DB6AC", trait: "yogi",        desc: "Attempting bus meditation. Needs silence." },
    { name: "The Clown",       emoji: "\uD83E\uDD21", color: "#FF8A65", trait: "clown",       desc: "Making balloon animals. Honk honk." },
    { name: "The Gamer",       emoji: "\uD83C\uDFAE", color: "#7E57C2", trait: "gamer",       desc: "Button-mashing on a handheld. Loudly." },
    { name: "Loud Grandma",    emoji: "\uD83D\uDC75", color: "#FFA726", trait: "grandma",     desc: "Phone on speaker. Volume at MAX." },
    { name: "The Mime",        emoji: "\uD83E\uDD90", color: "#EEEEEE", trait: "mime",        desc: "Silent but deeply unsettling." }
  ]

  // ─── Interaction Rules ─────────────────────────────────────
  // [traitA, traitB, chaosChange, message]
  // Positive = more chaos, negative = calming
  var INTERACTIONS = [
    ["snorer",     "germaphobe",  18, "{a} drools on {b}'s sanitized armrest!"],
    ["snorer",     "professor",   10, "{a}'s snoring drowns out {b}'s reading!"],
    ["snorer",     "yogi",        12, "{a}'s chainsaw snoring ruins {b}'s zen!"],
    ["snorer",     "baby",       -8,  "{a}'s snoring somehow soothes {b}!"],
    ["chatterbox", "professor",   14, "{a} won't stop explaining podcast lore to {b}!"],
    ["chatterbox", "chatterbox", -6,  "{a} and {b} found their soulmate!"],
    ["chatterbox", "yogi",        12, "{a} asks {b} about chakras... for 40 minutes!"],
    ["chatterbox", "germaphobe",  8,  "{a} keeps leaning close to whisper to {b}!"],
    ["chatterbox", "mime",        10, "{a} is offended {b} won't respond!"],
    ["foodie",     "germaphobe",  22, "{b} watches {a} eat a mayo sandwich in HORROR!"],
    ["foodie",     "baby",        8,  "{b} wants {a}'s food. Tantrum incoming!"],
    ["foodie",     "yogi",        10, "{a}'s garlic bread violates {b}'s aura!"],
    ["foodie",     "foodie",     -5,  "{a} and {b} swap snacks! Food friends!"],
    ["dj",         "professor",   16, "{a}'s bass drops keep interrupting {b}!"],
    ["dj",         "baby",        14, "The beat makes {b} cry louder!"],
    ["dj",         "yogi",        16, "{a}'s dubstep destroys {b}'s inner peace!"],
    ["dj",         "drama",      -8,  "{b} starts dancing to {a}'s playlist!"],
    ["dj",         "gamer",      -4,  "{a}'s music syncs with {b}'s game perfectly!"],
    ["cat",        "dog",         25, "{a}'s cats and {b}'s dog start a WAR!"],
    ["cat",        "germaphobe",  14, "{b} discovers cat hair on EVERYTHING!"],
    ["cat",        "baby",       -6,  "{b} is mesmerized by {a}'s cats!"],
    ["cat",        "mime",        6,  "{a}'s cat tries to catch {b}'s invisible ball!"],
    ["dog",        "germaphobe",  12, "{b} is being LICKED by {a}'s dog!"],
    ["dog",        "baby",       -5,  "{b} giggles at {a}'s dog!"],
    ["dog",        "yogi",        8,  "{a}'s dog keeps interrupting {b}'s poses!"],
    ["germaphobe", "baby",        12, "{a} is terrified of {b}'s sticky hands!"],
    ["germaphobe", "clown",       14, "{a} doesn't trust {b}'s balloon hygiene!"],
    ["knitter",    "baby",       -12, "{a} knits a tiny hat for {b}! Adorable!"],
    ["knitter",    "drama",      -8,  "{a}'s calm energy mellows {b} out!"],
    ["knitter",    "professor",  -6,  "{a} and {b} enjoy peaceful silence together!"],
    ["knitter",    "yogi",       -10, "{a} and {b} radiate pure tranquility!"],
    ["knitter",    "conspiracy",  -4, "{a} listens politely to {b}'s theories!"],
    ["conspiracy", "tourist",     10, "{b} starts filming {a}'s rant. Goes viral!"],
    ["conspiracy", "professor",   12, "{a} debates flat earth with {b}. It's heated!"],
    ["conspiracy", "grandma",     8,  "{a} convinces {b} about lizard people!"],
    ["tourist",    "professor",   10, "Flash photo blinds {b} mid-sentence!"],
    ["tourist",    "yogi",        12, "{a}'s flash interrupts {b}'s meditation!"],
    ["tourist",    "mime",        -6, "{a} is DELIGHTED by {b}'s performance!"],
    ["tourist",    "baby",        8,  "{a}'s flash makes {b} cry!"],
    ["baby",       "drama",       16, "{b} CANNOT handle {a}'s crying!"],
    ["baby",       "clown",      -10, "{b} makes {a} laugh with balloon animals!"],
    ["baby",       "grandma",    -8,  "{b} tells {a} a bedtime story!"],
    ["drama",      "drama",       20, "Two {a}s having a drama-off. Bus trembles!"],
    ["drama",      "mime",        10, "{a} screams at {b} for being creepy!"],
    ["drama",      "clown",       8,  "{b}'s pie-in-face bit was NOT funny to {a}!"],
    ["yogi",       "yogi",       -12, "{a} and {b} achieve bus nirvana!"],
    ["clown",      "professor",   10, "{b} does NOT appreciate the whoopee cushion!"],
    ["clown",      "grandma",    -5,  "{b} LOVES {a}'s jokes! Reminds her of vaudeville!"],
    ["gamer",      "baby",        8,  "{b} keeps grabbing {a}'s controller!"],
    ["gamer",      "professor",   6,  "{a}'s button mashing annoys {b}!"],
    ["gamer",      "grandma",     6,  "{b} asks {a} to explain Fortnite. It's painful."],
    ["grandma",    "professor",   10, "{a}'s speakerphone call drowns out {b}!"],
    ["grandma",    "yogi",        10, "{a}'s ringtone breaks {b}'s trance!"],
    ["grandma",    "baby",       -6,  "{a} expertly soothes {b}! Grandma magic!"],
    ["mime",       "mime",       -8,  "Two {a}s perform a silent duet. Beautiful!"],
    ["mime",       "yogi",       -6,  "{a} and {b} appreciate the silence!"]
  ]

  // ─── Solo events (random per-passenger events) ─────────────
  var SOLO_EVENTS = [
    ["snorer",     8,  "{p} starts snoring at 90 decibels!"],
    ["snorer",    -2,  "{p} mumbles something adorable in their sleep!"],
    ["baby",       10, "{p} starts crying for no reason!"],
    ["baby",      -4,  "{p} giggles at absolutely nothing! Cute!"],
    ["drama",      8,  "{p} gasps dramatically at a pothole!"],
    ["dj",         6,  "{p} cranks the volume to 11!"],
    ["tourist",    4,  "{p} takes a selfie with the bus driver!"],
    ["clown",     -4,  "{p} makes a balloon giraffe! Delightful!"],
    ["clown",      6,  "{p}'s whoopee cushion goes off!"],
    ["conspiracy", 6,  "{p} starts a TED talk about chemtrails!"],
    ["grandma",    6,  "{p}'s phone BLASTS a soap opera!"],
    ["gamer",      4,  "{p} yells 'NO NO NO!' at their game!"],
    ["mime",       4,  "{p} pretends to be stuck in a box. Eerie."],
    ["foodie",     4,  "{p} opens a durian fruit. THE SMELL."],
    ["cat",        4,  "One of {p}'s cats escapes the bag!"],
    ["dog",        4,  "{p}'s dog barks at a squirrel outside!"],
    ["germaphobe", 4,  "{p} sprays Lysol everywhere!"],
    ["yogi",      -6,  "{p}'s meditation creates a pocket of peace!"],
    ["knitter",   -6,  "{p} finishes a beautiful scarf! So calming!"]
  ]

  // ─── Game State ────────────────────────────────────────────
  var STATE_TITLE = 0
  var STATE_SEATING = 1
  var STATE_SIMULATION = 2
  var STATE_RESULTS = 3
  var STATE_GAMEOVER = 4

  var state = STATE_TITLE
  var round = 0
  var totalScore = 0
  var chaos = 0
  var rideTimer = 0
  var eventTimer = 0
  var selectedPassenger = -1
  var passengers = []     // current round's passenger pool
  var seats = []          // array of TOTAL_SEATS, each null or passenger object
  var events = []         // {text, timer, chaos, x, y}
  var shakeMap = {}       // seatIndex → shake timer
  var glowMap = {}        // seatIndex → {timer, color}
  var hoverSeat = -1
  var hoverCard = -1
  var hoverButton = false
  var lastTime = 0
  var titleBounce = 0
  var busBounceX = 0
  var busBounceY = 0
  var busBounceTimer = 0
  var resultStars = 0
  var particles = []

  // ─── Helpers ───────────────────────────────────────────────
  function rand(a, b) { return a + Math.random() * (b - a) }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)) }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
  function shuffle(arr) {
    var a = arr.slice()
    for (var i = a.length - 1; i > 0; i--) {
      var j = randInt(0, i)
      var t = a[i]; a[i] = a[j]; a[j] = t
    }
    return a
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
  function lerp(a, b, t) { return a + (b - a) * t }

  // ─── Layout Calculation ────────────────────────────────────
  // Returns all layout rects relative to current canvas size
  function getLayout() {
    var scale = Math.min(W / 800, H / 760)
    var busW = 260 * scale
    var busH = 400 * scale
    var busX = (W - busW) / 2
    var busY = 55 * scale
    var seatW = 80 * scale
    var seatH = 70 * scale
    var aisleW = 30 * scale
    var padX = (busW - seatW * 2 - aisleW) / 2
    var padY = 30 * scale
    var rowGap = 10 * scale

    var seatRects = []
    for (var r = 0; r < BUS_ROWS; r++) {
      for (var c = 0; c < BUS_COLS; c++) {
        var sx = busX + padX + c * (seatW + aisleW)
        var sy = busY + padY + r * (seatH + rowGap)
        seatRects.push({ x: sx, y: sy, w: seatW, h: seatH, row: r, col: c })
      }
    }

    var cardW = 120 * scale
    var cardH = 130 * scale
    var cardGap = 12 * scale
    var totalCardW = passengers.length * (cardW + cardGap) - cardGap
    var cardStartX = (W - totalCardW) / 2
    var cardY = busY + busH + 24 * scale

    var cardRects = []
    for (var i = 0; i < passengers.length; i++) {
      cardRects.push({
        x: cardStartX + i * (cardW + cardGap),
        y: cardY,
        w: cardW,
        h: cardH
      })
    }

    var btnW = 180 * scale
    var btnH = 48 * scale
    var btnX = (W - btnW) / 2
    var btnY = cardY + cardH + 20 * scale

    return {
      scale: scale,
      busX: busX, busY: busY, busW: busW, busH: busH,
      seatRects: seatRects,
      cardRects: cardRects,
      seatW: seatW, seatH: seatH,
      cardW: cardW, cardH: cardH,
      aisleW: aisleW, padX: padX,
      btnX: btnX, btnY: btnY, btnW: btnW, btnH: btnH
    }
  }

  // ─── Round Setup ───────────────────────────────────────────
  function passengerCount() {
    return Math.min(4 + round, TOTAL_SEATS)
  }

  function startRound() {
    state = STATE_SEATING
    chaos = 0
    rideTimer = 0
    eventTimer = 0
    selectedPassenger = -1
    events = []
    shakeMap = {}
    glowMap = {}
    hoverSeat = -1
    hoverCard = -1
    hoverButton = false
    particles = []
    seats = []
    for (var i = 0; i < TOTAL_SEATS; i++) seats.push(null)

    var count = passengerCount()
    var pool = shuffle(ARCHETYPES)
    passengers = []
    for (var j = 0; j < count; j++) {
      passengers.push({
        archetype: pool[j % pool.length],
        placed: false,
        seatIndex: -1
      })
    }
  }

  // ─── Adjacency ─────────────────────────────────────────────
  function getAdjacent(seatIdx) {
    var row = Math.floor(seatIdx / BUS_COLS)
    var col = seatIdx % BUS_COLS
    var adj = []
    // Same row, other column (seat neighbor)
    if (col === 0) adj.push(seatIdx + 1)
    if (col === 1) adj.push(seatIdx - 1)
    // Row in front
    if (row > 0) {
      adj.push((row - 1) * BUS_COLS + col)
    }
    // Row behind
    if (row < BUS_ROWS - 1) {
      adj.push((row + 1) * BUS_COLS + col)
    }
    return adj
  }

  // ─── Simulation Logic ──────────────────────────────────────
  function allPlaced() {
    for (var i = 0; i < passengers.length; i++) {
      if (!passengers[i].placed) return false
    }
    return true
  }

  function startRide() {
    state = STATE_SIMULATION
    rideTimer = 0
    eventTimer = 0
    events = []
    sfxStart()
  }

  function addEvent(text, chaosChange, seatIdx) {
    var layout = getLayout()
    var ex, ey
    if (seatIdx >= 0 && seatIdx < layout.seatRects.length) {
      var r = layout.seatRects[seatIdx]
      ex = r.x + r.w / 2
      ey = r.y
    } else {
      ex = W / 2
      ey = H / 3
    }
    events.push({
      text: text,
      timer: 3.5,
      chaos: chaosChange,
      x: ex + rand(-20, 20),
      y: ey - 20 * layout.scale + rand(-10, 10),
      alpha: 1
    })

    chaos = clamp(chaos + chaosChange, 0, MAX_CHAOS)
    if (chaosChange > 0) {
      sfxChaos()
      if (seatIdx >= 0) shakeMap[seatIdx] = 0.4
      // Shake adjacent seats for big chaos
      if (chaosChange >= 15 && seatIdx >= 0) {
        var adj = getAdjacent(seatIdx)
        for (var i = 0; i < adj.length; i++) {
          if (seats[adj[i]]) shakeMap[adj[i]] = 0.2
        }
      }
    } else if (chaosChange < 0) {
      sfxCalm()
      if (seatIdx >= 0) glowMap[seatIdx] = { timer: 0.6, color: CHAOS_LOW }
    }

    // Spawn particles
    for (var p = 0; p < 5; p++) {
      particles.push({
        x: ex, y: ey,
        vx: rand(-80, 80), vy: rand(-100, -20),
        life: rand(0.5, 1.2),
        maxLife: 1.2,
        color: chaosChange > 0 ? pick(["#ff6644", "#ff4466", "#ffaa22"]) : pick(["#44ff88", "#44ddff", "#88ff44"]),
        size: rand(2, 5) * layout.scale
      })
    }
  }

  function checkInteractions() {
    var checked = {}
    for (var i = 0; i < TOTAL_SEATS; i++) {
      if (!seats[i]) continue
      var adj = getAdjacent(i)
      for (var a = 0; a < adj.length; a++) {
        var j = adj[a]
        if (!seats[j]) continue
        var key = Math.min(i, j) + "," + Math.max(i, j)
        if (checked[key]) continue
        checked[key] = true

        var tA = seats[i].archetype.trait
        var tB = seats[j].archetype.trait

        for (var r = 0; r < INTERACTIONS.length; r++) {
          var rule = INTERACTIONS[r]
          var match = false
          var nameA, nameB, primary
          if (rule[0] === tA && rule[1] === tB) {
            match = true; nameA = seats[i].archetype.name; nameB = seats[j].archetype.name; primary = i
          } else if (rule[0] === tB && rule[1] === tA) {
            match = true; nameA = seats[j].archetype.name; nameB = seats[i].archetype.name; primary = j
          }
          if (match && Math.random() < 0.35) {
            var msg = rule[3].replace("{a}", nameA).replace("{b}", nameB)
            addEvent(msg, rule[2], primary)
          }
        }
      }
    }
  }

  function checkSoloEvents() {
    for (var i = 0; i < TOTAL_SEATS; i++) {
      if (!seats[i]) continue
      var trait = seats[i].archetype.trait
      for (var r = 0; r < SOLO_EVENTS.length; r++) {
        if (SOLO_EVENTS[r][0] === trait && Math.random() < 0.15) {
          var msg = SOLO_EVENTS[r][2].replace("{p}", seats[i].archetype.name)
          addEvent(msg, SOLO_EVENTS[r][1], i)
          break
        }
      }
    }
  }

  function calculateScore() {
    var calm = MAX_CHAOS - chaos
    var base = Math.max(0, Math.round(calm * 10))
    var roundBonus = round * 50
    return base + roundBonus
  }

  function getStarRating() {
    if (chaos <= 20) return 3
    if (chaos <= 50) return 2
    if (chaos < MAX_CHAOS) return 1
    return 0
  }

  // ─── Drawing Helpers ───────────────────────────────────────
  function roundRect(x, y, w, h, r) {
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
  }

  function drawText(text, x, y, font, color, align, maxW) {
    ctx.save()
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = align || "center"
    ctx.textBaseline = "middle"
    if (maxW) {
      ctx.fillText(text, x, y, maxW)
    } else {
      ctx.fillText(text, x, y)
    }
    ctx.restore()
  }

  function drawShadowText(text, x, y, font, color, shadowColor, blur) {
    ctx.save()
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.shadowColor = shadowColor
    ctx.shadowBlur = blur || 10
    ctx.fillText(text, x, y)
    ctx.restore()
  }

  // ─── Draw Title Screen ────────────────────────────────────
  function drawTitle(dt) {
    titleBounce += dt * 2
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    var scale = Math.min(W / 800, H / 700)

    // Bus emoji
    var busSize = 80 * scale
    drawText("\uD83D\uDE8C", W / 2, H * 0.28 + Math.sin(titleBounce) * 8, Math.round(busSize) + "px sans-serif", TEXT_WHITE)

    // Title
    var titleSize = Math.round(48 * scale)
    drawShadowText("SEAT THE WEIRDOS", W / 2, H * 0.42, "bold " + titleSize + "px sans-serif", TITLE_COLOR, "#ff8800", 20)

    // Subtitle
    var subSize = Math.round(18 * scale)
    drawText("Place quirky passengers. Pray for peace.", W / 2, H * 0.52, subSize + "px sans-serif", SUBTITLE_COLOR)

    // Instructions
    var instrSize = Math.round(14 * scale)
    drawText("\uD83D\uDC46 Click passengers, then click seats to place them", W / 2, H * 0.62, instrSize + "px sans-serif", TEXT_DIM)
    drawText("\uD83C\uDFAF Keep chaos low to survive the ride!", W / 2, H * 0.67, instrSize + "px sans-serif", TEXT_DIM)

    // Start button
    var pulse = 0.9 + Math.sin(titleBounce * 1.5) * 0.1
    var btnW = 220 * scale * pulse
    var btnH = 54 * scale * pulse
    var btnX = (W - btnW) / 2
    var btnY = H * 0.76 - btnH / 2
    roundRect(btnX, btnY, btnW, btnH, 12 * scale)
    ctx.fillStyle = hoverButton ? BUTTON_HOVER : BUTTON_BG
    ctx.fill()
    drawText("START GAME", W / 2, H * 0.76, "bold " + Math.round(20 * scale) + "px sans-serif", BUTTON_TEXT)

    // Version
    drawText("v1.0 \u00B7 OpenArcades", W / 2, H * 0.92, Math.round(11 * scale) + "px sans-serif", TEXT_DIM)
  }

  // ─── Draw Bus ──────────────────────────────────────────────
  function drawBus(layout, dt) {
    var bx = layout.busX + busBounceX
    var by = layout.busY + busBounceY

    // Bus body
    roundRect(bx, by, layout.busW, layout.busH, 16 * layout.scale)
    ctx.fillStyle = BUS_BG
    ctx.fill()
    ctx.strokeStyle = BUS_BORDER
    ctx.lineWidth = 2 * layout.scale
    ctx.stroke()

    // Bus top label
    var labelSize = Math.round(14 * layout.scale)
    drawText("\uD83D\uDE8C Route " + (round + 1), bx + layout.busW / 2, by + 14 * layout.scale, "bold " + labelSize + "px sans-serif", TEXT_DIM)

    // Aisle
    var aisleX = bx + layout.padX + layout.seatW + (layout.aisleW / 2 - 2)
    ctx.fillStyle = AISLE_COLOR
    ctx.fillRect(aisleX - layout.aisleW / 2, by + 24 * layout.scale, layout.aisleW, layout.busH - 40 * layout.scale)

    // Row numbers
    for (var r = 0; r < BUS_ROWS; r++) {
      var ry = layout.seatRects[r * BUS_COLS].y + layout.seatH / 2
      var numSize = Math.round(10 * layout.scale)
      drawText("" + (r + 1), aisleX, ry, numSize + "px sans-serif", TEXT_DIM)
    }
  }

  // ─── Draw Seat ─────────────────────────────────────────────
  function drawSeat(idx, layout, dt) {
    var rect = layout.seatRects[idx]
    var passenger = seats[idx]
    var shake = shakeMap[idx] || 0
    var glow = glowMap[idx]
    var sx = rect.x + busBounceX
    var sy = rect.y + busBounceY

    if (shake > 0) {
      sx += rand(-3, 3) * layout.scale
      sy += rand(-2, 2) * layout.scale
    }

    // Seat background
    var bg = SEAT_EMPTY
    if (passenger) {
      bg = SEAT_PLACED
    } else if (state === STATE_SEATING && idx === hoverSeat && selectedPassenger >= 0) {
      bg = SEAT_HOVER
    }

    roundRect(sx, sy, rect.w, rect.h, 8 * layout.scale)
    ctx.fillStyle = bg
    ctx.fill()

    // Glow effect
    if (glow && glow.timer > 0) {
      ctx.save()
      ctx.globalAlpha = glow.timer
      roundRect(sx - 2, sy - 2, rect.w + 4, rect.h + 4, 10 * layout.scale)
      ctx.strokeStyle = glow.color
      ctx.lineWidth = 3 * layout.scale
      ctx.stroke()
      ctx.restore()
    }

    if (passenger) {
      // Draw passenger emoji
      var emojiSize = Math.round(28 * layout.scale)
      drawText(passenger.archetype.emoji, sx + rect.w / 2, sy + rect.h * 0.38, emojiSize + "px sans-serif", TEXT_WHITE)

      // Draw name
      var nameSize = Math.round(9 * layout.scale)
      drawText(passenger.archetype.name, sx + rect.w / 2, sy + rect.h * 0.72, nameSize + "px sans-serif", TEXT_WHITE, "center", rect.w - 4)

      // Trait color indicator
      ctx.fillStyle = passenger.archetype.color
      ctx.globalAlpha = 0.6
      ctx.fillRect(sx + 4 * layout.scale, sy + rect.h - 6 * layout.scale, rect.w - 8 * layout.scale, 3 * layout.scale)
      ctx.globalAlpha = 1
    } else if (state === STATE_SEATING) {
      // Empty seat indicator
      var col = idx % BUS_COLS
      var label = col === 0 ? "Window" : "Aisle"
      var labelSize2 = Math.round(9 * layout.scale)
      drawText(label, sx + rect.w / 2, sy + rect.h / 2, labelSize2 + "px sans-serif", TEXT_DIM)
    }
  }

  // ─── Draw Passenger Card ───────────────────────────────────
  function drawCard(idx, layout) {
    var p = passengers[idx]
    var rect = layout.cardRects[idx]
    if (!rect) return
    var isSelected = idx === selectedPassenger
    var isHover = idx === hoverCard
    var isPlaced = p.placed

    var alpha = isPlaced ? 0.4 : 1
    ctx.save()
    ctx.globalAlpha = alpha

    // Card bg
    roundRect(rect.x, rect.y, rect.w, rect.h, 10 * layout.scale)
    ctx.fillStyle = isSelected ? CARD_SELECTED : CARD_BG
    ctx.fill()
    if (isSelected || isHover) {
      ctx.strokeStyle = isSelected ? p.archetype.color : CARD_BORDER
      ctx.lineWidth = 2 * layout.scale
      ctx.stroke()
    }

    // Emoji
    var emojiSize = Math.round(32 * layout.scale)
    drawText(p.archetype.emoji, rect.x + rect.w / 2, rect.y + 30 * layout.scale, emojiSize + "px sans-serif", TEXT_WHITE)

    // Name
    var nameSize = Math.round(10 * layout.scale)
    drawText(p.archetype.name, rect.x + rect.w / 2, rect.y + 60 * layout.scale, "bold " + nameSize + "px sans-serif", p.archetype.color, "center", rect.w - 8)

    // Description
    var descSize = Math.round(8 * layout.scale)
    wrapText(p.archetype.desc, rect.x + rect.w / 2, rect.y + 78 * layout.scale, rect.w - 12 * layout.scale, 11 * layout.scale, descSize + "px sans-serif", TEXT_DIM)

    if (isPlaced) {
      drawText("\u2713 Seated", rect.x + rect.w / 2, rect.y + rect.h - 14 * layout.scale, Math.round(10 * layout.scale) + "px sans-serif", CHAOS_LOW)
    }

    ctx.restore()
  }

  function wrapText(text, x, y, maxW, lineH, font, color) {
    ctx.save()
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    var words = text.split(" ")
    var line = ""
    var ly = y
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + " "
      if (ctx.measureText(test).width > maxW && line.length > 0) {
        ctx.fillText(line.trim(), x, ly)
        line = words[i] + " "
        ly += lineH
      } else {
        line = test
      }
    }
    if (line.trim().length > 0) ctx.fillText(line.trim(), x, ly)
    ctx.restore()
  }

  // ─── Draw Chaos Meter ──────────────────────────────────────
  function drawChaosMeter(layout) {
    var mw = 200 * layout.scale
    var mh = 20 * layout.scale
    var mx = W - mw - 20 * layout.scale
    var my = 14 * layout.scale

    // Label
    var labelSize = Math.round(12 * layout.scale)
    drawText("CHAOS", mx - 40 * layout.scale, my + mh / 2, "bold " + labelSize + "px sans-serif", TEXT_DIM, "center")

    // Background
    roundRect(mx, my, mw, mh, 6 * layout.scale)
    ctx.fillStyle = "#1a1a2e"
    ctx.fill()
    ctx.strokeStyle = BUS_BORDER
    ctx.lineWidth = 1
    ctx.stroke()

    // Fill
    var pct = chaos / MAX_CHAOS
    var color = pct < 0.4 ? CHAOS_LOW : pct < 0.7 ? CHAOS_MID : CHAOS_HIGH
    if (pct > 0) {
      roundRect(mx + 2, my + 2, (mw - 4) * pct, mh - 4, 4 * layout.scale)
      ctx.fillStyle = color
      ctx.fill()
    }

    // Percentage
    var pctSize = Math.round(10 * layout.scale)
    drawText(Math.round(chaos) + "%", mx + mw / 2, my + mh / 2, "bold " + pctSize + "px sans-serif", TEXT_WHITE)
  }

  // ─── Draw HUD ──────────────────────────────────────────────
  function drawHUD(layout) {
    var hudSize = Math.round(14 * layout.scale)
    drawText("Round " + (round + 1), 20 * layout.scale, 24 * layout.scale, "bold " + hudSize + "px sans-serif", TEXT_WHITE, "left")
    drawText("Score: " + totalScore, 20 * layout.scale, 44 * layout.scale, hudSize + "px sans-serif", SUBTITLE_COLOR, "left")
    drawChaosMeter(layout)
  }

  // ─── Draw Events ───────────────────────────────────────────
  function drawEvents(dt) {
    for (var i = events.length - 1; i >= 0; i--) {
      var e = events[i]
      e.timer -= dt
      e.y -= 18 * dt
      e.alpha = clamp(e.timer / 1.5, 0, 1)
      if (e.timer <= 0) {
        events.splice(i, 1)
        continue
      }

      ctx.save()
      ctx.globalAlpha = e.alpha
      var fontSize = Math.round(11 * Math.min(W / 800, H / 700))
      ctx.font = "bold " + fontSize + "px sans-serif"
      var tw = ctx.measureText(e.text).width + 16
      var th = fontSize + 10
      roundRect(e.x - tw / 2, e.y - th / 2, tw, th, 6)
      ctx.fillStyle = e.chaos > 0 ? "rgba(180,40,40,0.85)" : "rgba(40,140,80,0.85)"
      ctx.fill()
      ctx.fillStyle = TEXT_WHITE
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(e.text, e.x, e.y, W - 20)
      ctx.restore()
    }
  }

  // ─── Draw Particles ────────────────────────────────────────
  function drawParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i]
      p.life -= dt
      if (p.life <= 0) { particles.splice(i, 1); continue }
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 120 * dt

      ctx.save()
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  // ─── Draw Ride Progress ────────────────────────────────────
  function drawRideProgress(layout) {
    var pw = 200 * layout.scale
    var ph = 8 * layout.scale
    var px = (W - pw) / 2
    var py = layout.busY + layout.busH + 10 * layout.scale

    roundRect(px, py, pw, ph, 4)
    ctx.fillStyle = "#1a1a2e"
    ctx.fill()

    var pct = clamp(rideTimer / RIDE_DURATION, 0, 1)
    if (pct > 0) {
      roundRect(px + 1, py + 1, (pw - 2) * pct, ph - 2, 3)
      ctx.fillStyle = SUBTITLE_COLOR
      ctx.fill()
    }

    var labelSize = Math.round(10 * layout.scale)
    drawText("Ride: " + Math.round(pct * 100) + "%", W / 2, py + ph + 12 * layout.scale, labelSize + "px sans-serif", TEXT_DIM)
  }

  // ─── Draw Start Ride Button ────────────────────────────────
  function drawStartButton(layout) {
    if (!allPlaced()) return

    var pulse = 0.95 + Math.sin(Date.now() / 200) * 0.05
    var bw = layout.btnW * pulse
    var bh = layout.btnH * pulse
    var bx = layout.btnX + (layout.btnW - bw) / 2
    var by = layout.btnY + (layout.btnH - bh) / 2

    roundRect(bx, by, bw, bh, 10 * layout.scale)
    ctx.fillStyle = hoverButton ? BUTTON_HOVER : BUTTON_BG
    ctx.fill()

    var fontSize = Math.round(16 * layout.scale)
    drawText("\uD83D\uDE80 START RIDE!", (bx + bw / 2), (by + bh / 2), "bold " + fontSize + "px sans-serif", BUTTON_TEXT)
  }

  // ─── Draw Seating Phase ────────────────────────────────────
  function drawSeating(dt) {
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    var layout = getLayout()
    drawHUD(layout)
    drawBus(layout, dt)

    for (var i = 0; i < TOTAL_SEATS; i++) {
      drawSeat(i, layout, dt)
    }

    // Instruction
    var instrSize = Math.round(12 * layout.scale)
    if (selectedPassenger >= 0) {
      drawText("\uD83D\uDC46 Now click a seat to place " + passengers[selectedPassenger].archetype.name, W / 2, layout.busY + layout.busH + 12 * layout.scale, instrSize + "px sans-serif", SUBTITLE_COLOR)
    } else if (!allPlaced()) {
      drawText("\uD83D\uDC47 Select a passenger below, then click a seat", W / 2, layout.busY + layout.busH + 12 * layout.scale, instrSize + "px sans-serif", TEXT_DIM)
    }

    for (var j = 0; j < passengers.length; j++) {
      drawCard(j, layout)
    }

    drawStartButton(layout)
  }

  // ─── Draw Simulation Phase ─────────────────────────────────
  function drawSimulation(dt) {
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    var layout = getLayout()
    drawHUD(layout)

    // Bus bounce during chaos
    busBounceTimer += dt
    if (chaos > 50) {
      var intensity = (chaos - 50) / 50 * 2 * layout.scale
      busBounceX = Math.sin(busBounceTimer * 12) * intensity
      busBounceY = Math.cos(busBounceTimer * 8) * intensity * 0.5
    } else {
      busBounceX = lerp(busBounceX, 0, dt * 4)
      busBounceY = lerp(busBounceY, 0, dt * 4)
    }

    drawBus(layout, dt)

    for (var i = 0; i < TOTAL_SEATS; i++) {
      drawSeat(i, layout, dt)
    }

    drawRideProgress(layout)
    drawEvents(dt)
    drawParticles(dt)

    // Update shake/glow timers
    for (var s in shakeMap) {
      shakeMap[s] -= dt
      if (shakeMap[s] <= 0) delete shakeMap[s]
    }
    for (var g in glowMap) {
      glowMap[g].timer -= dt
      if (glowMap[g].timer <= 0) delete glowMap[g]
    }
  }

  // ─── Draw Results Screen ───────────────────────────────────
  function drawResults(dt) {
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    var scale = Math.min(W / 800, H / 700)
    titleBounce += dt * 2

    // Title
    var titleSize = Math.round(36 * scale)
    drawShadowText("RIDE COMPLETE!", W / 2, H * 0.18, "bold " + titleSize + "px sans-serif", CHAOS_LOW, "#00ff88", 15)

    // Stars
    var starSize = Math.round(40 * scale)
    var stars = ""
    for (var i = 0; i < 3; i++) {
      stars += i < resultStars ? "\u2B50" : "\u2606"
    }
    drawText(stars, W / 2, H * 0.30, starSize + "px sans-serif", TITLE_COLOR)

    // Stats
    var statSize = Math.round(16 * scale)
    drawText("Chaos Level: " + Math.round(chaos) + "%", W / 2, H * 0.42, statSize + "px sans-serif", chaos < 40 ? CHAOS_LOW : chaos < 70 ? CHAOS_MID : CHAOS_HIGH)

    var roundScore = calculateScore()
    drawText("Round Score: +" + roundScore, W / 2, H * 0.50, statSize + "px sans-serif", SUBTITLE_COLOR)
    drawText("Total Score: " + totalScore, W / 2, H * 0.58, "bold " + Math.round(20 * scale) + "px sans-serif", TITLE_COLOR)

    // Funny comment
    var comment = ""
    if (resultStars === 3) comment = pick(["Flawless ride! Are you a bus whisperer?", "The passengers actually THANKED you!", "Not a single complaint. Legendary.", "Peak bus harmony. \u2728"])
    else if (resultStars === 2) comment = pick(["Pretty smooth! Only minor incidents.", "Mostly peaceful. The bus survived!", "Could be worse. The cat only hissed twice.", "Decent vibes overall!"])
    else comment = pick(["Well... the bus made it. Barely.", "Multiple complaints were filed.", "The driver is requesting hazard pay.", "Chaos reigned. But you lived!"])
    var commentSize = Math.round(13 * scale)
    drawText(comment, W / 2, H * 0.68, commentSize + "px sans-serif", TEXT_DIM)

    // Next round button
    var pulse = 0.95 + Math.sin(titleBounce * 1.5) * 0.05
    var btnW = 220 * scale * pulse
    var btnH = 50 * scale * pulse
    var btnX = (W - btnW) / 2
    var btnY = H * 0.78 - btnH / 2
    roundRect(btnX, btnY, btnW, btnH, 12 * scale)
    ctx.fillStyle = hoverButton ? BUTTON_HOVER : BUTTON_BG
    ctx.fill()
    drawText("NEXT ROUND \u2192", W / 2, H * 0.78, "bold " + Math.round(18 * scale) + "px sans-serif", BUTTON_TEXT)
  }

  // ─── Draw Game Over Screen ─────────────────────────────────
  function drawGameOver(dt) {
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    var scale = Math.min(W / 800, H / 700)
    titleBounce += dt * 2

    // Title
    var titleSize = Math.round(40 * scale)
    drawShadowText("BUS BREAKDOWN!", W / 2, H * 0.18, "bold " + titleSize + "px sans-serif", CHAOS_HIGH, "#ff4444", 20)

    // Chaos explosion emoji
    var emojiSize = Math.round(60 * scale)
    drawText("\uD83D\uDE31\uD83D\uDE8C\uD83D\uDCA5", W / 2, H * 0.32, emojiSize + "px sans-serif", TEXT_WHITE)

    // Stats
    var statSize = Math.round(16 * scale)
    drawText("Maximum chaos reached!", W / 2, H * 0.44, statSize + "px sans-serif", CHAOS_HIGH)
    drawText("You survived " + round + " round" + (round !== 1 ? "s" : ""), W / 2, H * 0.52, statSize + "px sans-serif", TEXT_DIM)

    var scoreSize = Math.round(24 * scale)
    drawText("Final Score: " + totalScore, W / 2, H * 0.62, "bold " + scoreSize + "px sans-serif", TITLE_COLOR)

    // Funny game over message
    var msg = pick([
      "The bus driver quit on the spot.",
      "Someone called the authorities.",
      "The bus itself filed a complaint.",
      "All passengers are writing Yelp reviews.",
      "The cats and dog have formed an alliance. Against you.",
      "The snoring was heard three blocks away."
    ])
    var msgSize = Math.round(13 * scale)
    drawText(msg, W / 2, H * 0.72, msgSize + "px sans-serif", TEXT_DIM)

    // Restart button
    var pulse = 0.95 + Math.sin(titleBounce * 1.5) * 0.05
    var btnW = 220 * scale * pulse
    var btnH = 50 * scale * pulse
    var btnX = (W - btnW) / 2
    var btnY = H * 0.82 - btnH / 2
    roundRect(btnX, btnY, btnW, btnH, 12 * scale)
    ctx.fillStyle = hoverButton ? "#cc4444" : "#aa3333"
    ctx.fill()
    drawText("\uD83D\uDD04 TRY AGAIN", W / 2, H * 0.82, "bold " + Math.round(18 * scale) + "px sans-serif", BUTTON_TEXT)
  }

  // ─── Tooltip ───────────────────────────────────────────────
  function drawTooltip(layout) {
    if (state !== STATE_SEATING) return
    if (hoverSeat < 0) return
    var passenger = seats[hoverSeat]
    if (!passenger) return

    var rect = layout.seatRects[hoverSeat]
    var tx = rect.x + rect.w + 10 * layout.scale + busBounceX
    var ty = rect.y + busBounceY
    var tw = 160 * layout.scale
    var th = 70 * layout.scale

    // Keep tooltip on screen
    if (tx + tw > W) tx = rect.x - tw - 10 * layout.scale + busBounceX

    ctx.save()
    ctx.globalAlpha = 0.95
    roundRect(tx, ty, tw, th, 8 * layout.scale)
    ctx.fillStyle = "#2a2a4a"
    ctx.fill()
    ctx.strokeStyle = passenger.archetype.color
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.globalAlpha = 1

    var nameSize = Math.round(11 * layout.scale)
    drawText(passenger.archetype.emoji + " " + passenger.archetype.name, tx + tw / 2, ty + 16 * layout.scale, "bold " + nameSize + "px sans-serif", passenger.archetype.color)

    var descSize = Math.round(9 * layout.scale)
    wrapText(passenger.archetype.desc, tx + tw / 2, ty + 30 * layout.scale, tw - 12, 12 * layout.scale, descSize + "px sans-serif", TEXT_DIM)

    var hintSize = Math.round(8 * layout.scale)
    drawText("Click to remove", tx + tw / 2, ty + th - 10 * layout.scale, hintSize + "px sans-serif", "#ff8888")
    ctx.restore()
  }

  // ─── Main Update ───────────────────────────────────────────
  function update(dt) {
    if (state === STATE_SIMULATION) {
      rideTimer += dt
      eventTimer += dt

      // Trigger interactions periodically
      if (eventTimer >= EVENT_INTERVAL) {
        eventTimer -= EVENT_INTERVAL
        checkInteractions()
        // Solo events less frequently
        if (Math.random() < 0.4) checkSoloEvents()
      }

      // Check game over
      if (chaos >= MAX_CHAOS) {
        state = STATE_GAMEOVER
        sfxGameOver()
        return
      }

      // Check ride complete
      if (rideTimer >= RIDE_DURATION) {
        resultStars = getStarRating()
        totalScore += calculateScore()
        state = STATE_RESULTS
        sfxWin()
        return
      }
    }
  }

  // ─── Main Draw ─────────────────────────────────────────────
  function draw(dt) {
    switch (state) {
      case STATE_TITLE:
        drawTitle(dt)
        break
      case STATE_SEATING:
        drawSeating(dt)
        drawTooltip(getLayout())
        break
      case STATE_SIMULATION:
        drawSimulation(dt)
        break
      case STATE_RESULTS:
        drawResults(dt)
        break
      case STATE_GAMEOVER:
        drawGameOver(dt)
        break
    }
  }

  // ─── Game Loop ─────────────────────────────────────────────
  function loop(time) {
    requestAnimationFrame(loop)
    if (!lastTime) { lastTime = time; return }
    var dt = Math.min(time - lastTime, MAX_DELTA) / 1000
    lastTime = time
    update(dt)
    draw(dt)
  }
  requestAnimationFrame(loop)

  // ─── Input Handling ────────────────────────────────────────
  var mouseX = 0, mouseY = 0

  function getMousePos(e) {
    var rect = canvas.getBoundingClientRect()
    var scaleX = canvas.width / rect.width
    var scaleY = canvas.height / rect.height
    if (e.touches && e.touches.length > 0) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function hitTest(x, y, rx, ry, rw, rh) {
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh
  }

  function handleMove(e) {
    var pos = getMousePos(e)
    mouseX = pos.x
    mouseY = pos.y

    hoverSeat = -1
    hoverCard = -1
    hoverButton = false

    if (state === STATE_SEATING) {
      var layout = getLayout()
      // Check seats
      for (var i = 0; i < layout.seatRects.length; i++) {
        var sr = layout.seatRects[i]
        if (hitTest(mouseX, mouseY, sr.x, sr.y, sr.w, sr.h)) {
          hoverSeat = i
          break
        }
      }
      // Check cards
      for (var j = 0; j < layout.cardRects.length; j++) {
        var cr = layout.cardRects[j]
        if (hitTest(mouseX, mouseY, cr.x, cr.y, cr.w, cr.h)) {
          hoverCard = j
          break
        }
      }
      // Check start button
      if (allPlaced()) {
        if (hitTest(mouseX, mouseY, layout.btnX, layout.btnY, layout.btnW, layout.btnH)) {
          hoverButton = true
        }
      }
    } else if (state === STATE_TITLE || state === STATE_RESULTS || state === STATE_GAMEOVER) {
      // Check button areas
      var scale = Math.min(W / 800, H / 700)
      var btnW2 = 220 * scale
      var btnH2 = 54 * scale
      var btnX2, btnY2
      if (state === STATE_TITLE) {
        btnX2 = (W - btnW2) / 2; btnY2 = H * 0.76 - btnH2 / 2
      } else if (state === STATE_RESULTS) {
        btnX2 = (W - btnW2) / 2; btnY2 = H * 0.78 - btnH2 / 2
      } else {
        btnX2 = (W - btnW2) / 2; btnY2 = H * 0.82 - btnH2 / 2
      }
      if (hitTest(mouseX, mouseY, btnX2, btnY2, btnW2, btnH2)) {
        hoverButton = true
      }
    }
  }

  function handleClick(e) {
    e.preventDefault()
    initAudio()

    var pos = getMousePos(e)
    mouseX = pos.x
    mouseY = pos.y

    if (state === STATE_TITLE) {
      round = 0
      totalScore = 0
      startRound()
      sfxClick()
      return
    }

    if (state === STATE_SEATING) {
      var layout = getLayout()

      // Check start button
      if (allPlaced() && hitTest(mouseX, mouseY, layout.btnX, layout.btnY, layout.btnW, layout.btnH)) {
        startRide()
        return
      }

      // Check seat click
      for (var i = 0; i < layout.seatRects.length; i++) {
        var sr = layout.seatRects[i]
        if (hitTest(mouseX, mouseY, sr.x, sr.y, sr.w, sr.h)) {
          if (seats[i] && selectedPassenger < 0) {
            // Remove passenger from seat
            var pIdx = -1
            for (var k = 0; k < passengers.length; k++) {
              if (passengers[k].seatIndex === i) { pIdx = k; break }
            }
            if (pIdx >= 0) {
              passengers[pIdx].placed = false
              passengers[pIdx].seatIndex = -1
              seats[i] = null
              sfxRemove()
            }
          } else if (!seats[i] && selectedPassenger >= 0) {
            // Place selected passenger
            seats[i] = passengers[selectedPassenger]
            passengers[selectedPassenger].placed = true
            passengers[selectedPassenger].seatIndex = i
            selectedPassenger = -1
            sfxPlace()
          }
          return
        }
      }

      // Check card click
      for (var j = 0; j < layout.cardRects.length; j++) {
        var cr = layout.cardRects[j]
        if (hitTest(mouseX, mouseY, cr.x, cr.y, cr.w, cr.h)) {
          if (!passengers[j].placed) {
            selectedPassenger = (selectedPassenger === j) ? -1 : j
            sfxClick()
          } else {
            // Clicking a placed card: unplace it
            var seatIdx = passengers[j].seatIndex
            if (seatIdx >= 0) {
              seats[seatIdx] = null
              passengers[j].placed = false
              passengers[j].seatIndex = -1
              selectedPassenger = j
              sfxRemove()
            }
          }
          return
        }
      }

      // Click elsewhere: deselect
      selectedPassenger = -1
      return
    }

    if (state === STATE_RESULTS) {
      round++
      startRound()
      sfxClick()
      return
    }

    if (state === STATE_GAMEOVER) {
      round = 0
      totalScore = 0
      startRound()
      sfxClick()
      return
    }
  }

  canvas.addEventListener("mousemove", handleMove)
  canvas.addEventListener("click", handleClick)
  canvas.addEventListener("touchstart", function(e) { e.preventDefault(); handleClick(e) }, { passive: false })
  canvas.addEventListener("touchmove", function(e) { e.preventDefault(); handleMove(e) }, { passive: false })

  // Prevent context menu
  canvas.addEventListener("contextmenu", function(e) { e.preventDefault() })

})()
