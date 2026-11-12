import React from "react"
import { useSelector } from "react-redux"
import { Center, Loader } from "@mantine/core"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import { useBanner } from "./core/banner"
import AppLayout from "./components/AppLayout"
import LoginScreen from "./screens/LoginScreen"
import TenantsScreen from "./screens/TenantsScreen"
import { selectAuthReady, selectAuthUid } from "./core/auth"
import { STEP_STATUS } from "./core"
import { fetchPago, listenPago, selectPago } from "./core/pago"


const App = () => {
  useBanner()
  const ready = useSelector(() => selectAuthReady())
  const uid = useSelector(() => selectAuthUid())
  const pago = useSelector(() => selectPago())
  const { loginStatus } = pago
  const loggedIn = loginStatus === STEP_STATUS.COMPLETED
  const [loadedUid, setLoadedUid] = React.useState(null)

  React.useLayoutEffect(() => {
    if (!uid) return
    let alive = true
    fetchPago().finally(() => {
      if (alive) setLoadedUid(uid)
    })
    const unlisten = listenPago()
    return () => {
      alive = false
      unlisten()
    }
  }, [uid])

  const waiting = Boolean(uid) && loadedUid !== uid
  if (!ready || waiting) {
    return (
      <Center h="100vh" className="bg-cs-bg">
        <Loader color="gray" />
      </Center>
    )
  }

  if (!loggedIn) {
    return (
      <AppLayout>
        <LoginScreen />
        <ModalDispatcher />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <TenantsScreen />
      <ModalDispatcher />
    </AppLayout>
  )
}

export default React.memo(App)
