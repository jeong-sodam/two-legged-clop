import { createHazard, difficultyForScore, intersects } from "./obstacles.js";
import { CONTROL_KEYS, createControlMapping } from "./input.js";

const GROUND_Y = 390;
const LIMB_NAMES = Object.freeze(["leftArm", "rightArm", "leftLeg", "rightLeg"]);

function createPlayer() {
  return {
    x: 220,
    y: GROUND_Y,
    forwardSpeed: 0,
    bodyWobble: 0,
    fallProgress: 0,
    limbs: Object.fromEntries(LIMB_NAMES.map((limb) => [limb, { raised: false, lift: 0, swing: 0 }])),
  };
}

export class Game {
  constructor(canvas, context, input) {
    this.canvas = canvas;
    this.context = context;
    this.input = input;
    this.state = "ready";
    this.selectedMode = "normal";
    this.mode = null;
    this.controlMapping = null;
    this.prepareSecondsRemaining = 0;
    this.prepareElapsedSeconds = 0;
    this.previousMapping = this.loadPreviousMapping();
    this.distance = 0;
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
    this.player = createPlayer();
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
      const storedScore = Number(localStorage.getItem("quadrupedClopBestDistance"));
      return Number.isFinite(storedScore) && storedScore >= 0 ? Math.floor(storedScore) : 0;
    } catch {
      return 0;
    }
  }

  loadPreviousMapping() {
    try {
      const stored = JSON.parse(localStorage.getItem("quadrupedClopPreviousMapping"));
      if (!stored || !["normal", "hard"].includes(stored.mode) || !stored.mapping) return null;
      const codes = [];
      for (const limb of ["leftArm", "rightArm", "leftLeg", "rightLeg"]) {
        const pair = stored.mapping[limb];
        if (!pair || !CONTROL_KEYS.includes(pair.raise)) return null;
        codes.push(pair.raise);
        if (stored.mode === "hard") {
          if (!CONTROL_KEYS.includes(pair.lower)) return null;
          codes.push(pair.lower);
        } else if (pair.lower !== null) {
          return null;
        }
      }
      if (new Set(codes).size !== codes.length) return null;
      return { mode: stored.mode, mapping: stored.mapping };
    } catch {
      return null;
    }
  }

  savePreviousMapping(mode, mapping) {
    this.previousMapping = { mode, mapping };
    try {
      localStorage.setItem("quadrupedClopPreviousMapping", JSON.stringify(this.previousMapping));
    } catch {
      // A session-local mapping still prevents repeats when browser storage is unavailable.
    }
  }

  startRun(mode = this.selectedMode) {
    this.mode = mode;
    this.selectedMode = mode;
    this.controlMapping = createControlMapping(mode, this.rng, this.previousMapping);
    this.input.clear();
    this.input.setControlMapping(this.controlMapping);
    this.savePreviousMapping(mode, this.controlMapping);
    this.state = "memorize";
    this.prepareSecondsRemaining = 10;
    this.prepareElapsedSeconds = 0;
    this.elapsedSeconds = 0;
    this.fallElapsedSeconds = 0;
    this.hazards = [];
    this.score = 0;
    this.distance = 0;
    this.distanceRemainder = 0;
    this.obstaclesAvoided = 0;
    this.nextHazardId = 1;
    this.player = createPlayer();
    this.spawnTimer = this.randomSpawnDelay();
  }

  finishRun() {
    this.state = "gameover";
    if (this.score <= this.bestScore) return;
    this.bestScore = this.score;
    try {
      localStorage.setItem("quadrupedClopBestDistance", String(this.bestScore));
    } catch {
      // Keep the game running when browser storage is blocked.
    }
  }

  update(deltaSeconds) {
    if (this.state === "ready") {
      const modeLeft = this.input.consumePressed("ArrowLeft");
      const modeRight = this.input.consumePressed("ArrowRight");
      if (modeLeft !== modeRight) {
        this.selectedMode = this.selectedMode === "normal" ? "hard" : "normal";
      }
      const enterPressed = this.input.consumePressed("Enter");
      const spacePressed = this.input.consumePressed("Space");
      if (enterPressed || spacePressed) this.startRun(this.selectedMode);
      return;
    }
    if (this.state === "gameover") {
      const enterPressed = this.input.consumePressed("Enter");
      const spacePressed = this.input.consumePressed("Space");
      if (enterPressed || spacePressed) {
        this.state = "ready";
        this.input.clear();
      }
      return;
    }
    if (this.state === "memorize") {
      this.prepareElapsedSeconds += deltaSeconds;
      this.prepareSecondsRemaining = Math.max(0, 10 - this.prepareElapsedSeconds);
      if (this.prepareElapsedSeconds >= 10) {
        this.prepareSecondsRemaining = 0;
        this.input.clear();
        this.state = "playing";
      }
      return;
    }
    if (this.state === "falling") {
      this.input.consumePressed("Enter");
      this.input.consumePressed("Space");
      this.fallElapsedSeconds += deltaSeconds;
      this.player.fallProgress = this.clamp(this.fallElapsedSeconds / 0.65, 0, 1);
      if (this.fallElapsedSeconds >= 0.65) this.finishRun();
      return;
    }
    if (this.state !== "playing") return;
    const liftTransitions = this.updateLimbs(deltaSeconds);
    this.updateCrawlMovement(deltaSeconds, liftTransitions);
    this.updateCourse(deltaSeconds);
    this.elapsedSeconds += deltaSeconds;
  }

  updateLimbs(deltaSeconds) {
    const transitions = [];
    for (const limbName of LIMB_NAMES) {
      const limb = this.player.limbs[limbName];
      const controls = this.controlMapping[limbName];
      const wasRaised = limb.raised;
      if (this.mode === "normal") {
        limb.raised = this.input.isDown(controls.raise);
      } else {
        if (this.input.consumePressed(controls.raise)) limb.raised = true;
        if (this.input.consumePressed(controls.lower)) limb.raised = false;
      }

      const target = limb.raised ? 1 : 0;
      const rate = limb.raised ? 7.5 : 9;
      limb.lift = Math.max(0, Math.min(1, limb.lift + Math.sign(target - limb.lift) * rate * deltaSeconds));
      if (Math.abs(limb.lift - target) < 0.02) limb.lift = target;
      limb.swing += deltaSeconds * (4 + this.player.forwardSpeed * 0.015);
      if (!wasRaised && limb.raised) transitions.push(limbName);
    }
    return transitions;
  }

  updateCrawlMovement(deltaSeconds, liftTransitions) {
    const player = this.player;
    player.forwardSpeed += liftTransitions.length * 42;
    player.forwardSpeed = Math.max(0, player.forwardSpeed - 95 * deltaSeconds);
    player.forwardSpeed = Math.min(260, player.forwardSpeed);
    const leftRaised = Number(player.limbs.leftArm.raised) + Number(player.limbs.leftLeg.raised);
    const rightRaised = Number(player.limbs.rightArm.raised) + Number(player.limbs.rightLeg.raised);
    const raisedCount = LIMB_NAMES.reduce((count, limb) => count + Number(player.limbs[limb].raised), 0);
    const wobbleTarget = this.clamp((leftRaised - rightRaised) * 0.045 + (raisedCount - 2) * 0.02, -0.18, 0.18);
    player.bodyWobble += (wobbleTarget - player.bodyWobble) * Math.min(1, deltaSeconds * 6);
    this.distance += player.forwardSpeed * deltaSeconds;
    this.score = Math.floor(this.distance);
  }

  getHeadHitbox() {
    const { x, y } = this.player;
    return { x: x + 30, y: y - 124, width: 39, height: 36 };
  }

  getBodyHitbox() {
    const { x, y } = this.player;
    return { x: x - 12, y: y - 80, width: 58, height: 32 };
  }

  getLimbHitboxes() {
    const { x, y, limbs } = this.player;
    const arm = (limb, boundsX) => ({
      limb,
      x: x + boundsX,
      y: y - 76 - limbs[limb].lift * 27,
      width: 38,
      height: 78,
    });
    const leg = (limb, boundsX) => ({
      limb,
      x: x + boundsX,
      y: y - 62 - limbs[limb].lift * 24,
      width: 36,
      height: 64,
    });
    return [arm("leftArm", 0), arm("rightArm", -31), leg("leftLeg", -15), leg("rightLeg", -49)];
  }

  beginFall() {
    if (this.state !== "playing") return;
    this.state = "falling";
    this.fallElapsedSeconds = 0;
    this.player.fallProgress = 0;
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
    this.spawnTimer -= deltaSeconds;
    if (this.spawnTimer <= 0) {
      this.spawnHazard();
      this.spawnTimer += this.randomSpawnDelay();
    }

    for (const hazard of this.hazards) {
      hazard.age += deltaSeconds;
      hazard.x += hazard.vx * deltaSeconds;
      if (hazard.type === "thrown") {
        hazard.y = hazard.baseY + Math.sin(hazard.age * 5 + hazard.phase) * 18;
      }

      const warningOver = !hazard.sudden || hazard.age >= hazard.warningDuration;
      if (!hazard.resolved && warningOver) {
        const bounds = { x: hazard.x, y: hazard.y, width: hazard.width, height: hazard.height };
        if (intersects(this.getHeadHitbox(), bounds)) {
          hazard.resolved = true;
          this.beginFall();
          return;
        }
        const bodyContact = intersects(this.getBodyHitbox(), bounds)
          || this.getLimbHitboxes().some((limb) => intersects(limb, bounds));
        if (bodyContact) {
          hazard.resolved = true;
          this.player.forwardSpeed *= 0.45;
          this.player.bodyWobble = this.clamp(this.player.bodyWobble + 0.08, -0.18, 0.18);
        }
      }

      if (!hazard.passed && !hazard.resolved && hazard.x + hazard.width < this.player.x) {
        hazard.passed = true;
        this.obstaclesAvoided += 1;
      }
    }
    this.hazards = this.hazards.filter((hazard) => hazard.x + hazard.width >= -40);
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
      const modeLabel = this.selectedMode === "normal" ? "노말" : "하드";
      this.drawOverlay("네발 클롭", [
        "선택 모드: " + modeLabel + "  (← / → 로 변경)",
        "노말: 키를 누르고 있으면 들고, 놓으면 내립니다.",
        "하드: 들기/내리기 키를 따로 눌러 자세를 바꿉니다.",
        "Enter 또는 Space를 눌러 시작",
      ]);
    } else if (this.state === "memorize") {
      const mappingLines = ["왼팔", "오른팔", "왼다리", "오른다리"].map((label, index) => {
        const limb = ["leftArm", "rightArm", "leftLeg", "rightLeg"][index];
        const controls = this.controlMapping[limb];
        const raise = this.formatControlKey(controls.raise);
        if (this.mode === "normal") return label + " 들기: " + raise;
        return label + "  ↑ " + raise + "   ↓ " + this.formatControlKey(controls.lower);
      });
      this.drawOverlay("키를 기억하세요 · " + Math.ceil(this.prepareSecondsRemaining) + "초", mappingLines);
    } else if (this.state === "gameover") {
      this.drawOverlay("\uB118\uC5B4\uC84C\uC2B5\uB2C8\uB2E4", [
        "\uCD5C\uC885 \uC810\uC218  " + this.score,
        "\uCD5C\uACE0 \uC810\uC218  " + this.bestScore,
        "\uD53C\uD55C \uC7A5\uC560\uBB3C  " + this.obstaclesAvoided,
        "Enter 또는 Space를 눌러 모드를 다시 선택",
      ]);
    }
  }

  formatControlKey(code) {
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    const labels = {
      Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]",
      Backslash: "\\", Semicolon: ";", Quote: "'", Backquote: "`",
      Comma: ",", Period: ".", Slash: "/",
    };
    return labels[code] ?? code;
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
    const fall = player.fallProgress;
    const limbs = player.limbs;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.translate(10, -66);
    ctx.rotate(player.bodyWobble + fall * 1.05);
    ctx.translate(-10, 66);
    ctx.globalAlpha = 1 - fall * 0.35;

    const drawArm = (limb, shoulderX, direction) => {
      const lift = limbs[limb].lift;
      const fold = fall * 17;
      const elbowX = shoulderX + direction * (8 - fold);
      const elbowY = -34 - lift * 13 + fold * 0.3;
      const handX = shoulderX + direction * (13 - fold * 0.75);
      const handY = -4 - lift * 27 + fall * 31;
      this.drawPixelSegment(ctx, shoulderX, -64, elbowX, elbowY, "#46334a", 11);
      this.drawPixelSegment(ctx, elbowX, elbowY, handX, handY, "#d89d72", 8);
      ctx.fillStyle = "#f0bc92";
      ctx.fillRect(Math.round(handX - 4), Math.round(handY - 3), 8, 6);
    };
    const drawLeg = (limb, hipX, direction) => {
      const lift = limbs[limb].lift;
      const swing = Math.sin(limbs[limb].swing) * (0.08 + player.forwardSpeed / 1800);
      const kneeX = hipX + direction * (11 + swing * 9);
      const kneeY = -27 - lift * 12;
      const footX = hipX + direction * (16 + swing * 16);
      const footY = -2 - lift * 24 + fall * 18;
      this.drawPixelSegment(ctx, hipX, -55, kneeX, kneeY, "#383148", 12);
      this.drawPixelSegment(ctx, kneeX, kneeY, footX, footY, "#51435b", 10);
      ctx.fillStyle = "#30283b";
      ctx.fillRect(Math.round(footX - 9), Math.round(footY - 2), 18, 7);
    };

    drawLeg("rightLeg", -22, -1);
    drawArm("rightArm", -7, -1);
    ctx.fillStyle = "#e7c2a1";
    ctx.fillRect(-12, -77, 58, 31);
    ctx.fillStyle = "#302e43";
    ctx.fillRect(-17, -82, 59, 31);
    ctx.fillStyle = "#78627a";
    ctx.fillRect(-8, -75, 36, 5);
    ctx.fillRect(23, -75, 7, 20);
    ctx.fillStyle = "#d6b46f";
    ctx.fillRect(-13, -54, 51, 5);
    ctx.fillStyle = "#d89d72";
    ctx.fillRect(28, -94, 15, 15);
    ctx.fillStyle = "#f0c29d";
    ctx.fillRect(33, -115, 35, 27);
    ctx.fillStyle = "#30283b";
    ctx.fillRect(30, -119, 35, 9);
    ctx.fillRect(35, -124, 23, 7);
    ctx.fillStyle = "#201e2e";
    ctx.fillRect(57, -105, 4, 4);
    ctx.fillStyle = "#f4e5ca";
    ctx.fillRect(65, -99, 4, 3);
    drawArm("leftArm", 12, 1);
    drawLeg("leftLeg", -8, 1);
    ctx.restore();
  }

  drawPixelSegment(ctx, startX, startY, endX, endY, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(Math.round(startX), Math.round(startY));
    ctx.lineTo(Math.round(endX), Math.round(endY));
    ctx.stroke();
  }

  drawHud(ctx) {
    const { level } = difficultyForScore(this.score);
    ctx.fillStyle = "rgba(35, 27, 47, 0.76)";
    ctx.fillRect(16, 14, 252, 70);
    ctx.fillRect(this.canvas.width - 244, 14, 228, 70);
    ctx.fillStyle = "#fff0a8";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.fillText("속도", 28, 34);
    ctx.fillStyle = "#28233b";
    ctx.fillRect(28, 43, 210, 12);
    ctx.fillStyle = "#79c65a";
    ctx.fillRect(28, 43, Math.round(Math.min(1, this.player.forwardSpeed / 260) * 210), 12);
    ctx.fillStyle = "#fff0a8";
    ctx.fillStyle = "#fff0a8";
    ctx.textAlign = "right";
    ctx.fillText("거리  " + this.score, this.canvas.width - 28, 34);
    ctx.fillText("최고  " + this.bestScore + "   레벨 " + level, this.canvas.width - 28, 56);
    ctx.fillText("회피  " + this.obstaclesAvoided, this.canvas.width - 28, 78);
    ctx.textAlign = "start";

    const labels = { leftArm: "왼팔", rightArm: "오른팔", leftLeg: "왼다리", rightLeg: "오른다리" };
    LIMB_NAMES.forEach((limb, index) => {
      const x = 14 + index * 236;
      const raised = this.player.limbs[limb].raised;
      ctx.fillStyle = "rgba(35, 27, 47, 0.9)";
      ctx.fillRect(x, 482, 224, 42);
      ctx.fillStyle = raised ? "#f0bc4e" : "#8a8297";
      ctx.fillRect(x + 10, 494, 14, 14);
      ctx.fillStyle = "#fff0a8";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.fillText(labels[limb] + " · " + (raised ? "들림" : "내려감"), x + 34, 506);
    });
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
