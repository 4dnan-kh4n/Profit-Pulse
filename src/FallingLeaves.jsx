const leaves = [
  [4, 18, 19, -5, '#b5b77b'], [13, 23, 27, 9, '#c79e5d'],
  [22, 16, 23, -11, '#89995d'], [31, 26, 31, 7, '#c1a76c'],
  [42, 19, 21, -8, '#9ca66a'], [53, 24, 29, 12, '#c7a767'],
  [64, 17, 24, -10, '#87945d'], [75, 22, 32, 6, '#b6a064'],
  [86, 18, 26, -7, '#9da76b'], [96, 25, 34, 10, '#c2a66c'],
  [8, 21, 29, 13, '#8f9e63'], [59, 20, 33, -12, '#b99a61'],
];

export default function FallingLeaves() {
  return <div className="falling-leaves" aria-hidden="true">
    {leaves.map(([left, size, duration, drift, color], index) => <span
      className="falling-leaf"
      key={index}
      style={{
        '--leaf-left': `${left}%`,
        '--leaf-size': `${size}px`,
        '--leaf-duration': `${duration}s`,
        '--leaf-drift': `${drift}vw`,
        '--leaf-color': color,
        '--leaf-delay': `${-(duration * (index % 5) / 5)}s`,
      }}
    ><svg viewBox="0 0 24 14" focusable="false"><path d="M1 7C5.8 1.2 14.7-.9 23 3.1 18.4 10 9.1 14.5 1 7Z" /><path className="leaf-vein" d="M2.4 7.1c6.1.4 12.2-1.3 18.6-3.6" /></svg></span>)}
  </div>;
}
