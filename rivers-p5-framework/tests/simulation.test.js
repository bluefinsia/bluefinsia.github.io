import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../js/world-generator.js';
import { PlayerController } from '../js/player-controller.js';
import { ArtifactSystem } from '../js/artifact-system.js';
import { rotateY } from '../js/math.js';
import { OPENING_CLUE } from '../js/data.js';

const near = (actual, expected, tolerance = 0.0001) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be near ${expected}`);
const floor = { id: 'floor', x: 0, y: -0.3, z: 0, w: 20, d: 20, h: 0.6 };
const flatWorld = () => ({ platforms: [{ ...floor }] });
const updateFor = (player, seconds, world, input = {}, options = {}) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 120) {
    player.update(1 / 120, input, world, options);
  }
};

test('seeded open worlds recreate five landmarks spread across a continuous landscape', () => {
  const a = generateWorld(2077);
  const b = generateWorld(2077);
  assert.deepEqual(a, b);
  // An alternate seed must change actual landscape content, not only metadata.
  assert.notDeepEqual(a.decor, generateWorld(2078).decor);
  assert.deepEqual(generateWorld('river'), generateWorld('river'));
  assert.equal('platforms' in a, false);
  assert.equal(a.surfaces.length, 1);
  assert.deepEqual(a.bounds, { minX: -72, maxX: 72, minZ: -112, maxZ: 32 });
  const ground = a.surfaces[0];
  assert.equal(ground.id, 'sanctuary-ground');
  assert.equal(ground.w, 144);
  assert.equal(ground.d, 144);
  near(ground.y + ground.h / 2, 0.3);
  assert.equal(a.artifacts.length, 5);
  assert.equal(a.final.unlocked, false);
  a.artifacts.forEach((artifact, index) => {
    assert.equal(artifact.index, index);
    assert.ok(artifact.position.x > a.bounds.minX + 3 && artifact.position.x < a.bounds.maxX - 3);
    assert.ok(artifact.position.z > a.bounds.minZ + 3 && artifact.position.z < a.bounds.maxZ - 3);
    near(artifact.checkpoint.x, artifact.position.x);
    near(artifact.checkpoint.z, artifact.position.z);
    near(artifact.checkpoint.y, 0.33);
    assert.equal(artifact.resolved, false);
  });
  const origin = a.artifacts[0].position;
  const direction = a.artifacts[1].position;
  assert.ok(a.artifacts.slice(2).some(({ position }) => Math.abs(
    (direction.x - origin.x) * (position.z - origin.z) -
    (direction.z - origin.z) * (position.x - origin.x)
  ) > 10), 'landmarks must occupy a two-dimensional landscape, not a single line');
});

test('ground samples across the whole open world settle without gaps or respawns', () => {
  const world = generateWorld();
  const bounds = world.bounds;
  // A reproducible low-discrepancy sample includes the outskirts and center.
  for (let index = 0; index < 96; index += 1) {
    const x = bounds.minX + 0.5 + ((index * 0.61803398875) % 1) * (bounds.maxX - bounds.minX - 1);
    const z = bounds.minZ + 0.5 + ((index * 0.41421356237) % 1) * (bounds.maxZ - bounds.minZ - 1);
    const player = new PlayerController({ x, y: 1.3, z });
    updateFor(player, 0.75, world, {}, { allowJump: false });
    near(player.position.x, x);
    near(player.position.z, z);
    near(player.position.y, 0.3);
    assert.equal(player.grounded, true);
    assert.equal(player.respawnCount, 0);
  }
});

/** Walk using ordinary analog movement; no jump, teleport or position edits. */
function walkTo(player, target, world) {
  const dt = 0.05;
  for (let step = 0; step < 6000; step += 1) {
    const x = target.x - player.position.x;
    const z = target.z - player.position.z;
    const remaining = Math.hypot(x, z);
    if (remaining < 0.02) return;
    const scale = Math.min(1, remaining / (player.speed * dt)) / remaining;
    player.update(dt, { move: { x: x * scale, z: z * scale }, headingYaw: 0 }, world, { allowJump: false });
    assert.ok(player.position.y >= 0.2999, 'walking must not descend into a hidden ground gap');
    assert.equal(player.respawnCount, 0);
  }
  assert.fail('landmark could not be reached with ordinary walking');
}

test('every artifact and the sanctuary are walkable directly and in story order without jumping', () => {
  const world = generateWorld();
  const destinations = [...world.artifacts.map(artifact => artifact.position), world.final.position];
  for (const destination of destinations) {
    const player = new PlayerController(world.start);
    walkTo(player, destination, world);
    assert.ok(Math.hypot(player.position.x - destination.x, player.position.z - destination.z) < 0.02);
  }
  const player = new PlayerController(world.start);
  for (const destination of destinations) walkTo(player, destination, world);
  assert.equal(player.respawnCount, 0);
  near(player.position.y, 0.3);
});

test('the world perimeter contains the whole VR footprint while allowing movement along the edge', () => {
  const world = generateWorld();
  const room = { x: 0.8, z: -0.4 };
  const { bounds } = world;
  const cases = [
    { position: { x: bounds.maxX - 1 - room.x, y: 0.3, z: -40 }, move: { x: 1, z: 0 }, axis: 'x', expected: bounds.maxX - 0.3 },
    { position: { x: bounds.minX + 1 - room.x, y: 0.3, z: -40 }, move: { x: -1, z: 0 }, axis: 'x', expected: bounds.minX + 0.3 },
    { position: { x: -room.x, y: 0.3, z: bounds.maxZ - 1 - room.z }, move: { x: 0, z: 1 }, axis: 'z', expected: bounds.maxZ - 0.3 },
    { position: { x: -room.x, y: 0.3, z: bounds.minZ + 1 - room.z }, move: { x: 0, z: -1 }, axis: 'z', expected: bounds.minZ + 0.3 },
  ];
  for (const item of cases) {
    const player = new PlayerController(item.position);
    updateFor(player, 2, world, { move: item.move, roomOffset: room });
    near(player.position[item.axis] + room[item.axis], item.expected);
    near(player.position.y, 0.3);
    assert.equal(player.grounded, true);
    assert.equal(player.respawnCount, 0);
  }
  const player = new PlayerController({ x: bounds.maxX - 0.3 - room.x, y: 0.3, z: -40 });
  updateFor(player, 0.5, world, { move: { x: 1, z: -1 }, roomOffset: room });
  near(player.position.x + room.x, bounds.maxX - player.radius);
  assert.ok(player.position.z < -41, 'the perimeter must permit sliding along its edge');
  // A physical sidestep beyond the edge is corrected even when UI blocks input.
  player.update(0.05, { roomOffset: { x: 3, z: -0.4 } }, world, { blocked: true });
  near(player.position.x + 3, bounds.maxX - player.radius);
  assert.equal(player.respawnCount, 0);
});

test('the controller permits one ground jump and one air jump, then resets on landing', () => {
  const world = flatWorld();
  const player = new PlayerController({ x: 0, y: 0, z: 0 });
  player.update(1 / 120, { jumpPressed: true }, world);
  assert.ok(player.position.y > 0);
  assert.ok(player.verticalVelocity > 0);
  assert.equal(player.airJumpAvailable, true);
  updateFor(player, 0.15, world);
  const beforeSecond = player.verticalVelocity;
  player.update(1 / 120, { jumpPressed: true }, world);
  assert.ok(player.verticalVelocity > beforeSecond);
  assert.equal(player.airJumpAvailable, false);
  const beforeThird = player.verticalVelocity;
  player.update(1 / 120, { jumpPressed: true }, world);
  assert.ok(player.verticalVelocity < beforeThird);
  updateFor(player, 2, world);
  near(player.position.y, 0);
  assert.equal(player.grounded, true);
  assert.equal(player.airJumpAvailable, true);
});

test('walking off an isolated ledge fixture retains exactly one air jump', () => {
  const world = { platforms: [{ ...floor, w: 1, d: 1 }] };
  const player = new PlayerController({ x: 0, y: 0, z: 0 });
  updateFor(player, 0.25, world, { move: { x: 1, z: 0 } });
  assert.equal(player.grounded, false);
  assert.equal(player.airJumpAvailable, true);
  player.update(1 / 120, { jumpPressed: true }, world);
  assert.ok(player.verticalVelocity > 0);
  assert.equal(player.airJumpAvailable, false);
  const velocity = player.verticalVelocity;
  player.update(1 / 120, { jumpPressed: true }, world);
  assert.ok(player.verticalVelocity < velocity);
});

test('capsule lands on the highest crossed surface and cannot pass a low ceiling', () => {
  const world = flatWorld();
  const player = new PlayerController({ x: 0, y: 3, z: 0 });
  player.verticalVelocity = -15;
  updateFor(player, 0.3, world);
  near(player.position.y, 0);
  assert.equal(player.grounded, true);
  world.platforms.push({ id: 'ceiling', x: 0, y: 2.3, z: 0, w: 4, d: 4, h: 0.6 });
  player.update(0.05, { jumpPressed: true }, world);
  assert.ok(player.position.y + player.height <= 2 + 0.0001);
  assert.ok(player.verticalVelocity <= 0);
  updateFor(player, 0.5, world);
  near(player.position.y, 0);
});

test('solid side collisions block entry and slide along a wall', () => {
  const wall = { id: 'wall', x: 1.3, y: 1, z: 0, w: 0.6, d: 8, h: 2 };
  const world = { platforms: [{ ...floor }, wall] };
  const player = new PlayerController({ x: 0, y: 0, z: 0 });
  updateFor(player, 0.5, world, { move: { x: 1, z: -1 } });
  assert.ok(player.position.x <= 0.7001);
  assert.ok(player.position.z < -1);
  near(player.position.y, 0);
});

test('movement uses heading yaw, normalizes diagonal input, and caps frame delta', () => {
  const world = flatWorld();
  const straight = new PlayerController({ x: 0, y: 0, z: 0 });
  straight.update(0.05, { move: { x: 0, z: -1 }, headingYaw: Math.PI / 2 }, world);
  near(straight.position.x, -straight.speed * 0.05);
  near(straight.position.z, 0);
  const diagonal = new PlayerController({ x: 0, y: 0, z: 0 });
  diagonal.update(100, { move: { x: 1, z: 1 } }, world);
  near(Math.hypot(diagonal.position.x, diagonal.position.z), diagonal.speed * 0.05);
});

test('blocked UI stops locomotion and jumping while gravity still lands the player', () => {
  const world = flatWorld();
  const player = new PlayerController({ x: 0, y: 1, z: 0 });
  updateFor(player, 1, world, { move: { x: 1, z: 1 }, jumpPressed: true }, { blocked: true });
  near(player.position.x, 0);
  near(player.position.z, 0);
  near(player.position.y, 0);
  assert.equal(player.grounded, true);
  player.update(0.05, { jumpPressed: true }, world, { allowJump: false });
  near(player.position.y, 0);
});

test('falling returns the physical VR footprint to the latest checkpoint', () => {
  const world = { platforms: [] };
  const player = new PlayerController({ x: 0, y: 0, z: 0 });
  player.setCheckpoint({ x: 4, y: 0.33, z: -14 });
  player.teleportTo({ x: 90, y: -7.9, z: 50 });
  player.verticalVelocity = -10;
  player.update(0.05, { roomOffset: { x: 0.8, z: -0.4 } }, world);
  assert.equal(player.respawnCount, 1);
  near(player.position.x + 0.8, 4);
  near(player.position.z - 0.4, -14);
  near(player.position.y, 0.33);
  near(player.verticalVelocity, 0);
  assert.equal(player.airJumpAvailable, true);
});

test('room-scale footprint participates in floor and wall collision', () => {
  const world = { platforms: [{ ...floor, w: 1, d: 1 }] };
  const player = new PlayerController({ x: 0, y: 0, z: 0 });
  player.update(0.05, { roomOffset: { x: 2, z: 0 } }, world);
  assert.equal(player.grounded, false);
  assert.ok(player.position.y < 0);
});

test('snap turning preserves physical head position without changing its local pose', () => {
  const player = new PlayerController({ x: 1, y: 0, z: 2 });
  const head = { x: 0.6, y: 1.65, z: -0.3 };
  const originalHead = { ...head };
  const before = rotateY(head, player.yaw);
  before.x += player.position.x;
  before.z += player.position.z;
  player.snapTurn(Math.PI / 4, head);
  const after = rotateY(head, player.yaw);
  near(after.x + player.position.x, before.x);
  near(after.z + player.position.z, before.z);
  assert.deepEqual(head, originalHead);
});

test('story starts with the opening journal and only allows the next artifact nearby', () => {
  const world = generateWorld();
  const story = new ArtifactSystem(world);
  assert.equal(story.journalOpen, true);
  assert.equal(story.clue, OPENING_CLUE);
  assert.equal(story.interact(world.artifacts[0].position), false);
  story.close();
  assert.equal(story.interact(world.artifacts[1].position), false);
  assert.equal(story.interact({ x: NaN, y: 0, z: 0 }), false);
  assert.equal(story.interact(world.artifacts[0].position), true);
  assert.equal(story.isBlocked, true);
  assert.equal(story.pending, world.artifacts[0]);
  assert.equal(story.listen(), world.artifacts[0]);
  assert.equal(story.clue, world.artifacts[0].definition.verse);
  story.close();
  assert.equal(story.foundCount, 0);
  assert.equal(world.artifacts[0].resolved, false);
  assert.equal(story.pending, null);
  assert.equal(story.listen(), null);
});

test('confirmation rechecks distance and choice, and a repeated confirmation cannot collect twice', () => {
  const world = generateWorld();
  const story = new ArtifactSystem(world);
  story.close();
  const artifact = world.artifacts[0];
  story.interact(artifact.position);
  assert.equal(story.resolve('steal', artifact.position), null);
  assert.equal(story.resolve('restore', { ...artifact.position, x: artifact.position.x + 4 }), null);
  assert.equal(story.resolve('restore', { ...artifact.position, y: NaN }), null);
  assert.equal(story.foundCount, 0);
  assert.equal(story.resolve('photograph', artifact.position), artifact);
  assert.equal(artifact.resolved, true);
  assert.equal(artifact.restored, false);
  assert.equal(artifact.choice, 'photograph');
  assert.equal(story.foundCount, 1);
  assert.equal(story.journalOpen, true);
  assert.equal(story.lastDiscovery, artifact);
  assert.equal(story.resolve('restore', artifact.position), null);
  assert.equal(story.foundCount, 1);
});

test('all five artifacts unlock the sanctuary, which requires proximity and closed UI', () => {
  const world = generateWorld();
  const story = new ArtifactSystem(world);
  story.close();
  assert.equal(story.enterSanctuary(world.final.position), false);
  for (let index = 0; index < 5; index += 1) {
    const artifact = world.artifacts[index];
    assert.equal(story.currentArtifact, artifact);
    assert.equal(story.interact(artifact.position), true);
    assert.equal(story.resolve(index % 2 === 0 ? 'restore' : 'photograph', artifact.position), artifact);
    assert.equal(artifact.restored, index % 2 === 0);
    assert.equal(world.final.unlocked, index === 4);
    assert.equal(story.foundCount, index + 1);
    assert.equal(story.enterSanctuary(world.final.position), false);
    story.close();
  }
  assert.equal(story.currentArtifact, null);
  assert.equal(story.enterSanctuary({ ...world.final.position, z: 0 }), false);
  assert.equal(story.enterSanctuary(world.final.position), true);
  assert.equal(story.completed, true);
  assert.equal(story.isBlocked, true);
  assert.equal(story.enterSanctuary(world.final.position), false);
  story.reset();
  assert.equal(story.foundCount, 0);
  assert.equal(story.completed, false);
  assert.equal(story.journalOpen, true);
  assert.equal(story.clue, OPENING_CLUE);
  assert.equal(world.final.unlocked, false);
  assert.ok(world.artifacts.every(artifact => !artifact.resolved && !artifact.restored && artifact.choice === null));
});
