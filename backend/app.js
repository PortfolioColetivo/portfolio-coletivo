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
async function carregarPortfolios() {
  const grid = document.getElementById('grid-projects');
  if (!grid) return;

  const querySnapshot = await getDocs(collection(db, "users"));
  grid.innerHTML = '';

  querySnapshot.forEach((doc) => {
    const data = doc.data().portfolio;
    if (!data) return;

    // FIX: todos os campos vindos do Firestore são escapados antes de ir ao innerHTML
    const nome  = escapeHtml(data.nome);
    const cargo = escapeHtml(data.cargo);
    const foto  = escapeHtml(data.foto || 'avatar.png');

    // Usa slug (ID público amigável) quando disponível; fallback para UID legado
    const profileLink = data.slug
      ? `u.html?slug=${escapeHtml(data.slug)}`
      : `u.html?id=${escapeHtml(doc.id)}`;

    grid.innerHTML += `
      <div class="card">
        <img src="${foto}" alt="${nome}">
        <h3>${nome}</h3>
        <p>${cargo}</p>
        <a href="${profileLink}">Ver portfólio</a>
      </div>
    `;
  });
}
