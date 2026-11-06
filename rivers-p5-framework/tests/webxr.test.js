import assert from 'node:assert/strict';
import {WebXRBridge,applyDesktopCamera} from '../js/webxr-bridge.js';
const identity = () => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const translation = (x,y,z) => { const m=identity(); m[12]=x;m[13]=y;m[14]=z;return m; };
const matrix = () => ({ mat4: identity(), reset() { this.mat4.set(identity()); } });
const calls=[];
const gl={FRAMEBUFFER:1,SCISSOR_TEST:2,COLOR_BUFFER_BIT:4,DEPTH_BUFFER_BIT:8,
 drawingBufferWidth:800,drawingBufferHeight:600,
 async makeXRCompatible(){},bindFramebuffer(...a){calls.push(['bind',...a]);},
 enable(){},disable(){},viewport(...a){calls.push(['viewport',...a]);},scissor(){},
 clearColor(){},clear(){},clearDepth(){}
};
const camera={cameraMatrix:matrix(),projMatrix:matrix()};
camera.projMatrix.mat4[5]=-2;
const renderer={GL:gl,_curCamera:camera,uModelMatrix:matrix(),uViewMatrix:matrix(),uPMatrix:matrix(),
 _update(){this.uModelMatrix.reset();this.uViewMatrix.mat4.set(this._curCamera.cameraMatrix.mat4);}
};
renderer.uPMatrix.mat4[5]=-2;
const p={_renderer:renderer,looping:true,isLooping(){return this.looping;},
 noLoop(){this.looping=false;},loop(){this.looping=true;},camera(...a){calls.push(['camera',...a]);}};
applyDesktopCamera(p,{x:1,y:2,z:3},{x:0,y:0,z:0});
assert.equal(renderer.uPMatrix.mat4[5],2);
assert.equal(renderer._curCamera.projMatrix.mat4[5],2);
const session={inputSources:[],listeners:{},addEventListener(n,f){this.listeners[n]=f;},
 updateRenderState(s){this.renderState=s;},async requestReferenceSpace(s){assert.equal(s,'local-floor');return {};},
 requestAnimationFrame(cb){this.frameCallback=cb;},async end(){this.listeners.end?.();}
};
Object.defineProperty(globalThis,'navigator',{value:{xr:{async isSessionSupported(){return true;},async requestSession(mode,options){assert.equal(mode,'immersive-vr');assert.deepEqual(options.requiredFeatures,['local-floor']);return session;}}},configurable:true});
globalThis.XRWebGLLayer=class{constructor(){this.framebuffer='xr';}getViewport(v){return {x:v.eye==='left'?0:400,y:0,width:400,height:600};}};
const rig={position:{x:10,y:0,z:20},yaw:0};
const updates=[],renders=[],states=[],errors=[];
const bridge=new WebXRBridge(p,{getRig:()=>rig,update(dt,state){updates.push({dt,head:{...state.headWorld},turn:state.turn,jump:state.jumpPressed,select:state.selectPressed,teleport:state.teleportPressed});rig.position.x+=1;},render({eye,state}){renders.push({eye,view:[...renderer.uViewMatrix.mat4],head:{...state.headWorld},ray:state.rightRay});},onStateChange:s=>states.push(s),onError:e=>errors.push(e)});
assert.equal(await bridge.supported(),true);
await bridge.enter();assert.equal(bridge.active,true);assert.equal(p.looping,false);
const left={handedness:'left',targetRaySpace:{},gamepad:{axes:[0,0,.2,-.5],buttons:[{pressed:true}]}};
const right={handedness:'right',targetRaySpace:{},gamepad:{axes:[0,0,.8,0],buttons:[{pressed:true},{},{},{},{pressed:true}]}};
session.inputSources=[left,right];
const pose={transform:{position:{x:2,y:1.7,z:3},matrix:translation(2,1.7,3)},views:['left','right'].map((eye,i)=>({eye,projectionMatrix:identity(),transform:{inverse:{matrix:translation(-2+(i===0?.032:-.032),-1.7,-3)}}}))};
let poseQueries=0;
const frame={session,getViewerPose(){poseQueries++;return pose;},getPose(){return {transform:{position:{x:2.2,y:1.4,z:2.8},matrix:translation(2.2,1.4,2.8)}};}};
session.frameCallback(1000,frame);
assert.equal(poseQueries,1);assert.equal(updates.length,1);assert.equal(renders.length,2);
assert.deepEqual(updates[0].head,{x:10,y:1.7,z:20});assert.deepEqual(renders[0].head,{x:11,y:1.7,z:20});
assert.ok(Math.abs(renders[0].view[12]-(-11+.032))<.00001);
assert.ok(Math.abs(renders[0].view[13]+1.7)<.00001);
assert.equal(updates[0].turn,1);assert.equal(updates[0].jump,true);assert.equal(updates[0].select,true);assert.equal(updates[0].teleport,false);
left.gamepad.buttons[0].pressed=false;
session.frameCallback(1011,frame);
assert.equal(poseQueries,2);assert.equal(updates[1].turn,0);assert.equal(updates[1].jump,false);assert.equal(updates[1].select,false);assert.equal(updates[1].teleport,true);
assert.deepEqual(bridge.headWorld,{x:12,y:1.7,z:20});
// Re-arming a turn requires returning the stick to centre.
right.gamepad.axes[2]=0;session.frameCallback(1022,frame);
right.gamepad.axes[2]=.8;session.frameCallback(1033,frame);
assert.equal(updates[3].turn,1);
// Tracking loss does not advance simulation or render stale images.
const count=updates.length;session.frameCallback(1044,{...frame,getViewerPose(){return null;}});assert.equal(updates.length,count);
// Standard yaw +90 turns forward toward -X and transforms the head offset.
rig.yaw=Math.PI/2;pose.transform.position.x=3;session.frameCallback(1055,frame);
assert.ok(Math.abs(renders.at(-1).head.x-rig.position.x)<1e-10);
assert.ok(Math.abs(renders.at(-1).head.z-19)<1e-10);
await bridge.exit();assert.equal(bridge.active,false);assert.equal(p.looping,true);
assert.deepEqual(states,[true,false]);assert.deepEqual(errors,[]);assert.deepEqual(renderer._viewport,[0,0,800,600]);
assert.equal(calls.filter(c=>c[0]==='bind').at(-1)[2],null);
assert.equal(camera.projMatrix.mat4[5],2);
// The same instance can enter again after a clean session end.
await bridge.enter();await bridge.exit();assert.deepEqual(states,[true,false,true,false]);
console.log('PASS: capability, lifecycle/re-entry, camera restoration, 2-eye matrices, single simulation update, calibrated floor pose, input edges, snap-turn latch, lost tracking, yaw and ray conversion.');
// Exit may be triggered by a world-space button during update itself. No eye
// render may continue after cleanup has cleared the opaque XR framebuffer.
let exitingBridge;
const exitErrors=[];
exitingBridge=new WebXRBridge(p,{getRig:()=>rig,update(){void exitingBridge.exit();},render(){assert.fail('Rendered after synchronous session exit');},onError:error=>exitErrors.push(error)});
await exitingBridge.enter();
session.frameCallback(2000,frame);
assert.equal(exitingBridge.active,false);
assert.equal(exitingBridge.headWorld,null);
assert.deepEqual(exitErrors,[]);
console.log('PASS: synchronous in-frame Exit stops submission and preserves cleared tracking state.');
