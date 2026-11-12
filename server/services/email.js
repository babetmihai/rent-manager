import _ from "lodash"
import { FieldValue } from "firebase-admin/firestore"
import { createServices } from "../lib/services.js"
import { versionRef } from "../lib/firebase.js"
import { claimLock, releaseLock } from "../lib/lock.js"
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

const sendInvoices = async ({ client, to, invoices, overdue }) => {
  const attachments = []
  for (const invoice of invoices) {
    const { id } = invoice
    const ref = String(id)
    const content = await client.getInvoicePdf(ref)
    if (content) attachments.push({ filename: `${ref}.pdf`, content })
  }
  const sections = _.map(_.groupBy(invoices, "tenantId"), (group) => {
    const { name } = group[0]
    const lines = _.map(group, (invoice) => {
      const { id, dueDate, amountDue, vendor, pointName } = invoice
      let due = dueDate
      if (dueDate) due = dueDate.replace(/^(\d{2})-(\d{2})-(\d{4}).*$/, "$3-$2-$1")
      return _.join(_.compact([vendor, pointName, String(id), due, formatAmount(amountDue)]), " · ")
    })
    return _.join([name, "", ...lines], "\n")
  })
  const total = _.sumBy(invoices, (invoice) => Number(invoice.amountDue))
  let subject = "Invoices"
  if (overdue) subject = "Overdue invoices"
  await sendMail({
    to,
    subject,
    text: _.join([...sections, "", formatAmount(total)], "\n"),
    attachments
  })
}

const hold = async (id, step, work) => {
  const ref = versionRef.collection("pago").doc(id)
  const token = await claimLock(ref, step)
  if (!token) return
  try {
    const fresh = await pagoService.get(id)
    if (fresh[`${step}Status`] !== STEP_STATUS.PENDING) return
    await work(fresh)
  } finally {
    await releaseLock(ref, token, step)
  }
}

const runPendingLogin = async () => {
  const accounts = await pagoService.list()
  const pending = _.filter(accounts, { loginStatus: STEP_STATUS.PENDING })
  for (const account of pending) {
    const { id } = account
    try {
      await hold(id, "login", async (fresh) => {
        const { email, password } = fresh
        const client = createPago({ email, password })
        const auth = await client.login()
        await pagoService.update(id, {
          ...auth,
          loginStatus: STEP_STATUS.COMPLETED,
          loginError: null,
          password: FieldValue.delete()
        })
      })
    } catch (error) {
      await pagoService.update(id, {
        loginStatus: STEP_STATUS.FAILED,
        loginError: error.message
      })
    }
  }
}

const sendSelected = async (account) => {
  const { email, password, access_token, refresh_token, createdBy, sendKeys = [] } = account
  const client = createPago({ email, password, access_token, refresh_token })
  const tenants = await tenantService.list({ createdBy })
  const byId = _.keyBy(tenants, "id")
  const byEmail = {}
  for (const key of sendKeys) {
    const splitAt = key.indexOf(":")
    const tenantId = key.slice(0, splitAt)
    const invoiceId = key.slice(splitAt + 1)
    const tenant = byId[tenantId]
    if (!tenant) continue
    const { invoices = [], email: to, name } = tenant
    if (!_.trim(to)) throw new Error(`${name} has no email`)
    const invoice = _.find(invoices, (item) => String(item.id) === invoiceId)
    if (!invoice) continue
    const address = _.toLower(_.trim(to))
    if (!byEmail[address]) byEmail[address] = { to: _.trim(to), invoices: [] }
    byEmail[address].invoices.push({ ...invoice, name, tenantId })
  }
  for (const group of Object.values(byEmail)) {
    const { to, invoices } = group
    await sendInvoices({ client, to, invoices, overdue: false })
    const sentAt = Date.now()
    const byTenant = _.groupBy(invoices, "tenantId")
    for (const tenantId of Object.keys(byTenant)) {
      const tenant = byId[tenantId]
      const { invoices: current = [] } = tenant
      const wanted = _.map(byTenant[tenantId], (invoice) => String(invoice.id))
      const next = _.map(current, (invoice) => {
        if (!_.includes(wanted, String(invoice.id))) return invoice
        return { ...invoice, sentAt }
      })
      await tenantService.update(tenantId, { invoices: next })
    }
  }
}

const runPendingSend = async () => {
  const accounts = await pagoService.list()
  const pending = _.filter(accounts, { sendStatus: STEP_STATUS.PENDING })
  for (const account of pending) {
    const { id } = account
    try {
      await hold(id, "send", async (fresh) => {
        await sendSelected(fresh)
        await pagoService.update(id, {
          sendStatus: STEP_STATUS.COMPLETED,
          sendError: null,
          sendKeys: []
        })
      })
    } catch (error) {
      await pagoService.update(id, {
        sendStatus: STEP_STATUS.FAILED,
        sendError: error.message
      })
    }
  }
}

const run = async () => {
  await runPendingLogin()
  await runPendingSend()
}

export default { run }
