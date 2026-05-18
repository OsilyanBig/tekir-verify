import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// ⚠️ Firebase Console > Project Settings'ten al
const firebaseConfig = {
  apiKey: "AIzaSyD5BVgidTB_E9y_rvdRHUstFfF1yqqCF-M",
  authDomain: "tekir-1e8b3.firebaseapp.com",
  projectId: "tekir-1e8b3",
  storageBucket: "tekir-1e8b3.firebasestorage.app",
  messagingSenderId: "350639938595",
  appId: "1:350639938595:web:b26685dd3d403c23156596"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
