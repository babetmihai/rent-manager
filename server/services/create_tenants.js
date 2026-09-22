import _ from "lodash"
import { createServices } from "../lib/services.js"
import { STEP_STATUS } from "../lib/index.js"
import { createTenantsFromUtilities } from "../lib/utilities/index.js"


const pagoService = createServices("pago")

const run = async () => {
  const accounts = await pagoService.list()
  const pending = _.filter(accounts, { tenantStatus: STEP_STATUS.PENDING })
  for (const account of pending) {
    const { id, createdBy } = account
    try {
      await createTenantsFromUtilities(createdBy)
      await pagoService.update(id, {
        tenantStatus: STEP_STATUS.COMPLETED,
        tenantError: null,
        onboardedAt: Date.now()
      })
    } catch (error) {
      await pagoService.update(id, {
        tenantStatus: STEP_STATUS.FAILED,
        tenantError: error.message
      })
    }
  }
}

export default { run }
