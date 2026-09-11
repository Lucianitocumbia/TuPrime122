// compras.js
// Responsabilidad única: carrito de la compra en curso, confirmación de
// compras, descuento de stock asociado y cálculo de estadísticas de venta.

import { getCompras, saveCompras, getNextPurchaseId } from './storage.js';
import { obtenerProducto, descontarStock, listarProductos, estadoStock } from './productos.js';

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
 * Confirma la compra actual: valida stock una última vez, la guarda en
 * localStorage, descuenta stock de cada producto y vacía el carrito.
 */
export function confirmarCompra() {
  if (carrito.length === 0) {
    return { ok: false, message: 'El carrito está vacío.' };
  }

  // Revalidación de stock por si cambió desde que se agregó al carrito.
  for (const item of carrito) {
    const producto = obtenerProducto(item.productoId);
    if (!producto || producto.stock < item.cantidad) {
      return { ok: false, message: `Sin stock suficiente para "${item.nombre}".` };
    }
  }

  const compra = {
    id: getNextPurchaseId(),
    fecha: new Date().toISOString(),
    items: carrito.map((i) => ({
      productoId: i.productoId,
      nombre: i.nombre,
      precioUnitario: i.precioUnitario,
      cantidad: i.cantidad,
      subtotal: calcularSubtotal(i),
    })),
    total: calcularTotalCarrito(),
  };

  const compras = getCompras();
  compras.unshift(compra);
  saveCompras(compras);

  carrito.forEach((item) => descontarStock(item.productoId, item.cantidad));
  vaciarCarrito();

  return { ok: true, compra };
}

export function listarCompras() {
  return getCompras();
}

export function obtenerCompra(id) {
  return getCompras().find((c) => c.id === id) || null;
}

export function eliminarCompra(id) {
  const compras = getCompras().filter((c) => c.id !== id);
  saveCompras(compras);
  return { ok: true };
}

export function buscarYFiltrarCompras({ texto = '', fecha = '' } = {}) {
  const t = texto.trim().toLowerCase();
  return getCompras().filter((c) => {
    const matchTexto = !t || c.items.some((i) => i.nombre.toLowerCase().includes(t)) || String(c.id).includes(t);
    const matchFecha = !fecha || c.fecha.slice(0, 10) === fecha;
    return matchTexto && matchFecha;
  });
}

/* ---------------- Estadísticas ---------------- */

export function calcularEstadisticas() {
  const compras = getCompras();
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
