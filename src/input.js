const SUPPORTED_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "Enter",
  "Space",
]);

const LIMBS = Object.freeze(["leftArm", "rightArm", "leftLeg", "rightLeg"]);
const MODIFIERS = new Set(["ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"]);

export const CONTROL_KEYS = Object.freeze([
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => "Key" + letter),
  ..."0123456789".split("").map((digit) => "Digit" + digit),
  "Minus", "Equal", "BracketLeft", "BracketRight", "Backslash",
  "Semicolon", "Quote", "Backquote", "Comma", "Period", "Slash",
]);

function normalizedMappingKey(mode, mapping) {
  return JSON.stringify([mode, ...LIMBS.flatMap((limb) => [
    mapping[limb]?.raise ?? null,
    mapping[limb]?.lower ?? null,
  ])]);
}

function mappingFrom(keys, mode) {
  const mapping = {};
  LIMBS.forEach((limb, index) => {
    mapping[limb] = {
      raise: keys[index],
      lower: mode === "hard" ? keys[index + LIMBS.length] : null,
    };
  });
  return mapping;
}

export function createControlMapping(mode, rng = Math.random, previous = null) {
  if (mode !== "normal" && mode !== "hard") {
    throw new RangeError("Unknown control mode: " + mode);
  }

  const keyCount = mode === "normal" ? 4 : 8;
  const previousKey = previous?.mode && previous?.mapping
    ? normalizedMappingKey(previous.mode, previous.mapping)
    : null;
  let mapping;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const shuffled = [...CONTROL_KEYS];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    mapping = mappingFrom(shuffled.slice(0, keyCount), mode);
    if (normalizedMappingKey(mode, mapping) !== previousKey) return mapping;
  }

  // Guarantee a different consecutive mapping if a caller supplies a constant RNG.
  const fallback = CONTROL_KEYS.slice(0, keyCount);
  if (normalizedMappingKey(mode, mappingFrom(fallback, mode)) === previousKey) {
    fallback.push(fallback.shift());
  }
  return mappingFrom(fallback, mode);
}

export class Input {
  constructor(target = window) {
    this.target = target;
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.controlMapping = null;

    this.handleKeyDown = (event) => {
      const mapped = this.isMapped(event.code);
      if (!mapped && !SUPPORTED_KEYS.has(event.code)) return;
      if (mapped && (event.ctrlKey || event.altKey || event.metaKey || MODIFIERS.has(event.code))) return;
      event.preventDefault();
      if (!this.down.has(event.code)) this.pressed.add(event.code);
      this.down.add(event.code);
    };

    this.handleKeyUp = (event) => {
      if (!this.down.has(event.code) && !SUPPORTED_KEYS.has(event.code) && !this.isMapped(event.code)) return;
      event.preventDefault();
      if (this.down.has(event.code)) this.released.add(event.code);
      this.down.delete(event.code);
    };

    this.handleBlur = () => this.clear();

    this.target.addEventListener("keydown", this.handleKeyDown);
    this.target.addEventListener("keyup", this.handleKeyUp);
    this.target.addEventListener("blur", this.handleBlur);
  }

  setControlMapping(mapping) {
    this.controlMapping = mapping;
  }

  isMapped(code) {
    if (!this.controlMapping) return false;
    return Object.values(this.controlMapping).some(({ raise, lower }) => raise === code || lower === code);
  }

  isDown(code) {
    return this.down.has(code);
  }

  consumePressed(code) {
    const wasPressed = this.pressed.has(code);
    this.pressed.delete(code);
    return wasPressed;
  }

  consumeReleased(code) {
    const wasReleased = this.released.has(code);
    this.released.delete(code);
    return wasReleased;
  }

  clear() {
    this.down.clear();
    this.pressed.clear();
    this.released.clear();
  }

  destroy() {
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.handleBlur);
    this.handleBlur();
  }
}
