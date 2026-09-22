import "./index.css"

import React from "react"
import ReactDOM from "react-dom/client"
import { Provider } from "react-redux"
import { Router } from "react-router-dom"
import { MantineProvider } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import App from "./App"
import store from "./core/store"
import { loadStorage } from "./core/store/storage"
import { loadI18n } from "./core/i18n"
import history from "./core/history"
import { initAuth } from "./core/auth"
import { theme } from "./theme"


void loadStorage()
  .then(() => loadI18n())
  .then(() => {
    initAuth()
    ReactDOM.createRoot(document.getElementById("root")).render(
      <Router history={history}>
        <Provider store={store}>
          <MantineProvider
            theme={theme}
            forceColorScheme="dark"
            withCssVariables
          >
            <Notifications position="bottom-right" zIndex={400} />
            <App />
          </MantineProvider>
        </Provider>
      </Router>
    )
  })
