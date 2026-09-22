import React from "react"
import { Button, Modal, PasswordInput, Stack, TextInput } from "@mantine/core"
import { useSelector } from "react-redux"
import { hideModal } from "app/core/modals"
import { cn, STEP_STATUS } from "app/core"
import { selectPago } from "app/core/pago"
import { useTranslation } from "react-i18next"


const PagoModal = ({ pago, onSubmit, onLoggedIn, onClose = hideModal }) => {
  const { t } = useTranslation()
  const live = useSelector(() => selectPago())
  const { email: initialEmail } = pago || {}
  const { loginStatus } = live
  const [email, setEmail] = React.useState(initialEmail || "")
  const [password, setPassword] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [pendingSeen, setPendingSeen] = React.useState(false)
  const [error, setError] = React.useState("")
  const isEdit = Boolean(initialEmail)

  React.useEffect(() => {
    if (!busy) return
    if (loginStatus === STEP_STATUS.PENDING) {
      setPendingSeen(true)
      return
    }
    if (!pendingSeen) return
    if (loginStatus === STEP_STATUS.COMPLETED) {
      if (onLoggedIn) onLoggedIn()
      onClose()
      return
    }
    if (loginStatus === STEP_STATUS.FAILED) {
      setError(t("pago_login_failed"))
      setBusy(false)
      setPendingSeen(false)
    }
  }, [busy, loginStatus, pendingSeen])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      await onSubmit({ email, password })
    } catch (err) {
      setError(t("pago_login_failed"))
      setBusy(false)
    }
  }

  return (
    <Modal className={cn("pago-modal")} opened onClose={onClose} title={t("pago_account")}>
      <form className={cn("pago-modal-form")} onSubmit={submit}>
        <Stack gap="sm">
          <p className={cn("pago-modal-copy", "m-0 text-[0.875rem] leading-normal text-cs-body")}>
            {t("pago_credentials_copy")}
          </p>
          <TextInput
            className={cn("pago-modal-email")}
            label={t("email")}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            disabled={busy}
          />
          <PasswordInput
            className={cn("pago-modal-password")}
            label={t("password")}
            value={password}
            onChange={(event) => {
              setPassword(event.currentTarget.value)
              setError("")
            }}
            required
            disabled={busy}
            error={error}
          />
          <Button className={cn("pago-modal-submit")} type="submit" loading={busy}>
            {isEdit ? t("save") : t("connect_pago")}
          </Button>
        </Stack>
      </form>
    </Modal>
  )
}

export default React.memo(PagoModal)
