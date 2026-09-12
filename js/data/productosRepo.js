// data/productosRepo.js
// Responsabilidad única: hablar con Firestore para todo lo referido a productos.
// Ningún módulo de negocio conoce nombres de colecciones ni funciones del SDK:
// todo pasa por acá.

import {
  addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy,
  serverTimestamp, runTransaction, writeBatch, increment, doc,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

import { db, gimnasioCol, gimnasioDocEn } from '../firebase.js';

/**
 * Se suscribe en tiempo real a los productos del gimnasio.
 * Llama a onCambio(productos) con cada actualización, venga de este dispositivo
 * o de otro. Devuelve la función para cancelar la suscripción.
 */
export function suscribirProductos(onCambio, onError) {
  const consulta = query(gimnasioCol('productos'), orderBy('nombre'));
  return onSnapshot(
    consulta,
    (snap) => {
      onCambio(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    onError
  );
}

export function crear(datos) {
  return addDoc(gimnasioCol('productos'), {
    ...datos,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
}

export function actualizar(id, datos) {
  return updateDoc(gimnasioDocEn('productos', id), {
    ...datos,
    actualizadoEn: serverTimestamp(),
  });
}

export function eliminar(id) {
  return deleteDoc(gimnasioDocEn('productos', id));
}

/**
 * Descuenta stock de varios productos de una sola vez.
 * Usa increment() en lugar de leer-modificar-escribir: el servidor aplica la
 * resta de forma atómica, así que dos ventas simultáneas no se pisan.
 * items: [{ productoId, cantidad }]
 */
export function descontarStock(items) {
  const batch = writeBatch(db);
  items.forEach(({ productoId, cantidad }) => {
    batch.update(gimnasioDocEn('productos', productoId), {
      stock: increment(-cantidad),
      actualizadoEn: serverTimestamp(),
    });
  });
  return batch.commit();
}

/**
 * Carga los productos de ejemplo la primera vez, de forma idempotente.
 * Todo ocurre dentro de una transacción sobre meta/seed: si dos dispositivos
 * abren el sistema al mismo tiempo, uno de los dos aborta y no se duplica nada.
 * Devuelve true si sembró, false si ya estaba sembrado.
 */
export async function sembrarSiHaceFalta(productosIniciales) {
  const marcaSeed = gimnasioDocEn('meta', 'seed');

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(marcaSeed);
    if (snap.exists()) return false;

    productosIniciales.forEach((p) => {
      // doc() sin id genera uno nuevo en el cliente, sin ida y vuelta al servidor.
      const ref = doc(gimnasioCol('productos'));
      tx.set(ref, { ...p, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() });
    });

    tx.set(marcaSeed, { sembrado: true, fecha: serverTimestamp() });
    return true;
  });
}
