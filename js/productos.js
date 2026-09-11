// productos.js
// Responsabilidad única: lógica de negocio sobre productos
// (crear, editar, eliminar, buscar, filtrar y controlar stock).

import { getProductos, saveProductos, getNextProductId, isSeeded, markSeeded } from './storage.js';

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

/** Carga los productos de ejemplo la primera vez que se abre el sistema. */
export function seedProductosIniciales() {
  if (isSeeded()) return;
  const productos = PRODUCTOS_INICIALES.map((p) => ({ id: getNextProductId(), ...p }));
  saveProductos(productos);
  markSeeded();
}

export function listarProductos() {
  return getProductos();
}

export function obtenerProducto(id) {
  return getProductos().find((p) => p.id === id) || null;
}

/**
 * Crea un producto nuevo. `datos` debe incluir nombre, descripcion, precio,
 * stock, categoria e imagen (imagen puede ser '' para usar el placeholder).
 */
export function crearProducto(datos) {
  const errores = validarProducto(datos);
  if (errores.length) return { ok: false, errores };

  const productos = getProductos();
  const nuevo = {
    id: getNextProductId(),
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion.trim(),
    precio: Number(datos.precio),
    stock: Number(datos.stock),
    categoria: datos.categoria,
    imagen: datos.imagen || '',
  };
  productos.push(nuevo);
  saveProductos(productos);
  return { ok: true, producto: nuevo };
}

export function editarProducto(id, datos) {
  const errores = validarProducto(datos);
  if (errores.length) return { ok: false, errores };

  const productos = getProductos();
  const idx = productos.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, errores: ['Producto no encontrado.'] };

  productos[idx] = {
    ...productos[idx],
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion.trim(),
    precio: Number(datos.precio),
    stock: Number(datos.stock),
    categoria: datos.categoria,
    imagen: datos.imagen || '',
  };
  saveProductos(productos);
  return { ok: true, producto: productos[idx] };
}

export function eliminarProducto(id) {
  const productos = getProductos().filter((p) => p.id !== id);
  saveProductos(productos);
  return { ok: true };
}

/** Descuenta stock tras una compra confirmada. No valida negativos (eso lo hace compras.js antes). */
export function descontarStock(id, cantidad) {
  const productos = getProductos();
  const idx = productos.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  productos[idx].stock = Math.max(0, productos[idx].stock - cantidad);
  saveProductos(productos);
  return true;
}

export function buscarYFiltrar({ texto = '', categoria = '' } = {}) {
  const t = texto.trim().toLowerCase();
  return getProductos().filter((p) => {
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
