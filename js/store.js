// store.js
// Responsabilidad única: mantener en memoria una copia de los datos de la nube,
// sincronizada en tiempo real, y avisar a quien quiera re-renderizar.
//
// Por qué existe: gracias a esta caché, leer productos sigue siendo SÍNCRONO
// (listarProductos, buscarYFiltrar, calcularEstadisticas...). Sólo las
// escrituras son async. Además hay una sola suscripción en vez de una lectura
// por cada render, y si otro dispositivo vende algo, la pantalla se actualiza
// sola.

import { suscribirProductos } from './data/productosRepo.js';
import { mensajeDeError } from './firebase.js';

let productos = [];
let productosCargados = false;
let cancelarProductos = null;

const suscriptores = new Set();
let onErrorGlobal = null;

function avisar() {
  suscriptores.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('[TUPRIME] Error al re-renderizar:', e);
    }
  });
}

/**
 * Abre las suscripciones a la nube. Llamar una sola vez, después del login.
 * Devuelve una promesa que resuelve con la primera carga de datos, para poder
 * mostrar un estado de "cargando" hasta que lleguen.
 */
export function iniciar({ onError } = {}) {
  onErrorGlobal = onError || null;

  return new Promise((resolve) => {
    let resuelto = false;

    cancelarProductos = suscribirProductos(
      (lista) => {
        productos = lista;
        productosCargados = true;
        if (!resuelto) {
          resuelto = true;
          resolve();
        }
        avisar();
      },
      (error) => {
        const mensaje = mensajeDeError(error, 'No se pudieron cargar los productos.');
        if (onErrorGlobal) onErrorGlobal(mensaje);
        if (!resuelto) {
          resuelto = true;
          resolve();
        }
      }
    );
  });
}

export function detener() {
  if (cancelarProductos) cancelarProductos();
  cancelarProductos = null;
  productos = [];
  productosCargados = false;
  suscriptores.clear();
}

/** Lectura sincrónica de los productos ya sincronizados. */
export function getProductos() {
  return productos;
}

export function productosEstanCargados() {
  return productosCargados;
}

/**
 * Registra una función a llamar cada vez que cambian los datos.
 * Devuelve la función para darse de baja.
 */
export function alCambiar(cb) {
  suscriptores.add(cb);
  return () => suscriptores.delete(cb);
}
