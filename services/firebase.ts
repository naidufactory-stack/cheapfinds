import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA9YOpKy-rRinyIkCQFPj1F0GNy-hIXvKI",
  authDomain: "cheapfinds-fc91f.firebaseapp.com",
  projectId: "cheapfinds-fc91f",
  storageBucket: "cheapfinds-fc91f.firebasestorage.app",
  messagingSenderId: "119035413422",
  appId: "1:119035413422:web:032dbba6a107011808fe3f",
  measurementId: "G-DRVK5MF3W7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { auth, storage, analytics };