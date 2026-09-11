// ui.js
// Responsabilidad única: todo lo que toca el DOM del dashboard —
// renderizar productos/compras/estadísticas, abrir y cerrar modales,
// y mostrar mensajes (toasts). No contiene reglas de negocio.

import { CATEGORIAS, estadoStock } from './productos.js';
import { calcularSubtotal } from './compras.js';

/* ---------------- Utilidades de formato ---------------- */

export function formatMoney(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ---------------- Toasts ---------------- */

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ---------------- Modales ---------------- */

export function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

/* ---------------- Imagen de producto ---------------- */

function productImageMarkup(producto) {
  if (producto.imagen) {
    return `<img src="${producto.imagen}" alt="${escapeHTML(producto.nombre)}" onerror="this.parentElement.innerHTML='<span class=\\'placeholder-icon\\'>🏋️</span>'">`;
  }
  return `<span class="placeholder-icon">🏋️</span>`;
}

function stockChip(stock) {
  const estado = estadoStock(stock);
  if (estado === 'agotado') return `<span class="chip chip-danger">Agotado</span>`;
  if (estado === 'bajo') return `<span class="chip chip-warning">Stock bajo · ${stock}</span>`;
  return `<span class="chip chip-ok">Stock: ${stock}</span>`;
}

export function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---------------- Navegación entre secciones ---------------- */

export function activarSeccion(seccionId) {
  document.querySelectorAll('.section-view').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.remove('active'));
  document.getElementById(`view-${seccionId}`)?.classList.add('active');
  document.querySelector(`.nav-item[data-section="${seccionId}"]`)?.classList.add('active');
}

/* ---------------- Select de categorías (reutilizable) ---------------- */

export function poblarSelectCategorias(selectEl, incluirTodas = false) {
  selectEl.innerHTML = '';
  if (incluirTodas) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Todas las categorías';
    selectEl.appendChild(opt);
  }
  CATEGORIAS.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    selectEl.appendChild(opt);
  });
}

/* ---------------- Grilla de productos (sección Productos) ---------------- */

export function renderGrillaProductos(container, productos) {
  if (productos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📦</div>
        <p>No se encontraron productos con esos filtros.</p>
      </div>`;
    return;
  }

  container.innerHTML = productos.map((p) => `
    <article class="product-card" data-id="${p.id}">
      <div class="product-image">
        ${productImageMarkup(p)}
        <span class="product-category-tag">${escapeHTML(p.categoria)}</span>
        <span class="stock-badge">${stockChip(p.stock)}</span>
      </div>
      <div class="product-body">
        <h4>${escapeHTML(p.nombre)}</h4>
        <p class="desc">${escapeHTML(p.descripcion)}</p>
        <div class="product-meta-row">
          <span class="product-price">${formatMoney(p.precio)}</span>
        </div>
      </div>
      <div class="product-actions">
        <button class="btn btn-secondary btn-sm" data-action="editar-producto" data-id="${p.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-action="eliminar-producto" data-id="${p.id}">Eliminar</button>
        <button class="btn btn-primary btn-sm" data-action="comprar-producto" data-id="${p.id}">Comprar</button>
      </div>
    </article>
  `).join('');
}

/* ---------------- Catálogo compacto (sección Nueva compra) ---------------- */

export function renderCatalogoCompra(container, productos) {
  if (productos.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No hay productos disponibles.</p></div>`;
    return;
  }
  container.innerHTML = productos.map((p) => `
    <div class="mini-product" data-id="${p.id}">
      <div class="mini-product-img">${productImageMarkup(p)}</div>
      <div class="mini-product-info">
        <div class="n">${escapeHTML(p.nombre)}</div>
        <div class="p">${formatMoney(p.precio)} · ${stockChip(p.stock)}</div>
      </div>
      <input type="number" min="1" value="1" class="qty-input" style="width:60px" ${p.stock === 0 ? 'disabled' : ''}>
      <button class="btn btn-primary btn-sm" data-action="agregar-carrito" data-id="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>Agregar</button>
    </div>
  `).join('');
}

/* ---------------- Carrito ---------------- */

export function renderCarrito(container, totalEl, carrito) {
  if (carrito.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:24px 8px;"><p>Agregá productos al carrito.</p></div>`;
  } else {
    container.innerHTML = carrito.map((item) => `
      <div class="cart-item" data-id="${item.productoId}">
        <span class="ci-name" title="${escapeHTML(item.nombre)}">${escapeHTML(item.nombre)}</span>
        <span class="ci-qty">
          <button data-action="carrito-menos" data-id="${item.productoId}">−</button>
          <span>${item.cantidad}</span>
          <button data-action="carrito-mas" data-id="${item.productoId}">+</button>
        </span>
        <span class="ci-sub">${formatMoney(calcularSubtotal(item))}</span>
        <button class="ci-remove" data-action="carrito-quitar" data-id="${item.productoId}">✕</button>
      </div>
    `).join('');
  }
  const total = carrito.reduce((acc, i) => acc + calcularSubtotal(i), 0);
  totalEl.textContent = formatMoney(total);
}

/* ---------------- Historial de compras ---------------- */

export function renderHistorial(tbody, compras) {
  if (compras.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">🧾</div><p>Todavía no hay compras registradas.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = compras.map((c) => `
    <tr data-id="${c.id}">
      <td>#${c.id}</td>
      <td>${formatDate(c.fecha)}</td>
      <td>${c.items.length} producto(s)</td>
      <td>${c.items.reduce((a, i) => a + i.cantidad, 0)} unidad(es)</td>
      <td><strong>${formatMoney(c.total)}</strong></td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="btn btn-secondary btn-sm" data-action="ver-compra" data-id="${c.id}">Ver detalle</button>
        <button class="btn btn-danger btn-sm" data-action="eliminar-compra" data-id="${c.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

export function renderDetalleCompra(container, compra) {
  container.innerHTML = `
    <div class="form-row"><strong>Compra #${compra.id}</strong></div>
    <div class="form-row" style="color:var(--text-lo); font-size:13px;">${formatDate(compra.fecha)}</div>
    <div class="panel" style="padding:0; margin-top:12px;">
      ${compra.items.map((i) => `
        <div class="list-row" style="padding:12px 16px;">
          <div>
            <div class="rname">${escapeHTML(i.nombre)}</div>
            <div class="rmeta">${i.cantidad} × ${formatMoney(i.precioUnitario)}</div>
          </div>
          <strong>${formatMoney(i.subtotal)}</strong>
        </div>
      `).join('')}
    </div>
    <div class="cart-total-row" style="border-top:1px solid var(--line); margin-top:12px;">
      <span class="t-label">Total</span>
      <span class="t-value">${formatMoney(compra.total)}</span>
    </div>
  `;
}

/* ---------------- Estadísticas / Inicio ---------------- */

export function renderStatCards(container, stats) {
  container.innerHTML = `
    <div class="stat-card">
      <div class="label">Ventas totales</div>
      <div class="value accent">${formatMoney(stats.ventasTotales)}</div>
    </div>
    <div class="stat-card">
      <div class="label">Compras realizadas</div>
      <div class="value">${stats.cantidadCompras}</div>
    </div>
    <div class="stat-card">
      <div class="label">Producto más vendido</div>
      <div class="value" style="font-size:20px;">${stats.productoMasVendido ? escapeHTML(stats.productoMasVendido) : '—'}</div>
      <div class="sub">${stats.productoMasVendido ? stats.unidadesProductoMasVendido + ' unidades vendidas' : 'Sin ventas todavía'}</div>
    </div>
    <div class="stat-card">
      <div class="label">Unidades en stock</div>
      <div class="value">${stats.cantidadTotalProductos}</div>
      <div class="sub">${stats.totalReferenciasProductos} producto(s) distintos</div>
    </div>
  `;
}

export function renderProductosPocoStock(container, productos) {
  if (productos.length === 0) {
    container.innerHTML = `<p style="color:var(--text-lo); font-size:14px;">Todos los productos tienen stock saludable.</p>`;
    return;
  }
  container.innerHTML = productos.map((p) => `
    <div class="list-row">
      <div>
        <div class="rname">${escapeHTML(p.nombre)}</div>
        <div class="rmeta">${escapeHTML(p.categoria)}</div>
      </div>
      ${stockChip(p.stock)}
    </div>
  `).join('');
}

export function renderUltimasCompras(container, compras) {
  const ultimas = compras.slice(0, 5);
  if (ultimas.length === 0) {
    container.innerHTML = `<p style="color:var(--text-lo); font-size:14px;">Todavía no hay compras registradas.</p>`;
    return;
  }
  container.innerHTML = ultimas.map((c) => `
    <div class="list-row">
      <div>
        <div class="rname">Compra #${c.id}</div>
        <div class="rmeta">${formatDate(c.fecha)}</div>
      </div>
      <strong>${formatMoney(c.total)}</strong>
    </div>
  `).join('');
}
