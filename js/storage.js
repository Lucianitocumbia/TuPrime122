// storage.js
// Responsabilidad única: leer, guardar, actualizar y eliminar datos en localStorage.
// Ningún otro módulo debe llamar a localStorage directamente: todos pasan por aquí.

const KEYS = {
  PRODUCTS: 'gym_productos',
  PURCHASES: 'gym_compras',
  SESSION: 'gym_session',
  SEEDED: 'gym_seeded',
  NEXT_PRODUCT_ID: 'gym_next_product_id',
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

function remove(key) {
  localStorage.removeItem(key);
}

/* ---------------- Productos ---------------- */

export function getProductos() {
  return readJSON(KEYS.PRODUCTS, []);
}

export function saveProductos(productos) {
  return writeJSON(KEYS.PRODUCTS, productos);
}

export function getNextProductId() {
  const next = readJSON(KEYS.NEXT_PRODUCT_ID, 1);
  writeJSON(KEYS.NEXT_PRODUCT_ID, next + 1);
  return next;
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

/* ---------------- Sesión ---------------- */

export function getSession() {
  return readJSON(KEYS.SESSION, null);
}

export function setSession(sessionData) {
  return writeJSON(KEYS.SESSION, sessionData);
}

export function clearSession() {
  remove(KEYS.SESSION);
}

/* ---------------- Semilla de datos iniciales ---------------- */

export function isSeeded() {
  return readJSON(KEYS.SEEDED, false);
}

export function markSeeded() {
  writeJSON(KEYS.SEEDED, true);
}

export const STORAGE_KEYS = KEYS;
