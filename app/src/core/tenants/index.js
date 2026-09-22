import _ from "lodash"
import { onSnapshot, query, where } from "firebase/firestore"
import { actions } from "app/core/store"
import { createServices, getCollectionRef, getDocRef } from "app/core/services"
import { EMPTY_OBJECT, STEP_STATUS, TRUE } from "app/core"
import { selectAuthUid } from "app/core/auth"
import { setLoader, clearLoader } from "app/core/loaders"
import { wakeTicker } from "app/core/firebase"
import { assignUtility, selectUtilities } from "app/core/utilities"
import { markPagoOnboarded, selectPago } from "app/core/pago"


const service = createServices("tenants")
const tenantsActions = actions.create("tenants")

export const selectTenants = () => tenantsActions.get()
export const selectTenant = (id) => tenantsActions.get(id, EMPTY_OBJECT)

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

export const fetchTenant = async (id) => {
  if (!id) return
  const cached = selectTenant(id)
  if (cached.id) return cached
  try {
    setLoader(`tenants.${id}`)
    const item = await service.get(id)
    if (!item) return
    tenantsActions.set(id, item)
    return item
  } catch (error) {
    console.error("fetch tenant failed", error.message)
  } finally {
    clearLoader(`tenants.${id}`)
  }
}

export const listenTenant = (id) => {
  if (!id) return () => {}
  return onSnapshot(getDocRef("tenants", id), (snap) => {
    const item = snap.data()
    const { _active } = item || {}
    if (!snap.exists() || _active !== TRUE) {
      tenantsActions.unset(id)
      return
    }
    tenantsActions.set(id, _.omit(item, ["_search", "_active"]))
  })
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
  const { id: pagoId } = selectPago()
  if (pagoId) await markPagoOnboarded()
  return item
}

export const updateTenant = async (id, values) => {
  const item = await service.update(id, values)
  tenantsActions.update(id, item)
  return item
}

export const requestTenantEmail = async (id) => {
  if (!id) return
  const item = await service.update(id, {
    emailStatus: STEP_STATUS.PENDING,
    emailError: null
  })
  tenantsActions.update(id, item)
  void wakeTicker()
  return item
}

export const requestTenantAssign = async (id) => {
  if (!id) return
  const item = await service.update(id, {
    assignStatus: STEP_STATUS.PENDING,
    assignError: null
  })
  tenantsActions.update(id, item)
  void wakeTicker()
  return item
}

export const removeTenant = async (id) => {
  const utilities = _.filter(selectUtilities(), { tenantId: id })
  for (const utility of utilities) {
    const { id: utilityId } = utility
    await assignUtility(utilityId, null)
  }
  await service.remove(id)
  tenantsActions.unset(id)
  void wakeTicker()
}
