import axios from "axios"
import { randomUUID } from "node:crypto"
import _ from "lodash"
import cleanDeep from "clean-deep"


const BASE_URL = "https://pago.cloud"
const AUTH_URL = "/authentication/uaa/oauth/token"
const AUTH_BASIC = "Basic cGFnby1tb2JpbGUtYXBwOnBhZ28tbW9iaWxlLWFwcC1zZWNyZXQ="
const APP_ID = "bed83d2a-6287-4e6c-9ce1-e7a49d4f2a43"
const APP_VERSION = "4.2.0"

const unwrap = (raw) => {
  const { data, error } = raw || {}
  if (data !== undefined && error !== undefined) return data
  return raw
}

export const createPago = ({
  email,
  password,
  access_token,
  refresh_token,
  phoneId = randomUUID(),
  sessionId = randomUUID(),
  http = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
      Accept: "application/json",
      "User-Agent": `Pago/${APP_VERSION}`,
      Country: "RO",
      "Accept-Language": "ro",
      "Session-Id": sessionId,
      AppId: APP_ID,
      "Phone-Id": phoneId
    }
  })
} = {}) => {
  if (!access_token && (!email || !password)) throw new Error("email and password are required")

  const { interceptors } = http
  if (interceptors) {
    interceptors.response.use((response) => {
      const { data, config } = response
      const { responseType } = config || {}
      if (responseType === "arraybuffer") return response
      if (_.isPlainObject(data) || _.isArray(data)) response.data = cleanDeep(data)
      return response
    })
  }

  let token = access_token || null
  let refreshToken = refresh_token || null
  let auth = null

  const sendRes = async ({ method, url, data, auth: useAuth = true, headers = {}, responseType, timeout } = {}) => {
    try {
      const next = { ...headers }
      if (useAuth && token) next.Authorization = `Bearer ${token}`
      return await http.request({ method, url, data, headers: next, responseType, timeout })
    } catch (error) {
      const { response } = error
      const { status } = response || {}
      if (status === 401) {
        token = null
        throw new Error("unauthorized")
      }
      throw error
    }
  }

  const send = async (config) => {
    const { data } = await sendRes(config)
    return data
  }

  const requestToken = async (form) => {
    let data
    try {
      data = await send({
        method: "POST",
        url: AUTH_URL,
        auth: false,
        headers: {
          Authorization: AUTH_BASIC,
          "Content-Type": "application/x-www-form-urlencoded",
          "Phone-Details": `PagoSDK;${APP_VERSION};Node`
        },
        data: new URLSearchParams(form)
      })
    } catch (error) {
      const { response } = error
      const { data: body } = response || {}
      const { error: code } = body || {}
      if (code === "invalid_grant") throw new Error("Pago login failed")
      throw error
    }
    const { access_token: nextToken, refresh_token: nextRefresh } = data || {}
    if (!nextToken) throw new Error("login rejected")
    token = nextToken
    if (nextRefresh) refreshToken = nextRefresh
    auth = data
    return data
  }

  const login = async () => {
    if (email && password) {
      return requestToken({
        grant_type: "pago",
        username: email,
        password
      })
    }
    if (refreshToken) {
      return requestToken({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
    }
    throw new Error("email and password are required")
  }

  const authorized = async (config) => {
    if (!token) await login()
    try {
      return await sendRes(config)
    } catch (error) {
      if (error.message !== "unauthorized") throw error
      await login()
      return sendRes(config)
    }
  }

  const get = async (url) => {
    const { data } = await authorized({ method: "GET", url })
    return unwrap(data)
  }

  const post = async (url, data) => {
    const { data: payload } = await authorized({ method: "POST", url, data })
    return unwrap(payload)
  }

  const getBills = async () => {
    const data = await get("/sdk/bills/accounts/summary")
    const { billsList } = data || {}
    return billsList || []
  }

  const getInvoiceAccounts = async () => {
    return get("/payment/payment-details-v2?paymentEntityType=INVOICE&size=100&page=0")
  }

  const getProviders = async () => {
    const data = await get("/sdk/bills/providers")
    return data || []
  }

  const getBillAccounts = async () => {
    return post("/sdk/bills/accounts", {})
  }

  const getProfile = async () => {
    return get("/authentication/uaa/v1.00/user_profile")
  }

  const getProviderAccounts = async (uuid) => {
    return get(`/pos_v1_1/provider/fetch/${uuid}`)
  }

  const getTransactions = async () => {
    return get("/payment/transactions")
  }

  const getInvoicePdf = async (billId) => {
    const { data } = await authorized({
      method: "GET",
      url: `/pos_v1_1/provider/pdfbytes/${billId}`,
      responseType: "arraybuffer",
      timeout: 60000
    })
    return Buffer.from(data)
  }

  return {
    login,
    getBills,
    getInvoiceAccounts,
    getProviders,
    getBillAccounts,
    getProfile,
    getProviderAccounts,
    getTransactions,
    getInvoicePdf,
    get token() {
      return token
    },
    get auth() {
      return auth
    }
  }
}
