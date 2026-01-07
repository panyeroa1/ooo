import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDwf9xBQ1oYmGZzzVLc2Il0On13l2hJ8K8",
  authDomain: "brh-apps-k6hhgf.firebaseapp.com",
  databaseURL: "https://brh-apps-k6hhgf-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "brh-apps-k6hhgf",
  storageBucket: "brh-apps-k6hhgf.appspot.com",
  messagingSenderId: "367191147774",
  appId: "1:367191147774:web:0b04a0e4157147754d9241"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
