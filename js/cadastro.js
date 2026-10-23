tel.oninput = () => {
  let v = tel.value.replace(/\D/g, "").slice(0, 11);
  v = v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  tel.value = v;
};
f.onsubmit = async (ev) => {
  ev.preventDefault();
  e.textContent = "";
  if (senha.value !== conf.value)
    return (e.textContent = "As senhas não coincidem.");
  try {
    await api("/auth/register", {
      method: "POST",
      body: {
        nome: nome.value,
        tel: tel.value,
        email: email.value,
        senha: senha.value,
      },
    });
    f.innerHTML =
      '<img class="logo" src="assets/logo.png" alt="SNK"><h1>Cadastro enviado</h1><p class="sub">Seu acesso será liberado pelo administrador. Você poderá entrar assim que for aprovado.</p><a class="btn btn-primary" href="login.html" style="display:block;text-align:center;text-decoration:none">Ir para o login</a>';
  } catch (x) {
    e.textContent = x.message;
  }
};
