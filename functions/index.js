import { onRequest } from "firebase-functions/v2/https"
import { onDocumentWritten } from "firebase-functions/v2/firestore"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { defineSecret } from "firebase-functions/params"
import { app, runServices } from "./server/index.js"


const brevoKey = defineSecret("BREVO_API_KEY")
const region = "europe-west1"

export const login = onRequest({
  region,
  secrets: [brevoKey],
  invoker: "public",
  timeoutSeconds: 60
}, app)

export const ticker = onDocumentWritten({
  document: "versions/{version}/meta/wake",
  region,
  secrets: [brevoKey],
  timeoutSeconds: 300
}, () => runServices())

export const tickerCatchup = onSchedule({
  schedule: "every 2 minutes",
  region,
  secrets: [brevoKey],
  timeoutSeconds: 300
}, () => runServices())

export const sync = onDocumentWritten({
  document: "versions/{version}/meta/sync",
  region,
  timeoutSeconds: 540,
  memory: "1GiB"
}, () => runServices(["sync"]))

export const syncDaily = onSchedule({
  schedule: "every 24 hours",
  region,
  timeoutSeconds: 540,
  memory: "1GiB"
}, () => runServices(["sync"]))
