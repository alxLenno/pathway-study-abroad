import React,{useEffect,useState} from 'react';
import {Plane} from 'lucide-react';

export default function TypedText({text}) {
  const [count,setCount]=useState(0);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setCount(text.length);return;}
    setCount(0);
    let index=0;
    let deleting=false;
    let timer=setTimeout(function type(){
      if(!text.length)return;
      index+=deleting?-1:1;
      setCount(index);
      let delay=deleting?35:65;
      if(index===text.length){deleting=true;delay=2200;}
      else if(index===0){deleting=false;delay=600;}
      timer=setTimeout(type,delay);
    },450);
    return ()=>clearTimeout(timer);
  },[text]);
  return <span className="typed-text" aria-label={text}>
    <span className="typed-text-space" aria-hidden="true">{text}</span>
    <span className={'typed-text-visible'+(count<text.length?' is-typing':'')} aria-hidden="true">{Array.from(text.slice(0,count)).map((letter,index)=><span className="skywriting-letter" key={index}>{letter}</span>)}<span className="skywriting-plane"><span className="skywriting-trail"/><Plane className="typing-cursor" aria-hidden="true"/></span></span>
  </span>;
}
