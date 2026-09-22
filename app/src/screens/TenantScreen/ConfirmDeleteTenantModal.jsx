import React from "react"
import { Button, Modal, Stack } from "@mantine/core"
import { hideModal } from "app/core/modals"
import { cn } from "app/core"
import { useTranslation } from "react-i18next"


const ConfirmDeleteTenantModal = ({ onSubmit, onClose = hideModal }) => {
  const { t } = useTranslation()
  const [busy, setBusy] = React.useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      await onSubmit()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal className={cn("confirm-delete-tenant-modal")} opened onClose={onClose} title={t("delete_tenant")}>
      <Stack className={cn("confirm-delete-tenant-body")} gap="sm">
        <p className={cn("confirm-delete-tenant-copy", "m-0 text-[0.875rem] leading-normal text-cs-body")}>
          {t("delete_tenant_copy")}
        </p>
        <Button className={cn("confirm-delete-tenant-confirm")} color="red" onClick={confirm} loading={busy}>
          {t("delete")}
        </Button>
      </Stack>
    </Modal>
  )
}

export default React.memo(ConfirmDeleteTenantModal)
