import express from "express"
import { PORT, SYNC_PORT } from "./lib/index.js"
import { listenSync } from "./lib/wake.js"
import { startTicker } from "./lib/ticker.js"
import syncService from "./services/sync.js"


const DAY_SECONDS = 24 * 60 * 60

const app = express()

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "sync" })
})

const port = Number(SYNC_PORT || PORT) || 3003
app.listen(port, () => {
  console.log(`Sync started on ${port}`)
  startTicker({
    label: "Sync",
    run: () => syncService.run(),
    listen: listenSync,
    intervalSeconds: DAY_SECONDS
  })
})
