import React from "react"
import { Button, Modal, Stack, TagsInput, Textarea, TextInput } from "@mantine/core"
import { hideModal } from "app/core/modals"
import { cn } from "app/core"
import { useTranslation } from "react-i18next"
import _ from "lodash"


const TenantModal = ({ tenant, onSubmit, onDelete, onClose = hideModal }) => {
  const { t } = useTranslation()
  const { name: initialName, email: initialEmail, description: initialDescription, tags: initialTags = [] } = tenant || {}
  const isEdit = Boolean((tenant || {}).id)
  const [name, setName] = React.useState(initialName || "")
  const [email, setEmail] = React.useState(initialEmail || "")
  const [description, setDescription] = React.useState(initialDescription || "")
  const [tags, setTags] = React.useState(initialTags)
  const [draft, setDraft] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const raw = _.trim(draft)
    let nextTags = tags
    if (raw) {
      const exists = _.some(tags, (tag) => _.toLower(tag) === _.toLower(raw))
      if (!exists) nextTags = [...tags, raw]
    }
    setBusy(true)
    try {
      await onSubmit({
        name,
        email,
        description,
        tags: nextTags
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
        <Stack gap="sm">
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
            minRows={2}
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
          <TagsInput
            className={cn("tenant-modal-tags")}
            label={t("tags")}
            placeholder={t("add_tag")}
            size="md"
            value={tags}
            searchValue={draft}
            disabled={busy}
            onChange={setTags}
            onSearchChange={setDraft}
          />
          <Button className={cn("tenant-modal-submit")} type="submit" size="md" loading={busy} fullWidth>
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
