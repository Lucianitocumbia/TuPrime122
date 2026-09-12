# TUPRIME — Sistema de gestión de ventas para gimnasio

Aplicación web sin backend propio (HTML + CSS + JavaScript Vanilla con módulos
ES6) que guarda sus datos en **Firebase**: autenticación con email y contraseña,
y productos y compras en Firestore, sincronizados en tiempo real entre todos los
dispositivos donde inicies sesión.

No hay paso de compilación ni dependencias que instalar: el SDK de Firebase se
carga por CDN.

## Cómo abrirlo en tu computadora

Los módulos de JavaScript (`import`/`export`) requieren que el sitio se sirva
por `http://`, no por `file://`. Cualquier servidor estático sirve:

```bash
npx serve -l 8000
```

Y abrí `http://localhost:8000` en el navegador. Si tenés Python instalado,
`python3 -m http.server 8000` hace lo mismo.

Para entrar necesitás un usuario dado de alta en Firebase (ver
*Cómo dar de alta un usuario* más abajo). No hay credenciales de prueba.

## Estructura del proyecto

```
├── index.html            → Pantalla de login
├── dashboard.html        → Panel principal (todas las secciones)
├── firestore.rules       → Reglas de seguridad (fuente de verdad)
├── css/
│   ├── style.css          → Tokens de diseño, reset y componentes globales
│   ├── login.css          → Estilos de la pantalla de login
│   ├── dashboard.css      → Layout del panel (sidebar, secciones, tablas)
│   └── productos.css      → Tarjetas de producto y carrito de compra
├── js/
│   ├── firebase.config.js → Config del proyecto + ID del gimnasio
│   ├── firebase.js        → Inicializa el SDK, rutas de datos y errores
│   ├── store.js           → Caché en memoria sincronizada (onSnapshot)
│   ├── data/
│   │   ├── productosRepo.js → CRUD de productos en Firestore
│   │   └── comprasRepo.js   → Alta transaccional y listado de compras
│   ├── auth.js            → Login, logout y protección de rutas
│   ├── productos.js       → Reglas de negocio de productos
│   ├── compras.js         → Carrito, confirmación de compra y estadísticas
│   ├── imagen.js          → Compresión de imágenes en el navegador
│   ├── ui.js              → Renderizado del DOM, modales y mensajes (toasts)
│   └── app.js             → Inicialización y conexión entre todos los módulos
└── img/productos/         → Carpeta reservada para imágenes de productos
```

## Cómo está organizado el código

La decisión de diseño central es **`store.js`**. Mantiene en memoria una copia de
los productos y las compras, sincronizada con Firestore por `onSnapshot`.
Gracias a eso:

- Las **lecturas siguen siendo sincrónicas** (`listarProductos()`,
  `buscarYFiltrar()`, `calcularEstadisticas()`). Sólo las escrituras son `async`,
  así que el `async` no se propagó por toda la aplicación.
- Hay **una sola suscripción** por colección, no una lectura por cada render.
- Si otro dispositivo vende algo, **la pantalla se actualiza sola**.
- `ui.js` no sabe que Firebase existe.

Los módulos de `data/` son los únicos que conocen nombres de colecciones y
funciones del SDK. Si algún día cambia la base de datos, se reemplazan esos dos
archivos y el resto no se entera.

## Estructura de los datos

```
usuarios/{uid}
    email, gimnasioId, rol: 'admin' | 'empleado', activo

gimnasios/{gimnasioId}
    nombre, activo
    ├── productos/{autoId}   → nombre, descripcion, precio, stock, categoria,
    │                          imagen, creadoEn, actualizadoEn
    ├── compras/{autoId}     → numero, fecha, items[], total, usuarioId,
    │                          usuarioEmail
    └── meta/
        ├── seed             → marca de la carga inicial
        └── contadores       → último número de compra usado
```

Todo cuelga de `gimnasios/{gimnasioId}` a propósito: el aislamiento entre
gimnasios es **estructural**, no depende de que cada consulta se acuerde de
filtrar. El ID del gimnasio de esta instalación está en `js/firebase.config.js`.

Cada compra guarda copia del nombre y el precio de cada ítem. Es a propósito: una
compra es un registro histórico, si mañana subís un precio la venta vieja no debe
cambiar.

## Cómo se confirma una compra

Es la operación más delicada del sistema y corre dentro de **una sola
transacción** de Firestore:

1. Lee el stock real de cada producto y el contador de números de compra.
2. Verifica **en el servidor** que el stock alcance.
3. Descuenta el stock, incrementa el contador y crea la compra.

Todo o nada. Entre que la pantalla lee el stock y el usuario aprieta *Confirmar*,
otro vendedor pudo haber vendido lo mismo; si eso pasa, Firestore detecta que los
documentos cambiaron y reintenta con los datos frescos. **El stock no puede
quedar negativo** y el número de compra no puede duplicarse.

## Cómo agregar y editar productos

1. Iniciá sesión y andá a la sección **Productos**.
2. **"＋ Nuevo producto"** o **"Editar"** en una tarjeta existente.
3. Completá nombre, descripción, precio, stock y categoría.
4. Guardá. El cambio aparece al instante en todos los dispositivos conectados.

### Imágenes

En el modal hay un botón **"Subir JPG o PNG"**. La imagen se redimensiona a 800px
y se recomprime a JPEG **en el navegador** antes de guardarse dentro del documento
del producto. Esto no es un capricho: un documento de Firestore no puede superar
1 MiB y el Base64 agrega un 33% al peso, así que una foto de celular sin comprimir
no entraría. Una foto de 20 MB queda en unos 150 KB.

También podés pegar una **URL** de una imagen alojada en otro sitio. Si no cargás
ninguna, o falla al mostrarse, se ve un ícono placeholder — la interfaz nunca se
rompe por una imagen faltante.

## Cómo dar de alta un usuario

El alta se hace desde la consola de Firebase, a propósito: las reglas no dejan
que la aplicación escriba en `usuarios/`, porque si pudiera, cualquiera se
ascendería a administrador.

1. **Authentication → Usuarios → Agregar usuario**: email y contraseña.
   Copiá el **UID** que queda en la lista.
2. **Firestore → Datos → colección `usuarios`**: creá un documento cuyo **ID sea
   ese UID**, con los campos:

   | Campo | Tipo | Ejemplo |
   |---|---|---|
   | `email` | string | `persona@gmail.com` |
   | `gimnasioId` | string | `primefitness` |
   | `rol` | string | `admin` |
   | `activo` | boolean | `true` |

Usá emails reales: si el identificador no tiene una casilla detrás, no hay
recuperación de contraseña y cada olvido termina en un reseteo manual desde la
consola.

Para dar de baja a alguien, poné `activo` en `false`: pierde el acceso sin
borrarle el historial de ventas.

## Reglas de seguridad

La fuente de verdad es [`firestore.rules`](firestore.rules). Para aplicarlas:
consola de Firebase → **Firestore Database → Reglas** → pegar el contenido del
archivo → **Publicar**.

Lo que garantizan:

- Sin sesión no se lee ni se escribe nada.
- Cada usuario sólo ve los datos del gimnasio al que pertenece, y sólo si está
  activo.
- Sólo el rol `admin` crea, edita o borra productos y borra compras.
- Cualquier miembro puede vender: puede **bajar** el stock, nunca subirlo, nunca
  dejarlo negativo, y sin tocar ningún otro campo del producto.
- Una compra no se puede crear a nombre de otro ni editar después de creada.
- Nadie puede escribir en `usuarios/` desde la aplicación.

## Poner en marcha otro gimnasio

1. Creá un proyecto nuevo en Firebase y activá Authentication (email/contraseña)
   y Firestore.
2. Publicá las reglas de `firestore.rules`.
3. Copiá la config del proyecto nuevo en `js/firebase.config.js` y cambiá
   `GIMNASIO_ID`.
4. Creá el documento `gimnasios/{GIMNASIO_ID}` y el usuario admin.
5. Desplegá el sitio.

Ningún otro archivo necesita tocarse. La estructura de datos ya está preparada
para que varios gimnasios convivan en un mismo proyecto el día que convenga
unificarlos: haría falta resolver de dónde sale `GIMNASIO_ID` al iniciar sesión
(del perfil del usuario, que ya lo trae) en lugar de leerlo de la configuración.

## Cómo hostearlo

Es un sitio estático sin build, así que va en cualquier hosting de archivos.
Todas las rutas son relativas: funciona tanto en la raíz de un dominio como en
una subcarpeta.

- **Netlify:** arrastrá la carpeta a [app.netlify.com/drop](https://app.netlify.com/drop).
- **Vercel:** `vercel` desde la carpeta, se detecta como sitio estático.
- **GitHub Pages:** activalo apuntando a la rama correspondiente.
- **Hosting tradicional (cPanel, FTP):** subí todos los archivos y carpetas.

Un paso obligatorio después de desplegar: en la consola de Firebase,
**Authentication → Settings → Dominios autorizados**, agregá el dominio del sitio.
Si no, el login falla en producción aunque funcione en local.

> Los valores de `js/firebase.config.js` son **públicos por diseño** — viajan en
> el código de cualquier aplicación web de Firebase. Lo que protege los datos son
> las reglas de seguridad y el login, no esconder la `apiKey`.

## Diseño responsive

La interfaz se adapta a computadora, tablet y celular: el menú lateral se
convierte en un panel deslizable, las tarjetas y el carrito se reacomodan en una
sola columna, y las tablas permiten scroll horizontal en pantallas muy chicas.
