import _ from "lodash"
import { createServices } from "../lib/services.js"
import { STEP_STATUS } from "../lib/index.js"
import { createTenantFromUtility } from "../lib/utilities/index.js"


const utilityService = createServices("utilities")

const run = async () => {
  const list = await utilityService.list()
  const pending = _.filter(list, { createStatus: STEP_STATUS.PENDING })
  for (const utility of pending) {
    const { id } = utility
    try {
      await createTenantFromUtility(utility)
      await utilityService.update(id, {
        createStatus: STEP_STATUS.COMPLETED,
        createError: null
      })
    } catch (error) {
      await utilityService.update(id, {
        createStatus: STEP_STATUS.FAILED,
        createError: error.message
      })
    }
  }
}

export default { run }
