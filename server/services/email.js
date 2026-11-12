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

const formatAmount = (value) => Number(value).toLocaleString("ro-RO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => {
  if (char === "&") return "&amp;"
  if (char === "<") return "&lt;"
  if (char === ">") return "&gt;"
  return "&quot;"
})

const formatDue = (dueDate) => {
  if (!dueDate) return ""
  return dueDate.replace(/^(\d{2})-(\d{2})-(\d{4}).*$/, "$1.$2.$3")
}

const money = (value, color) => {
  const amount = escapeHtml(formatAmount(value))
  const serif = "font-family:Georgia,'Iowan Old Style',Palatino,serif;font-size:17px;"
  const unit = "font-size:10px;letter-spacing:0.08em;color:#8a8175;"
  return `<span style="${serif}color:${color};">${amount}</span> <span style="${unit}">RON</span>`
}

const sendInvoices = async ({ client, to, invoices, overdue }) => {
  const attachments = []
  for (const invoice of invoices) {
    const { id } = invoice
    const ref = String(id)
    const content = await client.getInvoicePdf(ref)
    if (content) attachments.push({ filename: `${ref}.pdf`, content })
  }
  const groups = _.groupBy(invoices, "tenantId")
  const textSections = []
  const cards = _.map(groups, (group) => {
    const { name } = group[0]
    const lines = _.map(group, (invoice) => {
      const { dueDate, amountDue, vendor } = invoice
      const due = formatDue(dueDate)
      return _.join(_.compact([vendor, due, `${formatAmount(amountDue)} RON`]), "\n")
    })
    const sectionTotal = _.sumBy(group, (invoice) => Number(invoice.amountDue))
    textSections.push(_.join([name, "", ...lines, "", `${formatAmount(sectionTotal)} RON`], "\n\n"))
    const rows = _.map(group, (invoice) => {
      const { dueDate, amountDue, vendor } = invoice
      const due = formatDue(dueDate)
      return `<tr>
        <td style="padding:11px 12px 11px 0;border-top:1px solid rgba(28,25,21,0.08);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#1c1915;">${escapeHtml(vendor || "")}</td>
        <td style="padding:11px 12px;border-top:1px solid rgba(28,25,21,0.08);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#8a8175;white-space:nowrap;">${escapeHtml(due)}</td>
        <td align="right" style="padding:11px 0;border-top:1px solid rgba(28,25,21,0.08);white-space:nowrap;">${money(amountDue, "#8c3a2f")}</td>
      </tr>`
    })
    const rowBreak = `<tr><td colspan="3" style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>`
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffcf8;border-radius:16px;">
      <tr><td style="padding:24px 24px 8px;font-family:Georgia,'Iowan Old Style',Palatino,serif;font-size:28px;line-height:1.05;letter-spacing:-0.03em;color:#1c1915;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:4px 24px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join(rowBreak)}</table></td></tr>
      <tr><td align="right" style="padding:14px 24px 22px;border-top:1px solid rgba(28,25,21,0.08);">${money(sectionTotal, "#1c1915")}</td></tr>
    </table>`
  })
  let subject = "Invoices"
  if (overdue) subject = "Overdue invoices"
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#efece6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efece6;">
      <tr><td align="center" style="padding:32px 16px;">${cards.join(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;"><tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr></table>`)}</td></tr>
    </table>
  </body></html>`
  await sendMail({
    to,
    subject,
    text: textSections.join("\n\n\n"),
    html,
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
