import { showModal } from "app/core/modals"
import { updateTenant, removeTenant, requestTenantAssign, requestTenantEmail } from "app/core/tenants"
import { assignUtility } from "app/core/utilities"
import { showBanner } from "app/core/banner"
import i18n from "app/core/i18n"
import history from "app/core/history"
import TenantModal from "app/screens/TenantsScreen/TenantModal"
import AssignUtilityModal from "./AssignUtilityModal"
import ConfirmDeleteTenantModal from "./ConfirmDeleteTenantModal"
import { showAttachmentModal } from "app/components/AttachmentList/actions"


export const goTenants = () => history.push("/")


export const openEditTenant = (tenant) => showModal(TenantModal, {
  tenant,
  onSubmit: async (values) => {
    await updateTenant(tenant.id, values)
    showBanner("success", i18n.t("tenant_saved"))
  }
})

export const openUpload = (parentType, parentId) => showAttachmentModal({
  parentType,
  parentId
})

export const matchUtilities = async (tenantId) => {
  await requestTenantAssign(tenantId)
  showBanner("info", i18n.t("match_queued"))
}

export const sendBills = async (tenantId) => {
  await requestTenantEmail(tenantId)
  showBanner("info", i18n.t("email_queued"))
}

export const confirmDeleteTenant = (tenant) => showModal(ConfirmDeleteTenantModal, {
  onSubmit: async () => {
    const { id } = tenant
    await removeTenant(id)
    showBanner("success", i18n.t("tenant_deleted"))
    goTenants()
  }
})

export const openAssignUtilities = (tenantId) => showModal(AssignUtilityModal, {
  tenantId,
  onSubmit: async (utilityId, nextTenantId) => {
    await assignUtility(utilityId, nextTenantId)
    showBanner("success", i18n.t("utility_assigned"))
  }
})
