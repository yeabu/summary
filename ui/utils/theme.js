function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function hexToRgb(hex){
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||'');
  if(!m) return {r:180,g:40,b:45};
  return { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) };
}
function lighten(hex, ratio){
  const {r,g,b}=hexToRgb(hex); const k=ratio||0.16;
  const lr=clamp(Math.round(r + (255-r)*k),0,255);
  const lg=clamp(Math.round(g + (255-g)*k),0,255);
  const lb=clamp(Math.round(b + (255-b)*k),0,255);
  return '#'+[lr,lg,lb].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function makeFabStyle(color){
  const base = color || '#B4282D';
  const light = lighten(base, 0.18);
  const {r,g,b} = hexToRgb(base);
  const shadow = `0 16rpx 40rpx rgba(${r},${g},${b},0.35)`;
  return `background: linear-gradient(145deg, ${light}, ${base}); box-shadow: ${shadow};`;
}

module.exports = { makeFabStyle };

