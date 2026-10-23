// Configuração central. Em produção use o endereço HTTPS do seu servidor.
const API_URL = localStorage.getItem("snk_api") || "http://localhost:5000";
function toast(m) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.style.display = "block";
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.style.display = "none"), 3500);
}
const sessao = {
  get: () => JSON.parse(localStorage.getItem("snk_user") || "null"),
  set: (u) => localStorage.setItem("snk_user", JSON.stringify(u)),
  sair() {
    localStorage.removeItem("snk_user");
    location.href = "login.html";
  },
};
async function api(path, opt = {}) {
  const u = sessao.get();
  let r;
  try {
    r = await fetch(API_URL + path, {
      ...opt,
      headers: {
        "Content-Type": "application/json",
        ...(u ? { Authorization: "Bearer " + u.token } : {}),
      },
      body: opt.body && JSON.stringify(opt.body),
    });
  } catch {
    throw new Error("Servidor indisponível. Tente novamente.");
  }
  let j = {};
  try {
    j = await r.json();
  } catch {}
  if (!r.ok) {
    const e = new Error(j.error || "Erro de comunicação com o servidor.");
    e.status = r.status;
    throw e;
  }
  return j;
}
