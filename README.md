# Rent Manager

Property app for apartments. It uses the Pago API to connect one account and assign invoices to apartments. Dark editorial chrome (mihaibabet.ro). Stack: Vite, React, Redux, Mantine, Tailwind, Firebase Auth/Firestore/Storage, Express ticker.

Each signed-in user only sees their own documents (`createdBy`).

```sh
cp .env.example .env
cp firebaseConfig.example.json firebaseConfig.json
# fill firebaseConfig.json and FIREBASE_SERVICE_ACCOUNT in .env
npm install
npm start
```

UI at `http://localhost:5173`. Ticker health at `http://localhost:3002/health`.

## App

- Apartments (name, address, rent due)
- Documents on apartments
- One Pago account per user. Sync writes invoices (`ref` = Pago invoice id, plus vendor/address) and attaches the Pago PDF. Auto-assigns with Ollama (`llama3.2:3b`); you can still assign manually
- Apartment balance: rent due + assigned Pago dues

## SDK

Thin ESM client for Pago. Node 18+.

```js
import { createPago } from "./server/lib/pago.js"

const client = createPago({
  email: process.env.PAGO_EMAIL,
  password: process.env.PAGO_PASSWORD
})
const bills = await client.getBills()
const accounts = await client.getInvoiceAccounts()
const providers = await client.getProviders()
const billAccounts = await client.getBillAccounts()
```

```sh
npm test
```
