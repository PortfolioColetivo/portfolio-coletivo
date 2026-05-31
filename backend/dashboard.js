// dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, setDoc,
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// type="module" é defer por padrão: o DOM já está pronto quando este script executa.
// Por isso, atribuímos as variáveis DOM diretamente, sem precisar de DOMContentLoaded.
// A única espera necessária é pelo fetch do configFire.json (Firebase).

// --- Variáveis DOM (atribuídas diretamente — DOM já está pronto) ---
const form              = document.getElementById('portfolio-form');
const statusMsg         = document.getElementById('status-msg');
const logoutBtn         = document.getElementById('logout-btn');
const addProjectBtn     = document.getElementById('add-project-btn');
const projectsList      = document.getElementById('projects-list');
const portfolioUrlInput = document.getElementById('portfolio-url');
const projetosTitle     = document.getElementById('projetos-title');
const projetosHint      = document.getElementById('projetos-hint');
const projectModal      = document.getElementById('project-modal');
const projectForm       = document.getElementById('project-form');
const cancelProjectBtn  = document.getElementById('cancel-project-btn');
const slugInput             = document.getElementById('slug');
const slugPreview           = document.getElementById('slug-preview');
const slugErro              = document.getElementById('slug-erro');
const descricaoInput        = document.getElementById('descricao-portfolio');
const descricaoContador     = document.getElementById('descricao-contador');

descricaoInput?.addEventListener('input', () => {
  const len = descricaoInput.value.length;
  descricaoContador.textContent = `${len} / 1000 caracteres — palavras extraídas automaticamente para a busca.`;
});

let usuarioAtual      = null;
let projetosAtual     = [];
let editingProjectIdx = null;
let slugValido        = true; // controla se o form pode ser submetido

// --- Extração de palavras-chave do portfolio local ---
const STOPWORDS = new Set([
  // Português
  'de','da','do','das','dos','a','o','e','em','um','uma','com','para','por','que',
  'se','não','na','no','as','os','ao','foi','são','ter','ele','ela','seu','sua',
  'mas','mais','ou','como','me','nos','ser','há','já','isso','esta','este','essa',
  'esse','aqui','ali','bem','muito','ainda','depois','também','sobre','entre',
  'quando','onde','quem','seu','meu','teu','nosso','isso','aquilo','cada','todo',
  // Inglês
  'the','a','an','and','or','but','in','on','at','to','for','of','is','are',
  'was','were','be','been','have','has','had','do','does','did','will','would',
  'can','could','should','may','might','it','its','this','that','with','from',
  'by','as','if','we','you','he','she','they','my','your','our','their','all',
  'not','no','so','up','out','about','into','than','then','when','where','who',
  'get','use','new','one','two','also','just','make','like','see','time','way'
]);

function tokenizar(texto) {
  return texto
    .toLowerCase()
    .split(/[\s,.;\-_/\\|:!?@#$%^&*()\[\]{}<>"'`~\n\r\t+=]+/)
    .filter(p => p.length >= 3 && !STOPWORDS.has(p) && !/^\d+$/.test(p));
}

async function extrairPalavrasChave(slug) {
  if (!slug) return [];
  try {
    const res = await fetch(`../projetos/${slug}/index.html`);
    if (!res.ok) return [];
    const html = await res.text();
    const semTags = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    return tokenizar(semTags);
  } catch {
    return [];
  }
}

function extrairDoTexto(texto) {
  if (!texto || !texto.trim()) return [];
  return tokenizar(texto);
}

// --- Helpers de slug ---
function sanitizarSlug(valor) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function atualizarPreviewSlug(slug) {
  if (!slug) {
    slugPreview.style.display = 'none';
    return;
  }
  const url = `u.html?slug=${slug}`;
  slugPreview.style.display = 'block';
  slugPreview.innerHTML = `🔗 Link público: <a href="${url}" target="_blank">${url}</a>`;
}

let slugDebounceTimer = null;

slugInput.addEventListener('input', () => {
  // Sanitiza em tempo real enquanto digita
  const sanitizado = sanitizarSlug(slugInput.value);
  slugInput.value = sanitizado;
  slugErro.style.display = 'none';
  slugValido = true;
  atualizarPreviewSlug(sanitizado);

  // Valida unicidade com debounce de 600ms
  clearTimeout(slugDebounceTimer);
  if (sanitizado && usuarioAtual) {
    slugDebounceTimer = setTimeout(() => validarUnicidadeSlug(sanitizado), 600);
  }
});

async function validarUnicidadeSlug(slug) {
  if (!slug || !db || !usuarioAtual) return;
  try {
    const q    = query(collection(db, 'users'), where('portfolio.slug', '==', slug));
    const snap = await getDocs(q);
    // Conflito somente se outro usuário (não o próprio) usa esse slug
    const conflito = snap.docs.some(d => d.id !== usuarioAtual.uid);
    if (conflito) {
      slugErro.textContent  = '❌ Esse endereço já está em uso. Escolha outro.';
      slugErro.style.display = 'block';
      slugValido = false;
    } else {
      slugErro.style.display = 'none';
      slugValido = true;
    }
  } catch (e) {
    console.warn('Erro ao validar slug:', e);
  }
}

// --- Registra listeners UMA única vez ---
portfolioUrlInput.addEventListener('input', atualizarVisibilidadeProjetos);

addProjectBtn.addEventListener('click', () => {
  projetosAtual.push({ titulo: '', descricao: '', link: '' });
  abrirModalProjeto(projetosAtual.length - 1);
});

projectForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (editingProjectIdx === null) return;

  const titulo    = document.getElementById('proj-titulo').value.trim();
  const descricao = document.getElementById('proj-descricao').value.trim();
  const link      = document.getElementById('proj-link').value.trim();

  if (!titulo || !descricao || !link) {
    alert('Preencha todos os campos obrigatórios.');
    return;
  }

  projetosAtual[editingProjectIdx] = { titulo, descricao, link };
  renderizarProjetos();
  fecharModalProjeto();
});

cancelProjectBtn.addEventListener('click', fecharModalProjeto);

projectModal.addEventListener('click', (e) => {
  if (e.target === projectModal) fecharModalProjeto();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!usuarioAtual) {
    statusMsg.textContent = 'Aguardando autenticação. Tente novamente em instantes.';
    return;
  }

  if (!slugValido) {
    statusMsg.textContent = 'Corrija o endereço público antes de salvar.';
    slugInput.focus();
    return;
  }

  statusMsg.textContent = 'Salvando alterações...';

  const slugFinal = sanitizarSlug(slugInput.value);

  const stackRaw = document.getElementById('stack')?.value || '';
  const stack = stackRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const deHtml  = await extrairPalavrasChave(slugFinal);
  const deTexto = extrairDoTexto(descricaoInput?.value || '');
  const palavrasChave = [...new Set([...deHtml, ...deTexto])];

  const dadosPortfolio = {
    nome:          document.getElementById('nome').value,
    cargo:         document.getElementById('cargo').value,
    bio:           document.getElementById('bio').value,
    foto:          document.getElementById('foto').value,
    linkedin:      document.getElementById('linkedin').value,
    github:        document.getElementById('github').value,
    portfolio_url: portfolioUrlInput.value.trim(),
    projetos:      projetosAtual,
    stack:              stack,
    palavras_chave:     palavrasChave,
    descricao_portfolio: (descricaoInput?.value || '').trim().slice(0, 1000),
    email:              usuarioAtual.email,
    slug:          slugFinal
  };

  try {
    await setDoc(doc(db, 'users', usuarioAtual.uid), {
      portfolio: dadosPortfolio
    }, { merge: true });

    statusMsg.textContent = 'Alterações salvas com sucesso!';
    setTimeout(() => {
      statusMsg.textContent = '';
      window.location.href = '../index.html';
    }, 1500);
  } catch (error) {
    console.error('Erro ao salvar:', error);
    statusMsg.textContent = 'Erro ao salvar: ' + (error?.message || 'Tente novamente.');
  }
});

logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => (window.location.href = '../index.html'));
});

// --- Inicializa Firebase e arranca a autenticação ---
let auth, db;

(async () => {
  try {
    const response = await fetch(new URL('./configFire.json', import.meta.url));
    const firebaseConfig = await response.json();
    const app = initializeApp(firebaseConfig);
    getAnalytics(app);
    auth = getAuth(app);
    db   = getFirestore(app);

    setupAuthStateChanged();
  } catch (err) {
    console.error('Falha na inicialização do Firebase:', err);
    statusMsg.textContent = 'Erro ao carregar a página. Recarregue.';
  }
})();

// --- Auth ---
function setupAuthStateChanged() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      usuarioAtual = user;
      logoutBtn.classList.remove('hiddem');
      await carregarDados(user.uid);
    } else {
      window.location.href = 'login.html';
    }
  });
}

// --- Carrega dados do Firestore no form ---
async function carregarDados(uid) {
  try {
    const docRef  = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().portfolio) {
      const p = docSnap.data().portfolio;
      document.getElementById('nome').value     = p.nome     || '';
      document.getElementById('cargo').value    = p.cargo    || '';
      document.getElementById('bio').value      = p.bio      || '';
      document.getElementById('foto').value     = p.foto     || '';
      document.getElementById('linkedin').value = p.linkedin || '';
      document.getElementById('github').value   = p.github   || '';
      portfolioUrlInput.value                   = p.portfolio_url || '';

      const stackInput = document.getElementById('stack');
      if (stackInput) stackInput.value = (p.stack || []).join(', ');

      if (descricaoInput) {
        descricaoInput.value = p.descricao_portfolio || '';
        descricaoContador.textContent = `${descricaoInput.value.length} / 1000 caracteres — palavras extraídas automaticamente para a busca.`;
      }

      // Carrega o slug e exibe o link público
      const slugAtual = p.slug || '';
      slugInput.value = slugAtual;
      atualizarPreviewSlug(slugAtual);

      if (slugAtual) {
        detectarPastaLocal(slugAtual);
      }

      projetosAtual = p.projetos || [];
    } else {
      // Coleção/documento não existe ainda — perfil novo
      statusMsg.textContent = 'Perfil novo detectado. Preencha seus dados e salve para criar o perfil.';
      setTimeout(() => { statusMsg.textContent = ''; }, 4000);
    }
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    statusMsg.textContent = 'Erro ao carregar dados: ' + (err?.message || 'Tente recarregar a página.');
  } finally {
    // Garante que a UI é atualizada independente de o documento existir ou não
    renderizarProjetos();
    atualizarVisibilidadeProjetos();
  }
}

async function detectarPastaLocal(slug) {
  const statusEl = document.getElementById('slug-folder-status');
  if (!statusEl || !slug) return;
  try {
    const localPath = `../projetos/${slug}/index.html`;
    const res = await fetch(localPath, { method: 'HEAD' });
    if (res.ok) {
      statusEl.style.display  = 'block';
      statusEl.style.background = '#e8f5e9';
      statusEl.style.color    = '#2e7d32';
      statusEl.innerHTML = `✅ Pasta <strong>projetos/${slug}/</strong> detectada! Seu portfólio local será exibido automaticamente em <a href="u.html?slug=${slug}" target="_blank">u.html?slug=${slug}</a>.`;
    } else {
      statusEl.style.display  = 'block';
      statusEl.style.background = '#fff3e0';
      statusEl.style.color    = '#e65100';
      statusEl.innerHTML = `⚠️ Pasta <strong>projetos/${slug}/</strong> não encontrada. Serão usadas as opções abaixo.`;
    }
  } catch (_) {
    // silencia erros de rede
  }
}

// --- Lógica mutuamente exclusiva: URL externa OU projetos individuais ---
function atualizarVisibilidadeProjetos() {
  const temUrl        = portfolioUrlInput.value.trim();
  const secaoProjetos = document.getElementById("secao-projetos");
  const previewUrl    = document.getElementById("portfolio-url-preview");

  if (temUrl) {
    secaoProjetos.style.display = "none";
    if (previewUrl) {
      previewUrl.style.display = "block";
      previewUrl.textContent   = `u2713 Portfolio externo seru00e1 exibido: ${temUrl}`;
    }
  } else {
    secaoProjetos.style.display = "block";
    if (previewUrl) previewUrl.style.display = "none";
  }
}

function renderizarProjetos() {
  projectsList.innerHTML = '';
  projetosAtual.forEach((proj, idx) => {
    const div = document.createElement('div');
    div.style.cssText = 'border:1px solid #ccc;padding:1rem;margin-bottom:1rem;border-radius:4px;';
    div.innerHTML = `
      <h4 style="margin:0 0 .5rem">${proj.titulo || '(Sem título)'}</h4>
      <p style="margin:0 0 .5rem">${proj.descricao || '(Sem descrição)'}</p>
      <a href="${proj.link}" target="_blank" style="color:#007bff;text-decoration:none">Ver repositório ↗</a>
      <button type="button" data-idx="${idx}" class="edit-proj-btn"
        style="margin-left:1rem;padding:.25rem .75rem;background:#28a745;color:#fff;border:none;border-radius:3px;cursor:pointer">
        Editar
      </button>
      <button type="button" data-idx="${idx}" class="remove-proj-btn"
        style="margin-left:.25rem;padding:.25rem .5rem;background:#dc3545;color:#fff;border:none;border-radius:3px;cursor:pointer">
        Remover
      </button>
    `;
    projectsList.appendChild(div);
  });

  projectsList.querySelectorAll('.remove-proj-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      projetosAtual.splice(parseInt(e.target.dataset.idx), 1);
      renderizarProjetos();
    });
  });

  projectsList.querySelectorAll('.edit-proj-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      abrirModalProjeto(parseInt(e.target.dataset.idx));
    });
  });
}

function abrirModalProjeto(idx) {
  editingProjectIdx = idx;
  const proj = projetosAtual[idx];
  document.getElementById('proj-titulo').value    = proj.titulo    || '';
  document.getElementById('proj-descricao').value = proj.descricao || '';
  document.getElementById('proj-link').value      = proj.link      || '';
  projectModal.style.display = 'flex';
}

function fecharModalProjeto() {
  projectModal.style.display = 'none';
  editingProjectIdx = null;
  projectForm.reset();
}
