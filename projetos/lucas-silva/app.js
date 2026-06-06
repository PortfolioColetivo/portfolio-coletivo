import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9w_IfxFs5niyKzg1z36YfZwABOzwx1G4",
  authDomain: "lucas-portfolio-36466.firebaseapp.com",
  projectId: "lucas-portfolio-36466",
  storageBucket: "lucas-portfolio-36466.firebasestorage.app",
  messagingSenderId: "837850016522",
  appId: "1:837850016522:web:be3b2387ca3ea8a1a0e8f3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Busca dados do repo na API pública do GitHub ──────
async function buscarDadosGitHub(link) {
  if (!link || !link.includes("github.com")) return null;
  try {
    const partes = link.replace("https://github.com/", "").split("/");
    const usuario = partes[0];
    const repo = partes[1];
    if (!usuario || !repo) return null;

    const res = await fetch(`https://api.github.com/repos/${usuario}/${repo}`);
    if (!res.ok) return null;
    const data = await res.json();

    const resLangs = await fetch(`https://api.github.com/repos/${usuario}/${repo}/languages`);
    const langs = resLangs.ok ? await resLangs.json() : {};

    return {
      nome: data.name,
      descricao: data.description || "",
      tags: Object.keys(langs).slice(0, 6),
      stars: data.stargazers_count,
    };
  } catch (e) {
    return null;
  }
}

// ── Carrega perfil do Firestore e atualiza o DOM ──────
function aplicarPerfil(perfil) {
  if (!perfil) return;

  // Nome
  if (perfil.nome) {
    const nomeEl = document.querySelector(".hero-name");
    if (nomeEl) {
      const partes = perfil.nome.split(" ");
      const primeiro = partes[0];
      const resto = partes.slice(1).join(" ");
      nomeEl.innerHTML = `${primeiro}<br><em>${resto}</em>`;
    }
  }

  // Cargo
  if (perfil.cargo) {
    const cargoEl = document.querySelector(".hero-title");
    if (cargoEl) cargoEl.textContent = perfil.cargo;
  }

  // Bio
  if (perfil.bio) {
    const bioEl = document.querySelector(".hero-bio");
    if (bioEl) bioEl.textContent = perfil.bio;
  }

  // Foto de perfil
  if (perfil.foto) {
    const avatarEl = document.getElementById("avatar");
    if (avatarEl) {
      avatarEl.innerHTML = `<img src="${perfil.foto}" alt="${perfil.nome}" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">`;
    }
  }

  // Imagem de fundo do hero
  if (perfil.bg) {
    const heroEl = document.querySelector(".hero");
    if (heroEl) {
      heroEl.style.backgroundImage = `url('${perfil.bg}')`;
      heroEl.style.backgroundSize = "cover";
      heroEl.style.backgroundPosition = "center";
      heroEl.style.borderRadius = "12px";
      heroEl.style.padding = "2.5rem";
      // Overlay escuro para manter legibilidade
      heroEl.style.position = "relative";
      heroEl.insertAdjacentHTML("afterbegin", `
        <div style="
          position:absolute;inset:0;
          background:rgba(0,0,0,0.65);
          border-radius:12px;
          z-index:0;
        "></div>
      `);
      heroEl.style.isolation = "isolate";
      heroEl.querySelectorAll(".hero-left, .hero-avatar").forEach(el => {
        el.style.position = "relative";
        el.style.zIndex = "1";
      });
    }
  }

  // Links
  if (perfil.linkedin) {
    const el = document.querySelector(".btn-primary");
    if (el) el.href = perfil.linkedin;
  }
  if (perfil.github) {
    const el = document.querySelector(".btn-ghost");
    if (el) el.href = perfil.github;
  }

  // Contato
  if (perfil.linkedin) {
    const el = document.querySelector(".contact-card[href*='linkedin']");
    if (el) {
      el.href = perfil.linkedin;
      const val = el.querySelector(".contact-value");
      if (val) val.textContent = perfil.linkedin.replace("https://www.linkedin.com/in/", "").replace("https://linkedin.com/in/", "").replace("/", "");
    }
  }
  if (perfil.github) {
    const el = document.querySelector(".contact-card[href*='github']");
    if (el) {
      el.href = perfil.github;
      const val = el.querySelector(".contact-value");
      if (val) val.textContent = perfil.github.replace("https://github.com/", "");
    }
  }
  if (perfil.email) {
    const el = document.querySelector(".contact-card[href*='mailto']");
    if (el) {
      el.href = `mailto:${perfil.email}`;
      const val = el.querySelector(".contact-value");
      if (val) val.textContent = perfil.email;
    }
  }
}

// ── Carrega stack do Firestore e atualiza o DOM ───────
function aplicarStack(stack) {
  if (!stack) return;

  const grupos = {
    frontend: document.querySelectorAll(".stack-group")[0],
    backend:  document.querySelectorAll(".stack-group")[1],
    infra:    document.querySelectorAll(".stack-group")[2],
    ia:       document.querySelectorAll(".stack-group")[3],
  };

  const destacados = {
    frontend: ["React", "Angular 21", "TypeScript"],
    backend:  ["Node.js", "C# .NET 10"],
    infra:    [],
    ia:       ["OpenAI API"],
  };

  Object.entries(grupos).forEach(([chave, grupo]) => {
    if (!grupo || !stack[chave] || stack[chave].length === 0) return;
    const grid = grupo.querySelector(".stack-grid");
    if (!grid) return;
    grid.innerHTML = stack[chave].map(tech => {
      const isHighlight = (destacados[chave] || []).includes(tech);
      return `<span class="pill ${isHighlight ? "highlight" : ""}">${tech}</span>`;
    }).join("");
  });
}

// ── Monta card de projeto ─────────────────────────────
async function criarCardProjeto(projeto) {
  const usarGitHub = projeto.link &&
    projeto.link.includes("github.com") &&
    !projeto.descricaoManual;

  let nome = projeto.nome;
  let descricao = projeto.descricao || "";
  let tags = projeto.tags || [];

  if (usarGitHub) {
    const gh = await buscarDadosGitHub(projeto.link);
    if (gh) {
      if (!projeto.nome) nome = gh.nome;
      if (!projeto.descricao) descricao = gh.descricao;
      if (!projeto.tags || projeto.tags.length === 0) tags = gh.tags;
    }
  }

  const statusClasse = {
    "Em produção": "status-live",
    "Cliente real": "status-live",
    "Em andamento": "status-wip",
    "Finalizado": "status-done"
  }[projeto.status] || "status-wip";

  const tagsHTML = tags.map(tag => `<span class="project-tag">${tag}</span>`).join("");
  const linkHTML = projeto.link
    ? `<a class="project-link" href="${projeto.link}" target="_blank">Ver repositório ↗</a>`
    : "";

  return `
    <div class="project-card">
      <div class="project-top">
        <span class="project-name">${nome}</span>
        <span class="project-status ${statusClasse}">${projeto.status}</span>
      </div>
      <p class="project-desc">${descricao}</p>
      <div class="project-tags">${tagsHTML}</div>
      ${linkHTML}
    </div>
  `;
}

// ── Carrega tudo do Firestore ─────────────────────────
async function carregarPortfolio() {
  const container = document.getElementById("projects-list");
  container.innerHTML = `<p style="color:#888;font-size:.85rem;">Carregando projetos...</p>`;

  try {
    const snap = await getDoc(doc(db, "portfolio", "dados"));

    if (!snap.exists()) {
      await renderizarProjetosDefault(container);
      return;
    }

    const dados = snap.data();

    // Aplica perfil e stack dinamicamente
    aplicarPerfil(dados.perfil);
    aplicarStack(dados.stack);

    // Renderiza projetos
    const projetos = dados.projetos || [];
    if (projetos.length === 0) {
      await renderizarProjetosDefault(container);
      return;
    }

    const cardsHTML = await Promise.all(projetos.map(p => criarCardProjeto(p)));
    container.innerHTML = cardsHTML.join("");

  } catch (erro) {
    console.error("Erro ao carregar portfólio:", erro);
    await renderizarProjetosDefault(container);
  }
}

// ── Projetos padrão (fallback) ────────────────────────
async function renderizarProjetosDefault(container) {
  const projetosDefault = [
    { nome: "PayFlow", status: "Em produção", link: "https://github.com/LuuckySilva/Payflow" },
    { nome: "BarberApp", status: "Cliente real", link: "https://github.com/LuuckySilva/barberapp" },
    { nome: "NovaCRM AI", status: "Em produção", descricao: "Módulo de análise de leads com IA via OpenAI API.", tags: ["React", "Node.js", "OpenAI API"], link: "https://github.com/LuuckySilva" },
    { nome: "Portfólio Coletivo", status: "Em andamento", link: "https://github.com/PortfolioColetivo/portfolio-coletivo" }
  ];
  const cardsHTML = await Promise.all(projetosDefault.map(p => criarCardProjeto(p)));
  container.innerHTML = cardsHTML.join("");
}

carregarPortfolio();