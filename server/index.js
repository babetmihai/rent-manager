import express from "express"
import { pathToFileURL } from "url"
import path from "path"
import _ from "lodash"
import { SERVICES_ENABLED, WAKE_CATCHUP_SECONDS, PORT, MACHINE_ID } from "./lib/index.js"
import { listenWake } from "./lib/wake.js"
import { startTicker } from "./lib/ticker.js"
import { SERVICES } from "./services/index.js"


const TICKER_SERVICES = ["purge", "email", "sync"]

const wakeCatchupSeconds = Number(WAKE_CATCHUP_SECONDS) || 120
const enabledNames = _.compact(_.map(_.split(SERVICES_ENABLED || "", ","), _.trim))
const serviceNames = _.intersection(TICKER_SERVICES, enabledNames)
const unknown = _.difference(enabledNames, _.keys(SERVICES))
if (unknown.length) throw new Error(`Unknown service in SERVICES_ENABLED: ${unknown.join(", ")}`)

const runServices = async (names = serviceNames) => {
  for (const name of names) {
    const service = SERVICES[name]
    if (!service) throw new Error(`Unknown service: ${name}`)
    console.log(`Ticker: ${name} start`)
    await service.run()
  }
}

const runTicker = () => {
  if (!serviceNames.length) {
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
  try {
    const result = await SERVICES.login.run(req.body)
    res.json(result)
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
