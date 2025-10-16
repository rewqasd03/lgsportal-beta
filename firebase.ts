import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBYfBhkLIfjqpnL9MxBhxW6iJeC0VAEDLk",
  authDomain: "kopruler-basari-portali.firebaseapp.com",
  projectId: "kopruler-basari-portali",
  storageBucket: "kopruler-basari-portali.firebasestorage.app",
  messagingSenderId: "318334276429",
  appId: "1:318334276429:web:7caa5e5b9dccb564d71d04",
  measurementId: "G-EF6P77SMFP"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);