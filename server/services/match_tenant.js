import { createServices } from "../lib/services.js"
import { STEP_STATUS } from "../lib/index.js"
import { assignUtilitiesForTenant } from "../lib/utilities/index.js"


const tenantService = createServices("tenants")

const run = async () => {
  const pending = await tenantService.list({ assignStatus: STEP_STATUS.PENDING })
  for (const tenant of pending) {
    const { id } = tenant
    try {
      await assignUtilitiesForTenant(tenant)
      await tenantService.update(id, {
        assignStatus: STEP_STATUS.COMPLETED,
        assignError: null
      })
    } catch (error) {
      await tenantService.update(id, {
        assignStatus: STEP_STATUS.FAILED,
        assignError: error.message
      })
    }
  }
}

export default { run }
