import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDIvPVf3GhovK6FBUR5yYkmJSxfsji6P3I",
  authDomain: "taskflow-auth-rinsiya.firebaseapp.com",
  projectId: "taskflow-auth-rinsiya",
  storageBucket: "taskflow-auth-rinsiya.firebasestorage.app",
  messagingSenderId: "406209550682",
  appId: "1:406209550682:web:6b3f602e8a83fc859efb63"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, signOut, onAuthStateChanged };
