import { showModal } from "app/core/modals"
import { requestPagoSync, requestPagoMatch, requestPagoTenants } from "app/core/pago"
import { showBanner } from "app/core/banner"
import i18n from "app/core/i18n"
import { showAttachmentModal } from "app/components/AttachmentList/actions"
import { removeAllBills } from "app/core/bills"
import { removeBillAttachments } from "app/core/attachments"
import { removeAllUtilities } from "app/core/utilities"
import ConfirmDeleteBillsModal from "./ConfirmDeleteBillsModal"


export const syncPago = async () => {
  await requestPagoSync()
  showBanner("info", i18n.t("sync_queued"))
}

export const matchPago = async () => {
  await requestPagoMatch()
  showBanner("info", i18n.t("match_queued"))
}

export const createTenants = async () => {
  await requestPagoTenants()
  showBanner("info", i18n.t("tenants_queued"))
}

export const openUpload = (billId) => showAttachmentModal({
  parentType: "bill",
  parentId: billId
})

export const confirmDeleteAllBills = () => showModal(ConfirmDeleteBillsModal, {
  onSubmit: async () => {
    await removeAllBills()
    await removeBillAttachments()
    await removeAllUtilities()
    showBanner("success", i18n.t("bills_and_utilities_deleted"))
  }
})
