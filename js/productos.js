// productos.js
// Responsabilidad única: lógica de negocio sobre productos
// (crear, editar, eliminar, buscar, filtrar y controlar stock).
//
// Las LECTURAS salen de store.js (caché en memoria sincronizada con la nube),
// por eso siguen siendo sincrónicas. Las ESCRITURAS van a Firestore y son async.

import { getProductos as productosEnCache, estanCargados as datosCargados } from './store.js';
import * as repo from './data/productosRepo.js';
import { mensajeDeError } from './firebase.js';

export const CATEGORIAS = ['Bebidas', 'Suplementos', 'Proteínas', 'Snacks', 'Accesorios', 'Otros'];

// Umbral por debajo del cual el stock se considera "bajo".
export const STOCK_BAJO_UMBRAL = 5;

const PRODUCTOS_INICIALES = [
  {
    nombre: 'Agua mineral 500ml',
    descripcion: 'Agua mineral sin gas, botella individual ideal para entrenar.',
    precio: 800,
    stock: 40,
    categoria: 'Bebidas',
    imagen: '',
  },
  {
    nombre: 'Bebida energética',
    descripcion: 'Bebida con cafeína y taurina para antes de entrenar.',
    precio: 1500,
    stock: 25,
    categoria: 'Bebidas',
    imagen: '',
  },
  {
    nombre: 'Proteína Whey 1kg',
    descripcion: 'Proteína de suero de leche sabor chocolate, 30 servicios.',
    precio: 18500,
    stock: 12,
    categoria: 'Proteínas',
    imagen: '',
  },
  {
    nombre: 'Creatina monohidratada 300g',
    descripcion: 'Creatina pura para fuerza y recuperación muscular.',
    precio: 9800,
    stock: 4,
    categoria: 'Suplementos',
    imagen: '',
  },
  {
    nombre: 'Barra de proteína',
    descripcion: 'Snack de 20g de proteína sabor maní y chocolate.',
    precio: 1200,
    stock: 60,
    categoria: 'Snacks',
    imagen: '',
  },
];

/**
 * Carga los productos de ejemplo la primera vez que se abre el sistema.
 * Es idempotente y transaccional: no puede duplicar datos aunque se abra el
 * sistema en dos dispositivos a la vez.
 */
export async function seedProductosIniciales() {
  try {
    const sembro = await repo.sembrarSiHaceFalta(PRODUCTOS_INICIALES);
    return { ok: true, sembro };
  } catch (e) {
    return { ok: false, message: mensajeDeError(e, 'No se pudieron cargar los productos iniciales.') };
  }
}

/* ---------------- Lecturas (sincrónicas, desde la caché) ---------------- */

export function listarProductos() {
  return productosEnCache();
}

export function estanCargados() {
  return datosCargados();
}

export function obtenerProducto(id) {
  return productosEnCache().find((p) => p.id === id) || null;
}

export function buscarYFiltrar({ texto = '', categoria = '' } = {}) {
  const t = texto.trim().toLowerCase();
  return productosEnCache().filter((p) => {
    const matchTexto = !t || p.nombre.toLowerCase().includes(t) || p.descripcion.toLowerCase().includes(t);
    const matchCategoria = !categoria || p.categoria === categoria;
    return matchTexto && matchCategoria;
  });
}

export function estadoStock(stock) {
  if (stock <= 0) return 'agotado';
  if (stock <= STOCK_BAJO_UMBRAL) return 'bajo';
  return 'normal';
}

/* ---------------- Escrituras (async, contra Firestore) ---------------- */

function normalizar(datos) {
  return {
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion.trim(),
    precio: Number(datos.precio),
    stock: Number(datos.stock),
    categoria: datos.categoria,
    imagen: datos.imagen || '',
  };
}

export async function crearProducto(datos) {
  const errores = validarProducto(datos);
  if (errores.length) return { ok: false, errores };

  try {
    const ref = await repo.crear(normalizar(datos));
    return { ok: true, id: ref.id };
  } catch (e) {
    return { ok: false, errores: [mensajeDeError(e, 'No se pudo crear el producto.')] };
  }
}

export async function editarProducto(id, datos) {
  const errores = validarProducto(datos);
  if (errores.length) return { ok: false, errores };

  if (!obtenerProducto(id)) return { ok: false, errores: ['Producto no encontrado.'] };

  try {
    await repo.actualizar(id, normalizar(datos));
    return { ok: true, id };
  } catch (e) {
    return { ok: false, errores: [mensajeDeError(e, 'No se pudo guardar el producto.')] };
  }
}

export async function eliminarProducto(id) {
  try {
    await repo.eliminar(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: mensajeDeError(e, 'No se pudo eliminar el producto.') };
  }
}


function validarProducto(datos) {
  const errores = [];
  if (!datos.nombre || !datos.nombre.trim()) errores.push('El nombre es obligatorio.');
  if (!datos.categoria || !CATEGORIAS.includes(datos.categoria)) errores.push('Seleccioná una categoría válida.');
  if (datos.precio === '' || datos.precio === null || isNaN(datos.precio) || Number(datos.precio) < 0) {
    errores.push('El precio debe ser un número mayor o igual a 0.');
  }
  if (datos.stock === '' || datos.stock === null || isNaN(datos.stock) || Number(datos.stock) < 0) {
    errores.push('El stock debe ser un número mayor o igual a 0.');
  }
  return errores;
}
