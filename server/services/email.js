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
    const content = await client.getInvoicePdf(ref)
    if (content) attachments.push({ filename: `${ref}.pdf`, content })
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

const sendSelected = async (account) => {
  const { email, password, access_token, refresh_token, createdBy, sendKeys = [] } = account
  const client = createPago({ email, password, access_token, refresh_token })
  const tenants = await tenantService.list({ createdBy })
  const byId = _.keyBy(tenants, "id")
  const grouped = {}
  for (const key of sendKeys) {
    const splitAt = key.indexOf(":")
    const tenantId = key.slice(0, splitAt)
    const invoiceId = key.slice(splitAt + 1)
    if (!grouped[tenantId]) grouped[tenantId] = []
    grouped[tenantId].push(invoiceId)
  }
  for (const tenantId of Object.keys(grouped)) {
    const tenant = byId[tenantId]
    if (!tenant) continue
    const { invoices = [], email: to, name } = tenant
    if (!to) throw new Error(`${name} has no email`)
    const wanted = grouped[tenantId]
    const chosen = _.filter(invoices, (invoice) => _.includes(wanted, String(invoice.id)))
    if (!chosen.length) continue
    await sendInvoices({ client, from: email, tenant, invoices: chosen, overdue: false })
    const sentAt = Date.now()
    const next = _.map(invoices, (invoice) => {
      if (!_.includes(wanted, String(invoice.id))) return invoice
      return { ...invoice, sentAt }
    })
    await tenantService.update(tenantId, { invoices: next })
  }
}

const runPendingSend = async () => {
  const accounts = await pagoService.list()
  const pending = _.filter(accounts, { sendStatus: STEP_STATUS.PENDING })
  for (const account of pending) {
    const { id } = account
    try {
      await sendSelected(account)
      await pagoService.update(id, {
        sendStatus: STEP_STATUS.COMPLETED,
        sendError: null,
        sendKeys: []
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
