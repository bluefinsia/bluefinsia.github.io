import { ARTIFACTS } from './data.js';

/** Hash strings as well as numeric seeds, so a saved seed recreates the route. */
function seedNumber(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  let hash = 2166136261;
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seedNumber(seed);
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a complete, reachable trail without relying on p5's global random
 * state. Six-meter platforms have one-meter gaps: ordinary movement plus a
 * single jump can cross them. The double jump offers a generous safety margin.
 * Platform Y is its CENTER; player/checkpoint Y is the player's FEET.
 */
export function generateWorld(seed = 2077) {
  const random = seededRandom(seed);
  const platforms = Array.from({ length: 13 }, (_, index) => ({
    id: `platform-${index}`,
    x: index === 0 ? 0 : (random() * 2 - 1) * 0.7,
    y: index === 0 ? 0 : (random() * 2 - 1) * 0.12,
    z: -index * 7,
    w: 6,
    d: 6,
    h: 0.6,
    stationIndex: index >= 2 && index <= 10 && index % 2 === 0 ? index / 2 - 1 : null,
  }));

  const artifacts = ARTIFACTS.map((definition, index) => {
    const platform = platforms[(index + 1) * 2];
    const surface = platform.y + platform.h / 2;
    return {
      index,
      id: definition.id,
      definition,
      position: { x: platform.x, y: surface + 1.2, z: platform.z },
      checkpoint: { x: platform.x, y: surface + 0.03, z: platform.z },
      resolved: false,
      restored: false,
      choice: null,
    };
  });
  const last = platforms[12];
  return {
    seed,
    platforms,
    artifacts,
    final: { position: { x: last.x, y: last.y + last.h / 2, z: last.z }, unlocked: false },
    start: { x: 0, y: platforms[0].y + platforms[0].h / 2 + 0.03, z: 0 },
    waterY: -0.9,
  };
}
