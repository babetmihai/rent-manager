import { showModal } from "app/core/modals"
import { createAttachment } from "app/core/attachments"
import { showBanner } from "app/core/banner"
import i18n from "app/core/i18n"
import AttachmentModal from "./AttachmentModal"


export const showAttachmentModal = ({ parentType, parentId }) => showModal(AttachmentModal, {
  parentType,
  parentId,
  onSubmit: async ({ file }) => {
    await createAttachment({ parentType, parentId, file })
    showBanner("success", i18n.t("attachment_uploaded"))
  }
})

export const uploadFiles = async ({ parentType, parentId, files }) => {
  for (const file of files) {
    await createAttachment({ parentType, parentId, file })
  }
  showBanner("success", i18n.t("attachment_uploaded"))
}
