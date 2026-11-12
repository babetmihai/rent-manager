import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import os from "os"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, "../../.env") })

export const TRUE = "TRUE"
export const FALSE = "FALSE"

export const STEP_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
}

export const {
  VITE_APP_VERSION,
  FIREBASE_SERVICE_ACCOUNT,
  FIREBASE_CONFIG,
  SERVICES_ENABLED,
  WAKE_CATCHUP_SECONDS,
  PORT,
  SMTP_URL
} = process.env

export const MACHINE_ID = process.env.MACHINE_ID || os.hostname()
