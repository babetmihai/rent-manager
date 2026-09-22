import { showModal } from "app/core/modals"
import { savePago } from "app/core/pago"
import { showBanner } from "app/core/banner"
import i18n from "app/core/i18n"
import PagoModal from "./PagoModal"


export const openPago = (pago) => showModal(PagoModal, {
  pago,
  onSubmit: async (values) => {
    await savePago(values)
  },
  onLoggedIn: () => showBanner("success", i18n.t("pago_saved"))
})
