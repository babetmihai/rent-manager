import { showModal } from "app/core/modals"
import { assignUtility, requestUtilityCreate, waitUtilityCreate } from "app/core/utilities"
import { showBanner } from "app/core/banner"
import i18n from "app/core/i18n"
import history from "app/core/history"
import AssignModal from "app/components/BillCard/AssignModal"


export const openUtility = (id) => history.push(`/utilities/${id}`)


export const openAssignUtility = (utility) => showModal(AssignModal, {
  tenantId: utility.tenantId,
  onSubmit: async (tenantId) => {
    await assignUtility(utility.id, tenantId)
    showBanner("success", i18n.t("utility_assigned"))
  }
})

export const unassignUtility = async (utilityId) => {
  await assignUtility(utilityId, null)
  showBanner("success", i18n.t("utility_unassigned"))
}

export const createTenantFromUtility = async (utility) => {
  const { id } = utility
  await requestUtilityCreate(id)
  await waitUtilityCreate(id)
  showBanner("success", i18n.t("tenant_added"))
}
