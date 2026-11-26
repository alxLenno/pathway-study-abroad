import React, {useLayoutEffect, useRef, useState} from 'react';

export default function StickyHeader({children}) {
  const header = useRef(null);
  const [height, setHeight] = useState(125);
  useLayoutEffect(() => {
    const measure = () => setHeight(header.current.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header.current);
    return () => observer.disconnect();
  }, []);
  return <>
    <div aria-hidden="true" style={{height, flexShrink: 0}} />
    <div className="sticky-top" ref={header}>{children}</div>
  </>;
}
