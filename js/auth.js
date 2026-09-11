// auth.js
// Responsabilidad única: validar credenciales, crear/cerrar sesión y
// proteger el acceso al dashboard.

import { getSession, setSession, clearSession } from './storage.js';

// Credenciales iniciales del sistema (ver especificación del proyecto).
const VALID_USER = '123';
const VALID_PASS = '123';

/**
 * Intenta iniciar sesión. Devuelve { ok: true } o { ok: false, message }.
 */
export function login(usuario, password) {
  if (!usuario || !password) {
    return { ok: false, message: 'Ingresá usuario y contraseña.' };
  }
  if (usuario === VALID_USER && password === VALID_PASS) {
    setSession({ usuario, loginAt: new Date().toISOString() });
    return { ok: true };
  }
  return { ok: false, message: 'Usuario o contraseña incorrectos.' };
}

export function logout() {
  clearSession();
  window.location.href = 'index.html';
}

export function isAuthenticated() {
  return !!getSession();
}

/**
 * Llamar al inicio de dashboard.html: si no hay sesión, redirige al login.
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/**
 * Llamar al inicio de index.html: si ya hay sesión activa, va directo al dashboard.
 */
export function redirectIfAuthenticated() {
  if (isAuthenticated()) {
    window.location.href = 'dashboard.html';
  }
}

export function getCurrentUser() {
  const session = getSession();
  return session ? session.usuario : null;
}
