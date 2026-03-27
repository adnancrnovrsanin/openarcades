// Floppy Bird — built with Phaser 3
// A Flappy Bird-inspired arcade game for OpenArcades

(function () {
  // ─── Constants ───────────────────────────────────────────────
  var GRAVITY = 1200;
  var FLAP_VELOCITY = -400;
  var PIPE_SPEED = -200;
  var PIPE_SPACING = 260;
  var PIPE_GAP = 150;
  var PIPE_WIDTH = 52;
  var BIRD_RADIUS = 15;
  var GROUND_HEIGHT = 80;

  // ─── Colors ──────────────────────────────────────────────────
  var SKY_TOP = 0x4ec0ca;
  var SKY_BOTTOM = 0x71c7d1;
  var GROUND_COLOR = 0xded895;
  var GROUND_DARK = 0xd2c475;
  var PIPE_COLOR = 0x73bf2e;
  var PIPE_DARK = 0x558b22;
  var PIPE_LIP_COLOR = 0x5ea823;
  var BIRD_BODY = 0xf5c842;
  var BIRD_BELLY = 0xfae08c;
  var BIRD_WING = 0xf0a830;
  var BIRD_EYE_WHITE = 0xffffff;
  var BIRD_EYE_BLACK = 0x000000;
  var BIRD_BEAK = 0xe87d3e;

  // ─── Menu Scene ──────────────────────────────────────────────
  var MenuScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function MenuScene() {
      Phaser.Scene.call(this, { key: "MenuScene" });
    },

    create: function () {
      var w = this.scale.width;
      var h = this.scale.height;

      this.drawBackground(w, h);
      this.drawGround(w, h);

      // Title
      this.add
        .text(w / 2, h * 0.22, "Floppy Bird", {
          fontFamily: "Arial, sans-serif",
          fontSize: Math.max(36, Math.floor(w * 0.08)) + "px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#2d6e1e",
          strokeThickness: 6,
        })
        .setOrigin(0.5);

      // Bird preview (bobbing)
      this.birdY = h * 0.45;
      this.bird = this.drawBird(w / 2, this.birdY);
      this.bobTime = 0;

      // Prompt
      this.prompt = this.add
        .text(w / 2, h * 0.65, "Tap / Click / Space to Start", {
          fontFamily: "Arial, sans-serif",
          fontSize: Math.max(16, Math.floor(w * 0.035)) + "px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      // Blink the prompt
      this.time.addEvent({
        delay: 600,
        loop: true,
        callback: function () {
          this.prompt.visible = !this.prompt.visible;
        },
        callbackScope: this,
      });

      // Input
      this.input.on("pointerdown", this.startGame, this);
      this.input.keyboard.on("keydown-SPACE", this.startGame, this);

      // Handle resize
      this.scale.on("resize", this.onResize, this);
    },

    update: function (_time, delta) {
      this.bobTime += delta * 0.003;
      var offsetY = Math.sin(this.bobTime) * 10;
      this.bird.forEach(function (obj) {
        obj.y = obj.getData("baseY") + offsetY;
      });
    },

    startGame: function () {
      this.scale.off("resize", this.onResize, this);
      this.scene.start("GameScene");
    },

    onResize: function (gameSize) {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      this.scene.restart();
    },

    drawBackground: function (w, h) {
      var bg = this.add.graphics();
      bg.fillStyle(SKY_TOP);
      bg.fillRect(0, 0, w, h);
    },

    drawGround: function (w, h) {
      var g = this.add.graphics();
      g.fillStyle(GROUND_COLOR);
      g.fillRect(0, h - GROUND_HEIGHT, w, GROUND_HEIGHT);
      g.fillStyle(GROUND_DARK);
      g.fillRect(0, h - GROUND_HEIGHT, w, 4);
    },

    drawBird: function (x, y) {
      var parts = [];
      var g = this.add.graphics();

      // Body
      g.fillStyle(BIRD_BODY);
      g.fillEllipse(x, y, BIRD_RADIUS * 2.2, BIRD_RADIUS * 2);

      // Belly
      g.fillStyle(BIRD_BELLY);
      g.fillEllipse(x + 2, y + 4, BIRD_RADIUS * 1.4, BIRD_RADIUS * 1.2);

      // Wing
      g.fillStyle(BIRD_WING);
      g.fillEllipse(x - 4, y - 2, BIRD_RADIUS * 1.2, BIRD_RADIUS * 0.8);

      // Eye white
      g.fillStyle(BIRD_EYE_WHITE);
      g.fillCircle(x + 8, y - 5, 6);

      // Eye pupil
      g.fillStyle(BIRD_EYE_BLACK);
      g.fillCircle(x + 10, y - 5, 3);

      // Beak
      g.fillStyle(BIRD_BEAK);
      g.fillTriangle(x + 15, y, x + 25, y + 3, x + 15, y + 6);

      g.setData("baseY", y);
      parts.push(g);
      return parts;
    },
  });

  // ─── Game Scene ──────────────────────────────────────────────
  var GameScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function GameScene() {
      Phaser.Scene.call(this, { key: "GameScene" });
    },

    create: function () {
      var w = this.scale.width;
      var h = this.scale.height;
      this.gameW = w;
      this.gameH = h;
      this.groundY = h - GROUND_HEIGHT;
      this.gameOver = false;
      this.score = 0;
      this.started = false;

      // Background
      this.bgGraphics = this.add.graphics();
      this.bgGraphics.fillStyle(SKY_TOP);
      this.bgGraphics.fillRect(0, 0, w, h);

      // Pipes group
      this.pipes = this.add.group();
      this.pipeGraphics = [];

      // Bird physics body (use a zone for collision)
      this.birdX = w * 0.25;
      this.birdBaseY = h * 0.4;
      this.birdY = this.birdBaseY;
      this.birdVelocity = 0;
      this.birdRotation = 0;

      // Draw bird container
      this.birdContainer = this.add.container(this.birdX, this.birdY);
      this.redrawBird();

      // Ground (drawn on top of pipes)
      this.groundGraphics = this.add.graphics();
      this.drawGround();

      // Score text
      this.scoreText = this.add
        .text(w / 2, 50, "0", {
          fontFamily: "Arial, sans-serif",
          fontSize: Math.max(32, Math.floor(w * 0.07)) + "px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(10);

      // "Tap to start" hint
      this.hintText = this.add
        .text(w / 2, h * 0.55, "Tap to Flap!", {
          fontFamily: "Arial, sans-serif",
          fontSize: Math.max(18, Math.floor(w * 0.04)) + "px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(10);

      // Bob bird before first tap
      this.bobTime = 0;

      // Input
      this.input.on("pointerdown", this.flap, this);
      this.input.keyboard.on("keydown-SPACE", this.flap, this);

      // Pipe timer — doesn't start until first flap
      this.pipeTimer = null;

      // Track scored pipes
      this.scoredPipes = new Set();

      // Handle resize
      this.scale.on("resize", this.onResize, this);
    },

    update: function (_time, delta) {
      if (this.gameOver) return;

      var dt = delta / 1000;

      if (!this.started) {
        // Bob the bird gently
        this.bobTime += delta * 0.003;
        this.birdY = this.birdBaseY + Math.sin(this.bobTime) * 10;
        this.birdContainer.y = this.birdY;
        return;
      }

      // Apply gravity
      this.birdVelocity += GRAVITY * dt;
      this.birdY += this.birdVelocity * dt;
      this.birdContainer.y = this.birdY;

      // Bird rotation based on velocity
      var targetAngle = Phaser.Math.Clamp(this.birdVelocity / 400, -0.5, 1.2);
      this.birdRotation += (targetAngle - this.birdRotation) * 0.1;
      this.birdContainer.rotation = this.birdRotation;

      // Moving pipes
      var speed = PIPE_SPEED * dt;
      var self = this;
      this.pipeGraphics.forEach(function (pipe) {
        pipe.x += speed;
      });

      // Check scoring and collisions
      this.checkScoring();
      this.checkCollisions();

      // Clean up off-screen pipes
      this.pipeGraphics = this.pipeGraphics.filter(function (pipe) {
        if (pipe.x < -PIPE_WIDTH - 30) {
          pipe.destroy();
          return false;
        }
        return true;
      });
    },

    flap: function () {
      if (this.gameOver) return;

      if (!this.started) {
        this.started = true;
        if (this.hintText) this.hintText.destroy();

        // Start spawning pipes
        this.spawnPipe();
        this.pipeTimer = this.time.addEvent({
          delay: PIPE_SPACING / Math.abs(PIPE_SPEED / 1000),
          loop: true,
          callback: this.spawnPipe,
          callbackScope: this,
        });
      }

      this.birdVelocity = FLAP_VELOCITY;
    },

    spawnPipe: function () {
      var w = this.gameW;
      var h = this.groundY;
      var minTop = 80;
      var maxTop = h - PIPE_GAP - 80;
      var topHeight = Phaser.Math.Between(minTop, maxTop);
      var bottomY = topHeight + PIPE_GAP;
      var lipHeight = 24;
      var lipExtra = 6;

      var g = this.add.graphics();

      // Top pipe body
      g.fillStyle(PIPE_COLOR);
      g.fillRect(w, 0, PIPE_WIDTH, topHeight);
      // Top pipe dark edge
      g.fillStyle(PIPE_DARK);
      g.fillRect(w, 0, 4, topHeight);
      g.fillRect(w + PIPE_WIDTH - 4, 0, 4, topHeight);
      // Top pipe lip
      g.fillStyle(PIPE_LIP_COLOR);
      g.fillRect(
        w - lipExtra,
        topHeight - lipHeight,
        PIPE_WIDTH + lipExtra * 2,
        lipHeight
      );
      g.fillStyle(PIPE_DARK);
      g.fillRect(
        w - lipExtra,
        topHeight - lipHeight,
        PIPE_WIDTH + lipExtra * 2,
        3
      );

      // Bottom pipe body
      g.fillStyle(PIPE_COLOR);
      g.fillRect(w, bottomY, PIPE_WIDTH, h - bottomY);
      // Bottom pipe dark edge
      g.fillStyle(PIPE_DARK);
      g.fillRect(w, bottomY, 4, h - bottomY);
      g.fillRect(w + PIPE_WIDTH - 4, bottomY, 4, h - bottomY);
      // Bottom pipe lip
      g.fillStyle(PIPE_LIP_COLOR);
      g.fillRect(w - lipExtra, bottomY, PIPE_WIDTH + lipExtra * 2, lipHeight);
      g.fillStyle(PIPE_DARK);
      g.fillRect(
        w - lipExtra,
        bottomY + lipHeight - 3,
        PIPE_WIDTH + lipExtra * 2,
        3
      );

      g.setData("pipeX", w);
      g.setData("topHeight", topHeight);
      g.setData("bottomY", bottomY);
      g.setData("scored", false);

      // Insert pipe behind ground
      g.setDepth(0);
      this.groundGraphics.setDepth(1);

      this.pipeGraphics.push(g);
    },

    checkScoring: function () {
      var birdRight = this.birdX + BIRD_RADIUS;
      var self = this;
      this.pipeGraphics.forEach(function (pipe) {
        var pipeRight = pipe.x + pipe.getData("pipeX") - pipe.getData("pipeX") + PIPE_WIDTH;
        // Actual pipe right edge (pipe.x is the offset from original position, but we drew at getData("pipeX"))
        // Since we move pipe.x directly, the drawn coordinates are relative to the graphics object origin.
        // The pipe was drawn at world x = getData("pipeX"), but the graphics object x is now pipe.x
        // So actual left edge = pipe.x, actual right edge = pipe.x + PIPE_WIDTH
        var actualRight = pipe.x + PIPE_WIDTH;
        if (!pipe.getData("scored") && actualRight < birdRight) {
          pipe.setData("scored", true);
          self.score++;
          self.scoreText.setText(self.score.toString());
        }
      });
    },

    checkCollisions: function () {
      var bx = this.birdX;
      var by = this.birdY;
      var r = BIRD_RADIUS;

      // Ground/ceiling collision
      if (by + r >= this.groundY || by - r <= 0) {
        this.triggerGameOver();
        return;
      }

      // Pipe collision
      var self = this;
      this.pipeGraphics.some(function (pipe) {
        var pipeLeft = pipe.x;
        var pipeRightEdge = pipe.x + PIPE_WIDTH;
        var topH = pipe.getData("topHeight");
        var bottomY = pipe.getData("bottomY");

        // Check horizontal overlap
        if (bx + r > pipeLeft && bx - r < pipeRightEdge) {
          // Check vertical collision (above gap or below gap)
          if (by - r < topH || by + r > bottomY) {
            self.triggerGameOver();
            return true;
          }
        }
        return false;
      });
    },

    triggerGameOver: function () {
      if (this.gameOver) return;
      this.gameOver = true;

      if (this.pipeTimer) this.pipeTimer.remove();

      // Flash effect
      this.cameras.main.flash(200, 255, 255, 255);
      this.cameras.main.shake(200, 0.01);

      // Brief pause then show game over screen
      this.time.delayedCall(600, function () {
        this.scale.off("resize", this.onResize, this);
        this.scene.start("GameOverScene", { score: this.score });
      }, [], this);
    },

    onResize: function (gameSize) {
      // On resize during gameplay, restart the game scene
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      this.scene.restart();
    },

    drawGround: function () {
      var w = this.gameW;
      var h = this.gameH;
      var g = this.groundGraphics;
      g.clear();
      g.fillStyle(GROUND_COLOR);
      g.fillRect(0, this.groundY, w, GROUND_HEIGHT);
      g.fillStyle(GROUND_DARK);
      g.fillRect(0, this.groundY, w, 4);
      // Ground texture stripes
      g.fillStyle(GROUND_DARK);
      for (var i = 0; i < w; i += 24) {
        g.fillRect(i, this.groundY + 8, 12, 2);
      }
      g.setDepth(1);
    },

    redrawBird: function () {
      this.birdContainer.removeAll(true);
      var g = this.add.graphics();

      // Body
      g.fillStyle(BIRD_BODY);
      g.fillEllipse(0, 0, BIRD_RADIUS * 2.2, BIRD_RADIUS * 2);

      // Belly
      g.fillStyle(BIRD_BELLY);
      g.fillEllipse(2, 4, BIRD_RADIUS * 1.4, BIRD_RADIUS * 1.2);

      // Wing
      g.fillStyle(BIRD_WING);
      g.fillEllipse(-4, -2, BIRD_RADIUS * 1.2, BIRD_RADIUS * 0.8);

      // Eye white
      g.fillStyle(BIRD_EYE_WHITE);
      g.fillCircle(8, -5, 6);

      // Eye pupil
      g.fillStyle(BIRD_EYE_BLACK);
      g.fillCircle(10, -5, 3);

      // Beak
      g.fillStyle(BIRD_BEAK);
      g.fillTriangle(15, 0, 25, 3, 15, 6);

      this.birdContainer.add(g);
    },
  });

  // ─── Game Over Scene ─────────────────────────────────────────
  var GameOverScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function GameOverScene() {
      Phaser.Scene.call(this, { key: "GameOverScene" });
    },

    init: function (data) {
      this.finalScore = data.score || 0;
    },

    create: function () {
      var w = this.scale.width;
      var h = this.scale.height;

      // Background
      var bg = this.add.graphics();
      bg.fillStyle(SKY_TOP);
      bg.fillRect(0, 0, w, h);

      // Ground
      var ground = this.add.graphics();
      ground.fillStyle(GROUND_COLOR);
      ground.fillRect(0, h - GROUND_HEIGHT, w, GROUND_HEIGHT);
      ground.fillStyle(GROUND_DARK);
      ground.fillRect(0, h - GROUND_HEIGHT, w, 4);

      // Score panel background
      var panelW = Math.min(280, w * 0.7);
      var panelH = 160;
      var panelX = (w - panelW) / 2;
      var panelY = h * 0.25;
      var panel = this.add.graphics();
      panel.fillStyle(0xdeb887, 0.95);
      panel.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
      panel.lineStyle(3, 0x8b7355);
      panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);

      // Game Over text
      this.add
        .text(w / 2, panelY + 30, "Game Over", {
          fontFamily: "Arial, sans-serif",
          fontSize: Math.max(28, Math.floor(w * 0.06)) + "px",
          fontStyle: "bold",
          color: "#c0392b",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      // Score
      this.add
        .text(w / 2, panelY + 80, "Score", {
          fontFamily: "Arial, sans-serif",
          fontSize: Math.max(16, Math.floor(w * 0.03)) + "px",
          color: "#4a4a4a",
        })
        .setOrigin(0.5);

      this.add
        .text(w / 2, panelY + 115, this.finalScore.toString(), {
          fontFamily: "Arial, sans-serif",
          fontSize: Math.max(36, Math.floor(w * 0.08)) + "px",
          fontStyle: "bold",
          color: "#2c3e50",
          stroke: "#ffffff",
          strokeThickness: 4,
        })
        .setOrigin(0.5);

      // Restart prompt
      var restartY = panelY + panelH + 50;
      this.prompt = this.add
        .text(w / 2, restartY, "Tap / Click / Space to Retry", {
          fontFamily: "Arial, sans-serif",
          fontSize: Math.max(16, Math.floor(w * 0.035)) + "px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      // Blink prompt
      this.time.addEvent({
        delay: 600,
        loop: true,
        callback: function () {
          this.prompt.visible = !this.prompt.visible;
        },
        callbackScope: this,
      });

      // Dead bird on the ground
      this.drawDeadBird(w / 2, h - GROUND_HEIGHT - BIRD_RADIUS - 5);

      // Delay input slightly to prevent accidental restart
      this.canRestart = false;
      this.time.delayedCall(500, function () {
        this.canRestart = true;
      }, [], this);

      this.input.on("pointerdown", this.restart, this);
      this.input.keyboard.on("keydown-SPACE", this.restart, this);

      this.scale.on("resize", this.onResize, this);
    },

    restart: function () {
      if (!this.canRestart) return;
      this.scale.off("resize", this.onResize, this);
      this.scene.start("GameScene");
    },

    onResize: function (gameSize) {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      this.scene.restart({ score: this.finalScore });
    },

    drawDeadBird: function (x, y) {
      var g = this.add.graphics();

      // Body
      g.fillStyle(BIRD_BODY);
      g.fillEllipse(x, y, BIRD_RADIUS * 2.2, BIRD_RADIUS * 2);

      // Belly
      g.fillStyle(BIRD_BELLY);
      g.fillEllipse(x + 2, y + 4, BIRD_RADIUS * 1.4, BIRD_RADIUS * 1.2);

      // Wing (droopy)
      g.fillStyle(BIRD_WING);
      g.fillEllipse(x - 4, y + 4, BIRD_RADIUS * 1.2, BIRD_RADIUS * 0.8);

      // Eye (X marks)
      g.lineStyle(2, BIRD_EYE_BLACK);
      g.lineBetween(x + 5, y - 8, x + 11, y - 2);
      g.lineBetween(x + 11, y - 8, x + 5, y - 2);

      // Beak (droopy)
      g.fillStyle(BIRD_BEAK);
      g.fillTriangle(x + 15, y + 2, x + 25, y + 6, x + 15, y + 8);
    },
  });

  // ─── Phaser Configuration ────────────────────────────────────
  var config = {
    type: Phaser.CANVAS,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: document.body,
    backgroundColor: "#4ec0ca",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [MenuScene, GameScene, GameOverScene],
    banner: false,
    audio: {
      noAudio: true,
    },
    input: {
      touch: true,
    },
  };

  new Phaser.Game(config);
})();
