import _ from "lodash"
import { onSnapshot, query, where } from "firebase/firestore"
import { actions } from "app/core/store"
import { createServices, getCollectionRef } from "app/core/services"
import { TRUE } from "app/core"
import { selectAuthUid } from "app/core/auth"
import { setLoader, clearLoader } from "app/core/loaders"


const service = createServices("tenants")
const tenantsActions = actions.create("tenants")

export const selectTenants = () => tenantsActions.get()

export const fetchTenants = async () => {
  const createdBy = selectAuthUid()
  if (!createdBy) return
  try {
    setLoader("tenants")
    const list = await service.list({ createdBy })
    tenantsActions.set(_.keyBy(list, "id"))
  } catch (error) {
    console.error("fetch tenants failed", error.message)
  } finally {
    clearLoader("tenants")
  }
}

export const listenTenants = () => {
  const createdBy = selectAuthUid()
  if (!createdBy) return () => {}
  const q = query(
    getCollectionRef("tenants"),
    where("createdBy", "==", createdBy),
    where("_active", "==", TRUE)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((docSnap) => _.omit(docSnap.data(), ["_search", "_active"]))
    tenantsActions.set(_.keyBy(list, "id"))
  })
}

export const createTenant = async (values) => {
  const createdBy = selectAuthUid()
  const item = await service.create({ ...values, createdBy })
  tenantsActions.set(item.id, item)
  return item
}

export const updateTenant = async (id, values) => {
  const item = await service.update(id, values)
  tenantsActions.update(id, item)
  return item
}

export const removeTenant = async (id) => {
  await service.remove(id)
  tenantsActions.unset(id)
}
