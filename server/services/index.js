import loginService from "./login.js"
import purgeService from "./purge.js"
import emailService from "./email.js"
import syncService from "./sync.js"


export const SERVICES = {
  login: loginService,
  purge: purgeService,
  email: emailService,
  sync: syncService
}
