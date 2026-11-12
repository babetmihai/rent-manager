import dayjs from "dayjs"
import { FieldValue } from "firebase-admin/firestore"
import { v7 } from "uuid"
import { db } from "./firebase.js"


const STALE_MS = 12 * 60 * 1000

export const claimLock = async (ref, step) => {
  const token = v7()
  const now = dayjs().valueOf()
  const byKey = `${step}LockBy`
  const atKey = `${step}LockAt`
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const { [atKey]: lockedAt } = snap.data() || {}
    const held = Number.isFinite(Number(lockedAt)) && now - Number(lockedAt) < STALE_MS
    if (held) return false
    tx.set(ref, {
      [byKey]: token,
      [atKey]: now
    }, { merge: true })
    return true
  })
  if (!claimed) return null
  return token
}

export const releaseLock = async (ref, token, step) => {
  const byKey = `${step}LockBy`
  const atKey = `${step}LockAt`
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const { [byKey]: lockedBy } = snap.data() || {}
    if (lockedBy !== token) return
    tx.update(ref, {
      [byKey]: FieldValue.delete(),
      [atKey]: FieldValue.delete()
    })
  })
}
