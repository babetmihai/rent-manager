import { createPago } from "../src/index.js"


const client = createPago({
  email: process.env.PAGO_EMAIL,
  password: process.env.PAGO_PASSWORD
})

const bills = await client.getBills()
const accounts = await client.getInvoiceAccounts()
const providers = await client.getProviders()
const billAccounts = await client.getBillAccounts()
const transactions = await client.getTransactions()
const totalDue = bills.reduce((sum, { dueAmount }) => sum + Number(dueAmount), 0)
console.log({
  bills: bills.length,
  totalDue,
  accounts: accounts.length,
  providers: providers.length,
  billAccounts,
  transactions: transactions.length
})
