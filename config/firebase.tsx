// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyDJu40aYrXPgMgOdvvLfooLM6id-MdkBQQ",
  authDomain: "mycelium-29d2c.firebaseapp.com",
  projectId: "mycelium-29d2c",
  storageBucket: "mycelium-29d2c.firebasestorage.app",
  messagingSenderId: "768645828447",
  appId: "1:768645828447:web:363c65f4c26dce8e1170ea",
  measurementId: "G-GPH1074ECM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();