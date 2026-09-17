import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDI1Pn_7G3o_Sl5L1C553UlGXpk4Jms6P4",
  authDomain: "seu-parking.firebaseapp.com",
  databaseURL: "https://seu-parking-default-rtdb.firebaseio.com",
  projectId: "seu-parking",
  storageBucket: "seu-parking.firebasestorage.app",
  messagingSenderId: "581268473042",
  appId: "1:581268473042:web:ae34ae3ee9d7bcd85fd90b"
};

// Initialize Firebase (Next.js e jate bar bar initialize na hoy)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

export { db };