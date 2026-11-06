import { clamp, clone3, rotateY } from './math.js';

const EPSILON = 0.00001;
const numberOr = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

/** Closest-point circle/AABB check for the horizontal capsule footprint. */
function overlaps(x, z, radius, platform) {
  const closestX = clamp(x, platform.x - platform.w / 2, platform.x + platform.w / 2);
  const closestZ = clamp(z, platform.z - platform.d / 2, platform.z + platform.d / 2);
  return (x - closestX) ** 2 + (z - closestZ) ** 2 < radius ** 2;
}

/**
 * Feet-based capsule controller independent of p5 and WebXR. The simulation
 * translates the player's origin; the headset's tracked pose is never written.
 * roomOffset is the headset's physical X/Z offset already rotated into world
 * space, so room-scale walking participates in collision and respawn placement.
 */
export class PlayerController {
  constructor(start) {
    this.position = clone3(start);
    this.checkpoint = clone3(start);
    this.yaw = 0;
    this.radius = 0.3;
    this.height = 1.7;
    this.speed = 4.6;
    this.jumpHeight = 1.6;
    this.gravity = -16;
    this.verticalVelocity = 0;
    this.grounded = false;
    this.airJumpAvailable = true;
    this.respawnCount = 0;
  }

  setCheckpoint(position) {
    this.checkpoint = clone3(position);
  }

  teleportTo(position) {
    this.position = clone3(position);
    this.verticalVelocity = 0;
    this.grounded = false;
    this.airJumpAvailable = true;
  }

  respawn(roomOffset = { x: 0, z: 0 }) {
    this.teleportTo({
      x: this.checkpoint.x - numberOr(roomOffset.x),
      y: this.checkpoint.y,
      z: this.checkpoint.z - numberOr(roomOffset.z),
    });
    this.respawnCount += 1;
  }

  /** Turn around the physical head, rather than making it orbit the XR origin. */
  snapTurn(delta, headLocal) {
    if (!Number.isFinite(delta)) return;
    if (headLocal) {
      const before = rotateY(headLocal, this.yaw);
      const after = rotateY(headLocal, this.yaw + delta);
      this.position.x += before.x - after.x;
      this.position.z += before.z - after.z;
    }
    this.yaw += delta;
  }

  update(deltaTime, input = {}, world, { blocked = false, allowJump = true } = {}) {
    const dt = clamp(numberOr(deltaTime), 0, 0.05);
    if (!dt) return;
    const platforms = world.platforms;
    const room = { x: numberOr(input.roomOffset?.x), z: numberOr(input.roomOffset?.z) };

    // Re-evaluate support before accepting a jump: walking off an edge grants
    // one air jump, but cannot reuse a stale grounded flag for a third jump.
    this.grounded = this.verticalVelocity <= 0 && platforms.some(platform => {
      const top = platform.y + platform.h / 2;
      return Math.abs(this.position.y - top) <= 0.035 &&
        overlaps(this.position.x + room.x, this.position.z + room.z, this.radius, platform);
    });
    if (this.grounded) this.airJumpAvailable = true;
    if (!blocked && allowJump && input.jumpPressed && (this.grounded || this.airJumpAvailable)) {
      if (!this.grounded) this.airJumpAvailable = false;
      this.verticalVelocity = Math.sqrt(-2 * this.gravity * this.jumpHeight);
      this.grounded = false;
    }

    const move = input.move ?? { x: 0, z: 0 };
    let mx = blocked ? 0 : numberOr(move.x);
    let mz = blocked ? 0 : numberOr(move.z);
    const magnitude = Math.hypot(mx, mz);
    if (magnitude > 1) { mx /= magnitude; mz /= magnitude; }
    const direction = rotateY({ x: mx, z: mz }, numberOr(input.headingYaw, this.yaw));

    // Small fixed-size substeps avoid tunneling through thin platform edges at
    // the largest accepted frame delta. No frame can produce a giant leap after
    // a suspended browser tab resumes.
    const steps = Math.ceil(dt / (1 / 120));
    const step = dt / steps;
    for (let index = 0; index < steps; index += 1) {
      this.moveHorizontal(direction.x * this.speed * step, direction.z * this.speed * step, room, platforms);
      this.moveVertical(step, room, platforms);
      if (this.position.y < -8) {
        this.respawn(room);
        break;
      }
    }
  }

  moveHorizontal(dx, dz, room, platforms) {
    // Resolve one axis at a time so the capsule slides along a platform wall.
    // A supported player does not collide with that platform's vertical sides.
    for (const axis of ['x', 'z']) {
      this.position[axis] += axis === 'x' ? dx : dz;
      for (const platform of platforms) {
        const bottom = platform.y - platform.h / 2;
        const top = platform.y + platform.h / 2;
        if (this.position.y >= top - EPSILON || this.position.y + this.height <= bottom + EPSILON) continue;
        const x = this.position.x + room.x;
        const z = this.position.z + room.z;
        if (!overlaps(x, z, this.radius, platform)) continue;
        const minX = platform.x - platform.w / 2;
        const maxX = platform.x + platform.w / 2;
        const minZ = platform.z - platform.d / 2;
        const maxZ = platform.z + platform.d / 2;
        // Rounded capsule corners use the actual circle radius at this cross
        // section rather than a square expansion around the entire platform.
        if (axis === 'x') {
          const separation = z - clamp(z, minZ, maxZ);
          const reach = Math.sqrt(Math.max(0, this.radius ** 2 - separation ** 2));
          const boundary = x < platform.x ? minX - reach : maxX + reach;
          this.position.x = boundary - room.x;
        } else {
          const separation = x - clamp(x, minX, maxX);
          const reach = Math.sqrt(Math.max(0, this.radius ** 2 - separation ** 2));
          const boundary = z < platform.z ? minZ - reach : maxZ + reach;
          this.position.z = boundary - room.z;
        }
      }
    }
  }

  moveVertical(dt, room, platforms) {
    const previousFeet = this.position.y;
    const previousHead = previousFeet + this.height;
    this.verticalVelocity += this.gravity * dt;
    let nextFeet = previousFeet + this.verticalVelocity * dt;
    this.grounded = false;
    for (const platform of platforms) {
      if (!overlaps(this.position.x + room.x, this.position.z + room.z, this.radius, platform)) continue;
      const top = platform.y + platform.h / 2;
      const bottom = platform.y - platform.h / 2;
      if (this.verticalVelocity <= 0 && previousFeet >= top - EPSILON && nextFeet <= top) {
        nextFeet = top;
        this.verticalVelocity = 0;
        this.grounded = true;
        this.airJumpAvailable = true;
      } else if (this.verticalVelocity > 0 && previousHead <= bottom + EPSILON && nextFeet + this.height >= bottom) {
        nextFeet = bottom - this.height;
        this.verticalVelocity = 0;
      }
    }
    this.position.y = nextFeet;
  }
}
