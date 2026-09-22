export const mockHttp = (handler) => ({
  request: async (config) => {
    const { status = 200, data } = await handler(config)
    if (status >= 400) {
      const error = new Error(`Request failed with status code ${status}`)
      error.response = { status, data, config }
      throw error
    }
    return { data, status, headers: {}, config }
  }
})
