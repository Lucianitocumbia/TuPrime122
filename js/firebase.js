// firebase.js
// Responsabilidad única: inicializar el SDK de Firebase una sola vez y exponer
// las referencias (auth, db), las rutas de datos del gimnasio y el traductor de
// errores. Ningún otro módulo importa el SDK directamente.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, collection, doc } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

import { firebaseConfig, GIMNASIO_ID } from './firebase.config.js';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export { GIMNASIO_ID };

/* ---------------- Rutas de datos ----------------
   Todo lo del gimnasio cuelga de gimnasios/{GIMNASIO_ID}/...
   Al pasar siempre por estos helpers, ningún módulo puede leer por accidente
   los datos de otro gimnasio: la ruta ajena habría que escribirla a mano.     */

export function gimnasioDoc() {
  return doc(db, 'gimnasios', GIMNASIO_ID);
}

/** Colección del gimnasio actual: gimnasioCol('productos') → gimnasios/x/productos */
export function gimnasioCol(nombre) {
  return collection(db, 'gimnasios', GIMNASIO_ID, nombre);
}

/** Documento dentro de una colección del gimnasio actual. */
export function gimnasioDocEn(nombreColeccion, id) {
  return doc(db, 'gimnasios', GIMNASIO_ID, nombreColeccion, String(id));
}

/** Perfil de un usuario de la plataforma: usuarios/{uid} */
export function usuarioDoc(uid) {
  return doc(db, 'usuarios', uid);
}

/* ---------------- Errores ---------------- */

const MENSAJES = {
  // Authentication
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/invalid-email': 'El email no tiene un formato válido.',
  'auth/user-not-found': 'Email o contraseña incorrectos.',
  'auth/wrong-password': 'Email o contraseña incorrectos.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisá tu internet e intentá de nuevo.',
  // Firestore
  'permission-denied': 'No tenés permisos para esta acción.',
  unavailable: 'Sin conexión con el servidor. Revisá tu internet.',
  'not-found': 'El dato ya no existe. Actualizá la página.',
  'failed-precondition': 'La operación no se pudo completar. Volvé a intentar.',
  aborted: 'Otra persona modificó estos datos al mismo tiempo. Volvé a intentar.',
};

/**
 * Traduce un error de Firebase a un mensaje en castellano para el usuario.
 * El error completo siempre va a la consola para poder depurar.
 */
export function mensajeDeError(error, porDefecto = 'Ocurrió un error inesperado. Intentá de nuevo.') {
  console.error('[TUPRIME] Error de Firebase:', error);
  const codigo = error && error.code ? error.code : '';
  return MENSAJES[codigo] || porDefecto;
}
