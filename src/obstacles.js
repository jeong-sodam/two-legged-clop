export const HAZARD_TYPES = Object.freeze(["barrier", "overhead", "thrown"]);

export function difficultyForScore(score) {
  const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0;
  const level = Math.floor(safeScore / 500);
  const cappedLevel = Math.min(level, 8);
  const allowedTypes = ["barrier"];
  if (level >= 1) allowedTypes.push("overhead");
  if (level >= 2) allowedTypes.push("thrown");
  return {
    level,
    speed: 250 + cappedLevel * 22,
    spawnMin: 1.65 - cappedLevel * 0.07,
    spawnMax: 2.45 - cappedLevel * 0.08,
    allowedTypes,
  };
}

export function createHazard(type, x, groundY, rng = Math.random) {
  if (!HAZARD_TYPES.includes(type)) throw new RangeError(`Unknown hazard type: ${type}`);
  const dimensions = {
    barrier: { width: 34, height: 52, y: groundY - 52 },
    overhead: { width: 76, height: 30, y: groundY - 96 },
    // Place the thrown object in the player's body lane so it can be dodged.
    thrown: { width: 28, height: 28, y: groundY - 100 },
  }[type];
  return {
    id: 0, type, x, y: dimensions.y, baseY: dimensions.y,
    width: dimensions.width, height: dimensions.height,
    vx: 0, vy: 0, age: 0, phase: rng() * Math.PI * 2,
    sudden: false, warningDuration: 0, passed: false, resolved: false,
  };
}

export function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}
