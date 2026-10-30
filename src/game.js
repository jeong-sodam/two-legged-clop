import { createHazard, difficultyForDistance, intersects, MAPS } from "./obstacles.js";
import { CONTROL_KEYS, createControlMapping } from "./input.js";
import { Renderer } from "./renderer.js";

const GROUND_Y = 390;
const LIMB_NAMES = Object.freeze(["leftArm", "rightArm", "leftLeg", "rightLeg"]);
const MOVING_HAZARD_MOTIONS = new Set(["arc", "sway", "walker", "roll", "gust", "swing", "cart"]);

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
    this.renderer = new Renderer(canvas, context);
    this.input = input;
    this.state = "ready";
    this.selectedMode = "normal";
    this.mode = null;
    this.controlMapping = null;
    this.prepareSecondsRemaining = 0;
    this.prepareElapsedSeconds = 0;
    this.previousMapping = this.loadPreviousMapping();
    this.map = null;
    this.nextHazardDistance = 0;
    this.elapsedSeconds = 0;
    this.lastTimestamp = null;
    this.animationFrameId = null;
    this.fallElapsedSeconds = 0;
    this.rng = Math.random;
    this.hazards = [];
    this.score = 0;
    this.obstaclesAvoided = 0;
    this.bestScore = this.loadBestScore();
    this.nextHazardId = 1;
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
    this.map = MAPS[Math.floor(this.rng() * MAPS.length)];
    this.state = "memorize";
    this.prepareSecondsRemaining = 10;
    this.prepareElapsedSeconds = 0;
    this.elapsedSeconds = 0;
    this.fallElapsedSeconds = 0;
    this.hazards = [];
    this.score = 0;
    this.distance = 0;
    this.obstaclesAvoided = 0;
    this.nextHazardId = 1;
    this.player = createPlayer();
    this.nextHazardDistance = this.randomSpawnGap();
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
    return { x: x + 30, y: y - 124 + this.getHeadOffset(), width: 39, height: 36 };
  }

  getHeadOffset() {
    const limbs = this.player.limbs;
    return (limbs.leftArm.lift + limbs.rightArm.lift) * 10
      + (limbs.leftLeg.lift + limbs.rightLeg.lift) * 3;
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

  randomSpawnGap(distance = this.distance) {
    const { minGap, maxGap } = difficultyForDistance(distance, this.mode ?? "normal");
    return minGap + this.rng() * (maxGap - minGap);
  }

  spawnHazard() {
    if (!this.map) return;
    const difficulty = difficultyForDistance(this.distance, this.mode);
    const types = this.map.hazardTypes;
    const type = types[Math.floor(this.rng() * types.length)];
    const hazard = createHazard(type, this.canvas.width + 60, GROUND_Y, this.rng);
    hazard.id = this.nextHazardId++;
    if (MOVING_HAZARD_MOTIONS.has(hazard.motion)) hazard.vx = -difficulty.movingHazardSpeed;
    this.hazards.push(hazard);
  }

  updateCourse(deltaSeconds) {
    if (this.map && this.distance >= this.nextHazardDistance) {
      this.spawnHazard();
      this.nextHazardDistance = this.distance + this.randomSpawnGap(this.distance);
    }

    for (const hazard of this.hazards) {
      hazard.age += deltaSeconds;
      hazard.x += (hazard.vx - this.player.forwardSpeed) * deltaSeconds;
      let motionOffset = 0;
      if (hazard.motion === "arc") {
        hazard.y = hazard.baseY + Math.sin(hazard.age * 4 + hazard.phase) * 22;
      } else if (hazard.motion === "sway" || hazard.motion === "swing") {
        hazard.y = hazard.baseY + Math.sin(hazard.age * 3.5 + hazard.phase) * 9;
        if (hazard.motion === "swing") motionOffset = Math.sin(hazard.age * 3 + hazard.phase) * 22;
      } else if (hazard.motion === "walker") {
        hazard.y = hazard.baseY + Math.abs(Math.sin(hazard.age * 8 + hazard.phase)) * 4;
      } else if (hazard.motion === "turnstile") {
        motionOffset = Math.sin(hazard.age * 6 + hazard.phase) * 10;
      } else if (hazard.motion === "gust") {
        hazard.y = hazard.baseY + Math.sin(hazard.age * 4 + hazard.phase) * 13;
      }
      hazard.x += motionOffset - hazard.motionOffset;
      hazard.motionOffset = motionOffset;
      hazard.armed = hazard.age >= hazard.warningDuration;
      hazard.bounds = { x: hazard.x, y: hazard.y, width: hazard.width, height: hazard.height };

      if (!hazard.resolved && hazard.armed) {
        if (intersects(this.getHeadHitbox(), hazard.bounds)) {
          hazard.resolved = true;
          this.beginFall();
          return;
        }
        const bodyContact = intersects(this.getBodyHitbox(), hazard.bounds)
          || this.getLimbHitboxes().some((limb) => intersects(limb, hazard.bounds));
        if (bodyContact) {
          hazard.resolved = true;
          this.applyHazardEffect(hazard.effect);
        }
      }

      if (!hazard.passed && !hazard.resolved && hazard.x + hazard.width < this.player.x) {
        hazard.passed = true;
        this.obstaclesAvoided += 1;
      }
    }
    this.hazards = this.hazards.filter((hazard) => hazard.x + hazard.width >= -120);
  }

  applyHazardEffect(effect) {
    const player = this.player;
    if (effect === "knockback") {
      this.distance = Math.max(0, this.distance - 35);
      this.score = Math.floor(this.distance);
      player.forwardSpeed = 0;
      player.bodyWobble = this.clamp(player.bodyWobble + 0.1, -0.18, 0.18);
    } else if (effect === "slow") {
      player.forwardSpeed *= 0.5;
    } else if (effect === "slip") {
      player.forwardSpeed *= 0.3;
      player.bodyWobble = this.clamp(player.bodyWobble + 0.08, -0.18, 0.18);
    }
  }

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  render() {
    this.renderer.render({
      state: this.state,
      mode: this.mode,
      map: this.map,
      player: this.player,
      hazards: this.hazards,
      score: this.score,
      bestScore: this.bestScore,
      distance: this.distance ?? 0,
      elapsedSeconds: this.elapsedSeconds,
      prepareSecondsRemaining: this.prepareSecondsRemaining,
      controlMapping: this.controlMapping,
    });
    if (this.state === "ready") {
      const modeLabel = this.selectedMode === "normal" ? "노말" : "하드";
      this.drawOverlay("네발 클롭", [
        "모드 선택   ←  " + modeLabel + "  →",
        "노말  ·  네 키를 누르고 있어 팔다리를 들기",
        "하드  ·  여덟 키로 들기와 내리기를 따로 조작",
        "장애물은 머리에 닿으면 넘어집니다",
        "Enter 또는 Space로 시작",
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
        "모드  " + (this.mode === "hard" ? "하드" : "노말"),
        "\uD53C\uD55C \uC7A5\uC560\uBB3C  " + this.obstaclesAvoided,
        "Enter 또는 Space로 모드 선택으로",
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

  drawOverlay(title, lines) {
    const ctx = this.context;
    const cardWidth = Math.min(690, this.canvas.width - 48);
    const lineHeight = 27;
    const cardHeight = 88 + lines.length * lineHeight;
    const x = Math.round((this.canvas.width - cardWidth) / 2);
    const y = Math.round((this.canvas.height - cardHeight) / 2);
    ctx.fillStyle = "rgba(20, 20, 34, 0.94)";
    ctx.fillRect(x, y, cardWidth, cardHeight);
    ctx.fillStyle = "#9a7658";
    ctx.fillRect(x + 4, y + 4, cardWidth - 8, 3);
    ctx.fillRect(x + 4, y + cardHeight - 7, cardWidth - 8, 3);
    ctx.fillRect(x + 4, y + 4, 3, cardHeight - 8);
    ctx.fillRect(x + cardWidth - 7, y + 4, 3, cardHeight - 8);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff0a8";
    ctx.font = "bold 27px monospace";
    ctx.fillText(title, this.canvas.width / 2, y + 39);
    ctx.fillStyle = "#f1e9d4";
    ctx.font = "bold 15px monospace";
    lines.forEach((line, index) => {
      const isModeSelection = this.state === "ready" && index === 0;
      if (isModeSelection) {
        ctx.fillStyle = "rgba(227, 186, 105, 0.16)";
        ctx.fillRect(x + 18, y + 54 + index * lineHeight, cardWidth - 36, 26);
      }
      ctx.fillStyle = isModeSelection ? "#f4cf7d" : "#e7e1d3";
      ctx.font = isModeSelection ? "bold 16px monospace" : "bold 14px monospace";
      ctx.fillText(line, this.canvas.width / 2, y + 73 + index * lineHeight, cardWidth - 36);
    });
    ctx.textAlign = "start";
  }

}
