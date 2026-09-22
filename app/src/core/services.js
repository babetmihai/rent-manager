import _ from "lodash"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  setDoc,
  updateDoc
} from "firebase/firestore"
import { v7 as uuidv7 } from "uuid"
import { getFirestoreDb, getFirestoreVersion } from "./firebase.js"
import { TRUE, FALSE } from "./index.js"

const PAGE_SIZE = 1000

const sanitize = (item) => {
  if (item) {
    return _.omit(item, ["_search", "_active"])
  }
}

const mapCollection = (snapshot) => snapshot.docs.map((docSnap) => docSnap.data())

const getCollectionRef = (path) => {
  const db = getFirestoreDb()
  const version = getFirestoreVersion()
  return collection(db, "versions", version, path)
}

const getDocRef = (path, id) => {
  const db = getFirestoreDb()
  const version = getFirestoreVersion()
  return doc(db, "versions", version, path, id)
}

export const createServices = (path) => {
  const services = {
    get: async (id) => {
      const snap = await getDoc(getDocRef(path, id))
      const item = snap.exists() ? snap.data() : undefined
      return sanitize(item)
    },
    list: async (queryParams = {}) => {
      const {
        ids,
        lastId,
        pageSize = PAGE_SIZE,
        orderByField = "createdAt",
        ...rest
      } = queryParams

      switch (true) {
        case (!_.isEmpty(ids)): {
          const uniqueIds = _.uniq(ids)
          const snaps = await Promise.all(
            uniqueIds.map((id) => getDoc(getDocRef(path, id)))
          )
          const items = snaps
            .filter((snap) => snap.exists())
            .map((snap) => snap.data())
          return items
            .filter((item) => item._active === TRUE)
            .map((item) => sanitize(item))
            .filter(Boolean)
        }
        default: {
          const constraints = []
          for (const [key, value] of Object.entries(rest)) {
            if (value === undefined) continue
            constraints.push(where(key, "==", value))
          }
          constraints.push(where("_active", "==", TRUE))
          constraints.push(orderBy(orderByField, "desc"))
          if (lastId) {
            const lastDoc = await getDoc(getDocRef(path, lastId))
            if (lastDoc.exists()) {
              constraints.push(startAfter(lastDoc))
            }
          }
          constraints.push(limit(Number(pageSize)))
          const snapshot = await getDocs(query(getCollectionRef(path), ...constraints))
          return mapCollection(snapshot).map((item) => sanitize(item))
        }
      }
    },
    create: async (payload) => {
      const id = uuidv7()
      const now = Date.now()
      const raw = {
        _active: TRUE,
        ...payload,
        createdAt: now,
        updatedAt: now,
        id
      }
      await setDoc(getDocRef(path, id), raw)
      return sanitize(raw)
    },
    update: async (id, payload) => {
      const patch = {
        ...payload,
        updatedAt: Date.now()
      }
      await updateDoc(getDocRef(path, id), patch)
      const item = await services.get(id)
      return item
    },
    remove: async (id) => {
      await updateDoc(getDocRef(path, id), {
        _active: FALSE,
        updatedAt: Date.now()
      })
    }
  }

  return services
}

export { getDocRef, getCollectionRef }
