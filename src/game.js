import { createHazard, difficultyForScore, intersects } from "./obstacles.js";

export class Game {
  constructor(canvas, context, input) {
    this.canvas = canvas;
    this.context = context;
    this.input = input;
    this.state = "ready";
    this.elapsedSeconds = 0;
    this.lastTimestamp = null;
    this.animationFrameId = null;
    this.fallElapsedSeconds = 0;
    this.rng = Math.random;
    this.hazards = [];
    this.score = 0;
    this.distance = 0;
    this.distanceRemainder = 0;
    this.obstaclesAvoided = 0;
    this.bestScore = this.loadBestScore();
    this.nextHazardId = 1;
    this.spawnTimer = this.randomSpawnDelay();
    this.player = {
      x: 220,
      y: 390,
      vx: 0,
      vy: 0,
      leftFoot: 0.5,
      rightFoot: 0.5,
      leftFootVelocity: 0,
      rightFootVelocity: 0,
      balance: 0,
      grounded: true,
      crouching: false,
    };
    this.frame = this.frame.bind(this);
  }

  start() {
    if (this.animationFrameId !== null) return;
    this.animationFrameId = requestAnimationFrame(this.frame);
  }

  frame(timestamp) {
    this.animationFrameId = null;
    const deltaSeconds = this.lastTimestamp === null
      ? 0
      : Math.min(0.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000));

    this.update(deltaSeconds);
    this.render();
    this.lastTimestamp = timestamp;
    this.animationFrameId = requestAnimationFrame(this.frame);
  }

  loadBestScore() {
    try {
      const storedScore = Number(localStorage.getItem("twoLeggedClopBestScore"));
      return Number.isFinite(storedScore) && storedScore >= 0 ? Math.floor(storedScore) : 0;
    } catch {
      return 0;
    }
  }

  startRun() {
    this.state = "playing";
    this.elapsedSeconds = 0;
    this.fallElapsedSeconds = 0;
    this.hazards = [];
    this.score = 0;
    this.distance = 0;
    this.distanceRemainder = 0;
    this.obstaclesAvoided = 0;
    this.nextHazardId = 1;
    this.player = {
      x: 220, y: 390, vx: 0, vy: 0,
      leftFoot: 0.5, rightFoot: 0.5,
      leftFootVelocity: 0, rightFootVelocity: 0,
      balance: 0, grounded: true, crouching: false,
    };
    this.spawnTimer = this.randomSpawnDelay();
  }

  finishRun() {
    this.state = "gameover";
    if (this.score <= this.bestScore) return;
    this.bestScore = this.score;
    try {
      localStorage.setItem("twoLeggedClopBestScore", String(this.bestScore));
    } catch {
      // Keep the game running when browser storage is blocked.
    }
  }

  update(deltaSeconds) {
    if (this.state === "ready" || this.state === "gameover") {
      const enterPressed = this.input.consumePressed("Enter");
      const spacePressed = this.input.consumePressed("Space");
      if (enterPressed || spacePressed) this.startRun();
      return;
    }
    if (this.state === "falling") {
      this.input.consumePressed("Enter");
      this.input.consumePressed("Space");
      this.fallElapsedSeconds += deltaSeconds;
      if (this.fallElapsedSeconds >= 0.65) this.finishRun();
      return;
    }
    if (this.state !== "playing") return;
    this.updateLegs(deltaSeconds);
    this.updateMovement(deltaSeconds);
    this.updateBalance(deltaSeconds);
    if (Math.abs(this.player.balance) >= 1) {
      this.state = "falling";
      this.fallElapsedSeconds = 0;
      return;
    }
    this.updateCourse(deltaSeconds);
    this.elapsedSeconds += deltaSeconds;
  }

  updateLegs(deltaSeconds) {
    const { input, player } = this;
    const rightDirection = Number(input.isDown("ArrowLeft")) - Number(input.isDown("ArrowRight"));
    const leftDirection = Number(input.isDown("ArrowDown")) - Number(input.isDown("ArrowUp"));

    player.rightFootVelocity = rightDirection * 2.8;
    player.leftFootVelocity = leftDirection * 2.8;
    player.rightFoot = this.clamp(player.rightFoot + player.rightFootVelocity * deltaSeconds, 0, 1);
    player.leftFoot = this.clamp(player.leftFoot + player.leftFootVelocity * deltaSeconds, 0, 1);
  }

  updateMovement(deltaSeconds) {
    const { input, player } = this;
    const movingLeft = input.isDown("KeyA");
    const movingRight = input.isDown("KeyD");

    if (movingLeft !== movingRight) {
      player.vx = movingLeft ? -150 : 150;
    } else {
      const friction = 500 * deltaSeconds;
      player.vx = Math.abs(player.vx) <= friction
        ? 0
        : player.vx - Math.sign(player.vx) * friction;
    }

    player.x = this.clamp(player.x + player.vx * deltaSeconds, 90, 420);
    player.crouching = input.isDown("KeyS");

    if (input.consumePressed("KeyW") && player.grounded) {
      player.vy = -430;
      player.grounded = false;
    }

    if (!player.grounded) {
      player.vy += 1100 * deltaSeconds;
      player.y += player.vy * deltaSeconds;
      if (player.y >= 390) {
        player.y = 390;
        player.vy = 0;
        player.grounded = true;
      }
    }
  }

  randomSpawnDelay() {
    const { spawnMin, spawnMax } = difficultyForScore(this.score ?? 0);
    return spawnMin + this.rng() * (spawnMax - spawnMin);
  }

  spawnHazard() {
    const difficulty = difficultyForScore(this.score);
    const type = difficulty.allowedTypes[Math.floor(this.rng() * difficulty.allowedTypes.length)];
    const sudden = difficulty.level >= 3 && this.rng() < 0.2;
    const x = sudden ? 640 : this.canvas.width + 40;
    const hazard = createHazard(type, x, 390, this.rng);
    hazard.id = this.nextHazardId++;
    hazard.sudden = sudden;
    hazard.warningDuration = sudden ? 0.35 : 0;
    hazard.vx = -difficulty.speed;
    this.hazards.push(hazard);
  }

  updateCourse(deltaSeconds) {
    const difficulty = difficultyForScore(this.score);
    this.distance += difficulty.speed * deltaSeconds;
    this.distanceRemainder += difficulty.speed * deltaSeconds;
    const distancePoints = Math.floor(this.distanceRemainder / 10);
    if (distancePoints > 0) {
      this.score += distancePoints;
      this.distanceRemainder -= distancePoints * 10;
    }

    this.spawnTimer -= deltaSeconds;
    if (this.spawnTimer <= 0) {
      this.spawnHazard();
      this.spawnTimer += this.randomSpawnDelay();
    }

    const player = this.player;
    const playerRect = {
      x: player.x - 18,
      y: player.y - (player.crouching ? 45 : 85),
      width: 36,
      height: player.crouching ? 45 : 85,
    };

    for (const hazard of this.hazards) {
      hazard.age += deltaSeconds;
      hazard.x += hazard.vx * deltaSeconds;
      if (hazard.type === "thrown") {
        hazard.y = hazard.baseY + Math.sin(hazard.age * 5 + hazard.phase) * 18;
      }

      const warningOver = !hazard.sudden || hazard.age >= hazard.warningDuration;
      if (!hazard.resolved && warningOver && intersects(playerRect, hazard)) {
        hazard.resolved = true;
        player.vx = -80;
        player.balance = this.clamp(
          player.balance + (player.x < hazard.x + hazard.width / 2 ? 0.16 : -0.16),
          -1.2,
          1.2,
        );
      }

      if (!hazard.passed && !hazard.resolved && hazard.x + hazard.width < player.x) {
        hazard.passed = true;
        this.obstaclesAvoided += 1;
        this.score += 100;
      }
    }
    this.hazards = this.hazards.filter((hazard) => hazard.x + hazard.width >= -40);
  }
  updateBalance(deltaSeconds) {
    const { player } = this;
    const heightDifference = player.rightFoot - player.leftFoot;
    let liftImpulse = 0;
    if (player.rightFootVelocity > 0) liftImpulse += 0.22;
    if (player.leftFootVelocity > 0) liftImpulse -= 0.22;

    player.balance += (heightDifference * 0.9 - player.balance * 0.35 + liftImpulse) * deltaSeconds;
    player.balance = this.clamp(player.balance, -1.2, 1.2);
  }

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  render() {
    const { context: ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawSky(ctx);
    this.drawHills(ctx);
    this.drawTree(ctx);
    this.drawGround(ctx);
    this.drawHazards(ctx);
    this.drawPlayer(ctx);
    this.drawHud(ctx);
    if (this.state === "ready") {
      this.drawOverlay("\uB450 \uBC1C \uD074\uB86D", [
        "\uC7A5\uC560\uBB3C\uC744 \uD53C\uD558\uACE0 \uADE0\uD615\uC744 \uC7A1\uC544 \uAC70\uB9AC\uB97C \uB298\uB9AC\uC138\uC694.",
        "\uB2E4\uB9AC: \u2190 \uC624\uB978\uBC1C \uB4E4\uAE30  \u2192 \uC624\uB978\uBC1C \uB0B4\uB9AC\uAE30",
        "\u2191 \uC67C\uBC1C \uB0B4\uB9AC\uAE30  \u2193 \uC67C\uBC1C \uB4E4\uAE30",
        "A / D \uC774\uB3D9   W \uC810\uD504   S \uC219\uC774\uAE30",
        "\uC5D4\uD130 \uB610\uB294 \uC2A4\uD398\uC774\uC2A4\uB97C \uB20C\uB7EC \uC2DC\uC791",
      ]);
    } else if (this.state === "gameover") {
      this.drawOverlay("\uB118\uC5B4\uC84C\uC2B5\uB2C8\uB2E4", [
        "\uCD5C\uC885 \uC810\uC218  " + this.score,
        "\uCD5C\uACE0 \uC810\uC218  " + this.bestScore,
        "\uD53C\uD55C \uC7A5\uC560\uBB3C  " + this.obstaclesAvoided,
        "\uC5D4\uD130 \uB610\uB294 \uC2A4\uD398\uC774\uC2A4\uB97C \uB20C\uB7EC \uB2E4\uC2DC \uC2DC\uC791",
      ]);
    }
  }

  drawSky(ctx) {
    const bands = ["#5424b8", "#6429bd", "#7629b5", "#8c2ba4", "#a43b89", "#b95373"];
    const bandHeight = Math.ceil(390 / bands.length);
    bands.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, index * bandHeight, this.canvas.width, bandHeight);
    });
  }

  drawHills(ctx) {
    ctx.fillStyle = "#48316f";
    ctx.fillRect(0, 294, 96, 22);
    ctx.fillRect(72, 278, 68, 38);
    ctx.fillRect(124, 292, 120, 24);
    ctx.fillRect(236, 270, 84, 46);
    ctx.fillRect(304, 289, 116, 27);
    ctx.fillRect(402, 278, 130, 38);
    ctx.fillRect(520, 295, 110, 21);
    ctx.fillStyle = "#5b367c";
    ctx.fillRect(0, 311, 218, 18);
    ctx.fillRect(190, 302, 156, 27);
    ctx.fillRect(340, 313, 176, 16);
    ctx.fillRect(500, 305, 160, 24);
  }

  drawTree(ctx) {
    ctx.fillStyle = "#33283e";
    ctx.fillRect(830, 112, 28, 282);
    ctx.fillRect(798, 180, 34, 22);
    ctx.fillRect(854, 156, 26, 20);
    ctx.fillStyle = "#4b3848";
    ctx.fillRect(842, 124, 10, 248);
    ctx.fillStyle = "#586127";
    ctx.fillRect(650, 42, 110, 66);
    ctx.fillRect(704, 10, 128, 94);
    ctx.fillRect(778, 0, 150, 126);
    ctx.fillRect(882, 22, 78, 112);
    ctx.fillRect(618, 78, 86, 68);
    ctx.fillRect(670, 118, 250, 44);
    ctx.fillStyle = "#73772b";
    ctx.fillRect(692, 28, 72, 42);
    ctx.fillRect(744, 4, 88, 50);
    ctx.fillRect(826, 18, 88, 62);
    ctx.fillRect(636, 88, 78, 34);
    ctx.fillStyle = "#3e522d";
    ctx.fillRect(720, 70, 28, 22);
    ctx.fillRect(792, 58, 34, 24);
    ctx.fillRect(866, 86, 34, 26);
    ctx.fillRect(684, 126, 28, 20);
    ctx.fillRect(908, 128, 28, 24);
  }

  drawGround(ctx) {
    ctx.fillStyle = "#39243e";
    ctx.fillRect(0, 390, this.canvas.width, 150);
    ctx.fillStyle = "#4d2850";
    ctx.fillRect(0, 410, this.canvas.width, 130);
    ctx.fillStyle = "#83a632";
    ctx.fillRect(0, 382, this.canvas.width, 8);
    ctx.fillStyle = "#b4cc4b";
    for (let x = 0; x < this.canvas.width; x += 18) {
      const height = 6 + (x % 4) * 2;
      ctx.fillRect(x + 3, 382 - height, 3, height);
    }
    ctx.fillStyle = "#644057";
    ctx.fillRect(0, 500, this.canvas.width, 40);
    ctx.fillStyle = "#2d2038";
    ctx.fillRect(0, 532, this.canvas.width, 8);
  }

  drawHazards(ctx) {
    for (const hazard of this.hazards) {
      if (hazard.sudden && hazard.age < hazard.warningDuration) {
        ctx.fillStyle = Math.floor(hazard.age * 18) % 2 === 0 ? "#fff0a8" : "#e54b52";
      } else {
        ctx.fillStyle = hazard.type === "barrier" ? "#8b5637"
          : hazard.type === "overhead" ? "#818b32" : "#ee8138";
      }
      ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
      ctx.fillStyle = "rgba(40, 35, 59, 0.45)";
      if (hazard.type === "barrier") {
        ctx.fillRect(hazard.x + 5, hazard.y + 8, 6, hazard.height - 8);
        ctx.fillRect(hazard.x + 22, hazard.y + 8, 6, hazard.height - 8);
      } else if (hazard.type === "overhead") {
        ctx.fillRect(hazard.x + 8, hazard.y + hazard.height - 7, hazard.width - 16, 7);
      } else {
        ctx.fillRect(hazard.x + 6, hazard.y + 6, 6, 6);
      }
    }
  }

  drawPlayer(ctx) {
    const { player } = this;
    const fallingProgress = this.state === "falling"
      ? this.clamp(this.fallElapsedSeconds / 0.65, 0, 1)
      : 0;
    const leanDirection = Math.sign(player.balance) || 1;
    const torsoTop = player.crouching ? -112 : -126;
    const headTop = player.crouching ? -140 : -154;
    const hipY = player.crouching ? -50 : -55;
    const leftLift = Math.round(player.leftFoot * 34);
    const rightLift = Math.round(player.rightFoot * 34);
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.translate(0, -75);
    ctx.rotate(fallingProgress * leanDirection * Math.PI / 2);
    ctx.translate(0, 75);
    ctx.globalAlpha = 1 - fallingProgress * 0.55;
    ctx.fillStyle = "#d89d72";
    ctx.fillRect(-9, headTop + 18, 18, 10);
    ctx.fillStyle = "#38273a";
    ctx.fillRect(-14, headTop + 2, 28, 12);
    ctx.fillRect(-12, headTop - 3, 22, 8);
    ctx.fillStyle = "#f1d9b5";
    ctx.fillRect(3, headTop + 13, 4, 3);
    ctx.fillStyle = "#d8cfb8";
    ctx.fillRect(-10, torsoTop + 5, 20, 55);
    ctx.fillStyle = "#343044";
    ctx.fillRect(-19, torsoTop, 38, 68);
    ctx.fillStyle = "#6a5265";
    ctx.fillRect(-13, torsoTop + 8, 5, 45);
    ctx.fillRect(8, torsoTop + 8, 5, 45);
    ctx.fillStyle = "#c5a66f";
    ctx.fillRect(-18, torsoTop + 61, 36, 6);
    if (player.crouching) {
      ctx.fillStyle = "#d89d72";
      ctx.fillRect(-27, torsoTop + 25, 10, 30);
      ctx.fillRect(17, torsoTop + 25, 10, 30);
    } else {
      ctx.fillStyle = "#343044";
      ctx.fillRect(-26, torsoTop + 10, 9, 48);
      ctx.fillRect(17, torsoTop + 10, 9, 48);
      ctx.fillStyle = "#d89d72";
      ctx.fillRect(-27, torsoTop + 54, 10, 9);
      ctx.fillRect(17, torsoTop + 54, 10, 9);
    }
    this.drawLeg(ctx, -10, hipY, leftLift);
    this.drawLeg(ctx, 2, hipY, rightLift);
    ctx.fillStyle = "#29283a";
    ctx.fillRect(-16, -leftLift - 7, 18, 7);
    ctx.fillRect(0, -rightLift - 7, 18, 7);
    ctx.fillStyle = "#a58a59";
    ctx.fillRect(-16, -leftLift - 7, 5, 2);
    ctx.fillRect(0, -rightLift - 7, 5, 2);
    ctx.restore();
  }

  drawLeg(ctx, x, hipY, lift) {
    const footY = -lift - 7;
    const kneeY = Math.round((hipY + footY) / 2);
    ctx.fillStyle = "#343044";
    ctx.fillRect(x, hipY, 10, Math.max(3, kneeY - hipY));
    ctx.fillRect(x + 1, kneeY, 8, Math.max(3, footY - kneeY));
    ctx.fillStyle = "#4b465e";
    ctx.fillRect(x + 2, hipY + 4, 3, Math.max(2, kneeY - hipY - 8));
  }

  drawHud(ctx) {
    const { level } = difficultyForScore(this.score);
    ctx.fillStyle = "rgba(35, 27, 47, 0.76)";
    ctx.fillRect(16, 14, 252, 70);
    ctx.fillRect(this.canvas.width - 244, 14, 228, 70);
    ctx.fillStyle = "#fff0a8";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.fillText("\uADE0\uD615", 28, 34);
    ctx.fillStyle = "#28233b";
    ctx.fillRect(28, 43, 210, 12);
    const center = 133;
    const amount = Math.round(Math.min(1, Math.abs(this.player.balance)) * 105);
    const color = Math.abs(this.player.balance) >= 0.85 ? "#e54b52"
      : Math.abs(this.player.balance) >= 0.65 ? "#f0bc4e" : "#79c65a";
    ctx.fillStyle = color;
    ctx.fillRect(this.player.balance < 0 ? center - amount : center, 43, amount, 12);
    ctx.fillStyle = "#fff0a8";
    ctx.fillRect(center - 2, 40, 4, 18);
    ctx.fillStyle = "#fff0a8";
    ctx.textAlign = "right";
    ctx.fillText("\uC810\uC218  " + this.score, this.canvas.width - 28, 34);
    ctx.fillText("\uCD5C\uACE0  " + this.bestScore + "   \uB808\uBCA8 " + level, this.canvas.width - 28, 56);
    ctx.fillText("\uD68C\uD53C  " + this.obstaclesAvoided, this.canvas.width - 28, 78);
    ctx.textAlign = "start";
  }

  drawOverlay(title, lines) {
    const ctx = this.context;
    const cardWidth = Math.min(690, this.canvas.width - 48);
    const lineHeight = 27;
    const cardHeight = 80 + lines.length * lineHeight;
    const x = Math.round((this.canvas.width - cardWidth) / 2);
    const y = Math.round((this.canvas.height - cardHeight) / 2);
    ctx.fillStyle = "rgba(22, 17, 36, 0.92)";
    ctx.fillRect(x, y, cardWidth, cardHeight);
    ctx.strokeStyle = "#c5a66f";
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, cardWidth - 4, cardHeight - 4);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff0a8";
    ctx.font = "bold 28px monospace";
    ctx.fillText(title, this.canvas.width / 2, y + 39);
    ctx.fillStyle = "#f1e9d4";
    ctx.font = "bold 15px monospace";
    lines.forEach((line, index) => {
      ctx.fillText(line, this.canvas.width / 2, y + 70 + index * lineHeight, cardWidth - 28);
    });
    ctx.textAlign = "start";
  }

}
