// u.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import {
  getFirestore,
  doc, getDoc,
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

(async () => {
  const response = await fetch(new URL('./configFire.json', import.meta.url));
  const firebaseConfig = await response.json();

  const app = initializeApp(firebaseConfig);
  getAnalytics(app);
  const db = getFirestore(app);

  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('slug');
  const uid    = params.get('id'); // legado — mantido para compatibilidade

  let data = null;

  if (slug) {
    // --- Opção 3: busca pelo slug personalizado ---
    const q    = query(collection(db, 'users'), where('portfolio.slug', '==', slug));
    const snap = await getDocs(q);
    if (snap.empty) {
      document.getElementById('profile-card').innerHTML = '<p>Portfólio não encontrado.</p>';
      return;
    }
    data = snap.docs[0].data().portfolio || {};

  } else if (uid) {
    // --- Fallback legado: busca pelo UID do Firebase ---
    const docRef = doc(db, 'users', uid);
    const snap   = await getDoc(docRef);
    if (!snap.exists()) {
      document.getElementById('profile-card').innerHTML = '<p>Portfólio não encontrado.</p>';
      return;
    }
    data = snap.data().portfolio || {};

  } else {
    document.getElementById('profile-card').innerHTML = '<p>ID do usuário não especificado.</p>';
    return;
  }

  const fotoEl = document.getElementById('pf-foto');
  if (data.foto) {
    fotoEl.src = data.foto;
    fotoEl.onerror = () => { fotoEl.style.display = 'none'; };
  } else {
    fotoEl.style.display = 'none';
  }
  document.getElementById('pf-nome').textContent  = data.nome  || '';
  document.getElementById('pf-cargo').textContent = data.cargo || '';
  document.getElementById('pf-bio').textContent   = data.bio   || '';

  // Links sociais + separador
  const ln  = document.getElementById('pf-linkedin');
  const gh  = document.getElementById('pf-github');
  const sep = document.getElementById('pf-sep');

  const temLinkedin = !!data.linkedin;
  const temGithub   = !!data.github;

  if (temLinkedin) {
    ln.href        = data.linkedin;
    ln.textContent = 'LinkedIn';
  } else {
    ln.style.display = 'none';
  }

  if (temGithub) {
    gh.href        = data.github;
    gh.textContent = 'GitHub';
  } else {
    gh.style.display = 'none';
  }

  // FIX: separador só aparece se AMBOS os links existirem
  if (!temLinkedin || !temGithub) {
    sep.style.display = 'none';
  }

  // Projetos / portfolio_url
  const projectWrapper = document.getElementById('pf-project');

  // --- OPÇÃO 3: pasta local ../projetos/<slug>/index.html ---
  // Tem prioridade sobre URL externa e projetos individuais
  const slugAtivo = params.get('slug'); // só tentamos se a página foi aberta por slug
  if (slugAtivo) {
    const localPath = `../projetos/${slugAtivo}/index.html`;
    try {
      // 404 aqui é esperado quando a pasta não existe; browser loga mesmo com try/catch
      const check = await fetch(localPath, { method: 'HEAD' });
      if (check.ok) {
        const section = document.createElement('div');
        section.style.cssText = 'margin-top:2rem';

        const titulo = document.createElement('h3');
        titulo.textContent = 'Portfólio';
        section.appendChild(titulo);

        const iframe = document.createElement('iframe');
        iframe.src             = localPath;
        iframe.title           = `Portfólio de ${data.nome || slugAtivo}`;
        iframe.width           = '100%';
        iframe.height          = '800';
        iframe.style.cssText   = 'border:1px solid #ddd;border-radius:6px;display:block';
        iframe.loading         = 'lazy';
        section.appendChild(iframe);
        projectWrapper.appendChild(section);
        return; // pasta local encontrada — encerra aqui
      }
    } catch (_) {
      // pasta não acessível (CORS, 404, etc.) — cai para as opções abaixo
    }
  }

  if (data.portfolio_url) {
    const portSection = document.createElement('div');
    portSection.style.cssText = 'margin-top:2rem';

    const portTitle = document.createElement('h3');
    portTitle.textContent = 'Meu Portfólio';
    portSection.appendChild(portTitle);

    const iframe = document.createElement('iframe');
    iframe.src    = data.portfolio_url;
    iframe.title  = `Portfólio de ${data.nome || 'usuário'}`;
    iframe.width  = '100%';
    iframe.height = '1000';
    iframe.style.cssText = 'border:1px solid #ddd;border-radius:4px';
    portSection.appendChild(iframe);
    projectWrapper.appendChild(portSection);

  } else if (data.projetos && data.projetos.length > 0) {
    const projectsSection = document.createElement('div');
    projectsSection.innerHTML = '<h3>Meus Projetos</h3>';

    data.projetos.forEach((proj) => {
      const projDiv = document.createElement('div');
      projDiv.style.cssText = 'border:1px solid #e0e0e0;padding:1rem;margin:1rem 0;border-radius:4px;background:#f9f9f9';

      const titulo = document.createElement('h4');
      titulo.textContent = proj.titulo;

      const desc = document.createElement('p');
      desc.textContent = proj.descricao;

      const link = document.createElement('a');
      link.href        = proj.link;
      link.target      = '_blank';
      link.textContent = 'Ver repositório';
      link.style.color = '#007bff';

      projDiv.appendChild(titulo);
      projDiv.appendChild(desc);
      projDiv.appendChild(link);
      projectsSection.appendChild(projDiv);
    });

    projectWrapper.appendChild(projectsSection);
  }
})();
