import objectHash from "object-hash"
import dayjs from "dayjs"
import _ from "lodash"
import { FieldValue } from "firebase-admin/firestore"
import { createServices } from "../lib/services.js"
import { STEP_STATUS } from "../lib/index.js"
import { bucket } from "../lib/firebase.js"
import { createPago } from "../../src/pago.js"
import { TBillSync } from "../lib/bills/index.js"
import { TUtilitySync } from "../lib/utilities/index.js"


const pagoService = createServices("pago")
const billService = createServices("bills")
const utilityService = createServices("utilities")
const documentService = createServices("documents")

const runPendingPagoLogin = async () => {
  const accounts = await pagoService.list()
  const pending = _.filter(accounts, { loginStatus: STEP_STATUS.PENDING })
  for (const account of pending) {
    const { id, email, password } = account
    try {
      const client = createPago({ email, password })
      const auth = await client.login()
      await pagoService.update(id, {
        ...auth,
        loginStatus: STEP_STATUS.COMPLETED,
        loginError: null,
        password: FieldValue.delete()
      })
    } catch (error) {
      await pagoService.update(id, {
        loginStatus: STEP_STATUS.FAILED,
        loginError: error.message
      })
    }
  }
}

const run = async () => {
  await runPendingPagoLogin()
  const today = dayjs().format("YYYY-MM-DD")
  const accounts = await pagoService.list()
  for (const account of accounts) {
    const { id, syncStatus, syncedAt } = account
    const isPending = syncStatus === STEP_STATUS.PENDING
    if (!isPending) {
      if (!syncedAt) continue
      const lastDay = dayjs(syncedAt).format("YYYY-MM-DD")
      if (lastDay === today) continue
      await pagoService.update(id, {
        syncStatus: STEP_STATUS.PENDING,
        syncError: null
      })
    }
  }
  const pending = await pagoService.list({ syncStatus: STEP_STATUS.PENDING })
  for (const account of pending) {
    await syncOne(account)
  }
}

const syncOne = async (account) => {
  const { id, email, password, access_token, refresh_token, createdBy } = account
  try {
    const client = createPago({ email, password, access_token, refresh_token })
    const { accountUuid } = await client.getProfile()
    const accounts = await client.getProviderAccounts(accountUuid)
    const totalDue = await fetchBills(client, createdBy, accounts)
    const { auth } = client
    await pagoService.update(id, {
      ...auth,
      totalDue,
      syncedAt: Date.now(),
      syncStatus: STEP_STATUS.COMPLETED,
      syncError: null,
      matchStatus: STEP_STATUS.PENDING,
      matchError: null,
      password: FieldValue.delete()
    })
  } catch (error) {
    await pagoService.update(id, {
      syncStatus: STEP_STATUS.FAILED,
      syncError: error.message
    })
  }
}

const fetchBills = async (client, createdBy, accounts) => {
  let totalDue = 0
  for (const account of accounts) {
    const { locations, lightProviderDTO } = account
    const { name: vendor } = lightProviderDTO
    for (const location of locations) {
      const { id: pagoId, locationLabel, service, invoices } = location
      const utilityId = objectHash({ pagoId: String(pagoId) })
      await utilityService.update(utilityId, TUtilitySync.parse({
        pagoId: String(pagoId),
        name: locationLabel || service,
        address: service || locationLabel,
        vendor,
        createdBy
      }))
      for (const invoice of invoices) {
        const { id, amountDue, dueDate } = invoice
        const ref = String(id)
        let status = "paid"
        if (amountDue) {
          totalDue += amountDue
          const iso = dueDate.replace(/^(\d{2})-(\d{2})-(\d{4}).*$/, "$3-$2-$1")
          const overdue = iso < dayjs().format("YYYY-MM-DD")
          if (overdue) status = "overdue"
          else status = "pending"
        }
        const billId = objectHash({ pagoId: ref })
        await billService.update(billId, TBillSync.parse({
          ref,
          status,
          dueAmount: amountDue,
          dueDate,
          utilityId,
          createdBy
        }))
        if (amountDue) await attachBillPdf(client, createdBy, billId, ref)
      }
    }
  }
  return totalDue
}

const attachBillPdf = async (client, createdBy, billId, ref) => {
  const id = objectHash({ pagoId: `pdf:${ref}` })
  const existing = await documentService.get(id)
  if (existing) return
  let buffer
  try {
    buffer = await client.getInvoicePdf(ref)
  } catch (error) {
    const { response } = error
    const { status } = response || {}
    if (status === 405) return
    if (status === 404) return
    throw error
  }
  const name = `${ref}.pdf`
  const storagePath = `documents/${createdBy}/${id}/${name}`
  const file = bucket.file(storagePath)
  await file.save(buffer, { contentType: "application/pdf" })
  const [url] = await file.getSignedUrl({ action: "read", expires: "03-01-2500" })
  await documentService.update(id, {
    parentType: "bill",
    parentId: billId,
    name,
    url,
    storagePath,
    createdBy
  })
}

export default { run }
