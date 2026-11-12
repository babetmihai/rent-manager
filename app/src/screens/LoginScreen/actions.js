import { signInWithPago } from "app/core/auth"
import { fetchPago } from "app/core/pago"


export const submitLogin = async (email, password) => {
  await signInWithPago(email, password)
  await fetchPago()
}
