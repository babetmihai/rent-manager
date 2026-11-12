import dayjs from "dayjs"
import _ from "lodash"
import { FieldValue } from "firebase-admin/firestore"
import { createServices } from "../lib/services.js"
import { STEP_STATUS } from "../lib/index.js"
import { createPago } from "../lib/pago.js"


const pagoService = createServices("pago")
const tenantService = createServices("tenants")

const syncAccount = async (account) => {
  const { id, email, password, access_token, refresh_token, createdBy } = account
  const client = createPago({ email, password, access_token, refresh_token })
  const { accountUuid } = await client.getProfile()
  const providers = await client.getProviderAccounts(accountUuid)
  const tenants = await tenantService.list({ createdBy })
  const byName = _.groupBy(tenants, (tenant) => _.toLower(_.trim(tenant.name)))
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
      let matched = byName[key]
      if (!matched) {
        const tenant = await tenantService.create({
          name: _.trim(pointName),
          createdBy
        })
        matched = [tenant]
        byName[key] = matched
        tenants.push(tenant)
      }
      for (const tenant of matched) {
        const { id: tenantId } = tenant
        onPago[tenantId] = true
        if (!invoicesByTenant[tenantId]) invoicesByTenant[tenantId] = []
        for (const invoice of invoices) {
          invoicesByTenant[tenantId].push({ ...invoice, vendor, pointName })
        }
      }
    }
  }
  for (const tenant of tenants) {
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

const run = async () => {
  const today = dayjs().format("YYYY-MM-DD")
  const accounts = await pagoService.list()
  for (const account of accounts) {
    const { id, loginStatus, syncedAt, syncStatus } = account
    if (loginStatus !== STEP_STATUS.COMPLETED) continue
    const asked = syncStatus === STEP_STATUS.PENDING
    const syncedToday = syncedAt && dayjs(syncedAt).format("YYYY-MM-DD") === today
    if (!asked && syncedToday) continue
    try {
      await syncAccount(account)
    } catch (error) {
      await pagoService.update(id, {
        mailError: error.message,
        syncStatus: STEP_STATUS.FAILED,
        syncError: error.message
      })
    }
  }
}

export default { run }
