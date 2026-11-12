import { createHash } from "crypto"
import _ from "lodash"
import { FieldValue } from "firebase-admin/firestore"
import { STEP_STATUS } from "../lib/index.js"
import { auth } from "../lib/firebase.js"
import { createPago } from "../lib/pago.js"
import { createServices } from "../lib/services.js"


const pagoAccounts = createServices("pago")

const run = async (body) => {
  const { email, password } = body || {}
  const trimmed = _.trim(email)
  const client = createPago({ email: trimmed, password })
  const session = await client.login()
  const accounts = await pagoAccounts.list()
  const existing = _.find(accounts, (account) => _.toLower(account.email) === _.toLower(trimmed))
  let uid = existing && existing.createdBy
  if (!uid) uid = createHash("sha256").update(_.toLower(trimmed)).digest("hex").slice(0, 28)
  const token = await auth.createCustomToken(uid)
  const saved = {
    ...session,
    email: trimmed,
    createdBy: uid,
    loginStatus: STEP_STATUS.COMPLETED,
    loginError: null
  }
  if (existing) {
    await pagoAccounts.update(existing.id, {
      ...saved,
      password: FieldValue.delete()
    })
  } else {
    await pagoAccounts.create(saved)
  }
  return { token }
}

export default { run }
