import { useEffect, useRef } from 'react';

const frames = [
  '/images/profit-pulse-business-world.png',
  '/images/shop-tour-01.jpg',
  '/images/shop-tour-02.jpg',
  '/images/shop-tour-03.jpg',
  '/images/shop-tour-04.jpg',
  '/images/shop-tour-05.jpg',
  '/images/shop-tour-06.jpg',
  '/images/shop-tour-07.jpg',
];

const cameraStops = [
  [0, [20, 0, 1.48]],
  [0.16, [13, -1, 1.62]],
  [0.22, [5, -2, 1.82]],
  [0.29, [0, 0, 1.04]],
  [0.78, [0, 0, 1.04]],
  [0.86, [-8, -1, 1.32]],
  [1, [0, 0, 1.14]],
];

const smooth = value => value * value * (3 - 2 * value);
const clamp01 = value => Math.max(0, Math.min(1, value));

function frameMix(progress) {
  const opacity = Array(frames.length).fill(0);
  const exteriorFadeIn = 0.22;
  const tourStart = 0.29;
  const tourEnd = 0.78;
  const exteriorFadeOut = 0.86;
  const interiorFrames = frames.length - 1;

  if (progress < exteriorFadeIn) {
    opacity[0] = 1;
  } else if (progress < tourStart) {
    const turn = smooth((progress - exteriorFadeIn) / (tourStart - exteriorFadeIn));
    opacity[0] = 1 - turn;
    opacity[1] = turn;
  } else if (progress < tourEnd) {
    const point = ((progress - tourStart) / (tourEnd - tourStart)) * (interiorFrames - 1);
    const index = Math.min(interiorFrames - 2, Math.floor(point));
    const turn = smooth(point - index);
    opacity[index + 1] = 1 - turn;
    opacity[index + 2] = turn;
  } else if (progress < exteriorFadeOut) {
    const turn = smooth((progress - tourEnd) / (exteriorFadeOut - tourEnd));
    opacity[interiorFrames] = 1 - turn;
    opacity[0] = turn;
  } else {
    opacity[0] = 1;
  }

  return opacity;
}

export default function ScrollWorldBackground() {
  const worldRef = useRef(null);
  const imageRefs = useRef([]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let anchors = [];
    let current = [...cameraStops[0][1]];
    let target = [...current];
    let currentProgress = 0;
    let targetProgress = 0;
    let pointer = [0, 0];
    let pointerTarget = [0, 0];
    let frame = 0;
    let previousTime = 0;

    const measure = () => {
      anchors = [...document.querySelectorAll('main [data-scene]')].map(section => {
        const rect = section.getBoundingClientRect();
        return rect.top + window.scrollY + rect.height / 2 - window.innerHeight / 2;
      });
      updateTarget();
    };

    const cameraForProgress = progress => {
      const boundedProgress = clamp01(progress);
      const nextIndex = cameraStops.findIndex(([stop]) => stop > boundedProgress);
      const index = nextIndex === -1 ? cameraStops.length - 2 : Math.max(0, nextIndex - 1);
      const [startProgress, startCamera] = cameraStops[index];
      const [endProgress, endCamera] = cameraStops[index + 1];
      const within = smooth((boundedProgress - startProgress) / (endProgress - startProgress));
      return startCamera.map((value, axis) => value + (endCamera[axis] - value) * within);
    };

    const updateTarget = () => {
      if (reducedMotion.matches) pointerTarget = [0, 0];
      let progress = 0;
      if (anchors.length > 1) {
        let chapter = 0;
        while (chapter < anchors.length - 2 && window.scrollY > anchors[chapter + 1]) chapter++;
        const start = anchors[chapter];
        const end = anchors[chapter + 1];
        const within = end > start ? clamp01((window.scrollY - start) / (end - start)) : 0;
        progress = (chapter + within) / (anchors.length - 1);
      }
      targetProgress = reducedMotion.matches ? 0 : progress;
      target = reducedMotion.matches ? [...cameraStops[0][1]] : cameraForProgress(progress);
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    const paint = () => {
      world.style.setProperty('--camera-x', `${current[0] + pointer[0]}%`);
      world.style.setProperty('--camera-y', `${current[1] + pointer[1]}vh`);
      world.style.setProperty('--camera-scale', current[2]);
      frameMix(currentProgress).forEach((opacity, index) => {
        if (imageRefs.current[index]) imageRefs.current[index].style.opacity = opacity;
      });
    };

    const updatePointer = event => {
      if (reducedMotion.matches || (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
      pointerTarget = [
        ((window.innerWidth / 2 - event.clientX) / window.innerWidth) * 5,
        ((window.innerHeight / 2 - event.clientY) / window.innerHeight) * 3.5,
      ];
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    const resetPointer = () => {
      pointerTarget = [0, 0];
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    const animate = time => {
      frame = 0;
      const delta = Math.min((time - (previousTime || time - 16)) / 1000, 0.05);
      previousTime = time;
      const easing = 1 - Math.exp(-4.8 * delta);
      current = current.map((value, axis) => value + (target[axis] - value) * easing);
      currentProgress += (targetProgress - currentProgress) * easing;
      pointer = pointer.map((value, axis) => value + (pointerTarget[axis] - value) * easing);
      paint();
      const cameraMoving = current.some((value, axis) => Math.abs(target[axis] - value) > 0.008);
      const sceneMoving = Math.abs(targetProgress - currentProgress) > 0.0005;
      const pointerMoving = pointer.some((value, axis) => Math.abs(pointerTarget[axis] - value) > 0.008);
      if (cameraMoving || sceneMoving || pointerMoving) frame = window.requestAnimationFrame(animate);
      else previousTime = 0;
    };

    window.addEventListener('scroll', updateTarget, { passive: true });
    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('pointerleave', resetPointer, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    document.addEventListener('toggle', updateTarget, true);
    reducedMotion.addEventListener?.('change', updateTarget);
    measure();

    return () => {
      window.removeEventListener('scroll', updateTarget);
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('resize', measure);
      document.removeEventListener('toggle', updateTarget, true);
      reducedMotion.removeEventListener?.('change', updateTarget);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="scroll-world" ref={worldRef} aria-hidden="true">
    {frames.map((src, index) => <img
      key={src}
      ref={element => { imageRefs.current[index] = element; }}
      src={src}
      alt=""
      decoding="async"
      draggable="false"
    />)}
  </div>;
}
