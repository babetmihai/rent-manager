import { FALSE } from "../lib/index.js"
import { versionRef, bucket } from "../lib/firebase.js"


const COLLECTIONS = ["bills", "documents", "tenants", "utilities", "pago"]

const run = async () => {
  for (const path of COLLECTIONS) {
    const snap = await versionRef.collection(path).where("_active", "==", FALSE).get()
    for (const docSnap of snap.docs) {
      const { storagePath } = docSnap.data() || {}
      if (storagePath) await bucket.file(storagePath).delete({ ignoreNotFound: true })
      await docSnap.ref.delete()
    }
  }
}

export default { run }
