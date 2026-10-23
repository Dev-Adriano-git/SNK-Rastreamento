const me = sessao.get();
if (!me || me.role !== "admin") location.href = "login.html";
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
function aba(n) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.toggle("on", t.dataset.t === n));
  document
    .querySelectorAll(".pg")
    .forEach((p) => (p.hidden = p.id !== "pg-" + n));
  if (n === "r") rastreadores();
}
async function clientes() {
  try {
    const l = await api("/admin/clientes");
    $("pend").textContent = l.filter((c) => c.status === "pendente").length;
    $("tb-c").innerHTML =
      l
        .map(
          (c) =>
            `<tr><td>${esc(c.nome)}</td><td>${esc(c.email)}</td><td>${esc(c.tel)}</td><td><span class="bd ${c.status}">${c.status}</span></td><td class="ac">${c.status !== "ativo" ? `<button class="btn btn-ok" onclick="mudar(${c.id},'ativo')">Liberar acesso</button>` : ""}${c.status !== "bloqueado" ? `<button class="btn btn-danger" onclick="mudar(${c.id},'bloqueado')">Bloquear</button>` : ""}</td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="5">Nenhum cliente cadastrado ainda.</td></tr>';
    $("cli").innerHTML =
      '<option value="">Selecione o cliente</option>' +
      l
        .filter((c) => c.status === "ativo")
        .map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`)
        .join("");
  } catch (e) {
    e.status === 401 ? sessao.sair() : toast(e.message);
  }
}
async function mudar(id, s) {
  try {
    await api("/admin/clientes/" + id, {
      method: "PATCH",
      body: { status: s },
    });
    toast("Cliente atualizado.");
    clientes();
  } catch (e) {
    toast(e.message);
  }
}
async function rastreadores() {
  try {
    const l = await api("/admin/rastreadores");
    $("tb-r").innerHTML =
      l
        .map(
          (r) =>
            `<tr><td>${esc(r.imei)}</td><td>${esc(r.placa)}</td><td>${esc(r.cliente)}</td><td>${esc(r.chip)} ${esc(r.operadora)}</td><td><span class="bd ${esc(r.conexao)}">${esc(r.conexao)}</span></td><td class="ac"><button class="btn btn-danger" onclick="remover(${r.id})">Remover</button></td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="6">Nenhum rastreador cadastrado.</td></tr>';
  } catch (e) {
    toast(e.message);
  }
}
async function remover(id) {
  if (!confirm("Remover este rastreador?")) return;
  try {
    await api("/admin/rastreadores/" + id, { method: "DELETE" });
    toast("Rastreador removido.");
    rastreadores();
  } catch (e) {
    toast(e.message);
  }
}
$("fr").onsubmit = async (ev) => {
  ev.preventDefault();
  try {
    await api("/admin/rastreadores", {
      method: "POST",
      body: {
        imei: $("imei").value.trim(),
        modelo: $("modelo").value,
        chip: $("chip").value,
        operadora: $("oper").value,
        placa: $("placa").value.trim(),
        veiculo: $("veic").value,
        user_id: $("cli").value,
      },
    });
    toast("Rastreador cadastrado.");
    $("fr").reset();
    rastreadores();
  } catch (e) {
    toast(e.message);
  }
};
clientes();
