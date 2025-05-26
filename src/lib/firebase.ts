
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage'; // Optional: if file attachments are implemented

// Check for the essential Firebase API key
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  throw new Error(
    "Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing. " +
    "Please ensure you have a .env.local file in the root of your project with all the required NEXT_PUBLIC_FIREBASE_... variables. " +
    "Example .env.local content:\n" +
    "NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key\n" +
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain\n" +
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id\n" +
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket\n" +
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id\n" +
    "NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id\n\n" +
    "After creating or updating the .env.local file, you MUST restart your development server."
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
// const storage = getStorage(app); // Optional

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
// export { app, auth, db, storage, googleProvider }; // If using storage
