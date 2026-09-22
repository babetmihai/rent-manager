import React from "react"
import { Menu, UnstyledButton } from "@mantine/core"
import { useSelector } from "react-redux"
import { selectAuthEmail, signOut } from "app/core/auth"
import { fetchPago, listenPago, selectPago } from "app/core/pago"
import { cn } from "app/core"
import { useTranslation } from "react-i18next"
import { openPago } from "./actions"


const AuthMenu = () => {
  const { t } = useTranslation()
  const email = useSelector(() => selectAuthEmail())
  const pago = useSelector(() => selectPago())
  const hasPago = Boolean(pago.id)

  React.useLayoutEffect(() => {
    fetchPago()
    return listenPago()
  }, [])

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <UnstyledButton
          className={cn(
            "auth-menu-target",
            "max-w-[12rem] truncate text-[0.75rem] text-cs-muted"
          )}
        >
          {email}
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item className={cn("auth-menu-pago")} onClick={() => openPago(pago)}>
          {hasPago ? t("pago_account") : t("connect_pago")}
        </Menu.Item>
        <Menu.Item className={cn("auth-menu-sign-out")} onClick={signOut}>
          {t("sign_out")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

export default React.memo(AuthMenu)
