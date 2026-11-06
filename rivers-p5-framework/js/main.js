import {generateWorld} from './platform-generator.js';
import {PlayerController} from './player-controller.js';
import {ArtifactSystem} from './artifact-system.js';
import {CameraFollow} from './camera-follow.js';
import {GameUI} from './game-ui.js';
import {SongPlayer} from './song-player.js';
import {renderWorld} from './scene-renderer.js';
import {WebXRBridge,applyDesktopCamera} from './webxr-bridge.js';
import {distance,rotateY} from './math.js';

// The same simulation powers both render loops. Only camera/input acquisition changes.
const world=generateWorld(2077);
const player=new PlayerController(world.start);
const system=new ArtifactSystem(world);
const camera=new CameraFollow();
const song=new SongPlayer();
const state={world,player,system,camera,started:false,xr:false,vrJump:false,photos:[],currentAudio:null,time:0,latestXR:null};
let p,bridge,font,photoBuffer;
const keys=new Set();let jumpPressed=false,interactPressed=false,menuPressed=false,orbiting=false;
const ui=new GameUI(state,dispatch);

function headPoint() {return state.xr&&(state.latestXR?.headWorld||bridge?.headWorld)?state.latestXR?.headWorld||bridge.headWorld:{x:player.position.x,y:player.position.y+1.65,z:player.position.z};}
function forwardPoint() {return state.latestXR?.headForward||rotateY({x:0,y:0,z:-1},player.yaw);}
const rigSnapshot=()=>({position:{...player.position},yaw:player.yaw});
function refreshTrackedInput(input,before) {
  // A snap/teleport changes the artificial rig, not the physical tracking sample.
  // Refresh this frame before interaction/physics rather than using cached prior-frame poses.
  if(!input)return;
  const offset=rotateY(input.headLocal,player.yaw),delta=player.yaw-before.yaw;
  input.roomOffset={x:offset.x,z:offset.z};
  input.headWorld={x:player.position.x+offset.x,y:player.position.y+offset.y,z:player.position.z+offset.z};
  input.headForward=rotateY(input.headForward,delta);
  for(const key of ['rightRay','leftRay']) {
    const ray=input[key];if(!ray)continue;
    const local=rotateY({x:ray.origin.x-before.position.x,y:ray.origin.y-before.position.y,z:ray.origin.z-before.position.z},-before.yaw);
    const moved=rotateY(local,player.yaw);
    ray.origin={x:player.position.x+moved.x,y:player.position.y+moved.y,z:player.position.z+moved.z};
    ray.direction=rotateY(ray.direction,delta);
  }
}
function near() {
  const target=system.currentArtifact?.position || (world.final.unlocked?world.final.position:null);
  return target&&distance(headPoint(),target)<=3;
}

/** One action router is shared by HTML buttons, E, and in-headset ray buttons. */
function dispatch(action) {
  if(!p)return;
  if(action==='begin') {state.started=true;system.close();song.unlock().catch(()=>{});}
  else if(action==='journal') {if(!state.started)return;system.isBlocked?system.close():system.openJournal();}
  else if(action==='close') {if(!system.completed)system.close();}
  else if(action==='interact') {
    if(system.completed)return;
    if(system.currentArtifact)system.interact(headPoint());
    else system.enterSanctuary(headPoint());
  }
  else if(action==='listen') {
    const artifact=system.listen();
    if(artifact){state.currentAudio=artifact.definition.audio;song.play(state.currentAudio);ui.notify('The verse is recorded in your journal.');}
  }
  else if(action==='photograph'||action==='restore') {
    const pending=system.pending;
    if(!pending||distance(headPoint(),pending.position)>3){system.close();ui.notify('Move a little closer to the artifact.');return;}
    let photograph=null;
    if(action==='photograph') {
      try {photograph=takePhotograph(pending);} catch(error){console.error(error);ui.notify('The photograph could not be captured. You can try again or restore the habitat.');return;}
    }
    const resolved=system.resolve(action,headPoint());
    if(resolved) {
      if(photograph)state.photos.push(photograph);
      player.setCheckpoint(resolved.checkpoint);state.currentAudio=resolved.definition.audio;song.play(state.currentAudio);
      ui.notify(action==='restore'?'Artifact found. A quiet light returns to the garden.':'Artifact found. A memory is preserved in your photograph.');
    }
  }
  else if(action==='replay')song.play(state.currentAudio);
  else if(action==='toggle-jump'){state.vrJump=!state.vrJump;document.querySelector('#vr-jump').checked=state.vrJump;ui.textureKey='';}
  else if(action==='exit-vr')bridge?.exit();
  else if(action==='restart') {
    const before=rigSnapshot();
    system.reset();system.close();player.setCheckpoint(world.start);player.yaw=0;
    player.respawn(state.xr&&state.latestXR?rotateY(state.latestXR.headLocal,player.yaw):undefined);
    refreshTrackedInput(state.latestXR,before);
    state.photos=[];state.currentAudio=null;song.stop();camera.update(player,0,true);ui.notify('Every return is a beginning.');
  }
  ui.sync(near());
}

/**
 * Render a mono research photograph into a separate p5 WEBGL context. This avoids
 * reading WebXR's opaque stereo framebuffer and works while a headset is active.
 * Photos stay in the journal; saving a PNG is an explicit desktop link click.
 */
function takePhotograph(artifact) {
  photoBuffer ||= p.createGraphics(800,600,p.WEBGL);
  const g=photoBuffer;g.pixelDensity(1);g._renderer._update();
  g.perspective(Math.PI/3,4/3,0.05,180);
  const eye=headPoint(),forward=forwardPoint();
  applyDesktopCamera(g,eye,{x:eye.x+forward.x,y:eye.y+forward.y,z:eye.z+forward.z});
  renderWorld(g,world,player,{time:state.time,showPlayer:false,currentIndex:system.foundCount,xr:false});
  return {id:artifact.id,name:artifact.definition.name,url:g.canvas.toDataURL('image/png')};
}

function platformHit(ray) {
  if(!ray||ray.direction.y>=-0.001)return null;
  let nearest=null;
  for(const platform of world.platforms) {
    const top=platform.y+platform.h/2,t=(top-ray.origin.y)/ray.direction.y;
    if(t<=0||t>30||(nearest&&t>=nearest.t))continue;
    const x=ray.origin.x+ray.direction.x*t,z=ray.origin.z+ray.direction.z*t;
    if(Math.abs(x-platform.x)<=platform.w/2-0.4&&Math.abs(z-platform.z)<=platform.d/2-0.4)nearest={x,y:top+0.03,z,t};
  }
  return nearest;
}
function rayHits(ray,position,radius=0.6) {
  if(!ray)return false;
  const d={x:position.x-ray.origin.x,y:position.y-ray.origin.y,z:position.z-ray.origin.z};
  const t=d.x*ray.direction.x+d.y*ray.direction.y+d.z*ray.direction.z;
  return t>0&&t<=4&&d.x*d.x+d.y*d.y+d.z*d.z-t*t<=radius*radius;
}

/** Advance physics/story once per frame; WebXR calls the render function twice. */
function update(dt,xrInput=null) {
  dt=Math.min(0.05,Math.max(0,dt));state.time+=dt;
  state.latestXR=xrInput;
  let input;
  if(xrInput) {
    if(xrInput.menuPressed)dispatch('journal');
    if(xrInput.turn&&!system.isBlocked){const before=rigSnapshot();player.snapTurn(-xrInput.turn*Math.PI/4,xrInput.headLocal);refreshTrackedInput(xrInput,before);}
    input={...xrInput,headingYaw:Math.atan2(-xrInput.headForward.x,-xrInput.headForward.z)};
    // The live panel is textured geometry. HTML dialogs do not enter the VR compositor.
    ui.placeVRPanel(xrInput.headWorld,xrInput.headForward);ui.texture(p,font);
    ui.hover=ui.hitPanel(xrInput.rightRay);
    if(xrInput.selectPressed) {
      if(system.isBlocked) {if(ui.hover)dispatch(ui.hover);}
      else {
        const target=system.currentArtifact?.position || (world.final.unlocked?{...world.final.position,y:world.final.position.y+1}:null);
        if(target&&rayHits(xrInput.rightRay,target))dispatch('interact');
      }
    }
    if(xrInput.teleportPressed&&!system.isBlocked) {
      const hit=platformHit(xrInput.leftRay);
      if(hit){const before=rigSnapshot();player.teleportTo({x:hit.x-xrInput.roomOffset.x,y:hit.y,z:hit.z-xrInput.roomOffset.z});refreshTrackedInput(xrInput,before);}
    }
  } else {
    if(menuPressed)dispatch('journal');
    if(interactPressed)dispatch('interact');
    input={move:{x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),z:Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))},jumpPressed};
    jumpPressed=false;interactPressed=false;menuPressed=false;
  }
  const priorRespawn=player.respawnCount,beforePhysics=rigSnapshot();
  if(xrInput){input.roomOffset=xrInput.roomOffset;input.headingYaw=Math.atan2(-xrInput.headForward.x,-xrInput.headForward.z);}
  player.update(dt,input,world,{blocked:!state.started||system.isBlocked,allowJump:!state.xr||state.vrJump});
  refreshTrackedInput(xrInput,beforePhysics);
  if(player.respawnCount!==priorRespawn){system.close();camera.update(player,0,true);ui.notify('The garden brings you back to your last discovery.');}
  camera.update(player,dt);
  ui.sync(near());
}

function drawWorldFrame(xrInfo=null) {
  const input=xrInfo?.state;
  if(input){state.latestXR=input;ui.placeVRPanel(input.headWorld,input.headForward);}
  const panel=state.xr?ui.texture(p,font):null;
  renderWorld(p,world,player,{time:state.time,xr:state.xr,showPlayer:!state.xr,currentIndex:system.foundCount,
    rays:input?{right:input.rightRay,left:input.leftRay}:null,
    teleportMarker:input&&!system.isBlocked?platformHit(input.leftRay):null,panel});
}

window.addEventListener('keydown',event=>{
  if(state.xr||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))return;
  keys.add(event.code);
  if(event.code==='Space'&&!system.isBlocked){event.preventDefault();if(!event.repeat)jumpPressed=true;}
  if(event.repeat)return;
  if(event.code==='KeyE')interactPressed=true;
  if(event.code==='KeyJ')menuPressed=true;
  if(event.code==='Escape'&&!system.completed)dispatch('close');
});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',()=>{keys.clear();orbiting=false;jumpPressed=false;interactPressed=false;menuPressed=false;});
window.addEventListener('pointerup',()=>{orbiting=false;});
window.addEventListener('pointermove',event=>{
  if(orbiting&&!state.xr&&!system.isBlocked){player.yaw-=event.movementX*0.005;camera.pitch+=event.movementY*0.004;}
});
document.querySelector('#brand').addEventListener('click',event=>event.preventDefault());

new p5(instance=>{
  p=instance;
  p.preload=()=>{font=p.loadFont('assets/fonts/NotoSans-Regular.ttf');};
  p.setup=()=>{
    p.setAttributes({alpha:false,antialias:true,preserveDrawingBuffer:true});
    const canvas=p.createCanvas(window.innerWidth,window.innerHeight,p.WEBGL);canvas.parent('canvas-host');
    p.pixelDensity(Math.min(window.devicePixelRatio||1,1.5));p.frameRate(30);p.noStroke();
    canvas.elt.addEventListener('contextmenu',event=>event.preventDefault());
    canvas.elt.addEventListener('pointerdown',event=>{if(event.button===2)orbiting=true;});
    p.perspective(Math.PI/3,p.width/p.height,0.05,180);camera.update(player,0,true);
    bridge=new WebXRBridge(p,{getRig:()=>player,update,render:drawWorldFrame,
      onStateChange:active=>{state.xr=active;state.latestXR=null;state.started=true;keys.clear();if(active)system.openJournal();else system.close();camera.update(player,0,true);ui.sync(near());},
      onError:error=>ui.notify(error.message)});
    const vrButton=document.querySelector('#vr-button');
    vrButton.addEventListener('click',()=>{song.unlock().catch(()=>{});bridge.active?bridge.exit():bridge.enter().catch(()=>{});});
    bridge.supported().then(supported=>ui.setVRSupport(supported));
    ui.ready();ui.sync(near());
    // Public model access helps learning/debugging without adding cheat controls to UI.
    Object.assign(state,{p,bridge,ui,dispatch});window.riversGame=state;
  };
  p.draw=()=>{
    if(bridge?.active)return;
    update(p.deltaTime/1000);
    p.perspective(Math.PI/3,p.width/p.height,0.05,180);
    applyDesktopCamera(p,camera.eye,camera.target);drawWorldFrame();
  };
  p.windowResized=()=>{if(!bridge?.active)p.resizeCanvas(window.innerWidth,window.innerHeight);};
});
