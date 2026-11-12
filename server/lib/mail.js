import axios from "axios"
import _ from "lodash"
import { BREVO_API_KEY } from "./index.js"


export const sendMail = async ({ to, subject, text, html, attachments }) => {
  if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY is required")
  const sender = { name: "Rent Manager", email: "rent.manager@brevosend.com" }
  const payload = {
    sender,
    to: [{ email: to }],
    subject,
    textContent: text,
    htmlContent: html
  }
  if (attachments.length) {
    payload.attachment = _.map(attachments, (file) => ({
      name: file.filename,
      content: Buffer.from(file.content).toString("base64")
    }))
  }
  await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
    headers: {
      "api-key": BREVO_API_KEY,
      "content-type": "application/json"
    }
  })
}
