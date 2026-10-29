(()=>{
'use strict';
const loadStatus=document.querySelector('#load-status');
const canvas=document.querySelector('#world');
let ctx;
try { ctx=canvas.getContext('2d'); } catch {}
if(!ctx){
  loadStatus.textContent='This preview cannot draw the game. Open the page in a browser with Canvas support.';
  return;
}
let W,H,dpr,t=0,mode='explore',playing=false,yaw=0,px=0,pz=0,flow=false,photo=false,remembered=false,ending=false;
const keys={},targets=[],rand=(a,b)=>a+Math.random()*(b-a);
let seed=91;function rng(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
const mountains=Array.from({length:8},(_,i)=>({x:i/7,h:.12+rng()*.19,w:.10+rng()*.12}));
const plants=Array.from({length:155},()=>({x:(rng()-.5)*42,z:4+rng()*65,s:.15+rng()*.4,kind:rng(),phase:rng()*6}));
const motes=Array.from({length:45},()=>({x:rng(),y:rng(),s:rng()*1.8,phase:rng()*6}));
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}addEventListener('resize',resize);resize();
function project(x,y,z){x-=px;z-=pz;let xx=x*Math.cos(yaw)-z*Math.sin(yaw),zz=x*Math.sin(yaw)+z*Math.cos(yaw);if(zz<.8)return null;const scale=W*.8/zz;return{x:W*.53+xx*scale,y:H*.46+(2.8-y)*scale,s:scale,z:zz};}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.7;ctx.stroke();}}
function face(points,c){const p=points.map(v=>project(...v));if(p.some(v=>!v))return;poly(p.map(v=>[v.x,v.y]),c);}
function box(x,y,z,w,h,d,c='#6b8171'){face([[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y+h,z-d/2],[x-w/2,y+h,z-d/2]],c);face([[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x+w/2,y+h,z+d/2],[x+w/2,y+h,z-d/2]],'#455e53');face([[x-w/2,y+h,z-d/2],[x+w/2,y+h,z-d/2],[x+w/2,y+h,z+d/2],[x-w/2,y+h,z+d/2]],'#9ba58a');}
function roof(x,y,z,w,d){face([[x-w*.6,y+.25,z-d*.6],[x,y+1.2,z-d*.6],[x+w*.6,y+.25,z-d*.6],[x+w*.65,y+.6,z-d*.6],[x+w*.5,y-.15,z-d*.6],[x-w*.5,y-.15,z-d*.6],[x-w*.65,y+.6,z-d*.6]],'#253f38');face([[x,y+1.2,z-d*.6],[x,y+1.2,z+d*.6],[x+w*.6,y+.25,z+d*.6],[x+w*.6,y+.25,z-d*.6]],'#456355');for(let j=0;j<5;j++){const yy=y+.2+j*.18;face([[x-w*(.5-j*.085),yy,z-d*.61],[x+w*(.5-j*.085),yy,z-d*.61],[x+w*(.5-j*.085),yy+.035,z-d*.61],[x-w*(.5-j*.085),yy+.035,z-d*.61]],'#b29b62');}}
function temple(x,z,size=1,levels=2){box(x,0,z,6*size,.5,4*size,'#697f69');for(let j=0;j<levels;j++){const y=.5+j*2.5*size,w=(5-j*.8)*size;box(x,y,z,w,.35*size,3.4*size,'#9b9d77');for(const k of [-1,1]){box(x+k*w*.39,y,z-1.2*size,.28*size,2.2*size,.28*size,'#a99369');box(x+k*w*.39,y,z+1*size,.28*size,2.2*size,.28*size,'#6f7a56');}box(x,y+.3*size,z+.7*size,w*.65,1.5*size,.25*size,'#3a5c50');roof(x,y+2*size,z,w,3.5*size);}const p=project(x,.7,z-1.85*size);if(p){ctx.fillStyle='#7f9871';for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(p.x+(i-2.5)*p.s*.6*size,p.y,p.s*.5*size,p.s*.10*size,0,0,Math.PI*2);ctx.fill();}}}
function arch(x,z){for(const k of [-1,1]){box(x+k*3.4,0,z,1.45,1,2,'#7c8a6d');box(x+k*3.4,1,z,.9,7.2,1.2,'#7b8c70');box(x+k*3.4,3.4,z,1.18,.3,1.5,'#b2a87c');box(x+k*3.4,6.6,z,1.2,.35,1.5,'#b2a87c');}box(x,7.1,z,8.5,.6,1.5,'#a6a27b');box(x,6.1,z,5.9,1.2,.65,'#596e57');roof(x,7.9,z,9.5,2.8);const p=project(x,6.7,z-.8);if(p){ctx.fillStyle='#d6c590';ctx.font=`${Math.max(5,p.s*.42)}px Georgia`;ctx.textAlign='center';ctx.fillText('水  ·  归  ·  生',p.x,p.y);}for(let i=0;i<20;i++){const p=project(x-4.2+i*.44,7.4-Math.sin(i)*.3,z-.85);if(p){ctx.fillStyle=i%3?'#507857':'#9da577';ctx.beginPath();ctx.ellipse(p.x,p.y,p.s*.22,p.s*(.3+(i%4)*.2),.2,0,7);ctx.fill();}}}
function waterfall(x,z,h,width){const a=project(x,h,z),b=project(x,0,z);if(!a||!b)return;const grad=ctx.createLinearGradient(a.x,a.y,b.x,b.y);grad.addColorStop(0,'#dcece1aa');grad.addColorStop(.65,'#b0ddd3c9');grad.addColorStop(1,'#a2dedb08');ctx.fillStyle=grad;ctx.fillRect(a.x-width*a.s/2,a.y,width*a.s,b.y-a.y);for(let i=0;i<9;i++){const xx=a.x+(i/9-.5)*width*a.s;ctx.strokeStyle=`rgba(225,248,230,${.12+Math.sin(t*.02+i)*.08})`;ctx.lineWidth=1+i%2;ctx.beginPath();ctx.moveTo(xx,a.y);ctx.lineTo(xx+Math.sin(t*.02+i)*2,b.y);ctx.stroke();}ctx.strokeStyle='#d7f7e34a';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(b.x,b.y+i*4,b.s*width*.9+i*8,3+i*3,0,0,7);ctx.stroke();}}
function lotus(x,z,s,phase,glowing=false){const p=project(x,0,z);if(!p)return;const r=p.s*s;ctx.fillStyle='#4e8a7080';ctx.beginPath();ctx.ellipse(p.x,p.y+2,r*2.1,r*.55,-.12,0,7);ctx.fill();ctx.strokeStyle='#87b09a66';ctx.beginPath();ctx.ellipse(p.x,p.y+4,r*2.7,r*.66,0,0,7);ctx.stroke();let yy=p.y-r*.9+Math.sin(t*.015+phase)*2;if(glowing){const g=ctx.createRadialGradient(p.x,yy,0,p.x,yy,r*4);g.addColorStop(0,'#77eee688');g.addColorStop(1,'#60e0d900');ctx.fillStyle=g;ctx.fillRect(p.x-r*4,yy-r*4,r*8,r*8);targets.push({kind:'lotus',x:p.x,y:yy,r:Math.max(r*3,35)});}for(let j=0;j<7;j++){let a=(j/6)*Math.PI-Math.PI;ctx.fillStyle=j%2?'#d6b8c2':'#eccdca';ctx.beginPath();ctx.ellipse(p.x+Math.cos(a)*r*.55,yy+Math.sin(a)*r*.35,r*.32,r*.85,a+Math.PI/2,0,7);ctx.fill();}ctx.fillStyle=glowing?'#b5fff0':'#e8d89b';ctx.beginPath();ctx.ellipse(p.x,yy+r*.1,r*.25,r*.15,0,0,7);ctx.fill();}
function rock(x,z,w,h){box(x,0,z,w,h,w*.7,'#5f7564');box(x-.1,h,z,w*.9,.1,w*.65,'#8b9977');}
function wheel(){const p=project(4.7,1.8,15);if(!p)return;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(flow?t*.012:0);ctx.strokeStyle='#c7b47c';ctx.lineWidth=p.s*.09;ctx.beginPath();ctx.arc(0,0,p.s*.7,0,7);ctx.stroke();for(let j=0;j<8;j++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(p.s*.7,0);ctx.stroke();}ctx.restore();targets.push({kind:'wheel',x:p.x,y:p.y,r:Math.max(30,p.s)});label(p.x,p.y-p.s,'ANCIENT SLUICE',flow?'Waterway restored':'Redirect water · 3');}
function label(x,y,title,sub){ctx.textAlign='center';ctx.font='8px sans-serif';ctx.letterSpacing='2px';ctx.fillStyle='#ecedce';ctx.fillText(title,x,y);ctx.letterSpacing='0px';ctx.font='italic 10px Georgia';ctx.fillStyle='#d1dfc4bb';ctx.fillText(sub,x,y+17);}
function render(){t++;targets.length=0;const speed=.085;if(playing&&!document.querySelector('.modal:not([hidden])')){if(keys.w||keys.arrowup)pz=Math.min(9,pz+speed);if(keys.s||keys.arrowdown)pz=Math.max(-4,pz-speed);if(keys.a)px=Math.max(-7,px-speed);if(keys.d)px=Math.min(7,px+speed);if(keys.arrowleft)yaw=Math.max(-.5,yaw-.009);if(keys.arrowright)yaw=Math.min(.5,yaw+.009);}
const sky=ctx.createLinearGradient(0,0,0,H*.6);sky.addColorStop(0,'#8ab7b4');sky.addColorStop(.45,'#c6d4b9');sky.addColorStop(1,'#e0dfbc');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);ctx.fillStyle='#f2e5bc';ctx.beginPath();ctx.arc(W*.65-yaw*W*.4,H*.2,W*.045,0,7);ctx.fill();for(let layer=0;layer<3;layer++){for(const m of mountains){const x=(m.x-yaw*.2)*W;poly([[x-m.w*W,H*.48],[x-m.w*W*.6,H*(.46-m.h*.6)+layer*H*.035],[x-m.w*W*.25,H*(.43-m.h)+layer*H*.035],[x+m.w*W*.18,H*(.44-m.h*.9)+layer*H*.035],[x+m.w*W*.7,H*.48]],['#a3b9a0','#839f8f','#6e9386'][layer]);}}
const water=ctx.createLinearGradient(0,H*.46,0,H);water.addColorStop(0,'#7eafa0');water.addColorStop(.45,'#3f827a');water.addColorStop(1,'#163f40');ctx.fillStyle=water;ctx.fillRect(0,H*.46,W,H*.54);for(let i=0;i<160;i++){const y=H*.47+Math.pow(i/160,1.7)*H*.53;const xx=(Math.sin(i*28.1)*.5+.5)*W;ctx.strokeStyle=`rgba(190,219,182,${.05+(i%7)*.013})`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(xx+Math.sin(t*.008+i)*10,y);ctx.lineTo(xx+20+(i/160)*90,y);ctx.stroke();}
// Distant terraces, shrine silhouettes, and the living water system.
temple(-13,53,1.9,3);temple(15,58,2,3);box(-5,0,45,12,5,5,'#718e78');waterfall(-5,42,5,2.3);temple(-5,46,1.3,2);box(9,0,37,8,4,3,'#6c856d');waterfall(9,35,4,2);temple(10,40,1.2,3);arch(0,29);temple(-10,24,1.1,2);temple(11,24,1.2,2);
// Submerged pathway.
for(let i=9;i>=0;i--){const z=5+i*1.85;box(-.5+Math.sin(i*.5)*.7,-.25,z,2.1,.32,1.4,'#8c9676');}
rock(4.7,15,2,1);wheel();if(flow){waterfall(3.8,14.8,1.4,1.1);for(let i=0;i<10;i++){const p=project(3.7-i*.55,0,14-i*.5);if(p){ctx.strokeStyle='#8fffe896';ctx.beginPath();ctx.ellipse(p.x,p.y,20+i*2,3,0,0,7);ctx.stroke();}}}
plants.sort((a,b)=>b.z-a.z);for(const p of plants){if(p.kind>.5)lotus(p.x,p.z,p.s,p.phase);else{const a=project(p.x,0,p.z);if(a){ctx.strokeStyle='#668d64';ctx.lineWidth=Math.max(1,a.s*.025);for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(a.x+i*3,a.y);ctx.quadraticCurveTo(a.x-8+i*6,a.y-a.s*p.s,a.x+Math.sin(i+1)*a.s*p.s,a.y-a.s*p.s*2);ctx.stroke();}}}}
lotus(-2.9,10,.4,0,true);const lp=project(-2.9,.85,10);if(lp)label(lp.x,lp.y-24,'LUMINOUS LOTUS',photo?'Specimen documented':'Observe with camera · 2');
if(flow){const p=project(0,2.1,26);if(p){ctx.save();ctx.globalAlpha=.6+Math.sin(t*.03)*.2;ctx.shadowColor='#a1fff2';ctx.shadowBlur=30;ctx.strokeStyle='#b1ffed';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,p.s*.8,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y-p.s*.5);ctx.lineTo(p.x,p.y+p.s*.5);ctx.moveTo(p.x-p.s*.5,p.y);ctx.lineTo(p.x+p.s*.5,p.y);ctx.stroke();ctx.restore();targets.push({kind:'memory',x:p.x,y:p.y,r:Math.max(40,p.s)});label(p.x,p.y-p.s*1.2,'THE SANCTUARY REMEMBERS','Approach the echo · click');}}
// Near banks frame the water, with trailing leaves.
rock(-8,5,5,.8);rock(9,5,4,.6);for(let i=0;i<12;i++)lotus(-7+i*.45,5+(i%3),.25,i);for(let i=0;i<16;i++){let x=W*(.77+i*.02);ctx.strokeStyle='#2c5546';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,-10);ctx.quadraticCurveTo(x-50,H*.07,x-30,H*(.04+(i%4)*.025));ctx.stroke();ctx.fillStyle=i%3?'#416a4e':'#728560';for(let j=0;j<4;j++){ctx.beginPath();ctx.ellipse(x-18-j*5,H*.012+j*12,12,4,-.7,0,7);ctx.fill();}}
for(const m of motes){ctx.fillStyle=`rgba(223,239,174,${.2+Math.sin(t*.02+m.phase)*.2})`;ctx.beginPath();ctx.arc((m.x*W+Math.sin(t*.003+m.phase)*30),m.y*H*.8+Math.cos(t*.005+m.phase)*15,m.s,0,7);ctx.fill();}
// Staff in the player's hand.
if(playing&&mode==='staff'){ctx.save();ctx.translate(W*.78,H*.93+Math.sin(t*.03)*3);ctx.rotate(.2);ctx.strokeStyle='#9e8d58';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(0,100);ctx.lineTo(0,-125);ctx.stroke();ctx.strokeStyle='#cbb782';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-150,32,0,7);ctx.stroke();const g=ctx.createRadialGradient(0,-150,1,0,-150,31);g.addColorStop(0,'#e7fff2');g.addColorStop(.3,'#8be7d6');g.addColorStop(1,'#3a9b9c22');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,-150,27,0,7);ctx.fill();ctx.restore();}
requestAnimationFrame(render);}render();
let toastTimer;function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3800);}
function start(){if(playing)return;playing=true;document.body.classList.add('playing');document.querySelector('#hint').innerHTML='<span>✧</span> Select the camera and click the luminous lotus';toast('Welcome home, researcher. Use WASD to explore; arrows to look.');}
function setMode(m){start();mode=m;document.querySelectorAll('.tool').forEach(e=>e.classList.toggle('active',e.id===m));document.querySelector('#camera-frame').hidden=m!=='camera';document.querySelector('#hint').innerHTML='<span>✧</span> '+({explore:'Follow the water. Click a glowing discovery.',camera:'Click the luminous lotus to document its habitat.',staff:'Click the golden sluice wheel to redirect the water.'}[m]||'');}
function complete(task){document.querySelector(`[data-task="${task}"]`).classList.add('done');document.querySelector(`[data-task="${task}"] i`).textContent='✓';document.querySelector('#progress').textContent=String([photo,flow,remembered].filter(Boolean).length).padStart(2,'0')+' / 03';}
function interact(kind){if(kind==='lotus'){if(mode!=='camera'){toast('This organism is unfamiliar. Select Camera (2) to study it.');return;}photo=true;complete('photo');document.querySelector('#journal-dot').hidden=false;document.querySelector('#camera-label').textContent='Nymphaea luminosa · documented';toast('Specimen documented. Its light responds to flowing water.');document.querySelector('#journal').hidden=false;}if(kind==='wheel'){if(!photo){toast('Study the luminous lotus first. Observation reveals the way.');return;}if(mode!=='staff'){toast('Select Water staff (3) to turn the ancient sluice.');return;}if(flow){toast('The waterway is flowing. The archive beneath the gate is awake.');return;}flow=true;complete('water');toast('Waterway restored. A memory is stirring beneath the gate.');document.querySelector('#hint').innerHTML='<span>✧</span> Click the luminous echo beneath the sanctuary gate';}if(kind==='memory'){if(!flow)return;remembered=true;complete('memory');document.querySelector('#memory').hidden=false;}}
canvas.addEventListener('click',e=>{if(!playing){start();return;}let candidates=targets.filter(v=>Math.hypot(v.x-e.clientX,v.y-e.clientY)<v.r);if(candidates.length)interact(candidates[0].kind);else toast(mode==='camera'?'Frame the glowing lotus on the left side of the path.':mode==='staff'?'The golden sluice wheel controls this waterway.':'Look for the luminous lotus, the sluice wheel, or the archive echo.');});
document.querySelector('#begin').onclick=start;for(const id of ['explore','camera','staff'])document.querySelector('#'+id).onclick=()=>setMode(id);
document.querySelector('#notes').onclick=()=>{if(!photo){toast('Your journal is empty. Photograph a species to begin.');return;}document.querySelector('#journal').hidden=false;document.querySelector('#journal-dot').hidden=true;};document.querySelector('.close').onclick=()=>document.querySelector('#journal').hidden=true;
document.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{ending=true;document.querySelector('#memory').hidden=true;document.querySelector('.objective h2').textContent='A new beginning';document.querySelector('.objective p').textContent=b.dataset.choice+'. The sanctuary will remember your choice.';document.querySelector('#hint').innerHTML='<span>✧</span> Chapter complete. A world changed. A home rediscovered.';toast('Choice recorded: '+b.dataset.choice+'. Continue exploring the sanctuary.');});
addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;keys[e.key.toLowerCase()]=true;if(e.key.startsWith('Arrow')||e.key===' ')e.preventDefault();if(e.key==='1')setMode('explore');if(e.key==='2')setMode('camera');if(e.key==='3')setMode('staff');if(e.key.toLowerCase()==='j')document.querySelector('#notes').click();if(e.key==='Escape')document.querySelectorAll('.modal').forEach(m=>m.hidden=true);});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
let audio,oscillators=[],sound=false;
document.querySelector('#sound').onclick=async()=>{
  const button=document.querySelector('#sound');
  try {
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio) throw new Error('Audio is unavailable');
    if(!audio){
      audio=new Audio();
      const gain=audio.createGain();gain.gain.value=.025;gain.connect(audio.destination);
      for(const hz of [130.81,196,261.63]){
        const o=audio.createOscillator();o.frequency.value=hz;o.type='sine';
        o.connect(gain);o.start();oscillators.push(o);
      }
    }
    if(sound) await audio.suspend(); else await audio.resume();
    sound=audio.state==='running';
    button.querySelector('span').textContent=sound?'SOUND ON':'SOUND OFF';
    if(!sound&&audio.state!=='suspended') toast('Sound is unavailable in this preview. You can keep playing silently.');
  } catch {
    sound=false;
    button.querySelector('span').textContent='SOUND UNAVAILABLE';
    button.disabled=true;
    toast('Sound is unavailable in this preview. You can keep playing silently.');
  }
};
loadStatus.hidden=true;
})();
