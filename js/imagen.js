// imagen.js
// Responsabilidad única: convertir un archivo de imagen elegido por el usuario
// en un data URL chico, apto para guardar dentro de un documento de Firestore.
//
// Por qué comprimir: un documento de Firestore no puede superar 1 MiB, y el
// Base64 agrega ~33% sobre el peso del archivo. Una foto de celular de 3 MB
// rompería el límite. Redimensionar a 800px y recodificar a JPEG deja
// cualquier foto en decenas de KB sin pérdida visible en una tarjeta.

const LADO_MAXIMO = 800;      // px del lado más largo
const CALIDAD_INICIAL = 0.82;
const PESO_OBJETIVO = 180 * 1024; // bytes del data URL resultante
const CALIDAD_MINIMA = 0.5;

/** Lee un File y devuelve su data URL. */
function leerComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function cargarImagen(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
    img.src = dataURL;
  });
}

/**
 * Comprime una imagen a un data URL JPEG chico.
 * Devuelve { ok: true, dataURL, bytes } o { ok: false, message }.
 */
export async function comprimirImagen(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    return { ok: false, message: 'Solo se aceptan imágenes JPG o PNG.' };
  }

  let img;
  try {
    img = await cargarImagen(await leerComoDataURL(file));
  } catch (e) {
    return { ok: false, message: e.message };
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);

  const ctx = canvas.getContext('2d');
  // Fondo blanco: los PNG con transparencia quedarían negros al pasar a JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let calidad = CALIDAD_INICIAL;
  let dataURL = canvas.toDataURL('image/jpeg', calidad);
  while (dataURL.length > PESO_OBJETIVO && calidad > CALIDAD_MINIMA) {
    calidad -= 0.1;
    dataURL = canvas.toDataURL('image/jpeg', calidad);
  }

  if (dataURL.length > 700 * 1024) {
    return { ok: false, message: 'La imagen es demasiado grande incluso comprimida. Probá con otra.' };
  }

  return { ok: true, dataURL, bytes: dataURL.length };
}
