import {useEffect,useEffectEvent,useRef} from 'react';

const focusable = [
 'button','input:not([type=hidden])','select','textarea','a[href]','summary','[tabindex]',
].join(',');

export function useDialogFocus<T extends HTMLElement>(active:boolean,close:()=>void){
 const ref=useRef<T>(null);
 const dismiss=useEffectEvent(close);

 useEffect(()=>{
  const dialog=ref.current;
  if(!active||!dialog)return;

  const previous=document.activeElement;
  const overflow=document.body.style.overflow;
  const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>(focusable)).filter(node=>
   node.tabIndex>=0&&!node.matches(':disabled')&&node.getClientRects().length>0&&
   getComputedStyle(node).visibility==='visible',
  );
  document.body.style.overflow='hidden';
  const initial=dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]');
  (initial??controls()[0]??dialog).focus();

  function handleKey(event:KeyboardEvent){
   if(event.defaultPrevented)return;
   if(event.key==='Escape'){
    event.preventDefault();
    dismiss();
   }else if(event.key==='Tab'){
    const items=controls();
    const focused=document.activeElement;
    const destination=event.shiftKey?items.at(-1):items[0];
    const boundary=event.shiftKey?items[0]:items.at(-1);
    if(focused===boundary||!items.some(item=>item===focused)){
     event.preventDefault();
     (destination??dialog)?.focus();
    }
   }
  }
  document.addEventListener('keydown',handleKey);
  return ()=>{
   document.removeEventListener('keydown',handleKey);
   document.body.style.overflow=overflow;
   if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();
  };
 },[active]);

 return ref;
}
