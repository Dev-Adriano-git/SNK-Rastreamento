// Tempo real no mapa: movimento suave, rastro, "seguir veículo" e veículo de demonstração.
const RASTRO_MAX = 60, trilhas = {};
let seguir = true, demo = false, demoV = null, demoH = null, demoD = 0, rotaDemo = null;

function mover(m, v) {
  if (m._st !== v.st) { m.setIcon(icone(v)); m._st = v.st; }
  const a = m.getLatLng(), b = L.latLng(v.lat, v.lng);
  if (m._raf) cancelAnimationFrame(m._raf);
  if (a.equals(b)) return;
  if (v.st === 'mov') rastro(v, a);
  const t0 = performance.now(), dur = v.demo ? 1000 : 3000;
  const passo = t => {
    const k = Math.min((t - t0) / dur, 1);
    m.setLatLng([a.lat + (b.lat - a.lat) * k, a.lng + (b.lng - a.lng) * k]);
    if (seguir && sel === v.id) map.panTo(m.getLatLng(), { animate: false });
    if (k < 1) m._raf = requestAnimationFrame(passo);
  };
  m._raf = requestAnimationFrame(passo);
}

function rastro(v, de) {
  const t = trilhas[v.id] || (trilhas[v.id] = L.polyline([de], { color: '#4f98ff', weight: 4, opacity: .8 }).addTo(map));
  const p = t.getLatLngs(); p.push(L.latLng(v.lat, v.lng));
  if (p.length > RASTRO_MAX) p.shift();
  t.setLatLngs(p);
}

function alternarSeguir() {
  seguir = !seguir;
  document.getElementById('bseg').textContent = seguir ? 'Seguindo: sim' : 'Seguindo: não';
}
map.on('dragstart', () => { if (seguir) alternarSeguir(); });

// ---- Demonstração: circuito de exemplo (aproximado, sem seguir o traçado exato das ruas)
const ROTA = [[-23.5560,-46.6620],[-23.5614,-46.6559],[-23.5690,-46.6474],[-23.5740,-46.6520],[-23.5680,-46.6600],[-23.5610,-46.6655],[-23.5560,-46.6620]];
const seg = []; let total = 0;
for (let i = 0; i < ROTA.length - 1; i++) { const a = L.latLng(ROTA[i]), b = L.latLng(ROTA[i + 1]), l = a.distanceTo(b); seg.push({ a, b, l, ini: total }); total += l; }
function pontoRota(d) {
  const s = seg.find(x => d <= x.ini + x.l) || seg[seg.length - 1], k = (d - s.ini) / s.l;
  return [s.a.lat + (s.b.lat - s.a.lat) * k, s.a.lng + (s.b.lng - s.a.lng) * k];
}
function passoDemo() {
  const vel = 44 + 8 * Math.sin(Date.now() / 4000);
  demoD = (demoD + vel / 3.6) % total;
  const [lat, lng] = pontoRota(demoD);
  demoV = { id: -1, demo: true, placa: 'DEMO-001', modelo: 'Veículo de demonstração', lat, lng, vel: Math.round(vel), st: 'mov', ign: 1 };
  frota = frota.filter(x => !x.demo).concat(demoV);
  desenhar();
}
function alternarDemo(b) {
  demo = !demo; b.textContent = demo ? 'Demonstração: ligada' : 'Demonstração';
  if (demo) {
    demoD = 0; rotaDemo = L.polyline(ROTA, { color: '#e5322d', weight: 3, dashArray: '6 8', opacity: .6 }).addTo(map);
    passoDemo(); demoH = setInterval(passoDemo, 1000); seguir = true; sel_(-1);
  } else {
    clearInterval(demoH); map.removeLayer(rotaDemo);
    [mk, trilhas].forEach(o => { if (o[-1]) { map.removeLayer(o[-1]); delete o[-1]; } });
    frota = frota.filter(x => !x.demo); demoV = null; if (sel === -1) sel = null; desenhar();
  }
}
