// data/comprasRepo.js
// Responsabilidad única: hablar con Firestore para todo lo referido a compras.
//
// La creación de una compra es la operación más delicada del sistema: toca
// varios documentos a la vez (el stock de cada producto, el contador de
// números y la compra en sí) y tiene que ser todo o nada.

import {
  deleteDoc, onSnapshot, query, orderBy, serverTimestamp,
  runTransaction, doc,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

import { db, gimnasioCol, gimnasioDocEn } from '../firebase.js';

/** Código que usamos para distinguir "no hay stock" de un error de red. */
export const SIN_STOCK = 'tuprime/sin-stock';

/**
 * Convierte un documento de Firestore al formato que usa la app.
 * `fecha` viaja como Timestamp del servidor; la UI espera un ISO string.
 * Mientras el servidor no confirma, el snapshot local la trae en null: en ese
 * hueco usamos la hora local, y el propio onSnapshot la corrige enseguida.
 */
function aCompra(d) {
  const datos = d.data();
  const ts = datos.fecha;
  return {
    ...datos,
    id: d.id,
    fecha: ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : new Date().toISOString(),
  };
}

/**
 * Se suscribe en tiempo real a las compras del gimnasio, de la más nueva a la
 * más vieja. Devuelve la función para cancelar la suscripción.
 */
export function suscribirCompras(onCambio, onError) {
  const consulta = query(gimnasioCol('compras'), orderBy('fecha', 'desc'));
  return onSnapshot(consulta, (snap) => onCambio(snap.docs.map(aCompra)), onError);
}

/**
 * Registra una compra descontando el stock, en una sola transacción.
 *
 * Por qué transacción y no escrituras sueltas: entre que el navegador lee el
 * stock y lo descuenta, otro vendedor pudo haber vendido lo mismo. Dentro de
 * una transacción, Firestore verifica en el servidor que los documentos leídos
 * no hayan cambiado; si cambiaron, reintenta sola con los datos nuevos. El
 * resultado es que el stock no puede quedar negativo ni perderse una venta.
 *
 * El número legible de la compra ("Compra #12") se incrementa DENTRO de la
 * misma transacción, así que tampoco puede duplicarse.
 *
 * items: [{ productoId, nombre, precioUnitario, cantidad, subtotal }]
 */
export function crearCompra({ items, total, usuarioId, usuarioEmail }) {
  const contadorRef = gimnasioDocEn('meta', 'contadores');

  return runTransaction(db, async (tx) => {
    // --- 1. TODAS las lecturas primero (Firestore lo exige) ---
    const refsProductos = items.map((i) => gimnasioDocEn('productos', i.productoId));
    const snapsProductos = await Promise.all(refsProductos.map((ref) => tx.get(ref)));
    const snapContador = await tx.get(contadorRef);

    // --- 2. Validación contra el stock real del servidor ---
    items.forEach((item, idx) => {
      const snap = snapsProductos[idx];
      if (!snap.exists()) {
        const error = new Error(`El producto "${item.nombre}" ya no existe.`);
        error.codigo = SIN_STOCK;
        throw error;
      }
      const stockActual = snap.data().stock || 0;
      if (stockActual < item.cantidad) {
        const error = new Error(
          `Sin stock suficiente para "${item.nombre}". Disponible: ${stockActual}.`
        );
        error.codigo = SIN_STOCK;
        throw error;
      }
    });

    // --- 3. Escrituras ---
    items.forEach((item, idx) => {
      tx.update(refsProductos[idx], {
        stock: snapsProductos[idx].data().stock - item.cantidad,
        actualizadoEn: serverTimestamp(),
      });
    });

    const numero = (snapContador.exists() ? snapContador.data().compras || 0 : 0) + 1;
    tx.set(contadorRef, { compras: numero }, { merge: true });

    const compraRef = doc(gimnasioCol('compras'));
    tx.set(compraRef, {
      numero,
      fecha: serverTimestamp(),
      items,
      total,
      usuarioId,
      usuarioEmail,
    });

    return { id: compraRef.id, numero };
  });
}

export function eliminar(id) {
  return deleteDoc(gimnasioDocEn('compras', id));
}
