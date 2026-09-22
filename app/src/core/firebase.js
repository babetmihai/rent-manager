import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { doc, initializeFirestore, setDoc } from "firebase/firestore"
import { getStorage } from "firebase/storage"


const { VITE_APP_VERSION } = import.meta.env
const firebaseConfig = __FIREBASE_CONFIG__ || {}
const { apiKey, projectId } = firebaseConfig

let app = null
let dbInstance = undefined
let storageInstance = undefined
let authInstance = undefined

export const getFirestoreVersion = () => (VITE_APP_VERSION || "").trim()

export const getFirebaseApp = () => {
  if (app) return app
  const hasConfig = Boolean(apiKey && String(apiKey).trim() && projectId && String(projectId).trim())
  if (!hasConfig) {
    return null
  }
  app = initializeApp(firebaseConfig)
  return app
}

export const getFirebaseAuth = () => {
  if (authInstance !== undefined) return authInstance
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) {
    authInstance = null
    return null
  }
  authInstance = getAuth(firebaseApp)
  return authInstance
}

export const getFirestoreDb = () => {
  if (dbInstance !== undefined) {
    return dbInstance
  }
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) {
    dbInstance = null
    return null
  }
  dbInstance = initializeFirestore(firebaseApp, {})
  return dbInstance
}

export const getFirebaseStorage = () => {
  if (storageInstance !== undefined) return storageInstance
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) {
    storageInstance = null
    return null
  }
  storageInstance = getStorage(firebaseApp)
  return storageInstance
}

export const wakeTicker = async () => {
  const db = getFirestoreDb()
  const version = getFirestoreVersion()
  if (!db || !version) return
  await setDoc(doc(db, "versions", version, "meta", "wake"), { at: Date.now() })
}
