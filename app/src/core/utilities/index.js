import _ from "lodash"
import { onSnapshot, query, where } from "firebase/firestore"
import { actions } from "app/core/store"
import { createServices, getCollectionRef, getDocRef } from "app/core/services"
import { EMPTY_OBJECT, STEP_STATUS, TRUE } from "app/core"
import { selectAuthUid } from "app/core/auth"
import { setLoader, clearLoader } from "app/core/loaders"
import { wakeTicker } from "app/core/firebase"


const service = createServices("utilities")
const tenantService = createServices("tenants")
const utilitiesActions = actions.create("utilities")
const tenantsActions = actions.create("tenants")

export const selectUtilities = () => utilitiesActions.get()
export const selectUtility = (id) => {
  if (!id) return EMPTY_OBJECT
  return utilitiesActions.get(id, EMPTY_OBJECT)
}

export const fetchUtilities = async () => {
  const createdBy = selectAuthUid()
  if (!createdBy) return
  try {
    setLoader("utilities")
    const list = await service.list({ createdBy })
    utilitiesActions.set(_.keyBy(list, "id"))
  } catch (error) {
    console.error("fetch utilities failed", error.message)
  } finally {
    clearLoader("utilities")
  }
}

export const fetchUtility = async (id) => {
  if (!id) return
  const cached = selectUtility(id)
  if (cached.id) return cached
  try {
    setLoader(`utilities.${id}`)
    const item = await service.get(id)
    if (!item) return
    utilitiesActions.set(id, item)
    return item
  } catch (error) {
    console.error("fetch utility failed", error.message)
  } finally {
    clearLoader(`utilities.${id}`)
  }
}

export const listenUtility = (id) => {
  if (!id) return () => {}
  return onSnapshot(getDocRef("utilities", id), (snap) => {
    const item = snap.data()
    const { _active } = item || {}
    if (!snap.exists() || _active !== TRUE) {
      utilitiesActions.unset(id)
      return
    }
    utilitiesActions.set(id, _.omit(item, ["_search", "_active"]))
  })
}

export const listenUtilities = () => {
  const createdBy = selectAuthUid()
  if (!createdBy) return () => {}
  const q = query(
    getCollectionRef("utilities"),
    where("createdBy", "==", createdBy),
    where("_active", "==", TRUE)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((docSnap) => _.omit(docSnap.data(), ["_search", "_active"]))
    utilitiesActions.set(_.keyBy(list, "id"))
  })
}

export const requestUtilityCreate = async (id) => {
  const item = await service.update(id, {
    createStatus: STEP_STATUS.PENDING,
    createError: null
  })
  utilitiesActions.update(id, item)
  void wakeTicker()
  return item
}

export const waitUtilityCreate = (id) => new Promise((resolve, reject) => {
  const unlisten = onSnapshot(getDocRef("utilities", id), (snap) => {
    const item = _.omit(snap.data(), ["_search", "_active"])
    utilitiesActions.update(id, item)
    const { createStatus, createError } = item || {}
    if (createStatus === STEP_STATUS.PENDING) return
    unlisten()
    if (createStatus === STEP_STATUS.FAILED) {
      reject(new Error(createError))
      return
    }
    resolve(item)
  })
})

export const assignUtility = async (id, tenantId) => {
  const nextId = tenantId || null
  const utility = selectUtility(id)
  const { tenantId: prevId } = utility
  const currentId = prevId || null
  if (currentId === nextId) return utility
  if (currentId) {
    const prev = tenantsActions.get(currentId, EMPTY_OBJECT)
    if (prev.id) {
      const { utilities } = prev || {}
      const nextUtilities = _.omit(utilities, id)
      tenantsActions.update(currentId, { utilities: nextUtilities })
      await tenantService.update(currentId, { utilities: nextUtilities })
    }
  }
  if (nextId) {
    const tenant = tenantsActions.get(nextId, EMPTY_OBJECT)
    const { utilities } = tenant || {}
    const nextUtilities = { ...utilities, [id]: TRUE }
    tenantsActions.update(nextId, { utilities: nextUtilities })
    await tenantService.update(nextId, { utilities: nextUtilities })
  }
  let assignedBy = null
  if (nextId) assignedBy = "user"
  utilitiesActions.update(id, { tenantId: nextId, assignedBy })
  const item = await service.update(id, { tenantId: nextId, assignedBy })
  utilitiesActions.update(id, item)
  void wakeTicker()
  return item
}

export const removeAllUtilities = async () => {
  const createdBy = selectAuthUid()
  const tenants = await tenantService.list({ createdBy })
  for (const tenant of tenants) {
    const { id, utilities } = tenant
    if (_.isEmpty(utilities)) continue
    tenantsActions.update(id, { utilities: {} })
    await tenantService.update(id, { utilities: {} })
  }
  const list = await service.list({ createdBy })
  for (const utility of list) {
    const { id } = utility
    await service.remove(id)
    utilitiesActions.unset(id)
  }
  void wakeTicker()
}
