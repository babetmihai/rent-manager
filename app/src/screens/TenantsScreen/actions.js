import { showModal } from "app/core/modals"
import { createTenant, removeTenant, updateTenant } from "app/core/tenants"
import { showBanner } from "app/core/banner"
import i18n from "app/core/i18n"
import TenantModal from "./TenantModal"


export const openCreate = () => showModal(TenantModal, {
  onSubmit: async (values) => {
    await createTenant(values)
    showBanner("success", i18n.t("tenant_added"))
  }
})

export const openEdit = (tenant) => showModal(TenantModal, {
  tenant,
  onSubmit: async (values) => {
    await updateTenant(tenant.id, values)
  },
  onDelete: async () => {
    await removeTenant(tenant.id)
    showBanner("success", i18n.t("tenant_deleted"))
  }
})
