function attachInk(canvas, penOnly) {
  const ctx = canvas.getContext('2d', {alpha: true});
  const strokes = [];
  let active, rect, size, frame = 0;

  function midpoint(a, b) {
    return {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
  }
  function paint() {
    frame = 0;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = ctx.strokeStyle = '#123950';
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = size * .013;
    for (const {points, finished} of strokes) {
      const first = points[0];
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(first.x * size, first.y * size, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(first.x * size, first.y * size);
      for (let i = 1; i < points.length; i++) {
        const prior = points[i - 1];
        const mid = midpoint(prior, points[i]);
        ctx.quadraticCurveTo(prior.x * size, prior.y * size, mid.x * size, mid.y * size);
      }
      const last = points.at(-1);
      if (finished) ctx.lineTo(last.x * size, last.y * size);
      else ctx.quadraticCurveTo(last.x * size, last.y * size, last.x * size, last.y * size);
      ctx.stroke();
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint);
  }
  function resize() {
    rect = canvas.getBoundingClientRect();
    size = rect.width;
    const pixels = Math.max(1, Math.round(size * Math.min(window.devicePixelRatio || 1, 3)));
    if (canvas.width !== pixels || canvas.height !== pixels) canvas.width = canvas.height = pixels;
    const scale = pixels / (size || 1);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    schedule();
  }
  function append(event) {
    const point = {x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height};
    const last = active.points.at(-1);
    if (!last || Math.hypot(last.x - point.x, last.y - point.y) > .0009) active.points.push(point);
  }
  canvas.addEventListener('pointerdown', event => {
    if (active || event.button !== 0 || !event.isPrimary || (penOnly() && event.pointerType !== 'pen')) return;
    event.preventDefault();
    rect = canvas.getBoundingClientRect();
    active = {id: event.pointerId, points: [], finished: false};
    canvas.setPointerCapture(event.pointerId);
    append(event);
    strokes.push(active);
    schedule();
  });
  canvas.addEventListener('pointermove', event => {
    if (active?.id !== event.pointerId) return;
    for (const sample of event.getCoalescedEvents?.() || []) append(sample);
    append(event);
    schedule();
  });
  function finish(event) {
    if (active?.id !== event.pointerId) return;
    if (event.type === 'pointerup') append(event);
    active.finished = true;
    active = undefined;
    schedule();
  }
  for (const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type, finish);
  document.querySelector('#undo').addEventListener('click', () => { if (!active) { strokes.pop(); schedule(); } });
  document.querySelector('#wipe').addEventListener('click', () => { if (!active) { strokes.length = 0; schedule(); } });
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  return () => { observer.disconnect(); cancelAnimationFrame(frame); };
}
