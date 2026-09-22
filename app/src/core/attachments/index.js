import _ from "lodash"
import { onSnapshot, query, where } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { actions } from "app/core/store"
import { createServices, getCollectionRef } from "app/core/services"
import { getFirebaseStorage, wakeTicker } from "app/core/firebase"
import { TRUE } from "app/core"
import { selectAuthUid } from "app/core/auth"
import { setLoader, clearLoader } from "app/core/loaders"


const service = createServices("documents")
const attachmentsActions = actions.create("attachments")

export const selectAttachments = () => attachmentsActions.get()

export const fetchAttachments = async () => {
  const createdBy = selectAuthUid()
  if (!createdBy) return
  try {
    setLoader("attachments")
    const list = await service.list({ createdBy })
    attachmentsActions.set(_.keyBy(list, "id"))
  } catch (error) {
    console.error("fetch attachments failed", error.message)
  } finally {
    clearLoader("attachments")
  }
}

export const listenAttachments = () => {
  const createdBy = selectAuthUid()
  if (!createdBy) return () => {}
  const q = query(
    getCollectionRef("documents"),
    where("createdBy", "==", createdBy),
    where("_active", "==", TRUE)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((docSnap) => _.omit(docSnap.data(), ["_search", "_active"]))
    attachmentsActions.set(_.keyBy(list, "id"))
  })
}

export const createAttachment = async ({ parentType, parentId, file }) => {
  const createdBy = selectAuthUid()
  const storage = getFirebaseStorage()
  const { name } = file
  let item
  try {
    setLoader("attachments.create")
    item = await service.create({
      parentType,
      parentId,
      name,
      url: "",
      storagePath: "",
      createdBy
    })
    const storagePath = `documents/${createdBy}/${item.id}/${name}`
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" })
    const url = await getDownloadURL(storageRef)
    const saved = await service.update(item.id, { url, storagePath, name })
    attachmentsActions.set(saved.id, saved)
    return saved
  } catch (error) {
    if (item) {
      await service.remove(item.id)
      attachmentsActions.unset(item.id)
    }
    throw error
  } finally {
    clearLoader("attachments.create")
  }
}

export const removeAttachment = async (id) => {
  await service.remove(id)
  attachmentsActions.unset(id)
  void wakeTicker()
}

export const removeBillAttachments = async () => {
  const createdBy = selectAuthUid()
  const list = await service.list({ createdBy })
  const billDocs = _.filter(list, { parentType: "bill" })
  for (const item of billDocs) {
    const { id } = item
    await removeAttachment(id)
  }
}
