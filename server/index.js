import express from "express"
import { createHash } from "crypto"
import { pathToFileURL } from "url"
import path from "path"
import _ from "lodash"
import { FieldValue } from "firebase-admin/firestore"
import { SERVICES_ENABLED, WAKE_CATCHUP_SECONDS, PORT, MACHINE_ID, STEP_STATUS } from "./lib/index.js"
import { listenWake } from "./lib/wake.js"
import { startTicker } from "./lib/ticker.js"
import { auth } from "./lib/firebase.js"
import { createPago } from "./lib/pago.js"
import { createServices } from "./lib/services.js"
import emailService from "./services/email.js"
import purgeService from "./services/purge.js"


const SERVICE_BY_NAME = {
  purge: purgeService,
  email: emailService
}

const wakeCatchupSeconds = Number(WAKE_CATCHUP_SECONDS) || 120
const serviceNames = _.compact(_.map(_.split(SERVICES_ENABLED || "", ","), _.trim))
const services = _.map(serviceNames, (name) => {
  const service = SERVICE_BY_NAME[name]
  if (!service) throw new Error(`Unknown service in SERVICES_ENABLED: ${name}`)
  return service
})

const runServices = async () => {
  for (const name of serviceNames) {
    console.log(`Ticker: ${name} start`)
    await SERVICE_BY_NAME[name].run()
  }
}

const runTicker = () => {
  if (!services.length) {
    console.log("No services enabled (set SERVICES_ENABLED in .env)")
    return
  }
  console.log(`Starting ticker machine=${MACHINE_ID} services=${serviceNames.join(", ")}`)
  startTicker({
    label: "Ticker",
    run: runServices,
    listen: listenWake,
    intervalSeconds: wakeCatchupSeconds
  })
}

const pagoAccounts = createServices("pago")

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  if (!process.env.K_SERVICE) return next()
  if (req.url.startsWith("/ticker")) req.url = req.url.slice("/ticker".length) || "/"
  next()
})

app.get("/health", (req, res) => {
  res.json({ ok: true, services: serviceNames })
})

app.post("/auth/pago", async (req, res) => {
  const { email, password } = req.body || {}
  const trimmed = _.trim(email)
  try {
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
    res.json({ token })
  } catch (error) {
    const { message } = error
    const rejected = message === "Pago login failed" || message === "login rejected" || message === "unauthorized"
    let status = 500
    if (rejected) status = 401
    res.status(status).json({ error: message })
  }
})

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isMain) {
  const port = Number(PORT) || 3002
  app.listen(port, () => {
    console.log(`Server started on ${port}`)
    runTicker()
  })
}

export { app, runServices }
