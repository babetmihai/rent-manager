import React from "react"
import { Button, Modal, Stack, Switch, Textarea, TextInput } from "@mantine/core"
import { hideModal } from "app/core/modals"
import { cn } from "app/core"
import { useTranslation } from "react-i18next"


const TenantModal = ({ tenant, onSubmit, onDelete, onClose = hideModal }) => {
  const { t } = useTranslation()
  const { name: initialName, email: initialEmail, description: initialDescription, notifications: initialNotifications } = tenant || {}
  const isEdit = Boolean((tenant || {}).id)
  let notificationsOn = initialNotifications !== false
  if (isEdit) notificationsOn = initialNotifications === true
  const [name, setName] = React.useState(initialName || "")
  const [email, setEmail] = React.useState(initialEmail || "")
  const [description, setDescription] = React.useState(initialDescription || "")
  const [notifications, setNotifications] = React.useState(notificationsOn)
  const [busy, setBusy] = React.useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      await onSubmit({
        name,
        email,
        description,
        notifications
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await onDelete()
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
        <Stack gap="md">
          <TextInput
            className={cn("tenant-modal-name")}
            label={t("name")}
            size="md"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            required
            disabled={busy}
          />
          <Textarea
            className={cn("tenant-modal-description")}
            label={t("description")}
            size="md"
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            minRows={3}
            autosize
            disabled={busy}
          />
          <TextInput
            className={cn("tenant-modal-email")}
            label={t("email")}
            type="email"
            size="md"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            disabled={busy}
          />
          <Switch
            className={cn("tenant-modal-active", "min-h-11")}
            size="md"
            label={t("active")}
            checked={notifications}
            onChange={(event) => setNotifications(event.currentTarget.checked)}
            disabled={busy}
          />
          <Button className={cn("tenant-modal-submit", "mt-2")} type="submit" size="md" loading={busy} fullWidth>
            {t("save")}
          </Button>
          {isEdit &&
            <Button
              className={cn("tenant-modal-delete")}
              type="button"
              variant="subtle"
              color="red"
              size="md"
              fullWidth
              disabled={busy}
              onClick={remove}
            >
              {t("delete")}
            </Button>
          }
        </Stack>
      </form>
    </Modal>
  )
}

export default React.memo(TenantModal)
