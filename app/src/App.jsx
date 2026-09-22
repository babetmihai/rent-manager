import React from "react"
import { Route, Switch } from "react-router-dom"
import { useSelector } from "react-redux"
import { Center, Loader } from "@mantine/core"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import { useBanner } from "./core/banner"
import AppLayout from "./components/AppLayout"
import LoginScreen from "./screens/LoginScreen"
import TenantsScreen from "./screens/TenantsScreen"
import TenantScreen from "./screens/TenantScreen"
import UtilitiesScreen from "./screens/UtilitiesScreen"
import UtilityScreen from "./screens/UtilityScreen"
import { selectAuthReady, selectAuthUid } from "./core/auth"


const App = () => {
  useBanner()
  const ready = useSelector(() => selectAuthReady())
  const uid = useSelector(() => selectAuthUid())

  if (!ready) {
    return (
      <Center h="100vh" className="bg-cs-bg">
        <Loader color="gray" />
      </Center>
    )
  }

  if (!uid) {
    return (
      <AppLayout>
        <LoginScreen />
        <ModalDispatcher />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" exact component={TenantsScreen} />
        <Route path="/tenants/:tenantId" component={TenantScreen} />
        <Route path="/utilities" exact component={UtilitiesScreen} />
        <Route path="/utilities/:utilityId" component={UtilityScreen} />
      </Switch>
      <ModalDispatcher />
    </AppLayout>
  )
}

export default React.memo(App)
