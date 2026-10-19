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

  update(deltaSeconds) {
    if (this.state === "ready") {
      const enterPressed = this.input.consumePressed("Enter");
      const spacePressed = this.input.consumePressed("Space");
      if (enterPressed || spacePressed) this.state = "playing";
      return;
    }

    if (this.state === "falling") {
      this.fallElapsedSeconds += deltaSeconds;
      if (this.fallElapsedSeconds >= 0.65) this.state = "gameover";
      return;
    }

    if (this.state !== "playing") return;

    this.updateLegs(deltaSeconds);
    this.updateMovement(deltaSeconds);
    this.updateBalance(deltaSeconds);

    if (Math.abs(this.player.balance) >= 1) {
      this.state = "falling";
      this.fallElapsedSeconds = 0;
    }
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

    ctx.fillStyle = "#5424b8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#4d2850";
    ctx.fillRect(0, 390, canvas.width, 150);

    ctx.fillStyle = "#83a632";
    ctx.fillRect(0, 382, canvas.width, 8);
    ctx.fillStyle = "#b4cc4b";
    for (let x = 0; x < canvas.width; x += 22) {
      ctx.fillRect(x + 4, 376 - (x % 3) * 2, 3, 8 + (x % 3) * 2);
    }

    this.drawBalanceMeter(ctx);
    this.drawPlayer(ctx);
    this.drawStateMessage(ctx);
  }

  drawBalanceMeter(ctx) {
    const { balance } = this.player;
    const x = 32;
    const y = 34;
    const width = 180;
    const height = 12;
    const center = x + width / 2;
    const amount = Math.round(Math.min(1, Math.abs(balance)) * width / 2);
    const color = Math.abs(balance) >= 0.85
      ? "#e54b52"
      : Math.abs(balance) >= 0.65
        ? "#f0bc4e"
        : "#79c65a";

    ctx.fillStyle = "#28233b";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = color;
    ctx.fillRect(balance < 0 ? center - amount : center, y, amount, height);
    ctx.fillStyle = "#fff0a8";
    ctx.fillRect(center - 2, y - 3, 4, height + 6);
    ctx.fillStyle = "#f1e9d4";
    ctx.font = "bold 14px monospace";
    ctx.fillText("균형", x, y - 8);
  }

  drawPlayer(ctx) {
    const { player } = this;
    const fallingProgress = this.state === "falling"
      ? this.clamp(this.fallElapsedSeconds / 0.65, 0, 1)
      : 0;
    const leanDirection = Math.sign(player.balance) || 1;
    const rotation = fallingProgress * leanDirection * Math.PI / 2;
    const torsoTop = player.crouching ? -112 : -126;
    const headTop = player.crouching ? -140 : -154;
    const hipY = player.crouching ? -50 : -55;
    const leftLift = Math.round(player.leftFoot * 34);
    const rightLift = Math.round(player.rightFoot * 34);

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.translate(0, -75);
    ctx.rotate(rotation);
    ctx.translate(0, 75);
    ctx.globalAlpha = 1 - fallingProgress * 0.55;

    ctx.fillStyle = "#28233b";
    ctx.fillRect(-14, headTop, 28, 29);
    ctx.fillRect(-18, torsoTop, 36, 72);

    if (player.crouching) {
      ctx.fillRect(-26, torsoTop + 21, 12, 37);
      ctx.fillRect(14, torsoTop + 21, 12, 37);
    } else {
      ctx.fillRect(-25, torsoTop + 10, 9, 52);
      ctx.fillRect(16, torsoTop + 10, 9, 52);
    }

    this.drawLeg(ctx, -10, hipY, leftLift);
    this.drawLeg(ctx, 2, hipY, rightLift);
    ctx.fillRect(-16, -leftLift - 7, 17, 7);
    ctx.fillRect(0, -rightLift - 7, 17, 7);

    ctx.fillStyle = "#f1e9d4";
    ctx.fillRect(5, headTop + 11, 3, 3);
    ctx.restore();
  }

  drawLeg(ctx, x, hipY, lift) {
    const footY = -lift - 7;
    const kneeY = Math.round((hipY + footY) / 2);
    const upperHeight = Math.max(3, kneeY - hipY);
    const lowerHeight = Math.max(3, footY - kneeY);

    ctx.fillStyle = "#28233b";
    ctx.fillRect(x, hipY, 10, upperHeight);
    ctx.fillRect(x + 1, kneeY, 8, lowerHeight);
  }

  drawStateMessage(ctx) {
    if (this.state !== "ready" && this.state !== "gameover") return;
    const isReady = this.state === "ready";
    ctx.fillStyle = "rgba(22, 17, 36, 0.82)";
    ctx.fillRect(270, 196, 420, 66);
    ctx.fillStyle = "#fff0a8";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText(isReady ? "Enter 또는 Space를 눌러 시작" : "균형을 잃었습니다", 480, 237);
    ctx.textAlign = "start";
  }
}
