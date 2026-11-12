import dayjs from "dayjs"
import _ from "lodash"
import { FieldValue } from "firebase-admin/firestore"
import { createServices } from "../lib/services.js"
import { versionRef } from "../lib/firebase.js"
import { claimLock, releaseLock } from "../lib/lock.js"
import { STEP_STATUS } from "../lib/index.js"
import { createPago } from "../lib/pago.js"


const pagoService = createServices("pago")
const tenantService = createServices("tenants")

const keepOne = async (tenants) => {
  const named = {}
  for (const tenant of tenants) {
    const key = _.toLower(_.trim(tenant.name))
    const current = named[key]
    if (!current) {
      named[key] = tenant
      continue
    }
    let keep = current
    let drop = tenant
    if (tenant.createdAt < current.createdAt) {
      keep = tenant
      drop = current
    }
    const { invoices: kept = [] } = keep
    const { invoices: dropped = [] } = drop
    const invoices = _.keyBy(kept, (invoice) => String(invoice.id))
    for (const invoice of dropped) {
      if (!invoice.sentAt) continue
      const prior = invoices[String(invoice.id)]
      if (prior && prior.sentAt) continue
      invoices[String(invoice.id)] = { ...(prior || invoice), sentAt: invoice.sentAt }
    }
    keep.invoices = _.values(invoices)
    await tenantService.remove(drop.id)
    named[key] = keep
  }
  return named
}

const syncAccount = async (account) => {
  const { id, email, password, access_token, refresh_token, createdBy } = account
  const client = createPago({ email, password, access_token, refresh_token })
  const { accountUuid } = await client.getProfile()
  const providers = await client.getProviderAccounts(accountUuid)
  const tenants = await tenantService.list({ createdBy })
  const named = await keepOne(tenants)
  const invoicesByTenant = {}
  const onPago = {}
  for (const provider of providers) {
    const { locations = [], lightProviderDTO = {} } = provider
    const { name: vendor } = lightProviderDTO
    for (const location of locations) {
      const { locationLabel, service, invoices = [] } = location
      const pointName = locationLabel || service
      const key = _.toLower(_.trim(pointName))
      if (!key) continue
      let tenant = named[key]
      if (!tenant) {
        tenant = await tenantService.create({
          name: _.trim(pointName),
          createdBy
        })
        named[key] = tenant
      }
      const { id: tenantId } = tenant
      onPago[tenantId] = true
      if (!invoicesByTenant[tenantId]) invoicesByTenant[tenantId] = []
      for (const invoice of invoices) {
        invoicesByTenant[tenantId].push({ ...invoice, vendor, pointName })
      }
    }
  }
  for (const tenant of Object.values(named)) {
    const { id: tenantId, invoices: current = [] } = tenant
    if (!onPago[tenantId]) {
      await tenantService.remove(tenantId)
      continue
    }
    let invoices = invoicesByTenant[tenantId]
    if (!invoices) invoices = []
    const previous = _.keyBy(current, (invoice) => String(invoice.id))
    const next = _.map(invoices, (invoice) => {
      const prior = previous[String(invoice.id)] || {}
      const { sentAt } = prior
      if (!sentAt) return invoice
      return { ...invoice, sentAt }
    })
    await tenantService.update(tenantId, { invoices: next })
  }
  const { auth: nextAuth } = client
  const patch = {
    password: FieldValue.delete(),
    syncedAt: Date.now(),
    syncStatus: STEP_STATUS.COMPLETED,
    syncError: null,
    mailError: null
  }
  if (nextAuth) Object.assign(patch, nextAuth)
  await pagoService.update(id, patch)
}

const due = (account, today) => {
  const { loginStatus, syncedAt, syncStatus } = account
  if (loginStatus !== STEP_STATUS.COMPLETED) return false
  if (syncStatus === STEP_STATUS.PENDING) return true
  if (!syncedAt) return true
  return dayjs(syncedAt).format("YYYY-MM-DD") !== today
}

const run = async () => {
  const today = dayjs().format("YYYY-MM-DD")
  const accounts = await pagoService.list()
  for (const account of accounts) {
    if (!due(account, today)) continue
    const { id } = account
    const ref = versionRef.collection("pago").doc(id)
    const token = await claimLock(ref, "sync")
    if (!token) continue
    try {
      const fresh = await pagoService.get(id)
      if (!due(fresh, today)) continue
      await syncAccount(fresh)
    } catch (error) {
      await pagoService.update(id, {
        mailError: error.message,
        syncStatus: STEP_STATUS.FAILED,
        syncError: error.message
      })
    } finally {
      await releaseLock(ref, token, "sync")
    }
  }
}

export default { run }
