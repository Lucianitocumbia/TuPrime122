// store.js
// Responsabilidad única: mantener en memoria una copia de los datos de la nube,
// sincronizada en tiempo real, y avisar a quien quiera re-renderizar.
//
// Por qué existe: gracias a esta caché, leer productos y compras sigue siendo
// SÍNCRONO (listarProductos, buscarYFiltrar, calcularEstadisticas...). Sólo las
// escrituras son async. Además hay una sola suscripción por colección en vez de
// una lectura por cada render, y si otro dispositivo vende algo, la pantalla se
// actualiza sola.

import { suscribirProductos } from './data/productosRepo.js';
import { suscribirCompras } from './data/comprasRepo.js';
import { mensajeDeError } from './firebase.js';

let productos = [];
let compras = [];
let datosCargados = false;

const cancelaciones = [];
const suscriptores = new Set();

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
 * La promesa resuelve cuando llegaron las primeras tandas de productos y
 * compras, para poder mostrar un estado de "cargando" hasta entonces.
 */
export function iniciar({ onError } = {}) {
  const avisarError = (mensaje) => {
    if (onError) onError(mensaje);
  };

  const primeraCargaProductos = new Promise((resolve) => {
    let resuelto = false;
    const listo = () => {
      if (!resuelto) {
        resuelto = true;
        resolve();
      }
    };

    cancelaciones.push(
      suscribirProductos(
        (lista) => {
          productos = lista;
          listo();
          avisar();
        },
        (error) => {
          avisarError(mensajeDeError(error, 'No se pudieron cargar los productos.'));
          listo();
        }
      )
    );
  });

  const primeraCargaCompras = new Promise((resolve) => {
    let resuelto = false;
    const listo = () => {
      if (!resuelto) {
        resuelto = true;
        resolve();
      }
    };

    cancelaciones.push(
      suscribirCompras(
        (lista) => {
          compras = lista;
          listo();
          avisar();
        },
        (error) => {
          avisarError(mensajeDeError(error, 'No se pudo cargar el historial de compras.'));
          listo();
        }
      )
    );
  });

  return Promise.all([primeraCargaProductos, primeraCargaCompras]).then(() => {
    datosCargados = true;
  });
}

export function detener() {
  cancelaciones.forEach((cancelar) => cancelar());
  cancelaciones.length = 0;
  productos = [];
  compras = [];
  datosCargados = false;
  suscriptores.clear();
}

/* ---------------- Lecturas sincrónicas ---------------- */

export function getProductos() {
  return productos;
}

export function getCompras() {
  return compras;
}

export function estanCargados() {
  return datosCargados;
}

/**
 * Registra una función a llamar cada vez que cambian los datos.
 * Devuelve la función para darse de baja.
 */
export function alCambiar(cb) {
  suscriptores.add(cb);
  return () => suscriptores.delete(cb);
}
