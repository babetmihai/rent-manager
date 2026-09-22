import { showModal } from "app/core/modals"
import { createTenant } from "app/core/tenants"
import { requestPagoTenants } from "app/core/pago"
import { showBanner } from "app/core/banner"
import i18n from "app/core/i18n"
import history from "app/core/history"
import TenantModal from "./TenantModal"


export const openUtilities = () => history.push("/utilities")


export const openCreate = () => showModal(TenantModal, {
  onSubmit: async (values) => {
    await createTenant(values)
    showBanner("success", i18n.t("tenant_added"))
  }
})

export const openTenant = (id) => history.push(`/tenants/${id}`)

export const createTenants = async () => {
  await requestPagoTenants()
  showBanner("info", i18n.t("tenants_queued"))
}
