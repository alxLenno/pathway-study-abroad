import React,{useEffect,useState} from 'react';

export default function TypedText({text}) {
  const [count,setCount]=useState(0);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setCount(text.length);return;}
    setCount(0);
    let index=0;
    let timer=setTimeout(function type(){
      index+=1;
      setCount(index);
      if(index<text.length) timer=setTimeout(type,65);
    },450);
    return ()=>clearTimeout(timer);
  },[text]);
  return <span className="typed-text" aria-label={text}>
    <span className="typed-text-space" aria-hidden="true">{text}</span>
    <span className={'typed-text-visible'+(count<text.length?' is-typing':'')} aria-hidden="true">{text.slice(0,count)}<span className="typing-cursor"/></span>
  </span>;
}
