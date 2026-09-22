import { initializeApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import fs from "fs"
import { FIREBASE_SERVICE_ACCOUNT, FIREBASE_CONFIG, VITE_APP_VERSION } from "./index.js"
import path from "path"
import { fileURLToPath } from "url"


if (!FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT is required")
}

if (!FIREBASE_CONFIG) {
  throw new Error("FIREBASE_CONFIG is required")
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, "../..")
const serviceAccount = JSON.parse(fs.readFileSync(path.join(repoRoot, FIREBASE_SERVICE_ACCOUNT), "utf8"))
const { storageBucket } = JSON.parse(fs.readFileSync(path.join(repoRoot, FIREBASE_CONFIG), "utf8")) || {}

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket
})

export const db = getFirestore(app)
export const auth = getAuth(app)
export const bucket = getStorage(app).bucket()

export const versionRef = db.collection("versions").doc(VITE_APP_VERSION)
