import express from "express"
import _ from "lodash"
import { SERVICES_ENABLED, WAKE_CATCHUP_SECONDS, PORT, MACHINE_ID } from "./lib/index.js"
import { listenWake } from "./lib/wake.js"
import pagoSyncService from "./services/pago_sync.js"
import createTenantService from "./services/create_tenant.js"
import createTenantsService from "./services/create_tenants.js"
import pagoMatchService from "./services/pago_match.js"
import matchTenantService from "./services/match_tenant.js"
import purgeService from "./services/purge.js"
import billsMailService from "./services/bills_mail.js"


const SERVICE_BY_NAME = {
  pago_sync: pagoSyncService,
  create_tenant: createTenantService,
  create_tenants: createTenantsService,
  pago_match: pagoMatchService,
  match_tenant: matchTenantService,
  purge: purgeService,
  bills_mail: billsMailService
}

const wakeCatchupSeconds = Number(WAKE_CATCHUP_SECONDS) || 120
const serviceNames = _.compact(_.map(_.split(SERVICES_ENABLED || "", ","), _.trim))
const services = _.map(serviceNames, (name) => {
  const service = SERVICE_BY_NAME[name]
  if (!service) throw new Error(`Unknown service in SERVICES_ENABLED: ${name}`)
  return service
})

let inProgress = false
let wakeAgain = false

const cycle = async (reason) => {
  if (inProgress) {
    wakeAgain = true
    console.log(`Ticker: cycle in progress, queuing wake (${reason})`)
    return
  }
  inProgress = true
  try {
    do {
      wakeAgain = false
      console.log(`Ticker: cycle start (${reason}) machine=${MACHINE_ID}`)
      for (const name of serviceNames) {
        console.log(`Ticker: ${name} start`)
        await SERVICE_BY_NAME[name].run()
      }
      console.log("Ticker: cycle done")
    } while (wakeAgain)
  } finally {
    inProgress = false
  }
}

const runTicker = () => {
  if (!services.length) {
    console.log("No services enabled (set SERVICES_ENABLED in .env)")
    return
  }

  console.log(`Starting ticker machine=${MACHINE_ID} services=${serviceNames.join(", ")}`)
  console.log(`Wake-driven; catch-up every ${wakeCatchupSeconds}s`)

  listenWake(() => {
    void cycle("wake")
  })

  setInterval(() => {
    void cycle("catch-up")
  }, wakeCatchupSeconds * 1000)

  void cycle("startup")
}

const app = express()
app.get("/health", (req, res) => {
  res.json({ ok: true, services: serviceNames })
})

const port = Number(PORT) || 3002
app.listen(port, () => {
  console.log(`Server started on ${port}`)
  runTicker()
})
