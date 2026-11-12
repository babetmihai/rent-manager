import _ from "lodash"
import { onSnapshot, query, where } from "firebase/firestore"
import { actions } from "app/core/store"
import { createServices, getCollectionRef, getDocRef } from "app/core/services"
import { EMPTY_OBJECT, STEP_STATUS, TRUE } from "app/core"
import { selectAuthUid } from "app/core/auth"
import { setLoader, clearLoader } from "app/core/loaders"
import { wakeTicker } from "app/core/firebase"


const service = createServices("pago")
const pagoActions = actions.create("pago")

const selectPagos = () => pagoActions.get()
export const selectPago = () => _.find(selectPagos()) || EMPTY_OBJECT

export const fetchPago = async () => {
  const createdBy = selectAuthUid()
  if (!createdBy) return
  try {
    setLoader("pago")
    const list = await service.list({ createdBy })
    pagoActions.set(_.keyBy(list, "id"))
  } catch (error) {
    console.error("fetch pago failed", error.message)
  } finally {
    clearLoader("pago")
  }
}

export const listenPago = () => {
  const createdBy = selectAuthUid()
  if (!createdBy) return () => {}
  const q = query(
    getCollectionRef("pago"),
    where("createdBy", "==", createdBy),
    where("_active", "==", TRUE)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((docSnap) => _.omit(docSnap.data(), ["_search", "_active"]))
    pagoActions.set(_.keyBy(list, "id"))
  })
}

export const refreshInvoices = async () => {
  const { id } = selectPago()
  await service.update(id, { syncStatus: STEP_STATUS.PENDING, syncError: null })
  void wakeTicker()
}

export const savePago = async (values) => {
  const createdBy = selectAuthUid()
  const existing = selectPago()
  const payload = {
    ...values,
    loginStatus: STEP_STATUS.PENDING,
    loginError: null,
    createdBy
  }
  let item
  if (existing.id) {
    item = await service.update(existing.id, payload)
    pagoActions.update(existing.id, item)
  } else {
    item = await service.create(payload)
    pagoActions.set(item.id, item)
  }
  void wakeTicker()
  return item
}

export const waitPagoLogin = (id) => new Promise((resolve, reject) => {
  const unlisten = onSnapshot(getDocRef("pago", id), (snap) => {
    const item = _.omit(snap.data(), ["_search", "_active"])
    pagoActions.update(id, item)
    const { loginStatus, loginError } = item || {}
    if (loginStatus !== STEP_STATUS.COMPLETED && loginStatus !== STEP_STATUS.FAILED) return
    unlisten()
    if (loginStatus === STEP_STATUS.FAILED) {
      reject(new Error(loginError))
      return
    }
    resolve(item)
  })
})
