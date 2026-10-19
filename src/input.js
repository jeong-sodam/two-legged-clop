const SUPPORTED_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "Enter",
  "Space",
]);

export class Input {
  constructor(target = window) {
    this.target = target;
    this.down = new Set();
    this.pressed = new Set();

    this.handleKeyDown = (event) => {
      if (!SUPPORTED_KEYS.has(event.code)) return;
      event.preventDefault();
      if (!this.down.has(event.code)) this.pressed.add(event.code);
      this.down.add(event.code);
    };

    this.handleKeyUp = (event) => {
      if (!SUPPORTED_KEYS.has(event.code)) return;
      event.preventDefault();
      this.down.delete(event.code);
    };

    this.handleBlur = () => {
      this.down.clear();
      this.pressed.clear();
    };

    this.target.addEventListener("keydown", this.handleKeyDown);
    this.target.addEventListener("keyup", this.handleKeyUp);
    this.target.addEventListener("blur", this.handleBlur);
  }

  isDown(code) {
    return this.down.has(code);
  }

  consumePressed(code) {
    const wasPressed = this.pressed.has(code);
    this.pressed.delete(code);
    return wasPressed;
  }

  destroy() {
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.handleBlur);
    this.handleBlur();
  }
}
