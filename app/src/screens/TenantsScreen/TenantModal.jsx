import React from "react"
import { Button, Modal, Stack, Textarea, TextInput } from "@mantine/core"
import { hideModal } from "app/core/modals"
import { cn } from "app/core"
import { useTranslation } from "react-i18next"


const TenantModal = ({ tenant, onSubmit, onClose = hideModal }) => {
  const { t } = useTranslation()
  const { name: initialName, email: initialEmail, phone: initialPhone, description: initialDescription } = tenant || {}
  const [name, setName] = React.useState(initialName || "")
  const [email, setEmail] = React.useState(initialEmail || "")
  const [phone, setPhone] = React.useState(initialPhone || "")
  const [description, setDescription] = React.useState(initialDescription || "")
  const [busy, setBusy] = React.useState(false)
  const isEdit = Boolean((tenant || {}).id)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      await onSubmit({
        name,
        email,
        phone,
        description
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  let title = t("new_tenant")
  if (isEdit) title = t("edit_tenant")

  return (
    <Modal className={cn("tenant-modal")} opened onClose={onClose} title={title}>
      <form className={cn("tenant-modal-form")} onSubmit={submit}>
        <Stack gap="sm">
          <TextInput
            className={cn("tenant-modal-name")}
            label={t("name")}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            required
            disabled={busy}
          />
          <TextInput
            className={cn("tenant-modal-email")}
            label={t("email")}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            disabled={busy}
          />
          <TextInput
            className={cn("tenant-modal-phone")}
            label={t("phone")}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.currentTarget.value)}
            disabled={busy}
          />
          <Textarea
            className={cn("tenant-modal-description")}
            label={t("description")}
            placeholder={t("tenant_description_hint")}
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            minRows={3}
            autosize
            disabled={busy}
          />
          <Button className={cn("tenant-modal-submit")} type="submit" loading={busy}>
            {t("save")}
          </Button>
        </Stack>
      </form>
    </Modal>
  )
}

export default React.memo(TenantModal)
