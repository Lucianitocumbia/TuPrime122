# TUPRIME — Sistema de gestión de ventas para gimnasio

Aplicación web 100% frontend (HTML + CSS + JavaScript Vanilla, con módulos
ES6). No requiere backend ni instalación: todos los datos se guardan en el
`localStorage` del navegador.

## Cómo abrirlo

Los módulos de JavaScript (`import`/`export`) requieren que el sitio se sirva
por `http://`, no por `file://`. Para probarlo localmente, desde la carpeta
`gimnasio/` ejecutá un servidor simple, por ejemplo:

```bash
python3 -m http.server 8000
```

Y abrí `http://localhost:8000/index.html` en el navegador.

**Usuario de prueba:** `123` / **Contraseña:** `123`

## Estructura del proyecto

```
gimnasio/
├── index.html          → Pantalla de login
├── dashboard.html       → Panel principal (todas las secciones)
├── css/
│   ├── style.css         → Tokens de diseño, reset y componentes globales
│   ├── login.css         → Estilos de la pantalla de login
│   ├── dashboard.css     → Layout del panel (sidebar, secciones, tablas)
│   └── productos.css     → Tarjetas de producto y carrito de compra
├── js/
│   ├── storage.js        → Único módulo que toca localStorage (CRUD genérico)
│   ├── auth.js            → Login, logout y protección de rutas
│   ├── productos.js       → Reglas de negocio de productos (alta/baja/edición/filtros)
│   ├── compras.js         → Carrito, confirmación de compra y estadísticas
│   ├── ui.js               → Renderizado del DOM, modales y mensajes (toasts)
│   └── app.js              → Inicialización y conexión entre todos los módulos
└── img/productos/         → Carpeta reservada para imágenes reales de productos
```

## Cómo agregar un nuevo producto

1. Iniciá sesión y andá a la sección **Productos**.
2. Hacé clic en **"＋ Nuevo producto"**.
3. Completá nombre, descripción, precio, stock y categoría.
4. En **"URL de imagen"** podés pegar un enlace a una imagen (ver más abajo)
   o dejarlo vacío: en ese caso se muestra un ícono genérico de gimnasio.
5. Guardá. El producto aparece de inmediato en el catálogo y en Nueva compra.

## Cómo editar nombre, descripción, precio, stock o imagen

1. En **Productos**, buscá la tarjeta del producto.
2. Hacé clic en **"Editar"**.
3. Modificá los campos que necesites y guardá. Los cambios se reflejan al
   instante en toda la aplicación (catálogo, carrito, estadísticas).

## Cómo usar imágenes propias

En el modal de producto hay un botón **"Subir JPG o PNG"**: al elegir un
archivo desde tu computadora, la imagen se guarda directamente en el
producto (codificada en Base64 dentro de `localStorage`), sin necesidad de
subirla a ningún servidor. Se acepta JPG y PNG, hasta 2 MB por imagen.

También podés pegar una **URL** en el campo de texto de abajo si preferís
usar una imagen ya alojada en otro sitio, o copiar archivos dentro de
`img/productos/` y escribir la ruta relativa (ej: `img/productos/proteina.jpg`).

Si no cargás ninguna imagen, o falla al mostrarse, se ve automáticamente un
ícono placeholder — la interfaz nunca se rompe por una imagen faltante.

> Nota: como las imágenes subidas quedan guardadas en `localStorage`, evitá
> cargar muchas fotos muy pesadas — los navegadores suelen limitar ese
> almacenamiento a unos 5–10 MB en total por sitio.

## Preparado para un backend futuro

Toda la persistencia pasa exclusivamente por `js/storage.js`. El día que se
agregue un backend con base de datos, alcanza con reemplazar las funciones
de ese archivo (`getProductos`, `saveProductos`, `getCompras`, etc.) por
llamadas a una API — el resto de los módulos (`productos.js`, `compras.js`,
`ui.js`, `app.js`) no necesitan cambiar porque no acceden a `localStorage`
directamente.

## Cómo hostearlo en internet

Es un sitio 100% estático (HTML + CSS + JS), así que se puede subir a
cualquier hosting de archivos estáticos sin build ni configuración especial.
Todas las rutas son relativas, por lo que funciona tanto en la raíz de un
dominio como dentro de una subcarpeta.

- **Netlify:** arrastrá la carpeta `gimnasio/` completa a
  [app.netlify.com/drop](https://app.netlify.com/drop) y listo.
- **Vercel:** `vercel` desde dentro de la carpeta `gimnasio/` (sin
  framework, se detecta como sitio estático), o subiéndola desde el
  dashboard.
- **GitHub Pages:** subí el contenido de `gimnasio/` a un repositorio y
  activá GitHub Pages apuntando a la rama/carpeta correspondiente.
- **Cualquier hosting tradicional (cPanel, etc.):** subí todos los archivos
  y carpetas (`index.html`, `dashboard.html`, `css/`, `js/`, `img/`) por
  FTP a la raíz del sitio (o a una subcarpeta).

No hace falta ningún paso de build: subís los archivos tal cual están.
La única condición es que se sirvan por `http://` o `https://` (lo cual
cualquier hosting hace automáticamente) porque los módulos de JavaScript
(`import`/`export`) no funcionan si el archivo se abre directo desde el
disco (`file://`) — por eso en el modo local se recomienda `python3 -m
http.server` (ver más arriba).

## Diseño responsive

La interfaz se adapta a computadora, tablet y celular:
- El menú lateral se convierte en un panel deslizable con botón de
  hamburguesa en pantallas angostas.
- Las tarjetas de producto, estadísticas y el carrito de compra se
  reacomodan en una sola columna en mobile.
- Las tablas (historial de compras) permiten scroll horizontal en
  pantallas muy chicas para no romper el diseño.
- Los formularios y modales ajustan su ancho, tipografía y botones a pantalla
  completa en dispositivos móviles.
