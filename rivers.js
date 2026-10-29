/* A small original ecological journey. All progress stays in this session. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const loadStatus = $('#load-status');
  const canvas = $('#world');
  let scene;
  try { scene = window.createRiversScene(canvas); }
  catch { loadStatus.textContent = 'This viewer cannot draw the landscape. Open index.html in a browser with Canvas and JavaScript enabled.'; return; }

  const landmarks = {
    lotus: {x:-11,z:0,h:1.6,name:'the luminous lotus'},
    wheel: {x:7,z:-5,h:2.3,name:'the ancient sluice'},
    memory: {x:0,z:-15,h:2.1,name:'the sanctuary echo'}
  };
  const words = [
    {x:-8,z:5,text:'where'}, {x:-14,z:-3,text:'water'},
    {x:-1,z:1,text:'wanders'}, {x:10,z:-9,text:'world'},
    {x:3,z:-13,text:'bloom'}, {x:-2,z:-18,text:'belong'}
  ];
  const state = {
    player:{x:-6,z:8,moving:false,facing:0}, time:0,
    restored:false,photo:false,memory:false,started:false,
    season:'autumn',pointer:{x:0,y:0},
    reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };
  let mode='explore',destination=null,pointerDown=false,near=null,chosen=null;
  let lastFrame=0,contextKey='',toastTimer,poemTimer,lastFocus=null;
  const keys=new Set(),foundWords=new Set();
  const wordNodes=words.map((word,i)=>{
    const button=document.createElement('button');
    button.className='word-mote';button.textContent=word.text;
    button.setAttribute('aria-label','Follow the word '+word.text);
    button.onclick=()=>{if(state.started&&!modalOpen())destination={x:word.x,z:word.z};};
    $('#word-motes').append(button);return button;
  });

  function toast(text){
    $('#toast').textContent=text;$('#toast').classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200);
  }
  function showPoem(line){
    $('#poem').textContent=line;$('#poem').classList.add('visible');
    clearTimeout(poemTimer);poemTimer=setTimeout(()=>$('#poem').classList.remove('visible'),6000);
  }
  function modalOpen(){return $('.overlay:not([hidden])');}
  function openPanel(id){
    lastFocus=document.activeElement;
    clearTimeout(toastTimer);$('#toast').classList.remove('show');
    document.querySelectorAll('.overlay').forEach(el=>el.hidden=el.id!==id);
    keys.clear();pointerDown=false;destination=null;
    const panel=$('#'+id);panel.querySelector('button')?.focus({preventScroll:true});
  }
  function closePanels(){
    document.querySelectorAll('.overlay').forEach(el=>el.hidden=true);
    if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
    lastFocus=null;
  }
  function start(){
    if(state.started)return;
    state.started=true;document.body.classList.add('is-playing');
    $('#begin').tabIndex=-1;
    toast('Click or tap the ground to wander. Follow a small light.');
    updateUi();
  }
  function setMode(next){
    if(!state.started)start();
    mode=next;
    for(const name of ['explore','camera','staff']){
      $('#'+name).classList.toggle('active',name===next);
      $('#'+name).setAttribute('aria-pressed',String(name===next));
    }
    $('#camera-vignette').classList.toggle('visible',next==='camera');
    $('#viewfinder').hidden=next!=='camera';
    contextKey='';
  }
  function goTo(name){
    if(!state.started||modalOpen()||(name==='memory'&&!state.restored))return;
    const p=landmarks[name];destination={x:p.x,z:p.z+1.25};
    if(Math.hypot(state.player.x-p.x,state.player.z-p.z)>2.5)toast('Wandering toward '+p.name+'…');
  }
  function updateUi(){
    const progress=Number(state.photo)+Number(state.restored)+Number(state.memory);
    $('#progress').textContent=progress+' / 3';
    document.querySelector('.steps').setAttribute('aria-label',progress+' of 3 discoveries completed');
    $('#step-photo').classList.toggle('done',state.photo);
    $('#step-water').classList.toggle('done',state.restored);
    $('#step-memory').classList.toggle('done',state.memory);
    $('#landmark-lotus').classList.toggle('visited',state.photo);
    $('#landmark-wheel').classList.toggle('visited',state.restored);
    $('#landmark-memory').classList.toggle('visited',state.memory);
    $('#specimen').hidden=!state.photo;$('#journal-empty').hidden=state.photo;
    $('#journal-title').innerHTML=state.photo?'A light that learned<br>to live underwater.':'Every small thing<br>holds a story.';
    $('#journal-poem').hidden=!state.restored;
    $('#journal-poem').textContent=state.memory?'Where the water wanders, the world learns to bloom. And we learn to belong.':'Where the water wanders, the world learns to bloom.';
    if(chosen){
      $('#chapter').textContent='III — A WORLD REBORN';
      $('#objective').textContent='Stay. Wander. Belong.';
      $('#objective-detail').textContent='There are still small words to find, and a world to know.';
    }else if(state.restored){
      $('#chapter').textContent='III — WHAT THE WATER KEPT';
      $('#objective').textContent='Something remembers.';
      $('#objective-detail').textContent='A pale echo has awakened beneath the old sanctuary gate.';
    }else if(state.photo){
      $('#chapter').textContent='II — A RIVER INTERRUPTED';
      $('#objective').textContent='Let the water return.';
      $('#objective-detail').textContent='The lotus needs moving water. An old sluice waits upstream.';
    }else{
      $('#chapter').textContent='I — THE LISTENING GARDEN';
      $('#objective').textContent='Follow a quiet light.';
      $('#objective-detail').textContent='A lotus glows beside the water. Perhaps it has something to tell you.';
    }
  }
  function updateContext(){
    let candidate=null,best=2.8;
    for(const [name,p]of Object.entries(landmarks)){
      if(name==='memory'&&!state.restored)continue;
      const d=Math.hypot(state.player.x-p.x,state.player.z-p.z);
      if(d<best){best=d;candidate=name;}
    }
    near=candidate;
    const key=[near,mode,state.photo,state.restored,state.memory,state.started,!!modalOpen()].join('|');
    if(key===contextKey)return;contextKey=key;
    $('#action-area').hidden=!state.started||!near||!!modalOpen();
    if(!near)return;
    const entries={
      lotus:state.photo?['Read the lotus study','Every small thing holds a story.']:mode==='camera'?['Photograph the lotus','An unfamiliar light, living in the water.']:['Raise your camera','Observe before you change the world.'],
      wheel:state.restored?['Listen to the water','A small current. A world awakening.']:!state.photo?['Study the waterway','Something living nearby may hold a clue.']:mode==='staff'?['Return water to the garden','Let the current find its way home.']:['Take up the water staff','The old channel is waiting for a pulse.'],
      memory:['Listen to the memory','Not everything that is lost is gone.']
    };
    $('#action-label').textContent=entries[near][0];$('#action-caption').textContent=entries[near][1];
  }
  function interact(){
    if(!state.started||modalOpen()||!near)return;
    destination=null;
    if(near==='lotus'){
      if(state.photo){openPanel('journal');return;}
      if(mode!=='camera'){setMode('camera');toast('The camera is ready. Photograph the lotus when you are ready.');return;}
      state.photo=true;updateUi();chime([523.25,659.25,783.99]);
      $('#flash').classList.remove('flash');void $('#flash').offsetWidth;$('#flash').classList.add('flash');
      showPoem('Where the water wanders,');openPanel('journal');
    }else if(near==='wheel'){
      if(!state.photo){toast('A light lives in the lotus pool. Study it with your camera first.');return;}
      if(state.restored){showPoem('Even a small current can carry a world.');chime([392,523.25]);return;}
      if(mode!=='staff'){setMode('staff');toast('The water staff answers. Return the flow when you are ready.');return;}
      state.restored=true;state.season='spring';document.body.dataset.season='spring';
      updateUi();showPoem('the world learns to bloom.');chime([392,523.25,659.25]);
      toast('The garden is flowing again. A memory wakes beneath the sanctuary gate.');
    }else if(near==='memory'){
      state.memory=true;updateUi();showPoem('And we learn to belong.');chime([329.63,493.88,659.25]);openPanel('memory');
    }
    contextKey='';
  }
  function updateWords(){
    if(!state.started||modalOpen())return;
    for(let i=0;i<words.length;i++){
      if(foundWords.has(i))continue;
      if(Math.hypot(state.player.x-words[i].x,state.player.z-words[i].z)<1.55){
        foundWords.add(i);wordNodes[i].classList.add('collected');wordNodes[i].disabled=true;
        $('#word-count').textContent=foundWords.size+' / 6 WORDS FOUND';
        $('#journal-count').textContent=foundWords.size+' / 6';
        const tag=document.createElement('span');tag.textContent=words[i].text;$('#journal-words').append(tag);
        chime([440+i*55]);
        if(foundWords.size===6)showPoem('The smallest words can hold an entire world.');
      }
    }
  }
  function projectUi(){
    for(const [name,p]of Object.entries(landmarks)){
      const el=$('#landmark-'+name),q=scene.worldToScreen(p.x,p.z,p.h);
      const next=!state.photo?'lotus':!state.restored?'wheel':'memory';
      const minX=35,maxX=innerWidth-35,minY=100,maxY=Math.max(145,innerHeight-160);
      const offscreen=q.x<minX||q.x>maxX||q.y<minY||q.y>maxY;
      const x=Math.max(minX,Math.min(maxX,q.x)),y=Math.max(minY,Math.min(maxY,q.y));
      el.hidden=!state.started||(name==='memory'&&!state.restored)||(offscreen&&name!==next);
      el.classList.toggle('offscreen',offscreen);
      el.dataset.edge=q.x>maxX?'right':q.x<minX?'left':q.y<minY?'top':'bottom';
      el.dataset.label=offscreen?{lotus:'Toward the quiet light',wheel:'Follow the water upstream',memory:'Toward the sanctuary'}[name]:{lotus:'A quiet light',wheel:'An old waterway',memory:'Something remembers'}[name];
      el.style.setProperty('--bearing',Math.atan2(q.y-y,q.x-x)+'rad');
      el.style.left=x+'px';el.style.top=y+'px';
    }
    words.forEach((p,i)=>{
      const q=scene.worldToScreen(p.x,p.z,.25);
      wordNodes[i].style.left=q.x+'px';wordNodes[i].style.top=(q.y+(state.reducedMotion?0:Math.sin(state.time*.8+i)*3))+'px';
      wordNodes[i].hidden=!state.started||q.x<20||q.x>innerWidth-20||q.y<82||q.y>innerHeight-75;
    });
  }
  function tick(now){
    const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):.016;lastFrame=now;state.time+=dt;
    state.player.moving=false;
    if(state.started&&!modalOpen()){
      let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
      let dz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
      if(dx||dz)destination=null;
      else if(destination){
        dx=destination.x-state.player.x;dz=destination.z-state.player.z;
        if(Math.hypot(dx,dz)<.15){dx=dz=0;destination=null;}
      }
      const len=Math.hypot(dx,dz);
      if(len){
        const speed=Math.min(5.4*dt,len);
        state.player.x=Math.max(-23,Math.min(23,state.player.x+dx/len*speed));
        state.player.z=Math.max(-22,Math.min(19,state.player.z+dz/len*speed));
        state.player.moving=true;state.player.facing=Math.atan2(dz,dx);
      }
      updateWords();
    }
    scene.render(state,dt);projectUi();updateContext();requestAnimationFrame(tick);
  }
  function moveToward(event){
    const p=scene.screenToWorld(event.clientX,event.clientY);
    destination={x:Math.max(-23,Math.min(23,p.x)),z:Math.max(-22,Math.min(19,p.z))};
    state.pointer={x:event.clientX,y:event.clientY};
  }
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||modalOpen())return;
    if(!state.started){start();return;}
    const hit=scene.hitTest(event.clientX,event.clientY);
    if(hit){goTo(hit);return;}
    pointerDown=true;moveToward(event);
    try{canvas.setPointerCapture(event.pointerId);}catch{}
  });
  canvas.addEventListener('pointermove',event=>{if(pointerDown&&state.started&&!modalOpen())moveToward(event);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>pointerDown=false);
  $('#begin').onclick=start;
  for(const name of ['explore','camera','staff'])$('#'+name).onclick=()=>setMode(name);
  for(const name of Object.keys(landmarks))$('#landmark-'+name).onclick=()=>goTo(name);
  $('#interact').onclick=interact;
  $('#notes').onclick=()=>openPanel('journal');$('#about').onclick=()=>openPanel('help');
  $('#help-close').onclick=closePanels;
  document.querySelectorAll('.panel-close').forEach(el=>el.onclick=closePanels);
  document.querySelectorAll('.overlay').forEach(el=>el.addEventListener('click',event=>{if(event.target===el&&el.id!=='ending')closePanels();}));
  document.querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>{
    chosen=el.dataset.choice;
    $('#ending-choice').textContent=chosen==='flourish'?'You chose to protect the life that found its way here. The sanctuary will grow in its own time.':'You chose to listen, learn, and find a place within this changed world. The sanctuary has room for another story.';
    updateUi();openPanel('ending');setMode('explore');
  });
  $('#continue').onclick=()=>{closePanels();showPoem('There is still a world to know.');};
  $('#restart').onclick=()=>{
    closePanels();state.player={x:-6,z:8,moving:false,facing:0};state.photo=state.restored=state.memory=false;
    state.season='autumn';document.body.dataset.season='autumn';chosen=null;destination=null;foundWords.clear();
    wordNodes.forEach(el=>{el.classList.remove('collected');el.disabled=false;});
    $('#journal-words').replaceChildren();$('#word-count').textContent='0 / 6 WORDS FOUND';$('#journal-count').textContent='0 / 6';
    setMode('explore');updateUi();contextKey='';showPoem('Every return is a beginning.');
  };
  $('#season').onclick=()=>{
    const seasons=['autumn','spring','summer'];state.season=seasons[(seasons.indexOf(state.season)+1)%3];
    document.body.dataset.season=state.season;
    toast({spring:'Spring. The world opens its hands.',summer:'Summer. Light rests on the water.',autumn:'Autumn. Even the falling leaves belong.'}[state.season]);
  };
  $('#fullscreen').onclick=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else throw new Error();}
    catch{toast('Fullscreen is unavailable in this viewer. You can keep exploring here.');}
  };
  $('.wordmark').onclick=event=>{event.preventDefault();openPanel('help');};
  addEventListener('resize',()=>scene.resize());
  addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
    const key=event.key.toLowerCase();
    if(modalOpen()){
      if(key==='escape'){event.preventDefault();closePanels();return;}
      if(key==='tab'){
        const focusable=[...modalOpen().querySelectorAll('button:not([disabled]),a[href]')];
        const first=focusable[0],last=focusable[focusable.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
      return;
    }
    if(key.startsWith('arrow')||key===' ')event.preventDefault();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key))keys.add(key);
    if(event.repeat)return;
    if(key==='1')setMode('explore');if(key==='2')setMode('camera');if(key==='3')setMode('staff');
    if(key==='e')interact();if(key==='j')openPanel('journal');if(key==='m')toggleSound();
  });
  addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  addEventListener('blur',()=>{keys.clear();pointerDown=false;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();pointerDown=false;}});

  // Soft wind and a quiet harmonic bed, synthesized locally after a user gesture.
  let audio=null,master=null,sound=false;
  async function toggleSound(){
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw new Error();
      if(!audio){
        audio=new Audio();master=audio.createGain();master.gain.value=.06;master.connect(audio.destination);
        const buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate),data=buffer.getChannelData(0);
        let previous=0,seed=9127;
        for(let i=0;i<data.length;i++){seed=seed*16807%2147483647;previous=(previous+(seed/2147483647*2-1)*.035)/1.018;data[i]=previous;}
        const noise=audio.createBufferSource();noise.buffer=buffer;noise.loop=true;
        const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1100;
        const noiseGain=audio.createGain();noiseGain.gain.value=.65;noise.connect(filter);filter.connect(noiseGain);noiseGain.connect(master);noise.start();
        for(const hz of [130.81,196,261.63]){
          const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=hz;gain.gain.value=.12;
          osc.connect(gain);gain.connect(master);osc.start();
        }
      }
      if(sound)await audio.suspend();else await audio.resume();sound=audio.state==='running';
      $('#sound').setAttribute('aria-pressed',String(sound));$('#sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');
    }catch{sound=false;$('#sound').setAttribute('aria-pressed','false');$('#sound').setAttribute('aria-label','Sound unavailable');toast('This viewer cannot play sound. The river is just as welcoming in silence.');}
  }
  function chime(notes){
    if(!sound||!audio||audio.state!=='running')return;
    notes.forEach((hz,i)=>{
      const osc=audio.createOscillator(),gain=audio.createGain(),at=audio.currentTime+i*.12;
      osc.type='sine';osc.frequency.value=hz;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.3,at+.03);gain.gain.exponentialRampToValueAtTime(.001,at+1.4);
      osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+1.5);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};
    });
  }
  $('#sound').onclick=toggleSound;
  scene.render(state,.016);projectUi();updateUi();loadStatus.hidden=true;requestAnimationFrame(tick);
})();
