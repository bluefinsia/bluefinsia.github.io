import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../js/platform-generator.js';
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

test('seeded worlds recreate the complete ordered, reachable trail', () => {
  const a = generateWorld(2077);
  const b = generateWorld(2077);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.platforms, generateWorld(2078).platforms);
  assert.deepEqual(generateWorld('river').platforms, generateWorld('river').platforms);
  assert.equal(a.platforms.length, 13);
  assert.equal(a.artifacts.length, 5);
  assert.equal(a.final.unlocked, false);
  a.platforms.forEach((platform, index) => {
    near(platform.z, -index * 7);
    assert.ok(Math.abs(platform.x) <= 0.7);
    assert.ok(Math.abs(platform.y) <= 0.12);
    assert.equal(platform.w, 6);
    assert.equal(platform.d, 6);
    assert.equal(platform.h, 0.6);
    const expectedStation = index >= 2 && index <= 10 && index % 2 === 0 ? index / 2 - 1 : null;
    assert.equal(platform.stationIndex, expectedStation);
  });
  a.artifacts.forEach((artifact, index) => {
    const platform = a.platforms[(index + 1) * 2];
    assert.equal(artifact.index, index);
    near(artifact.position.x, platform.x);
    near(artifact.position.z, platform.z);
    near(artifact.position.y, platform.y + platform.h / 2 + 1.2);
    near(artifact.checkpoint.y, platform.y + platform.h / 2 + 0.03);
    assert.equal(artifact.resolved, false);
  });
  near(a.final.position.z, -84);
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

test('walking off a platform retains exactly one air jump', () => {
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

test('platform side collisions block entry and slide along a wall', () => {
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
