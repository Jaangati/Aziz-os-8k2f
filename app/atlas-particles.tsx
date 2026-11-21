import {useEffect,useRef} from 'react';

/** Original point-cloud sphere. The Atlas mark is a separate, stationary layer. */
export default function AtlasParticles(){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const surface=canvas.current, context=surface?.getContext('2d');
  if(!surface||!context)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const count=1400,goldenAngle=Math.PI*(3-Math.sqrt(5));
  const points=Array.from({length:count},(_,i)=>{
   const y=1-2*(i+.5)/count, ring=Math.sqrt(1-y*y), theta=i*goldenAngle;
   const random=(Math.sin(i*127.1+8)*43758.5453)%1;
   return {x:Math.cos(theta)*ring,y,z:Math.sin(theta)*ring,seed:Math.abs(random)};
  });
  const palette=['#71512c','#a46829','#d1963c','#f9c976','#fff0c6'];
  let width=0,height=0,frame=0,last=0,start=0,visible=true;
  let pointerX=0,pointerY=0,tiltX=0,tiltY=0;
  function draw(t:number){
   if(!width||!height)return;
   context!.clearRect(0,0,width,height);
   const cx=width/2,cy=height/2,r=Math.min(width,height)*.35;
   tiltX+=(pointerX-tiltX)*.065;tiltY+=(pointerY-tiltY)*.065;
   const turn=t*.00016+tiltX, pitch=.23+tiltY;
   const cs=Math.cos(turn),sn=Math.sin(turn),cp=Math.cos(pitch),sp=Math.sin(pitch);
   for(const p of points){
    const x=p.x*cs-p.z*sn,z0=p.x*sn+p.z*cs;
    const y=p.y*cp-z0*sp,z=p.y*sp+z0*cp;
    const wave=1+.027*Math.sin(x*7+y*9+t*.0023);
    const light=Math.max(0,Math.min(.999,.51-x*.49-y*.33+z*.15));
    const seam=Math.pow(Math.max(0,1-Math.abs(y-.29*x-.12-.075*Math.sin(x*7+t*.0016))*4.7),2);
    const edge=Math.pow(Math.max(0,1-Math.abs(z)),3);
    const opacity=Math.min(.96,.075+.22*light+.36*edge+.36*seam*(z>0?1:.16));
    const size=.4+p.seed*.55+seam*.47;
    const stretch=wave*(1+z*.065);
    context!.globalAlpha=opacity;
    context!.fillStyle=palette[Math.floor(light*palette.length)];
    context!.fillRect(cx+x*r*stretch,cy+y*r*stretch,size,size);
   }
   context!.globalAlpha=1;
  }
  function resize(){
   const rect=surface!.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.75);
   width=rect.width;height=rect.height;surface!.width=Math.max(1,Math.round(width*dpr));surface!.height=Math.max(1,Math.round(height*dpr));
   context!.setTransform(dpr,0,0,dpr,0,0);draw(start?last-start:0);
  }
  function tick(now:number){
   if(!start)start=now;
   if(now-last>=30){last=now;draw(now-start);}
   frame=requestAnimationFrame(tick);
  }
  function sync(){
   cancelAnimationFrame(frame);
   if(!reduce.matches&&!document.hidden&&visible)frame=requestAnimationFrame(tick);
   else if(reduce.matches){tiltX=tiltY=pointerX=pointerY=0;draw(0);}
  }
  function move(event:PointerEvent){
   const rect=surface!.getBoundingClientRect();
   pointerX=Math.max(-.26,Math.min(.26,((event.clientX-rect.left)/Math.max(1,rect.width)-.5)*.52));
   pointerY=Math.max(-.21,Math.min(.21,((event.clientY-rect.top)/Math.max(1,rect.height)-.5)*.42));
  }
  function leave(){pointerX=pointerY=0;}
  const host=surface.parentElement!;
  const sizing=new ResizeObserver(resize);sizing.observe(surface);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});intersection.observe(surface);
  host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);
  reduce.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
  resize();sync();
  return()=>{cancelAnimationFrame(frame);sizing.disconnect();intersection.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);reduce.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);};
 },[]);
 return <canvas className="atlas-particles" ref={canvas} aria-hidden="true"/>;
}
