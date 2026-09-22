import React from "react"
import {
  Button,
  Divider,
  PasswordInput,
  Stack,
  TextInput
} from "@mantine/core"
import { useLoader } from "app/core/loaders"
import { cn, titleClass } from "app/core"
import AppScreen from "app/components/AppScreen"
import { useTranslation } from "react-i18next"
import { submitGoogle, submitLogin } from "./actions"


const LoginScreen = () => {
  const { t } = useTranslation()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [mode, setMode] = React.useState("signIn")

  const signingIn = useLoader("auth.signIn")
  const signingUp = useLoader("auth.signUp")
  const signingGoogle = useLoader("auth.google")
  const busy = signingIn || signingUp || signingGoogle
  const isSignIn = mode === "signIn"

  let submitLabel = t("sign_in")
  if (!isSignIn) submitLabel = t("create_account")
  if (signingIn || signingUp) submitLabel = t("please_wait")

  let switchLabel = t("already_have_account_sign_in")
  if (isSignIn) switchLabel = t("need_an_account_sign_up")

  let subtitle = t("create_an_account")
  if (isSignIn) subtitle = t("sign_in_to_manage_tenants")

  let passwordAutoComplete = "new-password"
  if (isSignIn) passwordAutoComplete = "current-password"

  return (
    <AppScreen>
      <div className={cn("login-screen", "mx-auto flex min-h-full w-full max-w-[24rem] flex-col justify-center px-3 py-4")}>
        <h1 className={cn("login-title", titleClass, "mb-1 text-xl")}>
          {t("rent_manager")}
        </h1>
        <p className={cn("login-copy", "mb-4 text-[0.875rem] text-cs-body")}>{subtitle}</p>
        <form className={cn("login-form")} onSubmit={(event) => submitLogin(event, email, password, isSignIn)}>
          <Stack gap="sm">
            <TextInput
              className={cn("login-email")}
              label={t("email")}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
              disabled={busy}
            />
            <PasswordInput
              className={cn("login-password")}
              label={t("password")}
              autoComplete={passwordAutoComplete}
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
              minLength={6}
              disabled={busy}
            />
            <Button className={cn("login-submit")} type="submit" loading={signingIn || signingUp}>
              {submitLabel}
            </Button>
            <Divider className={cn("login-or")} label={t("or")} labelPosition="center" />
            <Button
              className={cn("login-google")}
              type="button"
              variant="default"
              loading={signingGoogle}
              disabled={busy}
              onClick={submitGoogle}
              leftSection={
                <svg
                  className={cn("login-google-logo")}
                  width="0.875rem"
                  height="0.875rem"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              }
            >
              {t("continue_with_google")}
            </Button>
            <Button
              className={cn("login-switch")}
              type="button"
              variant="subtle"
              color="gray"
              disabled={busy}
              onClick={() => setMode(isSignIn ? "signUp" : "signIn")}
            >
              {switchLabel}
            </Button>
          </Stack>
        </form>
      </div>
    </AppScreen>
  )
}

export default React.memo(LoginScreen)
