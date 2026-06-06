// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const emailInput    = document.getElementById('email');
const senhaInput    = document.getElementById('senha');
const btnLogin      = document.getElementById('btn-login');
const btnCadastro   = document.getElementById('btn-cadastro');
const btnResetSenha = document.getElementById('btn-reset-senha');
const authErro      = document.getElementById('auth-erro');
const authSucesso   = document.getElementById('auth-sucesso');

btnLogin.disabled      = true;
btnCadastro.disabled   = true;
btnResetSenha.disabled = true;

let auth, db;

(async () => {
  try {
    const response = await fetch(new URL('./configFire.json', import.meta.url));
    const firebaseConfig = await response.json();

    const app = initializeApp(firebaseConfig);
    getAnalytics(app);
    auth = getAuth(app);
    db   = getFirestore(app);

    btnLogin.disabled      = false;
    btnCadastro.disabled   = false;
    btnResetSenha.disabled = false;
  } catch (err) {
    authErro.textContent = 'Erro ao carregar configurações. Recarregue a página.';
    console.error('Falha na inicialização do Firebase:', err);
  }
})();

function createSlug(value) {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

// CADASTRO
btnCadastro.addEventListener('click', async () => {
  authErro.textContent = '';
  try {
    const cred = await createUserWithEmailAndPassword(auth, emailInput.value, senhaInput.value);
    await setDoc(doc(db, "users", cred.user.uid), {
      portfolio: {
        nome:  emailInput.value.split('@')[0],
        email: emailInput.value,
        slug:  createSlug(emailInput.value.split('@')[0])
      }
    });
    window.location.href = 'Edit_Profile.html';
  } catch (error) {
    authErro.textContent = traduzErro(error.code);
  }
});

// LOGIN
btnLogin.addEventListener('click', fazerLogin);

// REDEFINIR SENHA
btnResetSenha.addEventListener('click', async () => {
  authErro.textContent    = '';
  authSucesso.textContent = '';
  const email = emailInput.value.trim();
  if (!email) {
    authErro.textContent = 'Digite seu email para redefinir a senha.';
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    authSucesso.textContent = 'Email de redefinição enviado! Verifique sua caixa de entrada.';
  } catch (error) {
    authErro.textContent = traduzErro(error.code);
  }
});

// FIX: Enter no campo senha também dispara o login
senhaInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') fazerLogin();
});

async function fazerLogin() {
  authErro.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, senhaInput.value);
    window.location.href = 'Edit_Profile.html';
  } catch (error) {
    authErro.textContent = traduzErro(error.code);
  }
}

function traduzErro(codigo) {
  if (codigo === 'auth/email-already-in-use') return 'Esse email já está em uso.';
  if (codigo === 'auth/weak-password')         return 'Senha fraca. Use no mínimo 6 caracteres.';
  if (codigo === 'auth/invalid-credential')    return 'Email ou senha inválidos.';
  if (codigo === 'auth/user-not-found')        return 'Nenhuma conta encontrada com esse email.';
  return 'Ocorreu um erro. Tente novamente.';
}
