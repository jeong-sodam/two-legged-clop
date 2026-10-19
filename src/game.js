export class Game {
  constructor(canvas, context) {
    this.canvas = canvas;
    this.context = context;
    this.state = "ready";
    this.elapsedSeconds = 0;
    this.lastTimestamp = null;
    this.animationFrameId = null;
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
    if (this.state === "playing") {
      this.elapsedSeconds += deltaSeconds;
    }
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

    // 임시 사람 실루엣입니다. 이후 작업에서 픽셀 아트로 교체합니다.
    ctx.fillStyle = "#28233b";
    ctx.fillRect(462, 264, 36, 72);
    ctx.fillRect(466, 236, 28, 29);
    ctx.fillRect(455, 274, 8, 52);
    ctx.fillRect(497, 274, 8, 52);
    ctx.fillRect(464, 334, 12, 48);
    ctx.fillRect(484, 334, 12, 48);
    ctx.fillRect(458, 379, 21, 7);
    ctx.fillRect(481, 379, 21, 7);

    ctx.fillStyle = "#f1e9d4";
    ctx.fillRect(475, 247, 3, 3);
  }
}

