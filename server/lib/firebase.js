import { initializeApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import fs from "fs"
import { FIREBASE_SERVICE_ACCOUNT, FIREBASE_CONFIG, VITE_APP_VERSION } from "./index.js"
import path from "path"
import { fileURLToPath } from "url"


const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, "../..")
const options = {}

if (FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(fs.readFileSync(path.join(repoRoot, FIREBASE_SERVICE_ACCOUNT), "utf8"))
  options.credential = cert(serviceAccount)
}

const inlineConfig = Boolean(FIREBASE_CONFIG && FIREBASE_CONFIG.trim().startsWith("{"))
if (FIREBASE_CONFIG) {
  let raw = FIREBASE_CONFIG
  if (!inlineConfig) raw = fs.readFileSync(path.join(repoRoot, FIREBASE_CONFIG), "utf8")
  const { storageBucket } = JSON.parse(raw) || {}
  options.storageBucket = storageBucket
}

if (!options.credential && !process.env.K_SERVICE && !inlineConfig) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT is required")
}

if (!options.storageBucket) {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT
  options.storageBucket = `${projectId}.appspot.com`
}

const app = initializeApp(options)

export const db = getFirestore(app)
export const auth = getAuth(app)
export const bucket = getStorage(app).bucket()

export const versionRef = db.collection("versions").doc(VITE_APP_VERSION)
