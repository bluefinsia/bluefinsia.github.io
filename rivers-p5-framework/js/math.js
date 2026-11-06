/** Small, renderer-independent helpers. All world distances are in meters. */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (from, to, amount) => from + (to - from) * amount;
export const clone3 = ({ x = 0, y = 0, z = 0 }) => ({ x, y, z });

/** Euclidean distance. Missing Y coordinates are treated as ground-level. */
export function distance(a, b) {
  return Math.hypot(a.x - b.x, (a.y ?? 0) - (b.y ?? 0), a.z - b.z);
}

/** Normalize a horizontal vector, with a safe zero-vector result. */
export function normalize2({ x = 0, z = 0 }) {
  const length = Math.hypot(x, z);
  return length > 0 ? { x: x / length, z: z / length } : { x: 0, z: 0 };
}

/** Rotate a vector about +Y; a local forward vector points along -Z. */
export function rotateY({ x = 0, y = 0, z = 0 }, yaw) {
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return { x: cosine * x + sine * z, y, z: -sine * x + cosine * z };
}
