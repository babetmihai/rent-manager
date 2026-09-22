import assert from "node:assert/strict"
import { test } from "node:test"
import { createPago } from "../server/lib/pago.js"
import { mockHttp } from "./mock.js"


test("login stores access_token and retries once on 401", async () => {
  const calls = []
  const client = createPago({
    email: "a@b.c",
    password: "secret",
    http: mockHttp(async (config) => {
      calls.push(config)
      if (config.url.includes("/oauth/token")) {
        return { data: { access_token: `token-${calls.length}`, expires_in: 3600 } }
      }
      if (calls.filter((call) => call.url.includes("/sdk/bills/accounts/summary")).length === 1) {
        return { status: 401, data: { error: "expired" } }
      }
      return { data: { error: false, data: { billsList: [{ id: 1, dueAmount: 75.5 }] } } }
    })
  })
  const bills = await client.getBills()
  assert.equal(bills[0].dueAmount, 75.5)
  assert.equal(client.token, "token-3")
  assert.equal(calls.filter((call) => call.url.includes("/oauth/token")).length, 2)
  assert.equal(calls.at(-1).headers.Authorization, "Bearer token-3")
})

test("login uses pago grant and basic auth", async () => {
  let body
  let headers
  const client = createPago({
    email: "ion@email.ro",
    password: "secret",
    http: mockHttp(async (config) => {
      body = config.data
      headers = config.headers
      return { data: { access_token: "tok" } }
    })
  })
  await client.login()
  assert.equal(String(body), "grant_type=pago&username=ion%40email.ro&password=secret")
  assert.match(headers.Authorization, /^Basic /)
})

test("login returns the token payload", async () => {
  const payload = { access_token: "tok", refresh_token: "ref", expires_in: 3600 }
  const client = createPago({
    email: "a@b.c",
    password: "secret",
    http: mockHttp(async () => ({ data: payload }))
  })
  const auth = await client.login()
  assert.equal(auth.access_token, "tok")
  assert.equal(auth.refresh_token, "ref")
  assert.equal(client.token, "tok")
  assert.equal(client.auth.refresh_token, "ref")
})

test("uses stored access_token without password", async () => {
  const calls = []
  const client = createPago({
    access_token: "tok",
    http: mockHttp(async (config) => {
      calls.push(config)
      return { data: { error: false, data: { billsList: [] } } }
    })
  })
  await client.getBills()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].headers.Authorization, "Bearer tok")
})

test("401 refreshes with refresh_token", async () => {
  const calls = []
  const client = createPago({
    access_token: "old",
    refresh_token: "ref",
    http: mockHttp(async (config) => {
      calls.push(config)
      if (config.url.includes("/oauth/token")) {
        return { data: { access_token: "new", refresh_token: "ref2" } }
      }
      if (calls.filter((call) => call.url.includes("/sdk/bills/accounts/summary")).length === 1) {
        return { status: 401, data: { error: "expired" } }
      }
      return { data: { error: false, data: { billsList: [{ id: 1, dueAmount: 10 }] } } }
    })
  })
  const bills = await client.getBills()
  assert.equal(bills[0].dueAmount, 10)
  assert.equal(client.token, "new")
  assert.equal(client.auth.refresh_token, "ref2")
  const tokenCall = calls.find((call) => call.url.includes("/oauth/token"))
  assert.equal(String(tokenCall.data), "grant_type=refresh_token&refresh_token=ref")
})

test("getBills unwraps billsList", async () => {
  const client = createPago({
    email: "a@b.c",
    password: "secret",
    http: mockHttp(async (config) => {
      if (config.url.includes("/oauth/token")) return { data: { access_token: "tok" } }
      return { data: { error: false, data: { billsList: [{ dueAmount: 75.5, dueDate: "20260915" }] } } }
    })
  })
  const bills = await client.getBills()
  assert.equal(bills.length, 1)
  assert.equal(bills[0].dueAmount, 75.5)
})

test("getProviders returns catalog as-is", async () => {
  const client = createPago({
    email: "a@b.c",
    password: "secret",
    http: mockHttp(async (config) => {
      if (config.url.includes("/oauth/token")) return { data: { access_token: "tok" } }
      return { data: { error: false, data: [{ id: 3, name: "Engie", uri: "engie.crawler" }] } }
    })
  })
  const providers = await client.getProviders()
  assert.equal(providers[0].uri, "engie.crawler")
})

test("getBillAccounts posts for nested locations", async () => {
  let called
  const client = createPago({
    email: "a@b.c",
    password: "secret",
    http: mockHttp(async (config) => {
      if (config.url.includes("/oauth/token")) return { data: { access_token: "tok" } }
      called = config
      return {
        data: {
          error: false,
          data: {
            activeAccounts: [{
              uuid: "acc-1",
              uri: "engie.crawler",
              locations: [{ id: 88, service: "Str. Mihai Eminescu 12" }],
              consumptionPoints: [{ id: 88, identifier: "12345" }]
            }]
          }
        }
      }
    })
  })
  const accounts = await client.getBillAccounts()
  assert.equal(called.method, "POST")
  assert.equal(called.url, "/sdk/bills/accounts")
  assert.equal(accounts.activeAccounts[0].locations[0].service, "Str. Mihai Eminescu 12")
})

test("getTransactions returns locationId rows as-is", async () => {
  const client = createPago({
    email: "a@b.c",
    password: "secret",
    http: mockHttp(async (config) => {
      if (config.url.includes("/oauth/token")) return { data: { access_token: "tok" } }
      return { data: [{ type: "provider", locationId: 88, amount: 150.51 }] }
    })
  })
  const rows = await client.getTransactions()
  assert.equal(rows[0].locationId, 88)
})

test("getProviderAccounts fetches connected accounts", async () => {
  let called
  const client = createPago({
    email: "a@b.c",
    password: "secret",
    http: mockHttp(async (config) => {
      if (config.url.includes("/oauth/token")) return { data: { access_token: "tok" } }
      called = config
      return {
        data: [{
          id: 4759682,
          uri: "rds.crawler",
          username: "36073018",
          locations: [{ id: 8304034, locationLabel: "Grivitei" }],
          lightProviderDTO: { id: 5, name: "Digi Romania", uri: "rds.crawler" }
        }]
      }
    })
  })
  const accounts = await client.getProviderAccounts("acct-uuid")
  assert.equal(called.method, "GET")
  assert.equal(called.url, "/pos_v1_1/provider/fetch/acct-uuid")
  assert.equal(accounts[0].locations[0].locationLabel, "Grivitei")
})

test("getInvoiceAccounts returns payment rows as-is", async () => {
  const row = {
    paidAmount: 125.5,
    paymentTimestamp: 1741161600000,
    invoice: {
      locationId: 88,
      providerUri: "engie.gas",
      locationAlias: "Apartament",
      locationType: "HOME"
    }
  }
  const client = createPago({
    email: "a@b.c",
    password: "secret",
    http: mockHttp(async (config) => {
      if (config.url.includes("/oauth/token")) return { data: { access_token: "tok" } }
      return { data: [row] }
    })
  })
  const accounts = await client.getInvoiceAccounts()
  assert.equal(accounts[0].invoice.providerUri, "engie.gas")
  assert.equal(accounts[0].paidAmount, 125.5)
})

test("getInvoicePdf fetches bill pdf bytes", async () => {
  let called
  const client = createPago({
    email: "a@b.c",
    password: "secret",
    http: mockHttp(async (config) => {
      if (config.url.includes("/oauth/token")) return { data: { access_token: "tok" } }
      called = config
      return { data: Buffer.from("%PDF-1.4") }
    })
  })
  const buf = await client.getInvoicePdf("122228828")
  assert.equal(called.method, "GET")
  assert.equal(called.url, "/pos_v1_1/provider/pdfbytes/122228828")
  assert.equal(called.responseType, "arraybuffer")
  assert.equal(buf.toString(), "%PDF-1.4")
})
