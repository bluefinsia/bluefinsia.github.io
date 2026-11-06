/**
 * All the artwork in the prototype is built from p5 WEBGL primitives. The scene
 * therefore runs without downloaded models, textures, or a separate asset build.
 *
 * Coordinate convention: metres, +Y up, and -Z forward. Camera ownership belongs
 * to main.js / the WebXR bridge: this file deliberately never sets a camera,
 * projection matrix, or eye transform. It also works with a WEBGL p5.Graphics,
 * which lets the research camera render the same world into a photograph.
 */

const PI = Math.PI;
const TAU = PI * 2;
const COLORS = {
  sky: [26, 47, 57],
  stone: [142, 158, 145],
  stoneTop: [178, 188, 163],
  edge: [69, 115, 111],
  dark: [31, 67, 72],
  cyan: [95, 231, 214],
  gold: [246, 205, 131],
  rose: [224, 157, 146],
};

// A deterministic decorative variation; rendering never advances game state or
// changes the platform generator's random seed.
function variation(n) {
  const value = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function stone(p, color = COLORS.stone) {
  p.ambientMaterial(...color);
}

function glow(p, color = COLORS.cyan) {
  p.emissiveMaterial(...color);
}

function block(p, x, y, z, w, h, d, color) {
  p.push();
  p.translate(x, y, z);
  stone(p, color);
  p.box(w, h, d);
  p.pop();
}

function orb(p, x, y, z, radius, color, scaleY = 1) {
  p.push();
  p.translate(x, y, z);
  p.scale(1, scaleY, 1);
  glow(p, color);
  p.sphere(radius, 12, 8);
  p.pop();
}

/** Flat ring in the X/Z plane: useful for water ripples and interaction cues. */
function groundRing(p, x, y, z, radius, tube, color) {
  p.push();
  p.translate(x, y, z);
  p.rotateX(PI / 2);
  glow(p, color);
  p.torus(radius, tube, 24, 4);
  p.pop();
}

/**
 * A square, slightly upturned roof. Explicit normals make the four large faces
 * pick up different light, producing a simple painterly, low-polygon silhouette.
 */
function roof(p, x, y, z, width, depth, rise, color = COLORS.dark) {
  const corners = [
    [-width / 2, 0.06, -depth / 2],
    [width / 2, 0.06, -depth / 2],
    [width / 2, 0.06, depth / 2],
    [-width / 2, 0.06, depth / 2],
  ];
  p.push();
  p.translate(x, y, z);
  stone(p, color);
  p.beginShape(p.TRIANGLES);
  for (let i = 0; i < 4; i += 1) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    // Cross (b-a) with (apex-a); normalize it for predictable light intensity.
    const ax = b[0] - a[0];
    const az = b[2] - a[2];
    const bx = -a[0];
    const by = rise - a[1];
    const bz = -a[2];
    const nx = -az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by;
    const length = Math.hypot(nx, ny, nz) || 1;
    p.normal(-nx / length, -ny / length, -nz / length);
    p.vertex(...a);
    p.vertex(0, rise, 0);
    p.vertex(...b);
  }
  p.endShape();
  p.pop();
}

function drawSky(p, time) {
  p.background(...COLORS.sky);
  p.push();
  p.noStroke();

  // The warm moon is far beyond the ruins. Its position does not track the
  // desktop camera, so stereo eyes and photographs share the same composition.
  orb(p, 60, 54, -180, 10, [233, 222, 173]);
  p.push();
  p.translate(60, 54, -181);
  glow(p, [67, 107, 112]);
  p.torus(12.4, 0.055, 32, 4);
  p.pop();

  // Broad ribbons suggest the GDD's impossible rivers in the sky. Each ribbon
  // is one small mesh instead of dozens of transparent particles.
  for (let river = 0; river < 2; river += 1) {
    glow(p, river === 0 ? [58, 104, 111] : [44, 86, 96]);
    p.beginShape(p.TRIANGLE_STRIP);
    for (let i = 0; i <= 30; i += 1) {
      const z = 45 - i * 8;
      const x = (river === 0 ? -45 : 55) + Math.sin(i * 0.26 + river) * 12;
      const y = 29 + Math.cos(i * 0.19 + river) * 6;
      p.vertex(x - 5, y, z);
      p.vertex(x + 5, y + 0.13, z);
    }
    p.endShape();
  }

  // Tiny stars use a single batched POINTS shape. Keep them subtle enough that
  // the navigable path remains the clearest shape in the scene.
  p.stroke(150, 189, 184);
  p.strokeWeight(0.015);
  p.beginShape(p.POINTS);
  for (let i = 0; i < 44; i += 1) {
    p.vertex((variation(i + 1) - 0.5) * 210,
      26 + variation(i + 72) * 45, -80 - variation(i + 140) * 150);
  }
  p.endShape();
  p.noStroke();

  // Distant islands are deliberately close to the sky color: a cheap, stable
  // atmospheric-depth cue that also looks consistent in both headset eyes.
  for (let i = 0; i < 8; i += 1) {
    p.push();
    p.translate((i % 2 ? 1 : -1) * (93 + variation(i) * 20),
      -3.4, 20 - i * 24);
    p.scale(18, 8 + variation(i + 8) * 8, 14);
    glow(p, [34, 64, 73]);
    p.sphere(1, 8, 5);
    p.pop();
  }
  p.pop();
}

function groundHeight(world) {
  const surface = world.surfaces?.[0];
  return surface ? surface.y + surface.h / 2 : 0.3;
}

/** One low-poly, slightly irregular patch, lying directly on the ground. */
function groundPatch(p, x, y, z, width, depth, seed, color) {
  stone(p, color);
  p.beginShape(p.TRIANGLE_FAN);
  p.normal(0, 1, 0);
  p.vertex(x, y, z);
  for (let edge = 0; edge <= 20; edge += 1) {
    const angle = ((edge % 20) / 20) * TAU;
    const radius = 0.94 + variation(seed + (edge % 20) * 4) * 0.06;
    p.vertex(x + Math.cos(angle) * width * 0.5 * radius, y,
      z + Math.sin(angle) * depth * 0.5 * radius);
  }
  p.endShape();
}

function drawTerrain(p, world) {
  const surfaces = world.surfaces ?? [{ x: 0, y: 0, z: -40, w: 144, d: 144, h: 0.6 }];
  for (const surface of surfaces) {
    // The single continuous top matches collision. Lawn, paths, and shallow
    // water are visual treatments of this same surface: walking needs no jumps.
    block(p, surface.x, surface.y, surface.z, surface.w, surface.h, surface.d,
      [104, 141, 117]);
  }
  const bounds = world.bounds ?? { minX: -72, maxX: 72, minZ: -112, maxZ: 32 };
  const y = groundHeight(world);
  for (let patch = 0; patch < 25; patch += 1) {
    const x = bounds.minX + 6 + variation(patch + 209) * (bounds.maxX - bounds.minX - 12);
    const z = bounds.minZ + 6 + variation(patch + 309) * (bounds.maxZ - bounds.minZ - 12);
    groundPatch(p, x, y + 0.003 + (patch % 3) * 0.001, z,
      9 + variation(patch + 409) * 15, 6 + variation(patch + 509) * 13,
      patch * 29, patch % 2 ? [94, 133, 111] : [115, 148, 115]);
  }
}

/** A smooth broad strip. Averaged tangents avoid seams at winding path joins. */
function pathStrip(p, points, width, y, color) {
  if (!points || points.length < 2) return;
  stone(p, color);
  p.beginShape(p.TRIANGLE_STRIP);
  p.normal(0, 1, 0);
  for (let i = 0; i < points.length; i += 1) {
    const previous = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz) || 1;
    const nx = (dz / length) * width / 2;
    const nz = (-dx / length) * width / 2;
    p.vertex(points[i].x + nx, y, points[i].z + nz);
    p.vertex(points[i].x - nx, y, points[i].z - nz);
  }
  p.endShape();
}

function drawPaths(p, world) {
  const y = groundHeight(world);
  for (const path of world.paths ?? []) {
    // Broad sandstone trails are useful visual suggestions, not rails or
    // colliders. All the surrounding grass is equally free to explore.
    pathStrip(p, path.points, (path.width ?? 3) + 0.5, y + 0.012, [135, 157, 122]);
    pathStrip(p, path.points, path.width ?? 3, y + 0.016, [177, 180, 144]);
  }
}

function drawWater(p, world, time) {
  const waterY = world.waterY ?? groundHeight(world) + 0.04;
  for (const [index, pond] of (world.ponds ?? []).entries()) {
    const width = pond.w ?? pond.width ?? 10;
    const depth = pond.d ?? pond.depth ?? 8;
    // Flat shallow pools leave the continuous floor intact beneath them. There
    // is no ocean-sized overlay obscuring paths or turning the park into islands.
    groundPatch(p, pond.x, waterY - 0.007, pond.z, width + 0.7, depth + 0.7,
      index * 17, [123, 160, 128]);
    groundPatch(p, pond.x, waterY, pond.z, width, depth, index * 17, [45, 119, 126]);
    groundRing(p, pond.x - width * 0.12, waterY + 0.015, pond.z + depth * 0.08,
      0.65 + ((time * 0.08 + index * 0.19) % 0.6), 0.009, [81, 161, 159]);
    p.push();
    p.stroke(84, 154, 150);
    p.strokeWeight(0.014);
    p.noFill();
    p.beginShape();
    for (let step = 0; step < 7; step += 1) {
      p.vertex(pond.x + (step - 3) * width * 0.09, waterY + 0.018,
        pond.z - depth * 0.16 + Math.sin(step * 0.65 + time * 0.3 + index) * 0.1);
    }
    p.endShape();
    p.pop();
    if (index % 2 === 0) {
      lotus(p, pond.x + width * 0.24, waterY + 0.035,
        pond.z - depth * 0.18, 0.9 + variation(index) * 0.4);
    }
  }
}

function drawColumn(p, x, z, height, waterY, broken = false) {
  block(p, x, waterY + 0.2, z, 0.95, 0.4, 0.95, COLORS.edge);
  p.push();
  p.translate(x, waterY + 0.4 + height / 2, z);
  stone(p, [115, 145, 134]);
  p.cylinder(0.28, height, 8, 1);
  p.pop();
  block(p, x, waterY + height + 0.42, z, 0.76, 0.18, 0.76, COLORS.stoneTop);
  if (!broken) {
    // Small gold seam suggests old Earth architecture reclaimed by new life.
    groundRing(p, x, waterY + height - 0.03, z, 0.29, 0.018, [161, 176, 131]);
  }
}

function drawRuins(p, world) {
  const y = groundHeight(world);
  const columns = world.decor?.columns ?? [];
  // Palace fragments are distributed around the garden perimeter rather than
  // lining a track. Gaps remain broad and every garden district has free access.
  for (const [index, column] of columns.entries()) {
    const height = column.height ?? (column.h ?? 4.5 + variation(index) * 2.5);
    drawColumn(p, column.x, column.z, height, y - 0.35,
      column.broken ?? index % 3 === 1);
  }
}

function drawGardenDecor(p, world) {
  const y = groundHeight(world);
  // Small meadow strokes share one draw call. They add scale and a hand-painted
  // texture to the lawn without a dense grass mesh or any collision obstacles.
  const bounds = world.bounds ?? { minX: -72, maxX: 72, minZ: -112, maxZ: 32 };
  p.push();
  p.stroke(121, 160, 112);
  p.strokeWeight(0.025);
  p.beginShape(p.LINES);
  for (let tuft = 0; tuft < 150; tuft += 1) {
    const x = bounds.minX + 3 + variation(tuft + 1109) * (bounds.maxX - bounds.minX - 6);
    const z = bounds.minZ + 3 + variation(tuft + 1309) * (bounds.maxZ - bounds.minZ - 6);
    const height = 0.15 + variation(tuft + 1509) * 0.2;
    p.vertex(x - 0.12, y + 0.01, z);
    p.vertex(x - 0.22, y + height, z);
    p.vertex(x, y + 0.01, z);
    p.vertex(x + 0.05, y + height * 1.2, z + 0.02);
    p.vertex(x + 0.12, y + 0.01, z);
    p.vertex(x + 0.23, y + height * 0.8, z - 0.02);
  }
  p.endShape();
  p.pop();
  for (const [index, tree] of (world.decor?.trees ?? []).entries()) {
    p.push();
    p.translate(tree.x, tree.y ?? y, tree.z);
    p.scale(tree.scale ?? 1);
    // Soft low-poly crowns give the flooded palace a reclaimed, cozy park
    // character. Sparse meshes remain inexpensive when rendered for two eyes.
    p.push();
    p.translate(0, 1.7, 0);
    stone(p, [90, 115, 90]);
    p.cylinder(0.19, 3.4, 7, 1);
    p.pop();
    for (let crown = 0; crown < 2; crown += 1) {
      p.push();
      p.translate(crown ? 0.7 : -0.3, crown ? 3.8 : 3.2, crown ? -0.2 : 0.2);
      p.scale(crown ? 1.1 : 1.5, crown ? 1.15 : 1.3, 1.3);
      stone(p, index % 3 ? [89, 145, 122] : [125, 163, 125]);
      p.sphere(1, 9, 6);
      p.pop();
    }
    p.pop();
  }
  for (const [index, rock] of (world.decor?.stones ?? []).entries()) {
    p.push();
    p.translate(rock.x, rock.y ?? y, rock.z);
    const scale = rock.scale ?? 1;
    p.scale(scale * 1.1, scale * 0.55, scale * 0.8);
    p.rotateY(index * 0.9);
    stone(p, index % 2 ? [123, 148, 127] : [105, 137, 123]);
    p.sphere(0.7, 7, 4);
    p.pop();
  }
}

/** A five-petal stylized lotus, deliberately sparse enough for stereo VR. */
function lotus(p, x, y, z, scale = 1, color = COLORS.rose) {
  p.push();
  p.translate(x, y, z);
  p.scale(scale);
  p.push();
  stone(p, [72, 134, 117]);
  p.scale(1, 0.07, 1);
  p.sphere(0.55, 10, 6);
  p.pop();
  for (let i = 0; i < 5; i += 1) {
    p.push();
    p.rotateY((i / 5) * TAU);
    p.translate(0, 0.14, 0.18);
    p.rotateX(-0.48);
    p.scale(0.62, 0.5, 1);
    stone(p, color);
    p.sphere(0.3, 8, 5);
    p.pop();
  }
  orb(p, 0, 0.2, 0, 0.13, COLORS.gold, 0.65);
  p.pop();
}

function lantern(p, x, y, z, scale = 1) {
  p.push();
  p.translate(x, y, z);
  p.scale(scale);
  block(p, 0, 0, 0, 0.3, 0.5, 0.3, [233, 185, 115]);
  block(p, 0, 0.3, 0, 0.42, 0.09, 0.42, COLORS.dark);
  block(p, 0, -0.3, 0, 0.38, 0.09, 0.38, COLORS.dark);
  orb(p, 0, 0.02, 0.163, 0.085, [255, 228, 153], 1.5);
  p.pop();
}

function drawStationLandmark(p, landmark) {
  const { index } = landmark;
  p.push();
  p.translate(landmark.x, landmark.y ?? 0.3, landmark.z);
  // Landmarks have a large readable silhouette across the open map. Only the
  // scenery is scaled; interaction distance and the collectible itself stay in
  // real metres and continue to use their separate artifact positions.
  p.scale(landmark.scale ?? 1.9);
  if (index === 0) {
    // “Lên chùa bẻ một cành sen” — pagoda roof and a flowering lotus pool.
    for (const x of [-1.35, 1.35]) {
      block(p, x, 1.1, -2, 0.16, 2.2, 0.16, COLORS.dark);
    }
    roof(p, 0, 2.2, -2, 3.6, 1.65, 0.65);
    roof(p, 0, 2.78, -2, 2.0, 1.0, 0.5, [64, 106, 102]);
    orb(p, 0, 3.36, -2, 0.09, COLORS.gold);
    lotus(p, -1.9, 0.12, 0.5, 1.05);
    lotus(p, 1.9, 0.12, -0.6, 0.65, [201, 186, 153]);
  } else if (index === 1) {
    // “Ăn cơm bằng đèn” — a modest table, rice bowls and warm lamplight.
    for (const x of [-2.15, 2.15]) {
      block(p, x, 1.55, -2.65, 0.14, 3.1, 0.14, COLORS.dark);
    }
    roof(p, 0, 3.1, -2.3, 5.1, 2.7, 0.65, [70, 107, 94]);
    block(p, 0, 0.78, -1.9, 2.5, 0.13, 0.9, [100, 123, 104]);
    for (const x of [-0.9, 0.9]) {
      block(p, x, 0.37, -1.9, 0.15, 0.74, 0.65, COLORS.dark);
      orb(p, x * 0.65, 0.9, -1.9, 0.2, [204, 209, 169], 0.5);
    }
    block(p, 0, 0.34, -2.6, 2.5, 0.15, 0.36, COLORS.dark);
    lantern(p, 0, 1.3, -1.9, 0.85);
    lantern(p, 0, 2.65, -2.1, 0.7);
  } else if (index === 2) {
    // “Đi cấy sáng trăng” — rice shoots grow in two shallow water trays.
    block(p, 0, 1.65, -2.9, 0.09, 3.3, 0.09, COLORS.dark);
    p.push();
    p.translate(0, 3.45, -2.9);
    glow(p, [191, 210, 143]);
    p.torus(0.55, 0.035, 16, 5);
    p.pop();
    for (const side of [-1, 1]) {
      block(p, side * 1.95, 0.08, -0.6, 1.1, 0.16, 3.0, COLORS.dark);
      block(p, side * 1.95, 0.17, -0.6, 0.96, 0.04, 2.86, [57, 132, 132]);
      p.push();
      p.stroke(171, 192, 126);
      p.strokeWeight(0.015);
      p.beginShape(p.LINES);
      for (let n = 0; n < 15; n += 1) {
        const x = side * 1.95 + ((n % 3) - 1) * 0.26;
        const z = -1.8 + Math.floor(n / 3) * 0.6;
        const height = 0.42 + variation(n) * 0.22;
        p.vertex(x, 0.19, z);
        p.vertex(x + 0.07, height, z);
        p.vertex(x, 0.19, z);
        p.vertex(x - 0.12, height * 0.8, z + 0.05);
      }
      p.endShape();
      p.pop();
    }
  } else if (index === 3) {
    // “Ba bốn cô có hẹn cùng chăng?” — four quiet human-shaped memories.
    for (let i = 0; i < 4; i += 1) {
      const x = (i - 1.5) * 0.85;
      p.push();
      p.translate(x, 0.65, -2.0 + (i % 2) * 0.18);
      stone(p, [122 + i * 9, 169 + i * 3, 155]);
      p.rotateZ(PI);
      p.cone(0.28, 1.0, 8, 1);
      p.pop();
      orb(p, x, 1.4, -2.0 + (i % 2) * 0.18, 0.2, [163, 200, 177]);
    }
    block(p, 0, 0.12, -2.0, 3.6, 0.24, 0.85, COLORS.edge);
  } else {
    // “Chơi trăng ngoài thềm” — a porch, lamps, and an open view of the moon.
    block(p, 0, 0.1, -1.8, 3.5, 0.2, 1.75, COLORS.stoneTop);
    for (const x of [-1.55, 1.55]) {
      block(p, x, 1.25, -2.35, 0.16, 2.3, 0.16, COLORS.dark);
      lantern(p, x, 1.55, -1.65, 0.75);
    }
    roof(p, 0, 2.4, -2.05, 4.05, 2.05, 0.55);
  }
  p.pop();
}

function drawArtifact(p, artifact, currentIndex, time) {
  const { position, index, resolved } = artifact;
  const color = artifact.definition?.color ?? COLORS.gold;
  const active = index === currentIndex;
  const platformY = artifact.checkpoint?.y ?? position.y - 1.2;
  // The physical pedestal remains after collection; the hovering object and
  // target ring disappear, giving clear feedback without hiding terrain.
  block(p, position.x, platformY + 0.12, position.z, 0.72, 0.24, 0.72, COLORS.dark);
  block(p, position.x, platformY + 0.27, position.z, 0.55, 0.07, 0.55,
    artifact.restored ? [96, 190, 166] : [172, 174, 138]);
  if (resolved) return;

  const pulse = active ? 1 + Math.sin(time * 2.6) * 0.065 : 0.9;
  p.push();
  p.translate(position.x, position.y + Math.sin(time * 1.5 + index) * 0.06, position.z);
  p.scale(pulse);
  p.rotateY(time * 0.45 + index);
  glow(p, color);
  if (index === 0) {
    p.push();
    p.rotateZ(PI / 4);
    p.scale(0.7, 1.2, 0.7);
    p.box(0.4);
    p.pop();
  } else if (index === 1) {
    p.box(0.32, 0.48, 0.32);
  } else if (index === 2) {
    p.push();
    p.scale(0.7, 1.35, 0.7);
    p.sphere(0.26, 10, 7);
    p.pop();
  } else if (index === 3) {
    p.torus(0.23, 0.065, 12, 6);
  } else {
    p.sphere(0.24, 12, 8);
  }
  p.rotateX(0.5);
  glow(p, active ? COLORS.cyan : [128, 167, 153]);
  p.torus(0.47, 0.012, 24, 4);
  p.pop();
  if (active) {
    groundRing(p, position.x, platformY + 0.035, position.z,
      0.85 + Math.sin(time * 2) * 0.045, 0.018, COLORS.cyan);
  }
}

function drawRestoration(p, artifact, time) {
  if (!artifact.restored) return;
  const { position, checkpoint } = artifact;
  const y = checkpoint?.y ?? position.y - 1.2;
  // These local cyanobacteria blooms only appear after the player chooses to
  // restore an artifact. Observing leaves this environmental change absent.
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * TAU + 0.3;
    const x = position.x + Math.cos(angle) * 1.1;
    const z = position.z + Math.sin(angle) * 1.1;
    p.push();
    p.translate(x, y + 0.2, z);
    glow(p, i % 2 ? [99, 200, 170] : [94, 220, 211]);
    p.cylinder(0.025, 0.4, 6, 1);
    p.translate(0, 0.2, 0);
    p.scale(1, 0.35, 1);
    p.sphere(0.19, 8, 5);
    p.pop();
    orb(p, x, y + 0.67 + Math.sin(time + i) * 0.08, z, 0.035, COLORS.cyan);
  }
}

function drawSanctuary(p, world, time) {
  const final = world.final;
  if (!final?.position) return;
  const { x, y, z } = final.position;
  // The ruin itself is always drawn and its collision remains unchanged. The
  // final song verse reveals the warm central light rather than spawning a wall.
  for (const side of [-1, 1]) {
    block(p, x + side * 1.65, y + 1.6, z - 1.3, 0.28, 3.2, 0.28, COLORS.edge);
  }
  roof(p, x, y + 3.2, z - 1.3, 4.9, 2.3, 0.85, [55, 95, 94]);
  block(p, x, y + 0.05, z - 1.3, 4.2, 0.1, 2.1, COLORS.stoneTop);
  if (!final.unlocked) return;
  orb(p, x, y + 1.4, z - 1.2, 0.55, [255, 221, 151]);
  p.push();
  p.translate(x, y + 1.4, z - 1.2);
  p.rotateY(time * 0.16);
  glow(p, COLORS.gold);
  p.torus(1.05, 0.035, 32, 6);
  p.rotateY(PI / 2);
  glow(p, COLORS.cyan);
  p.torus(0.82, 0.018, 24, 4);
  p.pop();
  for (const side of [-1, 1]) {
    lotus(p, x + side * 1.55, y + 0.16, z + 0.2, 0.8, [167, 215, 186]);
  }
  groundRing(p, x, y + 0.07, z, 1.55, 0.025, COLORS.gold);
}

function drawPlayer(p, player) {
  if (!player?.position) return;
  const { x, y, z } = player.position;
  const height = player.height ?? 1.7;
  p.push();
  p.translate(x, y, z);
  p.rotateY(player.yaw ?? 0);
  p.scale(height / 1.7);
  // A readable researcher silhouette in the desktop chase camera. The headset
  // view deliberately never renders this avatar around the tracked user's face.
  for (const side of [-1, 1]) {
    block(p, side * 0.12, 0.25, 0, 0.16, 0.5, 0.2, COLORS.dark);
    block(p, side * 0.12, 0.07, -0.06, 0.2, 0.14, 0.31, [44, 78, 81]);
    block(p, side * 0.32, 0.89, 0, 0.13, 0.53, 0.17, [199, 185, 147]);
  }
  p.push();
  p.translate(0, 0.92, 0);
  stone(p, [205, 199, 165]);
  p.cylinder(0.24, 0.59, 10, 1);
  p.pop();
  p.push();
  p.translate(0, 1.43, 0);
  stone(p, [183, 196, 175]);
  p.sphere(0.255, 12, 8);
  p.pop();
  block(p, 0, 1.45, -0.225, 0.32, 0.13, 0.06, [39, 99, 111]);
  block(p, 0, 0.98, 0.235, 0.32, 0.45, 0.18, [65, 119, 115]);
  block(p, 0, 1.02, 0.335, 0.19, 0.05, 0.025, COLORS.gold);
  p.pop();
}

function drawControllerAids(p, options) {
  if (options.rays) {
    p.push();
    p.strokeWeight(0.006); // The scene is in metres, not p5's usual pixel units.
    for (const [hand, ray] of Object.entries(options.rays)) {
      if (!ray?.origin || !ray?.direction) continue;
      const { origin, direction } = ray;
      p.stroke(...(hand === 'right' ? COLORS.gold : COLORS.cyan));
      p.line(origin.x, origin.y, origin.z,
        origin.x + direction.x * 5, origin.y + direction.y * 5,
        origin.z + direction.z * 5);
    }
    p.pop();
  }
  if (options.teleportMarker) {
    const point = options.teleportMarker;
    groundRing(p, point.x, point.y + 0.035, point.z, 0.34, 0.018, COLORS.cyan);
    groundRing(p, point.x, point.y + 0.037, point.z, 0.42, 0.008, COLORS.gold);
  }
}

function drawPanel(p, panel) {
  if (!panel?.visible || !panel.graphics) return;
  p.push();
  // Draw this last and unlit so text is legible even at night. It still uses
  // ordinary depth testing, making the interface feel located in the world.
  p.noLights();
  p.noStroke();
  p.translate(panel.position.x, panel.position.y, panel.position.z);
  p.rotateY(panel.yaw ?? 0);
  // Graphics text uses screen +Y-down. The scene uses +Y-up: this local flip
  // preserves upright text without changing the camera or an eye projection.
  p.scale(1, -1, 1);
  p.texture(panel.graphics);
  p.plane(panel.width ?? 1.8, panel.height ?? 1.3);
  p.pop();
}

/**
 * Render a snapshot of the world. No gameplay state is modified here, so both
 * WebXR eyes and research photographs can safely render the same simulation tick.
 *
 * @param {p5|p5.Graphics} p Destination with a WEBGL renderer.
 * @param {object} world Continuous terrain, paths, garden decor and artifacts.
 * @param {object} player Position is the feet, not the head/camera.
 * @param {object} options Time, XR state, active clue, rays and world-space UI.
 */
export function renderWorld(p, world, player, options = {}) {
  if (!world) return;
  const time = Number.isFinite(options.time) ? options.time : 0;
  const currentIndex = options.currentIndex ?? world.currentIndex ?? 0;
  p.push();
  p.colorMode(p.RGB, 255, 255, 255, 255);
  p.noStroke();
  drawSky(p, time);

  // Broad ambient light keeps VR surfaces comfortable to read; two soft
  // directional lights distinguish warm stone from cool water and vegetation.
  p.ambientLight(90, 120, 115);
  p.directionalLight(150, 150, 120, -0.45, -0.8, -0.3);
  p.directionalLight(55, 113, 132, 0.4, -0.25, 0.65);
  p.shininess(8);
  drawTerrain(p, world);
  drawPaths(p, world);
  drawWater(p, world, time);
  drawRuins(p, world);
  drawGardenDecor(p, world);
  const landmarks = world.landmarks ?? (world.artifacts ?? []).map(artifact => ({
    index: artifact.index,
    x: artifact.position.x,
    y: groundHeight(world),
    z: artifact.position.z,
  }));
  for (const landmark of landmarks) {
    drawStationLandmark(p, landmark);
  }
  for (const artifact of world.artifacts ?? []) {
    drawArtifact(p, artifact, currentIndex, time);
    drawRestoration(p, artifact, time);
  }
  drawSanctuary(p, world, time);
  if (!options.xr && options.showPlayer !== false) drawPlayer(p, player);
  drawControllerAids(p, options);
  drawPanel(p, options.panel);
  p.pop();
}
