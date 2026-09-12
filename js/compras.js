// compras.js
// Responsabilidad única: carrito de la compra en curso, confirmación de
// compras, descuento de stock asociado y cálculo de estadísticas de venta.
//
// El historial vive en Firestore. Las LECTURAS salen de store.js (caché
// sincronizada en tiempo real) y siguen siendo sincrónicas; sólo confirmar y
// eliminar son async.

import { getCompras as comprasEnCache } from './store.js';
import * as repo from './data/comprasRepo.js';
import { obtenerProducto, listarProductos, estadoStock } from './productos.js';
import { getCurrentUser } from './auth.js';
import { mensajeDeError } from './firebase.js';

// Carrito en memoria: se reinicia cada vez que se confirma una compra
// o se recarga la página (no necesita persistir, sólo la compra final).
let carrito = []; // [{ productoId, nombre, precioUnitario, cantidad }]

export function obtenerCarrito() {
  return carrito;
}

export function vaciarCarrito() {
  carrito = [];
}

/** Agrega un producto al carrito validando stock disponible. */
export function agregarAlCarrito(productoId, cantidad) {
  const producto = obtenerProducto(productoId);
  if (!producto) return { ok: false, message: 'El producto no existe.' };
  if (cantidad <= 0) return { ok: false, message: 'La cantidad debe ser mayor a 0.' };

  const yaEnCarrito = carrito.find((i) => i.productoId === productoId);
  const cantidadTotal = (yaEnCarrito ? yaEnCarrito.cantidad : 0) + cantidad;

  if (cantidadTotal > producto.stock) {
    return { ok: false, message: `Stock insuficiente. Disponible: ${producto.stock}.` };
  }

  if (yaEnCarrito) {
    yaEnCarrito.cantidad = cantidadTotal;
  } else {
    carrito.push({
      productoId,
      nombre: producto.nombre,
      precioUnitario: producto.precio,
      cantidad,
    });
  }
  return { ok: true };
}

export function actualizarCantidadCarrito(productoId, cantidad) {
  const producto = obtenerProducto(productoId);
  const item = carrito.find((i) => i.productoId === productoId);
  if (!item || !producto) return { ok: false, message: 'Producto no encontrado en el carrito.' };
  if (cantidad <= 0) {
    quitarDelCarrito(productoId);
    return { ok: true };
  }
  if (cantidad > producto.stock) {
    return { ok: false, message: `Stock insuficiente. Disponible: ${producto.stock}.` };
  }
  item.cantidad = cantidad;
  return { ok: true };
}

export function quitarDelCarrito(productoId) {
  carrito = carrito.filter((i) => i.productoId !== productoId);
}

export function calcularSubtotal(item) {
  return item.precioUnitario * item.cantidad;
}

export function calcularTotalCarrito() {
  return carrito.reduce((acc, item) => acc + calcularSubtotal(item), 0);
}

/**
 * Confirma la compra actual.
 *
 * La validación de stock que hacemos acá es sólo para dar un mensaje rápido:
 * la que vale es la que corre en el servidor dentro de la transacción, porque
 * entre que esta pantalla leyó el stock y confirma, otro vendedor pudo haber
 * vendido lo mismo. Si el servidor rechaza, la compra no se registra y el
 * stock no se toca.
 */
export async function confirmarCompra() {
  if (carrito.length === 0) {
    return { ok: false, message: 'El carrito está vacío.' };
  }

  for (const item of carrito) {
    const producto = obtenerProducto(item.productoId);
    if (!producto || producto.stock < item.cantidad) {
      return { ok: false, message: `Sin stock suficiente para "${item.nombre}".` };
    }
  }

  const usuario = getCurrentUser();
  const items = carrito.map((i) => ({
    productoId: i.productoId,
    nombre: i.nombre,
    precioUnitario: i.precioUnitario,
    cantidad: i.cantidad,
    subtotal: calcularSubtotal(i),
  }));

  try {
    const compra = await repo.crearCompra({
      items,
      total: calcularTotalCarrito(),
      usuarioId: usuario ? usuario.uid : null,
      usuarioEmail: usuario ? usuario.email : null,
    });

    vaciarCarrito();
    return { ok: true, compra };
  } catch (e) {
    // Sin stock es una situación esperable, no una falla: su mensaje ya viene
    // redactado para el usuario y no hace falta traducirlo.
    if (e && e.codigo === repo.SIN_STOCK) {
      return { ok: false, message: e.message };
    }
    return { ok: false, message: mensajeDeError(e, 'No se pudo registrar la compra.') };
  }
}

/* ---------------- Lecturas (sincrónicas, desde la caché) ---------------- */

export function listarCompras() {
  return comprasEnCache();
}

export function obtenerCompra(id) {
  return comprasEnCache().find((c) => c.id === id) || null;
}

export function buscarYFiltrarCompras({ texto = '', fecha = '' } = {}) {
  const t = texto.trim().toLowerCase();
  return comprasEnCache().filter((c) => {
    const matchTexto =
      !t || c.items.some((i) => i.nombre.toLowerCase().includes(t)) || String(c.numero).includes(t);
    const matchFecha = !fecha || c.fecha.slice(0, 10) === fecha;
    return matchTexto && matchFecha;
  });
}

/* ---------------- Escrituras ---------------- */

export async function eliminarCompra(id) {
  try {
    await repo.eliminar(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: mensajeDeError(e, 'No se pudo eliminar la compra.') };
  }
}

/* ---------------- Estadísticas ---------------- */

export function calcularEstadisticas() {
  const compras = comprasEnCache();
  const productos = listarProductos();

  const ventasTotales = compras.reduce((acc, c) => acc + c.total, 0);
  const cantidadCompras = compras.length;

  const ventasPorProducto = {};
  compras.forEach((c) => {
    c.items.forEach((i) => {
      ventasPorProducto[i.nombre] = (ventasPorProducto[i.nombre] || 0) + i.cantidad;
    });
  });

  let productoMasVendido = null;
  let maxVendido = 0;
  Object.entries(ventasPorProducto).forEach(([nombre, cantidad]) => {
    if (cantidad > maxVendido) {
      maxVendido = cantidad;
      productoMasVendido = nombre;
    }
  });

  const productosConPocoStock = productos.filter((p) => estadoStock(p.stock) !== 'normal');
  const cantidadTotalProductos = productos.reduce((acc, p) => acc + p.stock, 0);

  return {
    ventasTotales,
    cantidadCompras,
    productoMasVendido,
    unidadesProductoMasVendido: maxVendido,
    productosConPocoStock,
    cantidadTotalProductos,
    totalReferenciasProductos: productos.length,
  };
}
