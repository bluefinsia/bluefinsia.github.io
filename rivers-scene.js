/* Original procedural landscape. No image, font, or network dependencies. */
(() => {
  'use strict';
  window.createRiversScene = function createRiversScene(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    let width = 1, height = 1, scale = 24, camera = {x: -1, z: -2};
    let lastState = null;
    const landmarks = {lotus: {x: -11, z: 0, h: .1}, wheel: {x: 7, z: -5, h: 1.1}, memory: {x: 0, z: -15, h: 2}};
    let seed = 7321;
    function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    const between = (a,b) => a + (b-a)*random();
    const foliage = [];
    const grasses = [];
    const stones = [];
    const flecks = [];
    const trees = [];
    const clearings = [{x:-11,z:0,r:5.8},{x:7,z:-5,r:4.8},{x:0,z:-15,r:6.3},{x:-6,z:8,r:4}];
    for (let i=0; i<100; i++) {
      const x=between(-29,29),z=between(-25,23);
      if(clearings.some(c=>Math.hypot(x-c.x,(z-c.z)*.8)<c.r)) continue;
      // Trees follow the edge of the valley, leaving the central paths open.
      if(Math.abs(x)<9 && z>-12 && z<17) continue;
      trees.push({x,z,s:between(.75,1.55),seed:random(),lean:between(-.16,.16),kind:random(),dots:Array.from({length:22},()=>({x:between(-1,1),y:between(-1,1),r:between(.13,.38)}))});
    }
    for(let i=0;i<620;i++) grasses.push({x:between(-31,31),z:between(-27,25),r:between(.025,.075),a:random(),t:random()});
    for(let i=0;i<33;i++) stones.push({x:between(-25,25),z:between(-22,23),s:between(.2,.7),r:random()});
    for(let i=0;i<42;i++) foliage.push({x:between(-31,31),z:between(-28,24),rx:between(2,6),rz:between(1.6,4),tone:random()});
    for(let i=0;i<34;i++) flecks.push({x:random(),y:random(),phase:between(0,Math.PI*2),size:between(.7,2),speed:between(.3,1)});
    const texture = document.createElement('canvas'); texture.width=texture.height=256;
    const tx=texture.getContext('2d');
    for(let i=0;i<6500;i++){tx.fillStyle=i%2?'rgba(83,68,38,.055)':'rgba(255,255,246,.12)';tx.fillRect(random()*256,random()*256,random()<.8?1:2,1);}
    const paper = ctx.createPattern(texture,'repeat');
    const palettes = {
      spring: {paper:'#eeeedf',land:'#d9dfb9',light:'#e5e8c7',grass:'#a0b37a',tree:['#7b9b71','#a2b684','#b9c99c','#89a381'],accent:'#d9b987',water:'#8bbeb3',deep:'#68a89f',flower:'#d6abb7'},
      summer: {paper:'#eee9d8',land:'#d8ddb2',light:'#e8e5bc',grass:'#99ac73',tree:['#7d9e71','#9eb385','#bcc79a','#91ab7d'],accent:'#d5b675',water:'#8cbfb2',deep:'#65a69c',flower:'#d5a0a6'},
      autumn: {paper:'#f1ebdc',land:'#dedbb4',light:'#eee5c6',grass:'#b4b581',tree:['#ada779','#c1b184','#d3bc86','#91a381'],accent:'#cc9b65',water:'#8fb9ac',deep:'#72a69f',flower:'#d7a3ae'}
    };
    function resize(){
      width=canvas.clientWidth||innerWidth||1;height=canvas.clientHeight||innerHeight||1;
      const ratio=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
      ctx.setTransform(ratio,0,0,ratio,0,0);
      scale=Math.max(14,Math.min(31,width/(width<600?29:46)));
    }
    function worldToScreen(x,z,h=0){return{x:width*.5+(x-camera.x)*scale,y:height*.59+(z-camera.z)*scale*.54-h*scale};}
    function screenToWorld(x,y){return{x:(x-width*.5)/scale+camera.x,z:(y-height*.59)/(scale*.54)+camera.z};}
    function worldSpace(fn){ctx.save();const p=worldToScreen(0,0);ctx.translate(p.x,p.y);ctx.scale(scale,scale*.54);fn();ctx.restore();}
    function smoothPath(points,closed=false){
      ctx.beginPath();
      if(closed){const prev=points[points.length-1],first=points[0];ctx.moveTo((prev[0]+first[0])/2,(prev[1]+first[1])/2);points.forEach((p,i)=>{const next=points[(i+1)%points.length];ctx.quadraticCurveTo(p[0],p[1],(p[0]+next[0])/2,(p[1]+next[1])/2);});ctx.closePath();}
      else {ctx.moveTo(...points[0]);for(let i=1;i<points.length-1;i++){const p=points[i],n=points[i+1];ctx.quadraticCurveTo(p[0],p[1],(p[0]+n[0])/2,(p[1]+n[1])/2);}ctx.lineTo(...points[points.length-1]);}
    }
    function ellipse(x,y,rx,ry,color,angle=0){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);ctx.fill();}
    function softPatch(x,z,rx,rz,color,opacity=1){const p=worldToScreen(x,z);ctx.save();ctx.globalAlpha=opacity;ctx.translate(p.x,p.y);ctx.scale(rx,rz*.54);const g=ctx.createRadialGradient(0,0,0,0,0,scale);g.addColorStop(0,color);g.addColorStop(.65,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(-scale,-scale,scale*2,scale*2);ctx.restore();}
    function ground(p,state){
      ctx.fillStyle=p.paper;ctx.fillRect(0,0,width,height);
      // A faint hill wash keeps the field open and papery at the horizon.
      const haze=ctx.createLinearGradient(0,height*.22,0,height);haze.addColorStop(0,p.paper);haze.addColorStop(1,'#e4dfc8');ctx.fillStyle=haze;ctx.fillRect(0,0,width,height);
      softPatch(-25,-28,14,7,'#bcc5a6',.38);softPatch(23,-30,15,7,'#c5c5a4',.3);
      worldSpace(()=>{
        const boundary=[[-38,18],[-36,-4],[-29,-19],[-15,-27],[4,-29],[24,-23],[35,-7],[39,14],[21,30],[1,33],[-23,29]];
        smoothPath(boundary,true);ctx.fillStyle='#aeb6a41a';ctx.fill();
        ctx.save();ctx.translate(0,-.7);smoothPath(boundary,true);ctx.fillStyle=p.land;ctx.fill();ctx.clip();
        for(const patch of foliage){ctx.globalAlpha=.14;ellipse(patch.x,patch.z,patch.rx,patch.rz,patch.tone>.4?p.light:p.grass,patch.tone);}
        ctx.globalAlpha=1;
        // Meandering footpaths are washes rather than sharply outlined roads.
        smoothPath([[-14,22],[-6,10],[-7,3],[-6,-2],[0,-9],[0,-17]]);ctx.strokeStyle=p.light;ctx.lineWidth=2.8;ctx.lineCap='round';ctx.stroke();
        smoothPath([[-6,3],[-11,0],[-17,-4]]);ctx.lineWidth=1.5;ctx.stroke();
        smoothPath([[0,-8],[8,-5],[17,-7]]);ctx.lineWidth=1.6;ctx.stroke();
        for(const g of grasses){ctx.globalAlpha=.24+g.a*.2;ellipse(g.x,g.z,g.r*1.8,g.r,g.t>.48?p.grass:'#f9efcc');}
        ctx.restore();
      });
      drawWater(p,state);
      // A loose scattering of wildflowers and grass strokes gives scale to the valley.
      for(const g of grasses){if(g.t<.77)continue;const s=worldToScreen(g.x,g.z);if(s.x<-10||s.x>width+10||s.y<-10||s.y>height+10)continue;ctx.strokeStyle=g.t>.9?'#97a4757a':'#b6b78488';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+2,s.y-5);ctx.moveTo(s.x+2,s.y-1);ctx.lineTo(s.x+4,s.y-7);ctx.stroke();if(g.a>.65)ellipse(s.x+4,s.y-7,1.4,1.4,p.flower);}
    }
    const river=[[-1,-34],[8,-27],[14,-18],[12,-10],[7,-7],[1,-2],[-4,4],[-3,12],[4,19],[9,32]];
    function drawWater(p,state){
      worldSpace(()=>{
        smoothPath(river);ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle='#d6cdab';ctx.lineWidth=7.8;ctx.stroke();
        smoothPath(river);ctx.strokeStyle='#b3c4aa';ctx.lineWidth=7.2;ctx.stroke();
        smoothPath(river);ctx.strokeStyle=p.water;ctx.lineWidth=6.7;ctx.stroke();
        smoothPath(river);ctx.strokeStyle=state.restored?'#a7d3bc':'#a8c7b5';ctx.lineWidth=3.9;ctx.globalAlpha=.4;ctx.stroke();ctx.globalAlpha=1;
        const channel=[[-1,-3],[-6,-5],[-10,-3],[-11,0]];
        smoothPath(channel);ctx.strokeStyle='#c3be99';ctx.lineWidth=1.6;ctx.stroke();
        smoothPath(channel);ctx.strokeStyle=state.restored?p.water:'#b6c2a5';ctx.lineWidth=1.05;ctx.stroke();
        ellipse(-11,0,4.1,3.3,'#c5c7a1');ellipse(-11,-.15,3.8,3.05,state.restored?'#9bc8b1':'#a1c0ac');ellipse(-11,-.2,2.9,2.2,'#a8c9b3');
      });
      // Small horizontal gleams drift downriver without heavy shader effects.
      ctx.save();ctx.globalAlpha=.35;ctx.strokeStyle='#e4ead0';ctx.lineWidth=.9;
      for(let i=0;i<37;i++){
        const z=-28+((i*1.7+state.time*.14)%58);let x;
        if(z<-18)x=8+(z+27)*.52;else if(z<-9)x=13;else if(z<3)x=11-(z+9)*1.12;else if(z<12)x=-3;else x=-3+(z-12)*.65;
        const q=worldToScreen(x+Math.sin(i*7)*1.6,z);ctx.beginPath();ctx.moveTo(q.x-2,q.y);ctx.lineTo(q.x+3+(i%4)*2,q.y);ctx.stroke();
      }
      const q=worldToScreen(-11,0);for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(q.x,q.y,(1.8+i*.65)*scale,(.65+i*.3)*scale*.54,0,0,7);ctx.stroke();}ctx.restore();
    }
    function shrub(x,z,s,p){const q=worldToScreen(x,z);ellipse(q.x+scale*s*.18,q.y+scale*.13,scale*s*.7,scale*s*.19,'#697c5520');for(let i=0;i<5;i++)ellipse(q.x+Math.sin(i*5)*scale*s*.4,q.y-scale*s*(.13+(i%3)*.16),scale*s*.37,scale*s*.28,p.tree[i%4],i*.2);}
    function tree(o,p,state){
      const q=worldToScreen(o.x,o.z),s=scale*o.s;
      if(q.x<-s*3||q.x>width+s*3||q.y<-s*6||q.y>height+s*4)return;
      ellipse(q.x+s*.7,q.y+s*.35,s*1.25,s*.34,'#70805c15',-.2);
      ctx.save();ctx.translate(q.x,q.y);const sway=state.reducedMotion?0:Math.sin(state.time*.65+o.seed*8)*.018;ctx.rotate(o.lean+sway);
      ctx.strokeStyle='#8b8262';ctx.lineWidth=s*.13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-s*.1,-s*2.5);ctx.stroke();
      ctx.lineWidth=s*.055;ctx.beginPath();ctx.moveTo(0,-s*.9);ctx.lineTo(-s*.65,-s*2.1);ctx.moveTo(-s*.05,-s*1.3);ctx.lineTo(s*.65,-s*2.5);ctx.stroke();
      const color=p.tree[Math.floor(o.seed*4)];
      if(o.kind>.77){ // slender cypress forms among the rounded broadleaf trees
        ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-s*4.4);ctx.bezierCurveTo(-s*1.1,-s*2.7,-s*.85,-s*1.1,0,-s*.9);ctx.bezierCurveTo(s*.8,-s*1.2,s*.95,-s*3,0,-s*4.4);ctx.fill();
        ellipse(-s*.15,-s*2.5,s*.36,s*1.15,p.tree[(Math.floor(o.seed*4)+1)%4]);
      }else{
        ellipse(0,-s*2.3,s*1.12,s*1.4,color);
        for(const f of o.dots){const dx=f.x*s*.97,dy=-s*2.35+f.y*s*1.17;ellipse(dx,dy,f.r*s*1.4,f.r*s*1.2,p.tree[Math.floor((f.x+1)*1.8)%4]);}
        // A few dry brush marks break the edge of the canopy.
        ctx.globalAlpha=.4;for(let i=0;i<10;i++){const f=o.dots[i];ellipse(f.x*s*.86,-s*2.3+f.y*s,f.r*s*.17,f.r*s*.08,'#f0e7be',-.4);}ctx.globalAlpha=1;
      }
      ctx.restore();
    }
    function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();}
    function quad(points,color){polygon(points.map(p=>worldToScreen(...p)),color);}
    function block(x,z,w,d,h,color){
      quad([[x-w/2,z+d/2,0],[x+w/2,z+d/2,0],[x+w/2,z+d/2,h],[x-w/2,z+d/2,h]],color);
      quad([[x+w/2,z+d/2,0],[x+w/2,z-d/2,0],[x+w/2,z-d/2,h],[x+w/2,z+d/2,h]],'#9b9f83');
      quad([[x-w/2,z-d/2,h],[x+w/2,z-d/2,h],[x+w/2,z+d/2,h],[x-w/2,z+d/2,h]],'#c4c1a0');
    }
    function ruin(p,state){
      const q=worldToScreen(0,-15);ellipse(q.x+scale,q.y+scale*.6,scale*4.4,scale*1,'#6c7e5f12');
      block(0,-15,8,3,.28,'#b3b397');
      for(const side of [-1,1]){block(side*2.8,-15,1.15,1.2,5.5,'#afb197');block(side*2.8,-14.8,1.5,1.55,.55,'#a9ac8d');block(side*2.8,-15,1.4,1.4,4.6,'#aeb095');}
      block(0,-15,6.8,1.45,5.7,'#b7b698');
      // The lintel is drawn as a beam so that the arch remains genuinely open.
      quad([[-3.4,-14.23,4.65],[3.4,-14.23,4.65],[3.4,-14.23,5.7],[-3.4,-14.23,5.7]],'#b4b395');
      // Paint over the central block's face with the distant meadow through the opening.
      // The beam above is intentionally the only filled part between the columns.
      const left=worldToScreen(-2.2,-14.23,0),right=worldToScreen(2.2,-14.23,0),top=worldToScreen(0,-14.23,4.65);
      ctx.save();ctx.beginPath();ctx.moveTo(left.x,left.y);ctx.lineTo(left.x,top.y+scale*.8);ctx.quadraticCurveTo(top.x,top.y-scale*.25,right.x,top.y+scale*.8);ctx.lineTo(right.x,right.y);ctx.closePath();ctx.clip();
      const opening=ctx.createLinearGradient(0,top.y,0,left.y);opening.addColorStop(0,'#d6dbb5');opening.addColorStop(1,'#dce0bb');ctx.fillStyle=opening;ctx.fillRect(left.x,top.y-scale,right.x-left.x,left.y-top.y+scale);ctx.restore();
      const roofZ=-15;
      quad([[-4.4,roofZ-1,5.65],[-3.8,roofZ-1,6.1],[0,roofZ-1,6.85],[3.8,roofZ-1,6.1],[4.4,roofZ-1,5.65],[0,roofZ-1,6.15]],'#788c70');
      quad([[-4.4,roofZ+1.4,5.65],[0,roofZ+1.4,6.15],[4.4,roofZ+1.4,5.65],[3.9,roofZ+1.4,5.4],[-3.9,roofZ+1.4,5.4]],'#879775');
      quad([[0,roofZ-1,6.85],[3.8,roofZ-1,6.1],[4.4,roofZ+1.4,5.65],[0,roofZ+1.4,6.15]],'#9ca17c');
      ctx.strokeStyle='#b8ad81';ctx.lineWidth=1;for(let i=0;i<4;i++){const a=worldToScreen(-3.9+i*.15,-13.57,5.55+i*.13),b=worldToScreen(3.9-i*.15,-13.57,5.55+i*.13);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
      for(let i=0;i<14;i++)shrub(-3.7+i*.54,-15.6, .23+(i%3)*.06,p);
      for(const side of [-1,1]){const a=worldToScreen(side*3,-14.2,5.2);ctx.strokeStyle='#809467';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(a.x+side*10,a.y+30,a.x-side*15,a.y+40,a.x+side*5,a.y+scale*3.8);ctx.stroke();for(let i=0;i<7;i++)ellipse(a.x+Math.sin(i*2)*7,a.y+i*scale*.45,4,2.5,p.tree[i%4],i);}
      if(state.restored){const m=worldToScreen(0,-15,2);const glow=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,scale*2.8);glow.addColorStop(0,'#fff5c291');glow.addColorStop(1,'#f4e8a900');ctx.fillStyle=glow;ctx.fillRect(m.x-scale*3,m.y-scale*3,scale*6,scale*6);ctx.strokeStyle='#f7f4d5';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(m.x,m.y,scale*.55,scale*.8,0,0,7);ctx.stroke();marker(0,-15,2.1,state.time,true);}
    }
    function bridge(p){
      const a=-5.4,b=3.4,z=1.2;
      quad([[a,z-.65,.3],[b,z-.65,.3],[b,z+.65,.3],[a,z+.65,.3]],'#bca981');
      for(let x=a;x<=b;x+=.48){const p1=worldToScreen(x,z-.65,.31),p2=worldToScreen(x,z+.65,.31);ctx.strokeStyle='#8b856780';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();}
      for(const zz of [z-.73,z+.73]){for(let x=a;x<=b;x+=1.5){const p1=worldToScreen(x,zz,0),p2=worldToScreen(x,zz,1.05);ctx.strokeStyle='#9b8e6c';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();}const p1=worldToScreen(a,zz,.92),p2=worldToScreen(b,zz,.92);ctx.strokeStyle='#ae9d75';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();}
    }
    function sluice(p,state){
      block(7,-5,2.4,1,.6,'#b4ad8b');
      const q=worldToScreen(7,-5,1.1),r=scale*.7;
      ctx.save();ctx.translate(q.x,q.y);ctx.rotate(state.restored?state.time*.22:0);ctx.strokeStyle='#a58b59';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke();ctx.strokeStyle='#dac58c';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r*.85,0,7);ctx.stroke();for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.strokeStyle='#9b855b';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r,0);ctx.stroke();}ellipse(0,0,scale*.14,scale*.14,'#d2be83');ctx.restore();
      if(!state.restored)marker(7,-5,2.3,state.time,false);
      else{const q=worldToScreen(7,-4.7);ctx.strokeStyle='#e7edcf';ctx.lineWidth=.7;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(q.x,q.y+i*5,scale*(.6+i*.1),scale*.13,0,0,7);ctx.stroke();}}
    }
    function lotusFlower(x,z,size,p,state,glowing=false){
      const q=worldToScreen(x,z),r=scale*size;
      ellipse(q.x,q.y,r*1.7,r*.5,'#779f7a',-.2);
      const py=q.y-r*.4;
      if(glowing){const g=ctx.createRadialGradient(q.x,py,0,q.x,py,r*5);g.addColorStop(0,'#e8f6ca9c');g.addColorStop(1,'#e6f4c600');ctx.fillStyle=g;ctx.fillRect(q.x-r*5,py-r*5,r*10,r*10);}
      for(let i=0;i<5;i++){const a=Math.PI+(i/4)*Math.PI;ellipse(q.x+Math.cos(a)*r*.35,py+Math.sin(a)*r*.2,r*.23,r*.61,i%2?'#e7c9c2':p.flower,a+Math.PI/2);}
      ellipse(q.x,py+r*.1,r*.18,r*.1,'#f3dfb4');
    }
    function lotusPool(p,state){
      for(let i=0;i<9;i++){const a=i*2.399;lotusFlower(-11+Math.cos(a)*(1+i*.17),Math.sin(a)*(1+i*.14),.17+(i%3)*.035,p,state,false);}
      lotusFlower(-11,0,.38,p,state,true);if(!state.photo)marker(-11,0,1.6,state.time,false);
    }
    function marker(x,z,h,time,bright){const q=worldToScreen(x,z,h);ctx.save();ctx.translate(q.x,q.y+Math.sin(time*1.5)*2);ctx.rotate(Math.PI/4);ctx.strokeStyle=bright?'#fffde5':'#f3ead0';ctx.lineWidth=1;ctx.strokeRect(-3,-3,6,6);ctx.restore();}
    function rock(o){const q=worldToScreen(o.x,o.z);const r=scale*o.s;ellipse(q.x+r*.3,q.y+r*.15,r,r*.28,'#6d7e5b14');polygon([{x:q.x-r*.8,y:q.y},{x:q.x-r*.6,y:q.y-r*.55},{x:q.x+r*.3,y:q.y-r*.65},{x:q.x+r*.8,y:q.y-r*.1},{x:q.x+r*.6,y:q.y+r*.1}],o.r>.4?'#c0bca0':'#acb39b');}
    function wanderer(player,state){
      const q=worldToScreen(player.x,player.z),s=scale*.82,walk=player.moving&&!state.reducedMotion?Math.sin(state.time*10):0;
      ellipse(q.x+s*.15,q.y+s*.06,s*.43,s*.14,'#5d6e4d26',-.1);
      ctx.save();ctx.translate(q.x,q.y);const facing=typeof player.facing==='number'?player.facing:1;const flip=Math.cos(facing)>=0?1:-1;ctx.scale(flip,1);
      ctx.strokeStyle='#6c6854';ctx.lineWidth=Math.max(1,s*.085);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-s*.1,-s*.37);ctx.lineTo(-s*.1+walk*s*.11,-s*.03);ctx.moveTo(s*.1,-s*.37);ctx.lineTo(s*.1-walk*s*.11,-s*.03);ctx.stroke();
      // Long cloth ribbon trails behind the traveller, moving gently even at rest.
      ctx.strokeStyle='#bb765e';ctx.lineWidth=s*.12;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-s*.08,-s*1.08);ctx.bezierCurveTo(-s*.55,-s*.9,-s*.75,-s*1.12+Math.sin(state.time*2)*s*.08,-s*1.05,-s*.8+Math.sin(state.time*2+1)*s*.09);ctx.stroke();
      ctx.fillStyle='#bd8265';ctx.beginPath();ctx.moveTo(-s*.15,-s*1.14);ctx.quadraticCurveTo(-s*.43,-s*.75,-s*.36,-s*.29);ctx.quadraticCurveTo(0,-s*.2,s*.4,-s*.34);ctx.lineTo(s*.23,-s*1.12);ctx.closePath();ctx.fill();
      ctx.fillStyle='#d9a17d';ctx.beginPath();ctx.moveTo(s*.03,-s*1.1);ctx.lineTo(s*.32,-s*.36);ctx.lineTo(s*.04,-s*.34);ctx.closePath();ctx.fill();
      ellipse(0,-s*1.35,s*.21,s*.24,'#6c6d5a');ellipse(s*.06,-s*1.3,s*.11,s*.14,'#ddc0a0');
      ctx.strokeStyle='#b2a67c';ctx.lineWidth=s*.09;ctx.beginPath();ctx.moveTo(s*.4,-s*.74);ctx.lineTo(s*.49,s*.04);ctx.stroke();
      ellipse(s*.43,-s*.78,s*.09,s*.09,'#e4d8ad');ctx.restore();
      // Small pale ripples under the traveller keep water traversal legible.
      if(player.moving && Math.abs(player.x+2)<2 && player.z>0){ctx.strokeStyle='#e4ead078';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(q.x,q.y,scale*.5,scale*.13,0,0,7);ctx.stroke();}
    }
    function atmosphere(p,state){
      ctx.save();ctx.globalAlpha=.42;
      for(const f of flecks){const xx=(f.x*width+Math.sin(state.time*.13+f.phase)*50+width)%width,yy=(f.y*height+state.time*f.speed*2)%height;ctx.fillStyle=f.size>1.4?p.accent:'#fff8da';ctx.beginPath();ctx.ellipse(xx,yy,f.size*1.8,f.size*.65,Math.sin(f.phase+state.time*.2),0,7);ctx.fill();}
      ctx.restore();
      // Distant birds make the stillness feel inhabited.
      ctx.save();ctx.strokeStyle='#7e8d7460';ctx.lineWidth=.8;
      for(let i=0;i<5;i++){const x=(width*.68+i*22-state.time*2.5+width)%width,y=height*.22+Math.sin(i*3+state.time*.2)*18;ctx.beginPath();ctx.moveTo(x-4,y+1);ctx.quadraticCurveTo(x-2,y-2,x,y+1);ctx.quadraticCurveTo(x+2,y-2,x+4,y);ctx.stroke();}ctx.restore();
      // Vignette with paper instead of black preserves a watercolor edge.
      const edge=ctx.createRadialGradient(width*.5,height*.6,Math.min(width,height)*.22,width*.5,height*.6,Math.max(width,height)*.7);edge.addColorStop(0,'#f2ecdc00');edge.addColorStop(.75,'#f2ecdc00');edge.addColorStop(1,p.paper);ctx.fillStyle=edge;ctx.fillRect(0,0,width,height);
      if(paper){ctx.save();ctx.globalAlpha=.42;ctx.fillStyle=paper;ctx.fillRect(0,0,width,height);ctx.restore();}
    }
    function render(state,dt){
      lastState=state;
      if(state.reducedMotion)state={...state,time:0};
      const desired=state.started?{x:state.player.x*.88,z:state.player.z*.88-1}:{x:-1,z:-2};
      const ease=state.reducedMotion?1:1-Math.exp(-Math.max(0,dt||.016)*2.2);camera.x+=(desired.x-camera.x)*ease;camera.z+=(desired.z-camera.z)*ease;
      const p=palettes[state.season]||palettes.autumn;
      ground(p,state);
      const items=trees.map(o=>({z:o.z,draw:()=>tree(o,p,state)}));
      for(const stone of stones)items.push({z:stone.z,draw:()=>rock(stone)});
      items.push({z:-15,draw:()=>ruin(p,state)});
      items.push({z:-5,draw:()=>sluice(p,state)});
      items.push({z:0,draw:()=>lotusPool(p,state)});
      items.push({z:1.2,draw:()=>bridge(p)});
      items.push({z:state.player.z,draw:()=>wanderer(state.player,state)});
      items.sort((a,b)=>a.z-b.z).forEach(item=>item.draw());
      atmosphere(p,state);
    }
    function hitTest(x,y){
      const matches=[];
      for(const [name,point]of Object.entries(landmarks)){
        if(name==='memory'&&!lastState?.restored)continue;
        const q=worldToScreen(point.x,point.z,point.h),dist=Math.hypot(q.x-x,q.y-y);
        const markerHeight={lotus:1.6,wheel:2.3,memory:2.1}[name];
        const marker=worldToScreen(point.x,point.z,markerHeight);
        const markerDistance=Math.hypot(marker.x-x,marker.y-y);
        if(dist<Math.max(28,scale*(name==='memory'?1.7:1.35))||markerDistance<24)matches.push({name,dist:Math.min(dist,markerDistance)});
      }
      matches.sort((a,b)=>a.dist-b.dist);return matches[0]?.name||null;
    }
    resize();
    return {render,worldToScreen,screenToWorld,resize,hitTest};
  };
})();
