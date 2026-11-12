import dayjs from "dayjs"
import _ from "lodash"
import { FieldValue } from "firebase-admin/firestore"
import { createServices } from "../lib/services.js"
import { STEP_STATUS } from "../lib/index.js"
import { createPago } from "../lib/pago.js"
import { sendMail } from "../lib/mail.js"


const pagoService = createServices("pago")
const tenantService = createServices("tenants")

const formatAmount = (value) => {
  return Number(value).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON"
  })
}

const sendInvoices = async ({ client, from, tenant, invoices, overdue }) => {
  const { name, email } = tenant
  const attachments = []
  for (const invoice of invoices) {
    const { id } = invoice
    const ref = String(id)
    let content
    try {
      content = await client.getInvoicePdf(ref)
    } catch (error) {
      const { response } = error
      const { status } = response || {}
      if (status === 404 || status === 405) continue
      throw error
    }
    attachments.push({ filename: `${ref}.pdf`, content })
  }
  const lines = _.map(invoices, (invoice) => {
    const { id, dueDate, amountDue, vendor, pointName } = invoice
    let due = dueDate
    if (dueDate) due = dueDate.replace(/^(\d{2})-(\d{2})-(\d{4}).*$/, "$3-$2-$1")
    return _.join(_.compact([vendor, pointName, String(id), due, formatAmount(amountDue)]), " · ")
  })
  const total = _.sumBy(invoices, (invoice) => Number(invoice.amountDue))
  let subject = "Invoices"
  if (overdue) subject = "Overdue invoices"
  await sendMail({
    from,
    to: email,
    subject,
    text: _.join(_.compact([name, "", ...lines, "", formatAmount(total)]), "\n"),
    attachments
  })
}

const runPendingLogin = async () => {
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

const mailAccount = async (account) => {
  const { id, email, password, access_token, refresh_token, createdBy } = account
  const client = createPago({ email, password, access_token, refresh_token })
  const { accountUuid } = await client.getProfile()
  const providers = await client.getProviderAccounts(accountUuid)
  const tenants = await tenantService.list({ createdBy })
  const byName = _.groupBy(tenants, (tenant) => _.toLower(_.trim(tenant.name)))
  const invoicesByTenant = {}
  for (const provider of providers) {
    const { locations = [], lightProviderDTO = {} } = provider
    const { name: vendor } = lightProviderDTO
    for (const location of locations) {
      const { locationLabel, service, invoices = [] } = location
      const pointName = locationLabel || service
      const key = _.toLower(_.trim(pointName))
      if (!key) continue
      const matched = byName[key]
      if (!matched) continue
      for (const tenant of matched) {
        const { id: tenantId } = tenant
        if (!invoicesByTenant[tenantId]) invoicesByTenant[tenantId] = []
        for (const invoice of invoices) {
          invoicesByTenant[tenantId].push({ ...invoice, vendor, pointName })
        }
      }
    }
  }
  const today = dayjs().format("YYYY-MM-DD")
  let failed = null
  for (const tenant of tenants) {
    const { id: tenantId, notifications, email: to, mailed: sent = {} } = tenant
    let invoices = invoicesByTenant[tenantId]
    if (!invoices) invoices = []
    await tenantService.update(tenantId, { invoices })
    if (notifications !== true) continue
    if (!to) continue
    if (!invoices.length) continue
    try {
      const fresh = []
      const overdue = []
      for (const invoice of invoices) {
        const { id: invoiceId, amountDue, dueDate } = invoice
        if (!amountDue) continue
        const ref = String(invoiceId)
        const mark = sent[ref]
        if (mark === "overdue") continue
        let isOverdue = false
        if (dueDate) {
          const iso = dueDate.replace(/^(\d{2})-(\d{2})-(\d{4}).*$/, "$3-$2-$1")
          isOverdue = iso < today
        }
        if (isOverdue) {
          overdue.push(invoice)
          continue
        }
        if (mark === "new") continue
        fresh.push(invoice)
      }
      const mailed = { ...sent }
      if (fresh.length) {
        await sendInvoices({ client, from: email, tenant, invoices: fresh, overdue: false })
        for (const invoice of fresh) mailed[String(invoice.id)] = "new"
        await tenantService.update(tenantId, { mailed, mailError: null })
      }
      if (overdue.length) {
        await sendInvoices({ client, from: email, tenant, invoices: overdue, overdue: true })
        for (const invoice of overdue) mailed[String(invoice.id)] = "overdue"
        await tenantService.update(tenantId, { mailed, mailError: null })
      }
    } catch (error) {
      failed = error
      await tenantService.update(tenantId, { mailError: error.message })
    }
  }
  const { auth: nextAuth } = client
  const patch = {
    password: FieldValue.delete()
  }
  if (nextAuth) Object.assign(patch, nextAuth)
  if (failed) {
    patch.mailError = failed.message
    patch.syncStatus = STEP_STATUS.FAILED
    patch.syncError = failed.message
  } else {
    patch.syncedAt = Date.now()
    patch.mailedAt = Date.now()
    patch.mailError = null
    patch.syncStatus = STEP_STATUS.COMPLETED
    patch.syncError = null
  }
  await pagoService.update(id, patch)
}

const run = async () => {
  await runPendingLogin()
  const today = dayjs().format("YYYY-MM-DD")
  const accounts = await pagoService.list()
  for (const account of accounts) {
    const { id, loginStatus, syncedAt, syncStatus } = account
    if (loginStatus !== STEP_STATUS.COMPLETED) continue
    const asked = syncStatus === STEP_STATUS.PENDING
    const syncedToday = syncedAt && dayjs(syncedAt).format("YYYY-MM-DD") === today
    if (!asked && syncedToday) continue
    try {
      await mailAccount(account)
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
