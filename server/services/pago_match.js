import { createServices } from "../lib/services.js"
import { STEP_STATUS } from "../lib/index.js"
import { assignUtilitiesForUser } from "../lib/utilities/index.js"


const pagoService = createServices("pago")

const run = async () => {
  const pending = await pagoService.list({ matchStatus: STEP_STATUS.PENDING })
  for (const account of pending) {
    const { id, createdBy } = account
    try {
      await assignUtilitiesForUser(createdBy)
      await pagoService.update(id, {
        matchStatus: STEP_STATUS.COMPLETED,
        matchError: null
      })
    } catch (error) {
      await pagoService.update(id, {
        matchStatus: STEP_STATUS.FAILED,
        matchError: error.message
      })
    }
  }
}

export default { run }
