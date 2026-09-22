import React from "react"
import { Modal } from "@mantine/core"
import { Dropzone } from "@mantine/dropzone"
import { hideModal } from "app/core/modals"
import { cn } from "app/core"
import { useTranslation } from "react-i18next"


const AttachmentModal = ({ onSubmit, onClose = hideModal }) => {
  const { t } = useTranslation()
  const [busy, setBusy] = React.useState(false)

  const pick = async (files) => {
    setBusy(true)
    try {
      await onSubmit({ file: files[0] })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal className={cn("attachment-modal")} opened onClose={onClose} title={t("upload_attachment")}>
      <Dropzone
        className={cn("attachment-modal-dropzone", "flex min-h-[8rem] items-center justify-center")}
        onDrop={pick}
        maxFiles={1}
        disabled={busy}
      >
        <p className={cn("attachment-modal-dropzone-copy", "m-0 text-center text-[0.75rem] leading-relaxed text-cs-muted")}>
          {busy ? t("please_wait") : t("drop_file")}
        </p>
      </Dropzone>
    </Modal>
  )
}

export default React.memo(AttachmentModal)
