import _ from "lodash"
import { FieldPath } from "firebase-admin/firestore"
import { TRUE, FALSE } from "./index.js"
import { v7 } from "uuid"
import dayjs from "dayjs"
import { versionRef, db } from "./firebase.js"


const PAGE_SIZE = 1000

export const createServices = (path) => {
  const services = {
    get: async (id) => {
      const item = await versionRef.collection(path)
        .doc(id)
        .get()
        .then((docSnap) => docSnap.data())

      return sanitize(item)
    },
    create: async (payload) => {
      const id = v7()
      const ref = versionRef.collection(path).doc(id)
      const now = dayjs().valueOf()
      const values = _.isFunction(payload) ? await payload({ id }) : payload
      const _values = {
        _active: TRUE,
        ...values,
        createdAt: now,
        updatedAt: now,
        id
      }
      await ref.set(_values)
      return services.get(id)
    },
    update: async (id, payload) => {
      const now = dayjs().valueOf()
      const ref = versionRef.collection(path).doc(id)
      const existing = await services.get(id)
      const values = _.isFunction(payload) ? await payload(existing || { id }) : payload
      if (existing) {
        await ref.update({
          ...values,
          id,
          updatedAt: now
        })
      } else {
        await ref.set({
          _active: TRUE,
          ...values,
          createdAt: now,
          updatedAt: now,
          id
        })
      }
      return services.get(id)
    },
    list: async (queryParams = {}) => {
      const {
        ids,
        lastId,
        pageSize = PAGE_SIZE,
        ...rest
      } = queryParams

      switch (true) {
        case (!_.isEmpty(ids)): {
          const ref = versionRef.collection(path)
          const refs = _.uniq(ids).map((id) => ref.doc(id))
          const items = await db.getAll(...refs).then((docs) => docs.map((docSnap) => docSnap.data()))
          return items
            .filter((item) => {
              const { _active } = item || {}
              return _active === TRUE
            })
            .map((item) => sanitize(item))
            .filter(Boolean)
        }
        default: {
          let ref = versionRef.collection(path)
          for (const [key, value] of Object.entries(rest)) {
            if (value === undefined) continue
            if (key.includes(".")) {
              ref = ref.where(new FieldPath(...key.split(".")), "==", value)
            } else {
              ref = ref.where(key, "==", value)
            }
          }
          ref = ref.where("_active", "==", TRUE)
          ref = ref.orderBy("__name__", "desc")
          if (lastId) {
            const lastDoc = await versionRef.collection(path).doc(lastId).get()
            if (lastDoc.exists) {
              ref = ref.startAfter(lastDoc)
            }
          }
          ref = ref.limit(Number(pageSize))
          return ref.get().then((data) => data.docs.map((docSnap) => sanitize(docSnap.data())))
        }
      }
    },
    remove: async (id) => {
      await versionRef.collection(path).doc(id).update({
        _active: FALSE,
        updatedAt: dayjs().valueOf()
      })
    }
  }

  return services
}

const sanitize = (item) => {
  if (item) return _.omit(item, ["_search", "_active"])
}
