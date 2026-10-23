if (!sessao.get()) location.href = "login.html";
if (innerWidth <= 800)
  (tools.classList.add("m"),
    (menu.onclick = () => {
      side.classList.toggle("open");
    }));
const cor = { mov: "#27c47a", par: "#f0a62b", off: "#6b7a93" },
  txt = { mov: "Em movimento", par: "Parado", off: "Offline" };
let frota = [],
  sel = null,
  mk = {};
const map = L.map("map", {
  center: [-23.55, -46.63],
  zoom: 13,
  zoomControl: false,
});
L.control.zoom({ position: "bottomright" }).addTo(map);
const escuro = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { attribution: "© OpenStreetMap © CARTO" },
  ).addTo(map),
  sat = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "Esri" },
  );
function icone(v) {
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    html: `<div class="pin p-${v.st}" style="background:${cor[v.st]}">${v.placa.slice(-2)}</div>`,
  });
}
function desenhar() {
  frota.forEach((v) => {
    if (v.lat == null) return;
    if (!mk[v.id])
      mk[v.id] = L.marker([v.lat, v.lng], { icon: icone(v) })
        .addTo(map)
        .on("click", () => sel_(v.id));
    else mover(mk[v.id], v);
  });
  lista();
  detalhe();
}
function lista() {
  const q = busca.value.toLowerCase();
  n1.textContent = frota.filter((v) => v.st == "mov").length;
  n2.textContent = frota.filter((v) => v.st == "par").length;
  n3.textContent = frota.filter((v) => v.st == "off").length;
  document.getElementById("lista").innerHTML =
    frota
      .filter((v) => (v.placa + v.modelo).toLowerCase().includes(q))
      .map(
        (v) =>
          `<div class="v ${sel == v.id ? "on" : ""}" onclick="sel_(${v.id})"><span class="dot ${v.st}"></span><div>${v.modelo}<small>${v.placa} · ${txt[v.st]}</small></div><div class="spd">${v.vel} km/h</div></div>`,
      )
      .join("") ||
    '<p style="color:var(--mute);padding:10px">Nenhum veículo encontrado.</p>';
}
function sel_(id) {
  sel = id;
  const v = frota.find((x) => x.id == id);
  if (v.lat != null) map.flyTo([v.lat, v.lng], 16);
  side.classList.remove("open");
  desenhar();
}
function detalhe() {
  const v = frota.find((x) => x.id == sel);
  if (!v) return (det.style.display = "none");
  det.style.display = "block";
  det.innerHTML = `<div class="h"><img src="assets/carro.png" alt=""><div><b>${v.modelo}</b><br><span style="color:var(--mute)">${v.placa}</span></div><button class="btn" style="margin-left:auto;padding:4px 10px" onclick="sel=null;desenhar()">✕</button></div>
 <div class="g"><div><b>${v.vel} km/h</b>Velocidade</div><div><b>${txt[v.st]}</b>Status</div><div><b>${v.ign ? "Ligada" : "Desligada"}</b>Ignição</div></div>
 <div class="a"><button class="btn btn-danger" onclick="cmd('bloquear',${v.id})">Bloquear</button><button class="btn btn-ok" onclick="cmd('desbloquear',${v.id})">Desbloquear</button></div>`;
}
async function cmd(c, id) {
  const v = frota.find((x) => x.id == id);
  if (v.demo) return toast("Veículo de demonstração: comando apenas simulado.");
  if (!confirm(`Enviar comando de ${c} para ${v.placa}?`)) return;
  try {
    await api("/comandos", {
      method: "POST",
      body: { veiculo: id, comando: c },
    });
    toast(`Comando de ${c} enviado a ${v.placa}.`);
  } catch (e) {
    toast(e.message);
  }
}
function camada(b) {
  const s = map.hasLayer(sat);
  s
    ? (map.removeLayer(sat), map.addLayer(escuro))
    : (map.removeLayer(escuro), map.addLayer(sat));
  b.textContent = s ? "Satélite" : "Mapa escuro";
}
let ce = null,
  ro = null;
function cerca() {
  if (ce) {
    map.removeLayer(ce);
    ce = null;
    return toast("Cerca removida.");
  }
  const v = frota.find((x) => x.id == sel) || frota[0];
  ce = L.circle([v.lat, v.lng], {
    color: "#4f98ff",
    fillOpacity: 0.15,
    radius: 500,
  }).addTo(map);
  map.fitBounds(ce.getBounds());
  toast(`Cerca de 500 m ao redor de ${v.placa}.`);
}
function rota() {
  if (ro) {
    map.removeLayer(ro);
    ro = null;
    return toast("Histórico oculto.");
  }
  const v = frota.find((x) => x.id == sel) || frota[0];
  ro = L.polyline(
    [
      [v.lat, v.lng],
      [v.lat - 0.003, v.lng - 0.006],
      [v.lat - 0.006, v.lng - 0.009],
      [v.lat - 0.009, v.lng - 0.012],
    ],
    { color: "#e5322d", weight: 4, dashArray: "8 8" },
  ).addTo(map);
  map.fitBounds(ro.getBounds());
  toast(`Exemplo de rota de ${v.placa}. Dados reais virão do servidor.`);
}
function pdf() {
  const d = new jspdf.jsPDF();
  d.setFontSize(18);
  d.text("SNK Rastreamento - Relatório da frota", 14, 20);
  d.setFontSize(10);
  d.text(new Date().toLocaleString("pt-BR"), 14, 27);
  frota.forEach((v, i) =>
    d.text(
      `${v.placa}  ${v.modelo}  ${txt[v.st]}  ${v.vel} km/h`,
      14,
      42 + i * 8,
    ),
  );
  d.save("relatorio-snk.pdf");
}
async function carregar() {
  try {
    frota = (await api("/veiculos")).concat(demoV ? [demoV] : []);
    desenhar();
  } catch (e) {
    e.status === 401 ? sessao.sair() : toast(e.message);
  }
}
carregar();
setInterval(carregar, 3000);
if (sessao.get() && sessao.get().role === "admin") adm.style.display = "grid";
