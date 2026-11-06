/** Desktop DOM UI plus a textured, ray-clickable journal for immersive VR.
 * Normal DOM dialogs are not visible inside most desktop VR headsets.
 */
export class GameUI {
  constructor(state, dispatch) {
    this.state=state; this.dispatch=dispatch; this.key=''; this.textureKey=''; this.graphics=null; this.hover=null;
    this.panel={visible:false,position:{x:0,y:0,z:0},yaw:0,width:1.9,height:1.37,graphics:null};
    this.buttons=[];
    this.dialog=document.querySelector('#journal-dialog');
    const bind=(selector,action)=>document.querySelector(selector).addEventListener('click',()=>dispatch(action));
    bind('#begin-button','begin'); bind('#journal-button','journal'); bind('#brand','journal');
    bind('#interact-button','interact'); bind('#close-dialog','close'); bind('#leave-button','close');
    bind('#restart-button','restart'); bind('#replay-button','replay');
    document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>dispatch(button.dataset.action)));
    this.dialog.addEventListener('cancel',event=>{event.preventDefault();dispatch('close');});
    document.querySelector('#vr-jump').addEventListener('change',event=>{state.vrJump=event.target.checked;});
    for(let i=0;i<5;i++) document.querySelector('#progress-dots').append(document.createElement('i'));
  }
  notify(message) {
    const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('show');
    clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>toast.classList.remove('show'),4500);
    this.notice=message;this.textureKey='';
  }
  ready() { document.querySelector('#begin-button').disabled=false;document.querySelector('#begin-button').textContent='Follow the water →';document.querySelector('#load-status').hidden=true; }
  setVRSupport(supported) {
    const button=document.querySelector('#vr-button');button.disabled=!supported;
    button.textContent=supported?'Enter VR':'VR unavailable';
    button.title=supported?'Connect your headset and enter immersive VR':'Desktop play is available. VR needs a connected headset, a WebXR browser and HTTPS or localhost.';
  }
  sync(near) {
    const {system:s,started,xr,photos}=this.state;
    const key=[s.foundCount,s.pending?.id,s.journalOpen,s.completed,s.clue,started,xr,photos.length,near,this.state.currentAudio].join('|');
    if(key===this.key)return;
    this.key=key;this.textureKey='';
    document.body.classList.toggle('playing',started); document.body.classList.toggle('xr-active',xr);
    document.querySelector('#intro').hidden=started;document.querySelector('#field-note').hidden=!started;
    document.querySelector('#count').innerHTML=`${s.foundCount} <small>/ 5</small>`;
    [...document.querySelector('#progress-dots').children].forEach((dot,i)=>dot.classList.toggle('done',i<s.foundCount));
    document.querySelector('#chapter').textContent=`${s.foundCount<5?'THE ARTIFACT TRAIL':'A HOME REDISCOVERED'} · ${Math.min(s.foundCount+1,5)}`;
    document.querySelector('#objective').textContent=s.completed?'Stay. Wander. Belong.':s.foundCount===5?'Something remembers.':'Follow a quiet light.';
    document.querySelector('#verse').textContent=s.clue;
    const interact=document.querySelector('#interact-button');interact.disabled=!near||s.isBlocked;
    interact.textContent=near?'Interact · E':s.foundCount<5?'Wander toward the next image':'Find the sanctuary light';
    const open=started&&!xr&&(s.pending||s.journalOpen||s.completed);
    if(open&&!this.dialog.open)this.dialog.showModal(); else if(!open&&this.dialog.open)this.dialog.close();
    document.querySelector('#dialog-title').textContent=s.completed?'The river remembers.':s.pending?.definition.name || 'Đi Cấy · Field journal';
    document.querySelector('#dialog-description').textContent=s.completed?'This changed world was Earth. You found a home still learning to live.':s.pending?.definition.description || 'Read the song. Follow its images through the palace ruins.';
    document.querySelector('#dialog-verse').textContent=s.clue;
    document.querySelector('#choice-buttons').hidden=!s.pending;
    document.querySelector('#restart-button').hidden=!s.completed;
    document.querySelector('#leave-button').hidden=s.completed;
    document.querySelector('#close-dialog').hidden=s.completed;
    document.querySelector('#replay-button').disabled=!this.state.currentAudio;
    const gallery=document.querySelector('#photo-gallery');gallery.replaceChildren();
    for(const photo of photos) {
      const link=document.createElement('a');link.href=photo.url;link.download=photo.id+'.png';link.textContent=photo.name+' · Save photo';
      const image=new Image();image.src=photo.url;image.alt=photo.name+' research photograph';link.prepend(image);gallery.append(link);
    }
  }
  /** Open/reposition a world-anchored panel once per UI phase, not every head movement. */
  placeVRPanel(head,forward) {
    const visible=this.state.xr&&this.state.started&&this.state.system.isBlocked;
    const phase=[visible,this.state.system.pending?.id,this.state.system.journalOpen,this.state.system.completed].join('|');
    if(visible&&phase!==this.phase) {
      const length=Math.hypot(forward.x,forward.z)||1;
      const fx=forward.x/length,fz=forward.z/length;
      this.panel.position={x:head.x+fx*2.1,y:head.y-0.12,z:head.z+fz*2.1};
      this.panel.yaw=Math.atan2(-fx,-fz);
    }
    this.phase=phase;this.panel.visible=visible;
  }
  texture(p,font) {
    this.graphics ||= p.createGraphics(1000,720);
    this.panel.graphics=this.graphics;
    const s=this.state.system,key=[this.key,this.hover,this.notice,this.state.vrJump].join('|');
    if(key===this.textureKey)return this.panel;
    this.textureKey=key;
    const g=this.graphics;g.background(241,239,220);g.noStroke();g.textFont(font||'Arial');
    g.fill(100,123,104);g.textSize(18);g.text('THERE ARE RIVERS IN THE SKY',45,52);
    g.fill(37,66,60);g.textSize(28);g.text(`Artifacts found: ${s.foundCount} / 5`,45,105);
    g.textSize(36);g.text(s.completed?'The river remembers.':s.pending?.definition.name||'Đi Cấy · Field journal',45,170);
    g.fill(132,78,113);g.textSize(27);g.text(s.clue,45,213,910,145);
    g.fill(64,90,77);g.textSize(23);g.text(s.completed?'This changed world was Earth. You found a home still learning to live.':s.pending?.definition.description||'Follow the song through the flooded palace. Close the journal to explore.',45,370,910,110);
    this.buttons=[];
    if(s.pending) this.buttons.push({id:'listen',label:'Listen',x:40,y:500,w:285,h:66},{id:'photograph',label:'Photograph',x:357,y:500,w:285,h:66},{id:'restore',label:'Restore',x:675,y:500,w:285,h:66});
    this.buttons.push({id:s.completed?'restart':'close',label:s.completed?'Begin again':'Close / leave for now',x:300,y:610,w:400,h:62});
    this.buttons.push({id:'toggle-jump',label:this.state.vrJump?'Jumping: on':'Jumping: off',x:40,y:610,w:220,h:62});
    this.buttons.push({id:'exit-vr',label:'Exit VR',x:760,y:610,w:200,h:62});
    for(const button of this.buttons) {
      g.fill(this.hover===button.id?'#c5d8b8':'#dce3d0');g.rect(button.x,button.y,button.w,button.h,9);
      g.fill(40,68,58);g.textSize(23);g.textAlign(g.CENTER,g.CENTER);g.text(button.label,button.x+button.w/2,button.y+button.h/2);g.textAlign(g.LEFT,g.BASELINE);
    }
    if(this.notice){g.fill(88,119,89);g.textSize(17);g.text(this.notice,45,590,910,30);}
    return this.panel;
  }
  /** Intersect a controller ray with the plane, then test buttons in texture pixels. */
  hitPanel(ray) {
    if(!ray||!this.panel.visible)return null;
    const {position:c,yaw,width,height}=this.panel;
    const nx=Math.sin(yaw),nz=Math.cos(yaw),d=ray.direction;
    const denominator=d.x*nx+d.z*nz;
    if(Math.abs(denominator)<1e-6)return null;
    const t=((c.x-ray.origin.x)*nx+(c.z-ray.origin.z)*nz)/denominator;
    if(t<=0||t>4)return null;
    const dx=ray.origin.x+d.x*t-c.x,dy=ray.origin.y+d.y*t-c.y,dz=ray.origin.z+d.z*t-c.z;
    const x=( (Math.cos(yaw)*dx-Math.sin(yaw)*dz)/width+0.5)*1000;
    const y=(0.5-dy/height)*720;
    return this.buttons.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)?.id||null;
  }
}
