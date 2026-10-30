
export const MAPS = Object.freeze([
  Object.freeze({ id: "moss-forest", name: "이끼 숲", hazardTypes: Object.freeze(["slippery-log", "monkey-banana", "ground-spear", "knockback-snake"]) }),
  Object.freeze({ id: "subway", name: "지하철 플랫폼", hazardTypes: Object.freeze(["commuter", "train-edge", "turnstile"]) }),
  Object.freeze({ id: "factory", name: "버려진 공장", hazardTypes: Object.freeze(["conveyor", "piston", "rolling-gear"]) }),
  Object.freeze({ id: "windy-rooftop", name: "바람 부는 옥상", hazardTypes: Object.freeze(["gust", "swinging-sign", "low-wire"]) }),
  Object.freeze({ id: "night-market", name: "비 내리는 야시장", hazardTypes: Object.freeze(["puddle", "cart", "steam-vent"]) }),
]);

const HAZARD_CONFIG = Object.freeze({
  "slippery-log": { width: 82, height: 20, topOffset: 20, effect: "slip", motion: "static", warningDuration: 0 },
  "monkey-banana": { width: 22, height: 20, topOffset: 62, effect: "knockback", motion: "arc", warningDuration: 0 },
  "ground-spear": { width: 22, height: 110, topOffset: 110, effect: "none", motion: "trap", warningDuration: 0.7 },
  "knockback-snake": { width: 66, height: 28, topOffset: 28, effect: "knockback", motion: "sway", warningDuration: 0 },
  commuter: { width: 42, height: 62, topOffset: 62, effect: "knockback", motion: "walker", warningDuration: 0 },
  "train-edge": { width: 100, height: 32, topOffset: 124, effect: "none", motion: "train", warningDuration: 0 },
  turnstile: { width: 48, height: 52, topOffset: 52, effect: "slow", motion: "turnstile", warningDuration: 0 },
  conveyor: { width: 100, height: 16, topOffset: 16, effect: "slow", motion: "conveyor", warningDuration: 0 },
  piston: { width: 40, height: 118, topOffset: 118, effect: "none", motion: "trap", warningDuration: 0.6 },
  "rolling-gear": { width: 48, height: 48, topOffset: 48, effect: "knockback", motion: "roll", warningDuration: 0 },
  gust: { width: 116, height: 64, topOffset: 88, effect: "knockback", motion: "gust", warningDuration: 0 },
  "swinging-sign": { width: 58, height: 52, topOffset: 136, effect: "knockback", motion: "swing", warningDuration: 0 },
  "low-wire": { width: 112, height: 12, topOffset: 120, effect: "none", motion: "wire", warningDuration: 0 },
  puddle: { width: 94, height: 14, topOffset: 14, effect: "slip", motion: "puddle", warningDuration: 0 },
  cart: { width: 76, height: 44, topOffset: 44, effect: "knockback", motion: "cart", warningDuration: 0 },
  "steam-vent": { width: 52, height: 112, topOffset: 112, effect: "slow", motion: "trap", warningDuration: 0.8 },
});

export const HAZARD_TYPES = Object.freeze(Object.keys(HAZARD_CONFIG));

export function difficultyForDistance(distance, mode) {
  if (mode !== "normal" && mode !== "hard") throw new RangeError(`Unknown difficulty mode: ${mode}`);
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const level = Math.min(8, Math.floor(safeDistance / 300));
  const isHard = mode === "hard";
  const movingHazardSpeed = isHard ? 100 + 14 * level : 70 + 12 * level;
  const minGap = isHard ? Math.max(160, 280 - 15 * level) : Math.max(200, 360 - 20 * level);
  const maxGap = isHard ? Math.max(160, 390 - 15 * level) : Math.max(200, 500 - 20 * level);
  return { level, movingHazardSpeed, minGap, maxGap };
}

export function createHazard(type, x, groundY, rng = Math.random) {
  const config = HAZARD_CONFIG[type];
  if (!config) throw new RangeError(`Unknown hazard type: ${type}`);
  const y = groundY - config.topOffset;
  return {
    id: 0,
    type,
    x,
    y,
    baseY: y,
    width: config.width,
    height: config.height,
    bounds: { x, y, width: config.width, height: config.height },
    vx: 0,
    age: 0,
    phase: rng() * Math.PI * 2,
    motion: config.motion,
    motionOffset: 0,
    effect: config.effect,
    warningDuration: config.warningDuration,
    armed: config.warningDuration === 0,
    passed: false,
    resolved: false,
  };
}

export function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}
