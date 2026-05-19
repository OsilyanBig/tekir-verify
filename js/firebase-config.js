import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdVzVAtQhPV7B_JXuKfhCP9DPGVCimGrY",
  authDomain: "tekirnew.firebaseapp.com",
  projectId: "tekirnew",
  storageBucket: "tekirnew.firebasestorage.app",
  messagingSenderId: "290797859032",
  appId: "1:290797859032:web:40ed3c52b202ebe70267ad",
  measurementId: "G-3E9G9KFPTC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
