import React from "react"
import { Button, PasswordInput, Stack, TextInput } from "@mantine/core"
import { useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import AppScreen from "app/components/AppScreen"
import { cn, STEP_STATUS } from "app/core"
import { selectPago } from "app/core/pago"
import { submitLogin } from "./actions"


const LoginScreen = () => {
  const { t } = useTranslation()
  const pago = useSelector(() => selectPago())
  const { email: savedEmail, loginStatus } = pago
  const [email, setEmail] = React.useState(savedEmail || "")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const pending = loginStatus === STEP_STATUS.PENDING
  const loading = busy || pending

  React.useEffect(() => {
    if (!savedEmail) return
    setEmail(savedEmail)
  }, [savedEmail])

  React.useEffect(() => {
    if (loginStatus !== STEP_STATUS.FAILED) return
    setError(t("pago_login_failed"))
    setBusy(false)
  }, [loginStatus])

  const submit = (event) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    submitLogin(email, password).catch((error) => {
      const { message } = error
      let text = message
      if (message === "Pago login failed" || message === "login rejected" || message === "unauthorized") {
        text = t("pago_login_failed")
      }
      setError(text)
      setBusy(false)
    })
  }

  return (
    <AppScreen>
      <form className={cn("login-screen")} onSubmit={submit}>
        <Stack className={cn("login-panel")} gap="lg">
          <div className={cn("login-intro")}>
            <img className={cn("brand-mark", "brand-mark-login")} src="/favicon.svg" alt="" />
            <h1 className={cn("login-title")}>{t("rent_manager")}</h1>
            <p className={cn("login-copy")}>{t("sign_in_copy")}</p>
          </div>
          <TextInput
            className={cn("login-email")}
            label={t("email")}
            type="email"
            size="md"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            disabled={loading}
          />
          <PasswordInput
            className={cn("login-password")}
            label={t("password")}
            size="md"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.currentTarget.value)
              setError("")
            }}
            required
            disabled={loading}
            error={error}
          />
          <Button className={cn("login-submit")} type="submit" size="md" loading={loading} fullWidth>
            {t("sign_in")}
          </Button>
        </Stack>
      </form>
    </AppScreen>
  )
}

export default React.memo(LoginScreen)
