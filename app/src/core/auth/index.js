import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut
} from "firebase/auth"
import { actions } from "app/core/store"
import { getFirebaseAuth } from "app/core/firebase"
import { setLoader, clearLoader } from "app/core/loaders"


const authActions = actions.create("auth")

export const selectAuth = () => authActions.get()
export const selectAuthUid = () => authActions.get("uid", null)
export const selectAuthReady = () => authActions.get("ready", false)
export const selectAuthEmail = () => authActions.get("email", null)

export const initAuth = () => {
  authActions.update({ ready: false })
  const auth = getFirebaseAuth()
  if (!auth) {
    authActions.set(mapAuth(null))
    return () => {}
  }
  return onAuthStateChanged(auth, (user) => {
    authActions.set(mapAuth(user))
  })
}

export const signInWithEmail = async (email, password) => {
  const auth = getFirebaseAuth()
  try {
    setLoader("auth.signIn")
    await signInWithEmailAndPassword(auth, email.trim(), password)
  } finally {
    clearLoader("auth.signIn")
  }
}

export const signUpWithEmail = async (email, password) => {
  const auth = getFirebaseAuth()
  try {
    setLoader("auth.signUp")
    await createUserWithEmailAndPassword(auth, email.trim(), password)
  } finally {
    clearLoader("auth.signUp")
  }
}

export const signInWithGoogle = async () => {
  const auth = getFirebaseAuth()
  try {
    setLoader("auth.google")
    await signInWithPopup(auth, new GoogleAuthProvider())
  } catch (error) {
    const { code } = error
    if (code === "auth/popup-closed-by-user") return
    if (code === "auth/cancelled-popup-request") return
    throw error
  } finally {
    clearLoader("auth.google")
  }
}

export const signOut = async () => {
  const auth = getFirebaseAuth()
  try {
    setLoader("auth.signOut")
    await firebaseSignOut(auth)
  } finally {
    clearLoader("auth.signOut")
  }
}

const mapAuth = (user) => {
  if (user) {
    return {
      uid: user.uid,
      email: user.email || null,
      ready: true
    }
  }
  return {
    uid: null,
    email: null,
    ready: true
  }
}
