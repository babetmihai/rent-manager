export const startTicker = ({ label, run, listen, intervalSeconds }) => {
  let inProgress = false
  let again = false

  const cycle = async (reason) => {
    if (inProgress) {
      again = true
      console.log(`${label}: cycle in progress, queuing wake (${reason})`)
      return
    }
    inProgress = true
    try {
      do {
        again = false
        console.log(`${label}: cycle start (${reason})`)
        await run()
        console.log(`${label}: cycle done`)
      } while (again)
    } finally {
      inProgress = false
    }
  }

  console.log(`${label}: listening; interval ${intervalSeconds}s`)
  listen(() => {
    void cycle("wake")
  })
  setInterval(() => {
    void cycle("interval")
  }, intervalSeconds * 1000)
  void cycle("startup")
}
