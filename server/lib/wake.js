import { versionRef } from "./firebase.js"


const listenDoc = (id, onWake) => {
  let ready = false
  return versionRef.collection("meta").doc(id).onSnapshot((snap) => {
    if (!ready) {
      ready = true
      return
    }
    if (!snap.exists) return
    onWake()
  })
}

export const listenWake = (onWake) => listenDoc("wake", onWake)

export const listenSync = (onWake) => listenDoc("sync", onWake)
