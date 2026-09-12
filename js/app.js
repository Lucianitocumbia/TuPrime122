// app.js
// Responsabilidad única: inicializar el dashboard, cargar datos al arrancar
// y coordinar la comunicación entre auth.js, productos.js, compras.js y ui.js.
// No contiene reglas de negocio propias ni manipula localStorage directamente.

import { requireAuth, logout } from './auth.js';
import { iniciar as iniciarStore, alCambiar } from './store.js';
import { comprimirImagen } from './imagen.js';
import {
  seedProductosIniciales, listarProductos, buscarYFiltrar,
  obtenerProducto, crearProducto, editarProducto, eliminarProducto,
} from './productos.js';
import {
  obtenerCarrito, agregarAlCarrito, actualizarCantidadCarrito, quitarDelCarrito,
  confirmarCompra, listarCompras, buscarYFiltrarCompras, obtenerCompra, eliminarCompra,
  calcularEstadisticas,
} from './compras.js';
import {
  showToast, openModal, closeModal, activarSeccion, poblarSelectCategorias,
  renderGrillaProductos, renderCatalogoCompra, renderCarrito, renderHistorial,
  renderDetalleCompra, renderStatCards, renderProductosPocoStock, renderUltimasCompras,
} from './ui.js';

/* ---------------- Estado de UI que no necesita persistir ---------------- */

let filtroProductos = { texto: '', categoria: '' };
let filtroCompra = { texto: '' };
let filtroHistorial = { texto: '', fecha: '' };
let idProductoAEliminar = null;
let idCompraAEliminar = null;

/* ---------------- Arranque ---------------- */

async function init() {
  // requireAuth es asíncrona: Firebase necesita un instante para leer la sesión
  // guardada en el navegador. Si no hay sesión válida, ya redirigió al login.
  const perfil = await requireAuth();
  if (!perfil) return;

  document.getElementById('user-name').textContent = perfil.nombre;
  document.getElementById('user-avatar').textContent = perfil.nombre.slice(0, 1).toUpperCase();
  document.getElementById('config-usuario').textContent = perfil.email;

  poblarSelectCategorias(document.getElementById('pf-categoria'), false);
  poblarSelectCategorias(document.getElementById('prod-filtro-categoria'), true);

  wireNavegacion();
  wireLogout();
  wireProductos();
  wireNuevaCompra();
  wireHistorial();
  wireConfiguracion();

  mostrarCargando();

  // Abre la suscripción en tiempo real y espera a que lleguen los datos.
  await iniciarStore({ onError: (mensaje) => showToast(mensaje, 'error') });

  const seed = await seedProductosIniciales();
  if (!seed.ok) showToast(seed.message, 'error');

  // Cualquier cambio en la nube — propio o de otro dispositivo — repinta solo.
  alCambiar(renderTodo);

  renderTodo();
}

function renderTodo() {
  renderInicio();
  renderVistaProductos();
  renderVistaNuevaCompra();
  renderVistaHistorial();
  renderVistaEstadisticas();
}

function mostrarCargando() {
  document.getElementById('productos-grid').innerHTML =
    '<div class="empty-state"><p>Cargando productos…</p></div>';
  document.getElementById('historial-body').innerHTML =
    '<tr><td colspan="6"><div class="empty-state"><p>Cargando compras…</p></div></td></tr>';
}

/* ---------------- Navegación ---------------- */

function wireNavegacion() {
  document.querySelectorAll('.nav-item[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const seccion = btn.dataset.section;
      activarSeccion(seccion);
      cerrarSidebarMobile();
      if (seccion === 'inicio') renderInicio();
      if (seccion === 'productos') renderVistaProductos();
      if (seccion === 'nueva-compra') renderVistaNuevaCompra();
      if (seccion === 'historial') renderVistaHistorial();
      if (seccion === 'estadisticas') renderVistaEstadisticas();
    });
  });

  document.getElementById('btn-open-sidebar')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-scrim').classList.add('open');
  });
  document.getElementById('sidebar-scrim')?.addEventListener('click', cerrarSidebarMobile);
}

function cerrarSidebarMobile() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-scrim')?.classList.remove('open');
}

function wireLogout() {
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-logout-config').addEventListener('click', logout);
}

/* Cierre genérico de modales (botón X y botón "Cancelar") */
document.addEventListener('click', (e) => {
  const closeTarget = e.target.closest('[data-close-modal]');
  if (closeTarget) closeModal(closeTarget.dataset.closeModal);
});

/* ==================== INICIO ==================== */

function renderInicio() {
  const stats = calcularEstadisticas();
  renderStatCards(document.getElementById('inicio-stats'), stats);
  renderUltimasCompras(document.getElementById('inicio-ultimas-compras'), listarCompras());
  renderProductosPocoStock(document.getElementById('inicio-poco-stock'), stats.productosConPocoStock);
}

/* ==================== PRODUCTOS ==================== */

function renderVistaProductos() {
  const productos = buscarYFiltrar(filtroProductos);
  renderGrillaProductos(document.getElementById('productos-grid'), productos);
}

function wireProductos() {
  document.getElementById('prod-buscar').addEventListener('input', (e) => {
    filtroProductos.texto = e.target.value;
    renderVistaProductos();
  });
  document.getElementById('prod-filtro-categoria').addEventListener('change', (e) => {
    filtroProductos.categoria = e.target.value;
    renderVistaProductos();
  });

  document.getElementById('btn-nuevo-producto').addEventListener('click', () => abrirModalProducto(null));

  document.getElementById('pf-imagen-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // La imagen viaja dentro del documento de Firestore, que tiene un tope de
    // 1 MiB: se redimensiona y recomprime en el navegador antes de guardarla.
    const resultado = await comprimirImagen(file);
    if (!resultado.ok) {
      showToast(resultado.message, 'error');
      e.target.value = '';
      return;
    }

    document.getElementById('pf-imagen').value = resultado.dataURL;
    document.getElementById('pf-imagen-url').value = '';
    actualizarPreviewImagen(resultado.dataURL);
  });

  document.getElementById('pf-imagen-url').addEventListener('input', (e) => {
    document.getElementById('pf-imagen').value = e.target.value;
    document.getElementById('pf-imagen-file').value = '';
    actualizarPreviewImagen(e.target.value);
  });

  document.getElementById('pf-imagen-quitar').addEventListener('click', () => {
    document.getElementById('pf-imagen').value = '';
    document.getElementById('pf-imagen-url').value = '';
    document.getElementById('pf-imagen-file').value = '';
    actualizarPreviewImagen('');
  });

  document.getElementById('productos-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.dataset.action === 'editar-producto') abrirModalProducto(id);
    if (btn.dataset.action === 'eliminar-producto') {
      idProductoAEliminar = id;
      openModal('modal-confirmar-eliminar');
    }
    if (btn.dataset.action === 'comprar-producto') {
      const resultado = agregarAlCarrito(id, 1);
      if (!resultado.ok) {
        showToast(resultado.message, 'error');
        return;
      }
      activarSeccion('nueva-compra');
      document.querySelector('.nav-item[data-section="nueva-compra"]').classList.add('active');
      document.querySelector('.nav-item[data-section="productos"]').classList.remove('active');
      renderVistaNuevaCompra();
      showToast('Producto agregado al carrito.', 'success');
    }
  });

  document.getElementById('btn-confirmar-eliminar-producto').addEventListener('click', async (e) => {
    if (idProductoAEliminar === null) return;
    const boton = e.currentTarget;
    boton.disabled = true;
    try {
      const resultado = await eliminarProducto(idProductoAEliminar);
      if (!resultado.ok) {
        showToast(resultado.message, 'error');
        return;
      }
      showToast('Producto eliminado.', 'success');
      idProductoAEliminar = null;
      closeModal('modal-confirmar-eliminar');
      // No hace falta re-renderizar: el onSnapshot del store lo dispara solo.
    } finally {
      boton.disabled = false;
    }
  });

  document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = leerFormularioProducto();
    const id = document.getElementById('pf-id').value;

    const boton = e.target.querySelector('button[type="submit"]');
    const textoOriginal = boton ? boton.textContent : '';
    if (boton) { boton.disabled = true; boton.textContent = 'Guardando…'; }

    try {
      const resultado = id ? await editarProducto(id, datos) : await crearProducto(datos);

      if (!resultado.ok) {
        showToast(resultado.errores.join(' '), 'error');
        return;
      }

      showToast(id ? 'Producto actualizado.' : 'Producto creado.', 'success');
      closeModal('modal-producto');
      // El re-render llega solo por el onSnapshot del store.
    } finally {
      if (boton) { boton.disabled = false; boton.textContent = textoOriginal; }
    }
  });
}

function abrirModalProducto(id) {
  const form = document.getElementById('form-producto');
  form.reset();
  document.getElementById('pf-id').value = '';
  document.getElementById('pf-imagen').value = '';
  document.getElementById('pf-imagen-url').value = '';
  actualizarPreviewImagen('');
  document.getElementById('modal-producto-titulo').textContent = id ? 'Editar producto' : 'Nuevo producto';

  if (id) {
    const p = obtenerProducto(id);
    if (!p) return;
    document.getElementById('pf-id').value = p.id;
    document.getElementById('pf-nombre').value = p.nombre;
    document.getElementById('pf-descripcion').value = p.descripcion;
    document.getElementById('pf-precio').value = p.precio;
    document.getElementById('pf-stock').value = p.stock;
    document.getElementById('pf-categoria').value = p.categoria;
    document.getElementById('pf-imagen').value = p.imagen || '';
    // Si la imagen guardada es una URL (no un archivo subido en base64),
    // se muestra también en el campo de texto para poder editarla.
    if (p.imagen && !p.imagen.startsWith('data:')) {
      document.getElementById('pf-imagen-url').value = p.imagen;
    }
    actualizarPreviewImagen(p.imagen || '');
  }
  openModal('modal-producto');
}

function actualizarPreviewImagen(src) {
  const preview = document.getElementById('pf-imagen-preview');
  preview.innerHTML = src
    ? `<img src="${src}" alt="Vista previa" onerror="this.parentElement.innerHTML='<span class=\\'placeholder-icon\\'>🏋️</span>'">`
    : `<span class="placeholder-icon">🏋️</span>`;
}

function leerFormularioProducto() {
  return {
    nombre: document.getElementById('pf-nombre').value,
    descripcion: document.getElementById('pf-descripcion').value,
    precio: document.getElementById('pf-precio').value,
    stock: document.getElementById('pf-stock').value,
    categoria: document.getElementById('pf-categoria').value,
    imagen: document.getElementById('pf-imagen').value,
  };
}

/* ==================== NUEVA COMPRA ==================== */

function renderVistaNuevaCompra() {
  const productos = buscarYFiltrar({ texto: filtroCompra.texto });
  renderCatalogoCompra(document.getElementById('compra-catalogo'), productos);
  renderCarritoActual();
}

function renderCarritoActual() {
  renderCarrito(
    document.getElementById('carrito-items'),
    document.getElementById('carrito-total'),
    obtenerCarrito()
  );
}

function wireNuevaCompra() {
  document.getElementById('compra-buscar').addEventListener('input', (e) => {
    filtroCompra.texto = e.target.value;
    renderVistaNuevaCompra();
  });

  document.getElementById('compra-catalogo').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="agregar-carrito"]');
    if (!btn) return;
    const id = btn.dataset.id;
    const fila = btn.closest('.mini-product');
    const cantidad = Number(fila.querySelector('.qty-input').value) || 1;

    const resultado = agregarAlCarrito(id, cantidad);
    if (!resultado.ok) {
      showToast(resultado.message, 'error');
      return;
    }
    showToast('Producto agregado al carrito.', 'success');
    renderCarritoActual();
  });

  document.getElementById('carrito-items').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const item = obtenerCarrito().find((i) => i.productoId === id);
    if (!item) return;

    if (btn.dataset.action === 'carrito-mas') {
      const r = actualizarCantidadCarrito(id, item.cantidad + 1);
      if (!r.ok) showToast(r.message, 'error');
    }
    if (btn.dataset.action === 'carrito-menos') {
      actualizarCantidadCarrito(id, item.cantidad - 1);
    }
    if (btn.dataset.action === 'carrito-quitar') {
      quitarDelCarrito(id);
    }
    renderCarritoActual();
  });

  document.getElementById('btn-confirmar-compra').addEventListener('click', async (e) => {
    const boton = e.currentTarget;
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Confirmando…';

    try {
      const resultado = await confirmarCompra();
      if (!resultado.ok) {
        showToast(resultado.message, 'error');
        return;
      }
      showToast(`Compra #${resultado.compra.numero} confirmada.`, 'success');
    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });
}

/* ==================== HISTORIAL ==================== */

function renderVistaHistorial() {
  const compras = buscarYFiltrarCompras(filtroHistorial);
  renderHistorial(document.getElementById('historial-body'), compras);
}

function wireHistorial() {
  document.getElementById('hist-buscar').addEventListener('input', (e) => {
    filtroHistorial.texto = e.target.value;
    renderVistaHistorial();
  });
  document.getElementById('hist-filtro-fecha').addEventListener('change', (e) => {
    filtroHistorial.fecha = e.target.value;
    renderVistaHistorial();
  });

  document.getElementById('historial-body').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.dataset.action === 'ver-compra') {
      const compra = obtenerCompra(id);
      if (!compra) return;
      renderDetalleCompra(document.getElementById('detalle-compra-body'), compra);
      openModal('modal-detalle-compra');
    }
    if (btn.dataset.action === 'eliminar-compra') {
      idCompraAEliminar = id;
      openModal('modal-confirmar-eliminar-compra');
    }
  });

  document.getElementById('btn-confirmar-eliminar-compra').addEventListener('click', async (e) => {
    if (idCompraAEliminar === null) return;
    const boton = e.currentTarget;
    boton.disabled = true;
    try {
      const resultado = await eliminarCompra(idCompraAEliminar);
      if (!resultado.ok) {
        showToast(resultado.message, 'error');
        return;
      }
      showToast('Compra eliminada del historial.', 'success');
      idCompraAEliminar = null;
      closeModal('modal-confirmar-eliminar-compra');
      // El re-render llega solo por el onSnapshot del store.
    } finally {
      boton.disabled = false;
    }
  });
}

/* ==================== ESTADÍSTICAS ==================== */

function renderVistaEstadisticas() {
  const stats = calcularEstadisticas();
  renderStatCards(document.getElementById('stats-cards'), stats);
  renderProductosPocoStock(document.getElementById('stats-poco-stock'), stats.productosConPocoStock);
}

/* ==================== CONFIGURACIÓN ==================== */

function wireConfiguracion() {
  document.getElementById('btn-exportar-datos').addEventListener('click', () => {
    const datos = { productos: listarProductos(), compras: listarCompras() };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gimnasio-datos.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Datos exportados.', 'success');
  });

  // Los productos ya viven en la nube: este botón borraba claves de
  // localStorage que ya no mandan, así que reiniciarlos sería engañoso (y en
  // la nube, destructivo). Queda deshabilitado hasta la fase 4, donde se rehace
  // como "restablecer datos del gimnasio" con su propia confirmación.
  const btnReiniciar = document.getElementById('btn-reiniciar-datos');
  btnReiniciar.disabled = true;
  btnReiniciar.title = 'Disponible cuando termine la migración a la nube.';
  btnReiniciar.addEventListener('click', () => {
    showToast('Los productos ahora están en la nube. Esta opción vuelve al terminar la migración.', 'error');
  });
}

init();
