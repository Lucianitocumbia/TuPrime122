// auth.js
// Responsabilidad única: iniciar y cerrar sesión contra Firebase Authentication,
// cargar el perfil del usuario (gimnasio y rol) desde Firestore y proteger el
// acceso al dashboard.
//
// La sesión la persiste el propio SDK de Firebase (IndexedDB del navegador):
// ya no se guarda nada de sesión en localStorage.

import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getDoc } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

import { auth, usuarioDoc, GIMNASIO_ID, mensajeDeError } from './firebase.js';

// Perfil del usuario en memoria: { uid, email, gimnasioId, rol, nombre }
let perfilActual = null;

/**
 * Espera a que Firebase resuelva si hay sesión guardada.
 * Al cargar una página el SDK necesita un instante para leer la sesión del
 * navegador: hasta que este promise resuelve, auth.currentUser puede ser null
 * aunque el usuario sí esté logueado.
 */
function esperarSesion() {
  return new Promise((resolve) => {
    const cancelar = onAuthStateChanged(auth, (user) => {
      cancelar();
      resolve(user);
    });
  });
}

/**
 * Lee usuarios/{uid} y valida que el usuario pueda entrar a ESTA instalación.
 * Devuelve { ok: true, perfil } o { ok: false, message }.
 */
async function cargarPerfil(user) {
  let snap;
  try {
    snap = await getDoc(usuarioDoc(user.uid));
  } catch (e) {
    return { ok: false, message: mensajeDeError(e, 'No se pudo verificar tu usuario.') };
  }

  if (!snap.exists()) {
    return { ok: false, message: 'Tu usuario no está dado de alta en el sistema. Contactá al administrador.' };
  }

  const datos = snap.data();

  if (datos.activo === false) {
    return { ok: false, message: 'Tu usuario está desactivado. Contactá al administrador.' };
  }
  if (datos.gimnasioId !== GIMNASIO_ID) {
    return { ok: false, message: 'Tu usuario no pertenece a este gimnasio.' };
  }

  return {
    ok: true,
    perfil: {
      uid: user.uid,
      email: datos.email || user.email,
      gimnasioId: datos.gimnasioId,
      rol: datos.rol || 'admin',
      nombre: datos.nombre || (datos.email || user.email || '').split('@')[0],
    },
  };
}

/**
 * Inicia sesión con email y contraseña.
 * Devuelve { ok: true } o { ok: false, message }.
 */
export async function login(email, password) {
  if (!email || !password) {
    return { ok: false, message: 'Ingresá tu email y tu contraseña.' };
  }

  let credencial;
  try {
    credencial = await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (e) {
    return { ok: false, message: mensajeDeError(e, 'No se pudo iniciar sesión.') };
  }

  const resultado = await cargarPerfil(credencial.user);
  if (!resultado.ok) {
    // La credencial era válida pero el usuario no puede operar acá:
    // no dejamos una sesión a medias abierta.
    await signOut(auth).catch(() => {});
    return resultado;
  }

  perfilActual = resultado.perfil;
  return { ok: true };
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (e) {
    mensajeDeError(e);
  }
  perfilActual = null;
  window.location.href = 'index.html';
}

/**
 * Llamar al inicio de dashboard.html. Es asíncrona: hay que esperarla antes de
 * renderizar nada. Si no hay sesión válida redirige al login y devuelve null.
 */
export async function requireAuth() {
  const user = await esperarSesion();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }

  if (perfilActual && perfilActual.uid === user.uid) return perfilActual;

  const resultado = await cargarPerfil(user);
  if (!resultado.ok) {
    await signOut(auth).catch(() => {});
    window.location.href = 'index.html';
    return null;
  }

  perfilActual = resultado.perfil;
  return perfilActual;
}

/**
 * Llamar al inicio de index.html: si ya hay sesión activa, va al dashboard.
 */
export async function redirectIfAuthenticated() {
  const user = await esperarSesion();
  if (user) window.location.href = 'dashboard.html';
}

/** Perfil del usuario logueado. Sólo válido después de un login o requireAuth. */
export function getCurrentUser() {
  return perfilActual;
}

/** true si el usuario logueado es administrador del gimnasio. */
export function esAdmin() {
  return !!perfilActual && perfilActual.rol === 'admin';
}
