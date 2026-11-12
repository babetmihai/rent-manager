import {
  onAuthStateChanged,
  signInWithCustomToken,
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

export const signInWithPago = async (email, password) => {
  const auth = getFirebaseAuth()
  const previous = auth.currentUser && auth.currentUser.uid
  try {
    setLoader("auth.signIn")
    const response = await fetch("/ticker/auth/pago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password })
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error)
    await signInWithCustomToken(auth, body.token)
    const { uid } = auth.currentUser
    if (previous && previous !== uid) {
      actions.unset("pago")
      actions.unset("tenants")
    }
    authActions.set(mapAuth(auth.currentUser))
  } finally {
    clearLoader("auth.signIn")
  }
}

export const signOut = async () => {
  const auth = getFirebaseAuth()
  try {
    setLoader("auth.signOut")
    actions.unset("pago")
    actions.unset("tenants")
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
