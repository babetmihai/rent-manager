import _ from "lodash"
import path from "node:path"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import { createServices } from "../lib/services.js"
import { STEP_STATUS } from "../lib/index.js"
import { auth, bucket } from "../lib/firebase.js"
import { sendMail } from "../lib/mail.js"


dayjs.extend(customParseFormat)


const tenantService = createServices("tenants")
const utilityService = createServices("utilities")
const billService = createServices("bills")
const documentService = createServices("documents")

const formatAmount = (value) => {
  return Number(value || 0).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON"
  })
}

const sendBills = async (tenant) => {
  const { id, name, email, createdBy } = tenant
  const { email: from } = await auth.getUser(createdBy)
  if (!from) throw new Error("auth email is required")
  const utilities = await utilityService.list({ createdBy, tenantId: id })
  const utilitiesById = _.keyBy(utilities, "id")
  const bills = await billService.list({ createdBy })
  const due = _.filter(bills, (bill) => {
    const { ref, dueAmount, utilityId } = bill
    return ref && dueAmount && utilitiesById[utilityId]
  })
  const documents = await documentService.list({ createdBy })
  const billIds = _.keyBy(due, "id")
  const files = _.filter(documents, (item) => {
    const { parentType, parentId, storagePath } = item
    return parentType === "bill" && billIds[parentId] && storagePath
  })
  const attachments = []
  for (const file of files) {
    const { name: fileName, storagePath, parentId } = file
    const { ref } = billIds[parentId]
    const [content] = await bucket.file(storagePath).download()
    attachments.push({
      filename: _.join(_.compact([ref, fileName || path.basename(storagePath)]), "-"),
      content
    })
  }
  const lines = _.map(due, (bill) => {
    const { ref, dueDate, dueAmount, utilityId } = bill
    const { vendor, name: utilityName, address } = utilitiesById[utilityId]
    return _.join(_.compact([
      vendor,
      utilityName,
      address,
      ref,
      dueDate && dayjs(dueDate, "DD-MM-YYYY").format("YYYY-MM-DD"),
      formatAmount(dueAmount)
    ]), " · ")
  })
  const total = _.sumBy(due, (bill) => Number(bill.dueAmount) || 0)
  await sendMail({
    from,
    to: email,
    subject: "Bills",
    text: _.join(_.compact([name, "", ...lines, "", formatAmount(total)]), "\n"),
    attachments
  })
}

const run = async () => {
  const pending = await tenantService.list({ emailStatus: STEP_STATUS.PENDING })
  for (const tenant of pending) {
    const { id } = tenant
    try {
      await sendBills(tenant)
      await tenantService.update(id, {
        emailStatus: STEP_STATUS.COMPLETED,
        emailError: null
      })
    } catch (error) {
      await tenantService.update(id, {
        emailStatus: STEP_STATUS.FAILED,
        emailError: error.message
      })
    }
  }
}

export default { run }
