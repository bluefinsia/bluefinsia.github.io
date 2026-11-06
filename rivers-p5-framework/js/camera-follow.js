import { rotateY, clamp } from './math.js';

/** Delayed third-person camera for the desktop. Never applied to an XR head pose. */
export class CameraFollow {
  constructor() { this.eye=null; this.target=null; this.pitch=0.43; this.distance=6.8; this.delay=0.17; }
  update(player, dt, snap=false) {
    this.pitch=clamp(this.pitch,0.08,1.05);
    const target={x:player.position.x,y:player.position.y+1.1,z:player.position.z};
    const offset=rotateY({x:0,y:Math.sin(this.pitch)*this.distance,z:Math.cos(this.pitch)*this.distance},player.yaw);
    const desired={x:target.x+offset.x,y:target.y+offset.y,z:target.z+offset.z};
    if (!this.eye || snap) { this.eye=desired; this.target=target; return; }
    // Exponential decay gives consistent lag at different display frame rates.
    const a=1-Math.exp(-dt/this.delay);
    for(const axis of ['x','y','z']) { this.eye[axis]+=(desired[axis]-this.eye[axis])*a; this.target[axis]+=(target[axis]-this.target[axis])*a; }
  }
}
