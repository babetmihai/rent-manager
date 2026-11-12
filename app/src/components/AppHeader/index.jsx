import React from "react"
import { UnstyledButton } from "@mantine/core"
import { useSelector } from "react-redux"
import { selectAuthEmail, selectAuthUid } from "app/core/auth"
import { selectPago } from "app/core/pago"
import { cn } from "app/core"
import { useTranslation } from "react-i18next"
import { submitSignOut } from "./actions"


const AppHeader = () => {
  const { t } = useTranslation()
  const uid = useSelector(() => selectAuthUid())
  const email = useSelector(() => selectAuthEmail())
  const pago = useSelector(() => selectPago())
  const { email: pagoEmail } = pago || {}
  let account = email
  if (!account) account = pagoEmail
  if (!uid) return null

  return (
    <header className={cn("app-header")}>
      <div className={cn("app-header-inner")}>
        {account &&
          <div className={cn("app-header-user")}>{account}</div>
        }
        <UnstyledButton className={cn("app-header-sign-out")} onClick={submitSignOut}>
          {t("sign_out")}
        </UnstyledButton>
      </div>
    </header>
  )
}

export default React.memo(AppHeader)
