import nodemailer from "nodemailer"
import { SMTP_URL } from "./index.js"


export const sendMail = async ({ from, to, subject, text, attachments }) => {
  if (!SMTP_URL) throw new Error("SMTP_URL is required")
  const transport = nodemailer.createTransport(SMTP_URL)
  await transport.sendMail({
    from,
    to,
    subject,
    text,
    attachments
  })
}
