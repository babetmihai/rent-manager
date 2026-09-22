import _ from "lodash"
import { onSnapshot, query, where } from "firebase/firestore"
import { actions } from "app/core/store"
import { createServices, getCollectionRef } from "app/core/services"
import { TRUE } from "app/core"
import { selectAuthUid } from "app/core/auth"
import { setLoader, clearLoader } from "app/core/loaders"
import { wakeTicker } from "app/core/firebase"


const service = createServices("bills")
const billsActions = actions.create("bills")

export const selectBills = () => billsActions.get()

export const fetchBills = async () => {
  const createdBy = selectAuthUid()
  if (!createdBy) return
  try {
    setLoader("bills")
    const list = await service.list({ createdBy })
    billsActions.set(_.keyBy(list, "id"))
  } catch (error) {
    console.error("fetch bills failed", error.message)
  } finally {
    clearLoader("bills")
  }
}

export const listenBills = () => {
  const createdBy = selectAuthUid()
  if (!createdBy) return () => {}
  const q = query(
    getCollectionRef("bills"),
    where("createdBy", "==", createdBy),
    where("_active", "==", TRUE)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((docSnap) => _.omit(docSnap.data(), ["_search", "_active"]))
    billsActions.set(_.keyBy(list, "id"))
  })
}

export const removeAllBills = async () => {
  const createdBy = selectAuthUid()
  const list = await service.list({ createdBy })
  for (const bill of list) {
    const { id } = bill
    await service.remove(id)
    billsActions.unset(id)
  }
  void wakeTicker()
}

export const formatAmount = (value) => {
  return Number(value || 0).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON"
  })
}

export const billAmount = (bill) => {
  const { dueAmount } = bill
  return Number(dueAmount) || 0
}
