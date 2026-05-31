// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// FIX: escapa caracteres HTML para prevenir XSS ao exibir dados do Firestore
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let app, auth, db, analytics;

(async () => {
  const response = await fetch(new URL('./configFire.json', import.meta.url));
  const firebaseConfig = await response.json();

  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  auth = getAuth(app);
  db = getFirestore(app);

  // Chamadas dentro do IIFE garante que auth e db estão prontos antes de usar
  carregarPortfolios();
  setupAuthStateChanged();
})();

// 2. CONTROLE DE LOGIN/LOGOUT NO HEADER
function setupAuthStateChanged() {
  const loginBtn  = document.getElementById('login-btn');
  const dashBtn   = document.getElementById('dash-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // FIX: onAuthStateChanged é a única fonte de verdade para visibilidade dos botões.
  // Os botões já iniciam com display:none no HTML, então não há flash antes deste callback.
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginBtn.style.display  = 'none';
      dashBtn.style.display   = 'inline';
      logoutBtn.style.display = 'inline';
    } else {
      loginBtn.style.display  = 'inline';
      dashBtn.style.display   = 'none';
      logoutBtn.style.display = 'none';
    }
  });

  logoutBtn?.addEventListener('click', () => signOut(auth));
}

// 3. LISTAR TODOS OS PORTFÓLIOS NA HOME
let todosPortfolios = [];

async function carregarPortfolios() {
  const grid = document.getElementById('grid-projects');
  if (!grid) return;

  const querySnapshot = await getDocs(collection(db, "users"));
  todosPortfolios = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data().portfolio;
    if (!data) return;
    todosPortfolios.push({ uid: doc.id, data });
  });

  renderizarCards(todosPortfolios);

  const searchInput = document.getElementById('input-stack');
  if (searchInput) {
    searchInput.addEventListener('input', filtrarPorStack);
  }
}

function calcularScore(data, termos) {
  if (!termos.length) return 0;
  const stack    = (data.stack         || []).map(s => s.toLowerCase());
  const keywords = (data.palavras_chave || []).map(k => k.toLowerCase());
  const combined = [...new Set([...stack, ...keywords])];
  return termos.filter(t => combined.some(k => k.includes(t))).length;
}

function filtrarPorStack() {
  const valor = document.getElementById('input-stack').value.trim().toLowerCase();

  if (!valor) {
    renderizarCards(todosPortfolios);
    return;
  }

  const termos = valor.split(',').map(t => t.trim()).filter(Boolean);

  const rankeados = todosPortfolios
    .map(p => ({ ...p, score: calcularScore(p.data, termos) }))
    .filter(p => p.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // tiebreaker: quem tem slug aparece na frente
      return (b.data.slug ? 1 : 0) - (a.data.slug ? 1 : 0);
    })
    .slice(0, 10);

  renderizarCards(rankeados, termos);
}

function renderizarCards(lista, termos = []) {
  const grid = document.getElementById('grid-projects');
  if (!grid) return;
  grid.innerHTML = '';

  if (!lista.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888">Nenhum perfil encontrado para essa busca.</p>';
    return;
  }

  lista.forEach(({ uid, data, score }) => {
    const nome  = escapeHtml(data.nome);
    const cargo = escapeHtml(data.cargo);
    const foto  = escapeHtml(data.foto || 'avatar.png');

    const profileLink = data.slug
      ? `frontend/u.html?slug=${escapeHtml(data.slug)}`
      : `frontend/u.html?id=${escapeHtml(uid)}`;

    const badgeHtml = (termos.length && score != null)
      ? `<span class="match-badge">${score}/${termos.length} habilidades</span>`
      : '';

    grid.innerHTML += `
      <div class="card">
        <img src="${foto}" alt="${nome}">
        <h3>${nome}</h3>
        <p>${cargo}</p>
        ${badgeHtml}
        <a href="${profileLink}">Ver portfólio</a>
      </div>
    `;
  });
}
