import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9w_IfxFs5niyKzg1z36YfZwABOzwx1G4",
  authDomain: "lucas-portfolio-36466.firebaseapp.com",
  projectId: "lucas-portfolio-36466",
  storageBucket: "lucas-portfolio-36466.firebasestorage.app",
  messagingSenderId: "837850016522",
  appId: "1:837850016522:web:be3b2387ca3ea8a1a0e8f3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── Estado local ──────────────────────────────────────
// Guarda todos os dados em memória enquanto o admin está aberto
let dados = {
  perfil: {},
  projetos: [],
  stack: {}
};


// Índice do projeto sendo editado (-1 = novo projeto)
let indiceEdicao = -1;

// ── Elementos do DOM ──────────────────────────────────
const telaLogin = document.getElementById("tela-login");
const telaAdmin = document.getElementById("tela-admin");
const erroLogin = document.getElementById("erro-login");

// ── LOGIN ─────────────────────────────────────────────
document.getElementById("btn-login").addEventListener("click", async () => {
  const email = document.getElementById("input-email").value.trim();
  const senha = document.getElementById("input-senha").value;
  erroLogin.textContent = "";

  if (!email || !senha) {
    erroLogin.textContent = "Preencha e-mail e senha.";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (e) {
    erroLogin.textContent = "E-mail ou senha incorretos.";
  }
});

// Permite login com Enter
document.getElementById("input-senha").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("btn-login").click();
});

// ── LOGOUT ────────────────────────────────────────────
document.getElementById("btn-sair").addEventListener("click", () => signOut(auth));

// ── OBSERVADOR DE AUTH ────────────────────────────────
// Detecta login/logout e mostra a tela correta
onAuthStateChanged(auth, async (user) => {
  if (user) {
    telaLogin.style.display = "none";
    telaAdmin.style.display = "block";
    await carregarDados();
    preencherFormularios();
    renderizarListaProjetos();
  } else {
    telaLogin.style.display = "flex";
    telaAdmin.style.display = "none";
  }
});

// ── ABAS ──────────────────────────────────────────────
document.querySelectorAll(".aba").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".aba").forEach(b => b.classList.remove("ativa"));
    document.querySelectorAll(".aba-conteudo").forEach(c => c.classList.remove("ativa"));
    btn.classList.add("ativa");
    document.getElementById("aba-" + btn.dataset.aba).classList.add("ativa");
  });
});

// ── CARREGAR DADOS DO FIRESTORE ───────────────────────
async function carregarDados() {
  try {
    const snap = await getDoc(doc(db, "portfolio", "dados"));
    if (snap.exists()) {
      const firestoreDados = snap.data();
      dados.perfil   = firestoreDados.perfil   || {};
      dados.projetos = firestoreDados.projetos  || [];
      dados.stack    = firestoreDados.stack     || {};
    }
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
  }
}

// ── SALVAR TUDO NO FIRESTORE ──────────────────────────
// Sempre salva o objeto completo — uma fonte de verdade
async function salvarDados() {
  await setDoc(doc(db, "portfolio", "dados"), dados);
}

// ── PREENCHER FORMULÁRIOS COM DADOS ATUAIS ────────────
function preencherFormularios() {
  const p = dados.perfil;
  document.getElementById("perfil-nome").value    = p.nome    || "";
  document.getElementById("perfil-cargo").value   = p.cargo   || "";
  document.getElementById("perfil-bio").value     = p.bio     || "";
  document.getElementById("perfil-foto").value    = p.foto    || "";
  document.getElementById("perfil-bg").value      = p.bg      || "";
  document.getElementById("perfil-linkedin").value = p.linkedin || "";
  document.getElementById("perfil-github").value  = p.github  || "";
  document.getElementById("perfil-email").value   = p.email   || "";

  const s = dados.stack;
  document.getElementById("stack-frontend").value = (s.frontend || []).join(", ");
  document.getElementById("stack-backend").value  = (s.backend  || []).join(", ");
  document.getElementById("stack-infra").value    = (s.infra    || []).join(", ");
  document.getElementById("stack-ia").value       = (s.ia       || []).join(", ");
}

// ── SALVAR PERFIL ─────────────────────────────────────
document.getElementById("btn-salvar-perfil").addEventListener("click", async () => {
  const btn = document.getElementById("btn-salvar-perfil");
  const feedback = document.getElementById("feedback-perfil");
  btn.disabled = true;
  feedback.className = "feedback";
  feedback.textContent = "Salvando...";

  dados.perfil = {
    nome:     document.getElementById("perfil-nome").value.trim(),
    cargo:    document.getElementById("perfil-cargo").value.trim(),
    bio:      document.getElementById("perfil-bio").value.trim(),
    foto:     document.getElementById("perfil-foto").value.trim(),
    bg:       document.getElementById("perfil-bg").value.trim(),
    linkedin: document.getElementById("perfil-linkedin").value.trim(),
    github:   document.getElementById("perfil-github").value.trim(),
    email:    document.getElementById("perfil-email").value.trim(),
  };

  try {
    await salvarDados();
    feedback.className = "feedback ok";
    feedback.textContent = "Perfil salvo com sucesso!";
  } catch (e) {
    feedback.className = "feedback erro";
    feedback.textContent = "Erro ao salvar. Tenta de novo.";
  } finally {
    btn.disabled = false;
  }
});

// ── SALVAR STACK ──────────────────────────────────────
document.getElementById("btn-salvar-stack").addEventListener("click", async () => {
  const btn = document.getElementById("btn-salvar-stack");
  const feedback = document.getElementById("feedback-stack");
  btn.disabled = true;
  feedback.className = "feedback";
  feedback.textContent = "Salvando...";

  // Converte string "React, Node.js" em array ["React", "Node.js"]
  const toArray = id => document.getElementById(id).value
    .split(",")
    .map(t => t.trim())
    .filter(t => t.length > 0);

  dados.stack = {
    frontend: toArray("stack-frontend"),
    backend:  toArray("stack-backend"),
    infra:    toArray("stack-infra"),
    ia:       toArray("stack-ia"),
  };

  try {
    await salvarDados();
    feedback.className = "feedback ok";
    feedback.textContent = "Stack salva com sucesso!";
  } catch (e) {
    feedback.className = "feedback erro";
    feedback.textContent = "Erro ao salvar. Tenta de novo.";
  } finally {
    btn.disabled = false;
  }
});

// ── PROJETOS — renderizar lista ───────────────────────
function renderizarListaProjetos() {
  const lista = document.getElementById("lista-projetos");

  if (dados.projetos.length === 0) {
    lista.innerHTML = `<p style="font-size:.85rem;color:var(--muted);">Nenhum projeto cadastrado ainda.</p>`;
    return;
  }

  lista.innerHTML = dados.projetos.map((proj, i) => `
    <div class="projeto-item">
      <div class="projeto-item-info">
        <div class="projeto-item-nome">${proj.nome}</div>
        <div class="projeto-item-status">${proj.status}</div>
      </div>
      <div class="projeto-item-acoes">
        <button class="btn-editar" data-index="${i}">Editar</button>
        <button class="btn-remover" data-index="${i}">Remover</button>
      </div>
    </div>
  `).join("");

  // Eventos dos botões de editar e remover
  lista.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", () => abrirEdicaoProjeto(parseInt(btn.dataset.index)));
  });

  lista.querySelectorAll(".btn-remover").forEach(btn => {
    btn.addEventListener("click", () => removerProjeto(parseInt(btn.dataset.index)));
  });
}

// ── PROJETOS — abrir form novo ────────────────────────
document.getElementById("btn-novo-projeto").addEventListener("click", () => {
  indiceEdicao = -1;
  document.getElementById("form-projeto-titulo").textContent = "Novo projeto";
  document.getElementById("proj-nome").value   = "";
  document.getElementById("proj-status").value = "Em produção";
  document.getElementById("proj-desc").value   = "";
  document.getElementById("proj-tags").value   = "";
  document.getElementById("proj-link").value   = "";
  document.getElementById("feedback-projeto").textContent = "";
  document.getElementById("form-projeto").classList.add("aberto");
  document.getElementById("btn-novo-projeto").style.display = "none";
});

// ── PROJETOS — abrir form edição ──────────────────────
function abrirEdicaoProjeto(index) {
  indiceEdicao = index;
  const proj = dados.projetos[index];
  document.getElementById("form-projeto-titulo").textContent = "Editar projeto";
  document.getElementById("proj-nome").value   = proj.nome   || "";
  document.getElementById("proj-status").value = proj.status || "Em produção";
  document.getElementById("proj-desc").value   = proj.descricao || "";
  document.getElementById("proj-tags").value   = (proj.tags || []).join(", ");
  document.getElementById("proj-link").value   = proj.link   || "";
  document.getElementById("feedback-projeto").textContent = "";
  document.getElementById("form-projeto").classList.add("aberto");
  document.getElementById("btn-novo-projeto").style.display = "none";
}

// ── PROJETOS — cancelar form ──────────────────────────
document.getElementById("btn-cancelar-projeto").addEventListener("click", () => {
  document.getElementById("form-projeto").classList.remove("aberto");
  document.getElementById("btn-novo-projeto").style.display = "block";
});

// ── PROJETOS — salvar ─────────────────────────────────
document.getElementById("btn-salvar-projeto").addEventListener("click", async () => {
  const btn = document.getElementById("btn-salvar-projeto");
  const feedback = document.getElementById("feedback-projeto");
  const nome = document.getElementById("proj-nome").value.trim();

  if (!nome) {
    feedback.className = "feedback erro";
    feedback.textContent = "Nome do projeto é obrigatório.";
    return;
  }

  btn.disabled = true;
  feedback.className = "feedback";
  feedback.textContent = "Salvando...";

 const projeto = {
    nome,
    status:           document.getElementById("proj-status").value,
    descricao:        document.getElementById("proj-desc").value.trim(),
    descricaoManual:  document.getElementById("proj-desc").value.trim().length > 0,
    tags:             document.getElementById("proj-tags").value.split(",").map(t => t.trim()).filter(t => t),
    link:             document.getElementById("proj-link").value.trim(),
  };

  // Edição ou novo
  if (indiceEdicao >= 0) {
    dados.projetos[indiceEdicao] = projeto;
  } else {
    dados.projetos.push(projeto);
  }

  try {
    await salvarDados();
    feedback.className = "feedback ok";
    feedback.textContent = "Projeto salvo!";
    renderizarListaProjetos();
    setTimeout(() => {
      document.getElementById("form-projeto").classList.remove("aberto");
      document.getElementById("btn-novo-projeto").style.display = "block";
    }, 800);
  } catch (e) {
    feedback.className = "feedback erro";
    feedback.textContent = "Erro ao salvar. Tenta de novo.";
    // Reverte a mudança local se falhou
    if (indiceEdicao >= 0) {
      await carregarDados();
    } else {
      dados.projetos.pop();
    }
  } finally {
    btn.disabled = false;
  }
});

// ── PROJETOS — remover ────────────────────────────────
async function removerProjeto(index) {
  if (!confirm(`Remover "${dados.projetos[index].nome}"?`)) return;

  dados.projetos.splice(index, 1);

  try {
    await salvarDados();
    renderizarListaProjetos();
  } catch (e) {
    alert("Erro ao remover. Tenta de novo.");
    await carregarDados();
    renderizarListaProjetos();
  }
}