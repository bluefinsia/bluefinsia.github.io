/**
 * A small native WebXR adapter for the p5.js 1.11.3 WEBGL renderer.
 *
 * Coordinate contract: the game uses metres, +Y is up, and forward is -Z.
 * Positive yaw follows the right-handed rotation about +Y. Unlike the desktop
 * follow camera, a headset's tracked pose is never interpolated or delayed.
 *
 * This module intentionally pins its private p5 renderer integration to 1.11.3.
 * WebXR owns the animation loop during an immersive session, but all geometry
 * still uses p5 drawing commands in the application's shared render callback.
 */

const DEAD_ZONE = 0.16;
const TURN_THRESHOLD = 0.65;
const TURN_RELEASE = 0.25;

/**
 * Set a desktop camera for a canonical +Y-up world.
 *
 * p5's default WEBGL projection flips Y to support its usual screen-style
 * downward Y axis. Its camera() accepts an up vector, but that does not remove
 * the projection flip. Correct both copies of the projection after camera().
 * Call perspective() before this helper if the field of view must change.
 */
export function applyDesktopCamera(p, eye, target) {
  p.camera(eye.x, eye.y, eye.z, target.x, target.y, target.z, 0, 1, 0);
  const renderer = p._renderer;
  renderer.uPMatrix.mat4[5] = Math.abs(renderer.uPMatrix.mat4[5]);
  renderer._curCamera.projMatrix.mat4[5] = Math.abs(
    renderer._curCamera.projMatrix.mat4[5]
  );
}

export class WebXRBridge {
  /**
   * getRig() returns the player's mutable { position: {x,y,z}, yaw }.
   * position is the virtual position of the player's feet, not the headset.
   * update(dt, input) runs once per XR frame, with dt measured in seconds.
   * render({xr, eye, state}) runs once for each eye and must not set a camera.
   */
  constructor(p, { getRig, update, render, onStateChange, onError }) {
    this.p = p;
    this.getRig = getRig;
    this.update = update;
    this.render = render;
    this.onStateChange = onStateChange;
    this.onError = onError;

    this._session = null;
    this._referenceSpace = null;
    this._layer = null;
    this._running = false;
    this._enterPromise = null;
    this._lastTime = null;
    this._origin = null;
    this._headWorld = null;
    this._savedState = null;
    this._buttons = new Map();
    this._turnLatched = false;
    this._onFrameBound = (time, frame) => this._onFrame(time, frame);
  }

  get active() {
    return this._running;
  }

  /** Latest tracked head position in game world coordinates, or null. */
  get headWorld() {
    return this._headWorld ? { ...this._headWorld } : null;
  }

  /** A read-only capability check; a browser may still deny entry later. */
  async supported() {
    try {
      return Boolean(
        globalThis.navigator?.xr &&
        await navigator.xr.isSessionSupported('immersive-vr')
      );
    } catch {
      return false;
    }
  }

  /**
   * Invoke directly from a click. Do not await supported() here: requesting a
   * session must retain the user's activation on browsers that require it.
   * Failures reach onError and are also rejected so the caller can handle them.
   */
  async enter() {
    if (this._running) return this._session;
    if (this._enterPromise) return this._enterPromise;
    this._enterPromise = this._startSession().finally(() => {
      this._enterPromise = null;
    });
    return this._enterPromise;
  }

  async _startSession() {
    let session = null;
    try {
      if (!globalThis.navigator?.xr) {
        throw new Error('WebXR is unavailable. Use HTTPS or localhost in a WebXR-capable browser with a connected headset.');
      }
      const renderer = this.p._renderer;
      const gl = renderer?.GL;
      if (!gl || !renderer.uViewMatrix || !renderer.uPMatrix) {
        throw new Error('The VR bridge requires the pinned p5.js 1.11.3 WEBGL renderer.');
      }

      session = await navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor']
      });
      this._session = session;
      session.addEventListener('end', () => this._finishSession(session), {
        once: true
      });

      // Reuse p5's context: creating a separate context would prevent p5's
      // existing shaders, meshes and textures from rendering into the XR layer.
      await gl.makeXRCompatible();
      const layer = new XRWebGLLayer(session, gl);
      session.updateRenderState({
        baseLayer: layer,
        depthNear: 0.05,
        depthFar: 300
      });
      const referenceSpace = await session.requestReferenceSpace('local-floor');
      if (this._session !== session) {
        throw new Error('The VR session ended before tracking became ready.');
      }

      this._savedState = {
        camera: renderer._curCamera,
        cameraMatrix: new Float32Array(renderer._curCamera.cameraMatrix.mat4),
        cameraProjection: new Float32Array(renderer._curCamera.projMatrix.mat4),
        view: new Float32Array(renderer.uViewMatrix.mat4),
        projection: new Float32Array(renderer.uPMatrix.mat4),
        model: new Float32Array(renderer.uModelMatrix.mat4),
        looping: typeof this.p.isLooping === 'function' ? this.p.isLooping() : true
      };
      this._referenceSpace = referenceSpace;
      this._layer = layer;
      this._origin = null;
      this._headWorld = null;
      this._lastTime = null;
      this._buttons.clear();
      this._turnLatched = false;
      this.p.noLoop();
      this._running = true;
      this._notifyState(true);
      session.requestAnimationFrame(this._onFrameBound);
      return session;
    } catch (error) {
      // If initialization partially succeeded, close the session and restore
      // the ordinary canvas before allowing the user to retry.
      if (session) {
        try { await session.end(); } catch { /* It may already have ended. */ }
        this._finishSession(session);
      }
      this._reportError(error);
      throw error;
    }
  }

  async exit() {
    const session = this._session;
    if (!session) return;
    try {
      await session.end();
    } catch (error) {
      // End is idempotent for the app even if a runtime reports InvalidState.
      if (error?.name !== 'InvalidStateError') this._reportError(error);
    } finally {
      this._finishSession(session);
    }
  }

  _finishSession(session) {
    if (this._session !== session) return;
    const wasRunning = this._running;
    this._running = false;
    this._session = null;
    this._referenceSpace = null;
    this._layer = null;
    this._origin = null;
    this._headWorld = null;
    this._lastTime = null;
    this._buttons.clear();
    this._turnLatched = false;

    const renderer = this.p._renderer;
    const gl = renderer?.GL;
    if (gl) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.SCISSOR_TEST);
      const viewport = [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight];
      gl.viewport(...viewport);
      renderer._viewport = viewport;
    }

    const saved = this._savedState;
    this._savedState = null;
    if (saved && renderer) {
      renderer._curCamera = saved.camera;
      saved.camera.cameraMatrix.mat4.set(saved.cameraMatrix);
      saved.camera.projMatrix.mat4.set(saved.cameraProjection);
      renderer.uViewMatrix.mat4.set(saved.view);
      renderer.uPMatrix.mat4.set(saved.projection);
      renderer.uModelMatrix.mat4.set(saved.model);
      if (saved.looping) this.p.loop();
    }
    if (wasRunning) this._notifyState(false);
  }

  _onFrame(time, frame) {
    const session = this._session;
    if (!this._running || frame.session !== session) return;
    session.requestAnimationFrame(this._onFrameBound);

    try {
      // Query the viewer only once. Physics, the input snapshot and both eyes
      // then share one coherent tracking sample for this display frame.
      const pose = frame.getViewerPose(this._referenceSpace);
      const dt = this._lastTime === null ? 1 / 90 : Math.min(
        Math.max((time - this._lastTime) / 1000, 0), 0.05
      );
      this._lastTime = time;
      if (!pose) {
        // Tracking loss pauses the simulation and clears stale headset images.
        const gl = this.p._renderer.GL;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._layer.framebuffer);
        gl.disable(gl.SCISSOR_TEST);
        gl.clearColor(0.015, 0.025, 0.05, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        return;
      }

      if (!this._origin) {
        // Initial room-scale X/Z is the game's spawn point. Keep floor-relative
        // Y untouched so a real crouch or standing height remains accurate.
        this._origin = {
          x: pose.transform.position.x,
          z: pose.transform.position.z
        };
      }
      const state = this._readInput(frame, pose);
      this._updateWorldTracking(state, pose, this.getRig());
      this.update(dt, state);
      // An in-headset Exit button can synchronously end the session in update().
      // Cleanup has already cleared the layer; do not submit another eye frame.
      if (!this._running || this._session !== session) return;

      // The controller may have moved, jumped, turned or teleported the body.
      // Use that latest body pose for rendering without smoothing the headset.
      const rig = this.getRig();
      this._updateWorldTracking(state, pose, rig);
      this._headWorld = { ...state.headWorld };
      const referenceFromWorld = inverseRig(rig, this._origin);
      const renderer = this.p._renderer;
      const gl = renderer.GL;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._layer.framebuffer);
      gl.enable(gl.SCISSOR_TEST);

      for (const view of pose.views) {
        const vp = this._layer.getViewport(view);
        if (!vp) continue;
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        gl.scissor(vp.x, vp.y, vp.width, vp.height);
        // p5's stroke shader also consumes this cached viewport value.
        renderer._viewport = [vp.x, vp.y, vp.width, vp.height];
        gl.clearColor(0.015, 0.025, 0.05, 1);
        gl.clearDepth(1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // _update resets model transforms and lights. Its depth/stencil clear
        // is restricted to this eye by scissoring, preserving the other eye.
        renderer._update();
        const viewMatrix = multiply4(
          view.transform.inverse.matrix, referenceFromWorld
        );
        renderer.uViewMatrix.mat4.set(viewMatrix);
        renderer.uPMatrix.mat4.set(view.projectionMatrix);
        // resetMatrix() inside a drawing helper must retain this eye's view.
        renderer._curCamera.cameraMatrix.mat4.set(viewMatrix);
        renderer._curCamera.projMatrix.mat4.set(view.projectionMatrix);

        const previousDrawState = this.p._inUserDraw;
        this.p._inUserDraw = true;
        try {
          this.render({ xr: true, eye: view.eye, state });
        } finally {
          this.p._inUserDraw = previousDrawState;
        }
      }
      gl.disable(gl.SCISSOR_TEST);
    } catch (error) {
      this._reportError(error);
      void this.exit();
    }
  }

  _readInput(frame, pose) {
    const state = {
      headLocal: {
        x: pose.transform.position.x - this._origin.x,
        y: pose.transform.position.y,
        z: pose.transform.position.z - this._origin.z
      },
      headWorld: null,
      headForward: null,
      roomOffset: { x: 0, z: 0 },
      move: { x: 0, z: 0 },
      jumpPressed: false,
      selectPressed: false,
      teleportPressed: false,
      menuPressed: false,
      turn: 0,
      rightRay: null,
      leftRay: null
    };
    let rightTurn = 0;
    const connected = new Set();
    for (const source of this._session.inputSources) {
      if (source.handedness !== 'left' && source.handedness !== 'right') continue;
      connected.add(source);
      const gamepad = source.gamepad;
      const previous = this._buttons.get(source) || {
        trigger: false, primary: false
      };
      const trigger = pressed(gamepad, 0);
      const primary = pressed(gamepad, 4);
      const stick = thumbstick(gamepad);
      if (source.handedness === 'left') {
        state.move = { x: stick.x, z: stick.y };
        state.teleportPressed ||= previous.trigger && !trigger;
        state.menuPressed ||= primary && !previous.primary;
      } else {
        rightTurn = stick.x;
        state.jumpPressed ||= primary && !previous.primary;
        state.selectPressed ||= trigger && !previous.trigger;
      }
      this._buttons.set(source, { trigger, primary });

      // A controller can remain connected while its pose is unavailable.
      // Such a source contributes buttons but never a fabricated pointing ray.
      const rayPose = source.targetRaySpace
        ? frame.getPose(source.targetRaySpace, this._referenceSpace) : null;
      if (rayPose) {
        state[`${source.handedness}Ray`] = {
          origin: {
            x: rayPose.transform.position.x - this._origin.x,
            y: rayPose.transform.position.y,
            z: rayPose.transform.position.z - this._origin.z
          },
          direction: forwardFromMatrix(rayPose.transform.matrix)
        };
      }
    }
    // Disconnecting a controller is not a teleport release or a fresh press.
    for (const source of this._buttons.keys()) {
      if (!connected.has(source)) this._buttons.delete(source);
    }
    if (Math.abs(rightTurn) < TURN_RELEASE) this._turnLatched = false;
    if (!this._turnLatched && Math.abs(rightTurn) > TURN_THRESHOLD) {
      state.turn = Math.sign(rightTurn);
      this._turnLatched = true;
    }
    return state;
  }

  _updateWorldTracking(state, pose, rig) {
    const localHead = state.headLocal;
    const room = rotateYaw(localHead, rig.yaw);
    state.roomOffset = { x: room.x, z: room.z };
    state.headWorld = addPosition(room, rig.position);
    state.headForward = rotateYaw(
      forwardFromMatrix(pose.transform.matrix), rig.yaw
    );

    // Preserve local rays between the before/after-physics conversions. They
    // are sampled once per frame; only the virtual rig transform may change.
    if (!state._localRays) {
      Object.defineProperty(state, '_localRays', {
        value: { right: state.rightRay, left: state.leftRay },
        enumerable: false
      });
    }
    for (const hand of ['right', 'left']) {
      const ray = state._localRays[hand];
      state[`${hand}Ray`] = ray ? {
        origin: addPosition(rotateYaw(ray.origin, rig.yaw), rig.position),
        direction: rotateYaw(ray.direction, rig.yaw)
      } : null;
    }
  }

  _notifyState(active) {
    try { this.onStateChange?.(active); }
    catch (error) { this._reportError(error); }
  }

  _reportError(error) {
    if (this.onError) {
      try { this.onError(error); }
      catch (callbackError) { console.error(callbackError); }
    } else {
      console.error(error);
    }
  }
}

function pressed(gamepad, index) {
  const button = gamepad?.buttons?.[index];
  return Boolean(button && (button.pressed || button.value > 0.75));
}

function thumbstick(gamepad) {
  const axes = gamepad?.axes || [];
  // xr-standard reserves 0/1 for a touchpad and 2/3 for a thumbstick. Some
  // smaller gamepads expose only one pair, so support that shape as well.
  const start = axes.length >= 4 ? 2 : 0;
  return {
    x: deadZone(axes[start] || 0),
    y: deadZone(axes[start + 1] || 0)
  };
}

function deadZone(value) {
  if (!Number.isFinite(value) || Math.abs(value) < DEAD_ZONE) return 0;
  return Math.max(-1, Math.min(1, value));
}

function forwardFromMatrix(matrix) {
  return { x: -matrix[8], y: -matrix[9], z: -matrix[10] };
}

function rotateYaw(point, yaw) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: c * point.x + s * point.z, y: point.y,
    z: -s * point.x + c * point.z };
}

function addPosition(point, position) {
  return { x: point.x + position.x, y: point.y + position.y,
    z: point.z + position.z };
}

/**
 * ReferenceFromWorld = T(initialRoomXZ) * R_y(-yaw) * T(-playerFeet).
 * The eye's inverse pose then completes WorldToEye. Initial head X/Z is
 * removed, but local-floor Y stays physical and is added to the feet height.
 */
function inverseRig(rig, origin) {
  const { x, y, z } = rig.position;
  const c = Math.cos(rig.yaw);
  const s = Math.sin(rig.yaw);
  return new Float32Array([
    c, 0, s, 0,
    0, 1, 0, 0,
    -s, 0, c, 0,
    origin.x - c * x + s * z, -y, origin.z - s * x - c * z, 1
  ]);
}

/** Column-major matrix product out = a * b, matching WebGL and WebXR. */
function multiply4(a, b) {
  const result = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let value = 0;
      for (let k = 0; k < 4; k++) value += a[k * 4 + row] * b[col * 4 + k];
      result[col * 4 + row] = value;
    }
  }
  return result;
}
