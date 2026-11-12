import { FALSE } from "../lib/index.js"
import { versionRef, bucket } from "../lib/firebase.js"
import { claimLock, releaseLock } from "../lib/lock.js"


const COLLECTIONS = ["bills", "documents", "tenants", "utilities", "pago"]

const run = async () => {
  const ref = versionRef.collection("meta").doc("purge")
  const token = await claimLock(ref, "purge")
  if (!token) return
  try {
    for (const path of COLLECTIONS) {
      const snap = await versionRef.collection(path).where("_active", "==", FALSE).get()
      for (const docSnap of snap.docs) {
        const { storagePath } = docSnap.data() || {}
        if (storagePath) await bucket.file(storagePath).delete({ ignoreNotFound: true })
        await docSnap.ref.delete()
      }
    }
  } finally {
    await releaseLock(ref, token, "purge")
  }
}

export default { run }
