// firebase.config.js
// Configuración del proyecto Firebase y del gimnasio que atiende ESTE deploy.
//
// Estos valores NO son secretos: la configuración de una app web de Firebase es
// pública por diseño y viaja en el bundle de cualquier sitio. Lo que protege los
// datos son las reglas de seguridad de Firestore y el login de Authentication.
//
// Para poner en marcha otro gimnasio: duplicar el proyecto en Firebase, pegar
// acá su config y cambiar GIMNASIO_ID. Ningún otro archivo necesita tocarse.

export const firebaseConfig = {
  apiKey: 'AIzaSyDczXCnJIEMAVn9YC-p3B5U23akVlktges',
  authDomain: 'registrogym-42005.firebaseapp.com',
  projectId: 'registrogym-42005',
  storageBucket: 'registrogym-42005.firebasestorage.app',
  messagingSenderId: '962571904713',
  appId: '1:962571904713:web:fbd2e574905088bf990f18',
  measurementId: 'G-54DYVPGDFF',
};

// Gimnasio al que pertenecen los datos de esta instalación.
// Todos los documentos cuelgan de gimnasios/{GIMNASIO_ID}/...
export const GIMNASIO_ID = 'primefitness';
