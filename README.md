# Rent Manager

Sign in with a Pago account and keep a list of tenants (name, description, email, notifications). Once a day the ticker reads Pago invoices for every consumption point, matches the point name to the tenant name, and emails unpaid invoice PDFs to that tenant: once when the invoice appears, and again when it is overdue.

Stack: Vite, React, Redux, Mantine, Tailwind, Firebase Auth/Firestore, Express ticker.

Each signed-in user only sees their own documents (`createdBy`).

```sh
cp .env.example .env
cp firebaseConfig.example.json firebaseConfig.json
# fill firebaseConfig.json, FIREBASE_SERVICE_ACCOUNT, and BREVO_API_KEY in .env
npm install
npm start
```

UI at `http://localhost:5173`. App health at `http://localhost:3002/health`. Pago sync is a separate process (`npm run sync`, health at `http://localhost:3003/health`). It pulls invoices once a day for every signed-in account, and again when refresh marks that account pending. Deploy it on its own. The app process serves sign-in, mail, and purge.

Firebase Auth needs Email/Password and Anonymous sign-in. `BREVO_API_KEY` sends the mail. The From address is the Pago account email, and that address has to be a verified Brevo sender.

## SDK

Thin ESM client for Pago. Node 18+.

```js
import { createPago } from "./server/lib/pago.js"

const client = createPago({
  email: process.env.PAGO_EMAIL,
  password: process.env.PAGO_PASSWORD
})
const accounts = await client.getProviderAccounts(accountUuid)
```

```sh
npm test
```
