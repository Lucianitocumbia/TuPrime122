// storage.js
// Responsabilidad única: leer y guardar en localStorage lo que todavía no
// migró a la nube.
//
// Estado de la migración: productos y sesión ya viven en Firebase (ver
// data/productosRepo.js y auth.js). Acá quedan sólo las compras, que pasan a
// Firestore en la fase 3. Cuando eso ocurra, este archivo se elimina.

const KEYS = {
  PURCHASES: 'gym_compras',
  NEXT_PURCHASE_ID: 'gym_next_purchase_id',
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`No se pudo leer "${key}" de localStorage:`, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`No se pudo escribir "${key}" en localStorage:`, e);
    return false;
  }
}

/* ---------------- Compras ---------------- */

export function getCompras() {
  return readJSON(KEYS.PURCHASES, []);
}

export function saveCompras(compras) {
  return writeJSON(KEYS.PURCHASES, compras);
}

export function getNextPurchaseId() {
  const next = readJSON(KEYS.NEXT_PURCHASE_ID, 1);
  writeJSON(KEYS.NEXT_PURCHASE_ID, next + 1);
  return next;
}

export const STORAGE_KEYS = KEYS;
