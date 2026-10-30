import { cert, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import path from "node:path";
import { env } from "./env";

// The service account comes from the JSON env value when set, otherwise from the file (e.g. sca.json).
// The server stops at startup if it is missing or invalid.
const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? (JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as ServiceAccount)
  : path.resolve(env.FIREBASE_SERVICE_ACCOUNT_PATH);

// One shared Firebase app for the whole server
const firebaseApp = initializeApp({ credential: cert(serviceAccount) });

// Verifies Google sign-in ID tokens sent by the frontend
export const firebaseAuth = getAuth(firebaseApp);

// Database
export const db = getFirestore(firebaseApp);
db.settings({ ignoreUndefinedProperties: true });
