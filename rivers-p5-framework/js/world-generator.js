import { ARTIFACTS } from './data.js';

function seededRandom(seed) {
  let state=typeof seed==='number'?seed>>>0:2166136261;
  if(typeof seed!=='number') for(const c of String(seed)){state^=c.charCodeAt(0);state=Math.imul(state,16777619);}
  return ()=>{state+=0x6D2B79F5;let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return ((value^(value>>>14))>>>0)/4294967296;};
}

/**
 * A continuous open sanctuary, rather than a jumping course. The entire 144m
 * garden has solid ground. Paths/ponds are visual landmarks, not navigation gates;
 * players can walk directly between districts or wander across the grounds.
 * Story order is owned by ArtifactSystem and never imposed by terrain gaps.
 */
export function generateWorld(seed=2077) {
  const random=seededRandom(seed);
  const bounds={minX:-72,maxX:72,minZ:-112,maxZ:32};
  const groundY=0.3;
  const locations=[[-28,-12],[30,-8],[36,-52],[-34,-58],[-9,-88]];
  const landmarks=locations.map(([x,z],index)=>({index,x,y:groundY,z,radius:8}));
  const artifacts=ARTIFACTS.map((definition,index)=>({
    index,id:definition.id,definition,
    position:{x:landmarks[index].x,y:groundY+1.2,z:landmarks[index].z},
    checkpoint:{x:landmarks[index].x,y:groundY+0.03,z:landmarks[index].z},
    resolved:false,restored:false,choice:null
  }));
  const path=(points,width=3.2)=>({points:points.map(([x,z])=>({x,z})),width});
  const paths=[
    path([[0,20],[0,5],[-10,-2],[-28,-12]],4),
    path([[0,5],[12,-4],[30,-8]],4),
    path([[30,-8],[44,-25],[36,-52]]),
    path([[-28,-12],[-44,-31],[-34,-58]]),
    path([[36,-52],[10,-43],[-10,-44],[-34,-58]]),
    path([[0,5],[-5,-19],[0,-38],[-9,-65],[-9,-88]],3.6),
    path([[-34,-58],[-30,-77],[-9,-88]]),
    path([[-9,-88],[4,-94],[17,-88]]),
    path([[36,-52],[38,-75],[17,-88]])
  ];
  // These shallow ornamental ponds share the walkable ground underneath.
  // They support quiet wading/exploration and never require swimming or jumping.
  const ponds=[
    {x:-49,z:-7,w:18,d:14},{x:14,z:-23,w:19,d:13},
    {x:53,z:-43,w:17,d:22},{x:-13,z:-62,w:18,d:16},
    {x:-48,z:-80,w:19,d:18},{x:35,z:-96,w:20,d:10},
    {x:-49,z:19,w:16,d:10}
  ];
  const awayFromLandmarks=(x,z)=>landmarks.every(point=>Math.hypot(point.x-x,point.z-z)>9)&&Math.hypot(x,z-20)>8;
  const trees=[],stones=[];
  for(let i=0;i<90&&trees.length<34;i++) {
    const x=-62+random()*124,z=-103+random()*126;
    if(awayFromLandmarks(x,z))trees.push({x,z,scale:0.7+random()*0.8});
  }
  for(let i=0;i<35;i++) {
    const x=-65+random()*130,z=-106+random()*132;
    if(awayFromLandmarks(x,z))stones.push({x,z,scale:0.4+random()*0.8});
  }
  const columns=[];
  for(const x of [-63,63])for(const z of [15,-10,-35,-60,-85,-105])columns.push({x,z,height:3.5+random()*3});
  return {
    seed,bounds,groundY,
    surfaces:[{id:'sanctuary-ground',x:0,y:0,z:-40,w:144,d:144,h:0.6}],
    landmarks,artifacts,paths,ponds,decor:{trees,stones,columns},
    final:{position:{x:17,y:groundY,z:-88},unlocked:false},
    start:{x:0,y:groundY+0.03,z:20},waterY:groundY+0.035
  };
}
