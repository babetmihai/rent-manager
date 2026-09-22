import { notifications } from "@mantine/notifications"
import React from "react"
import i18n from "app/core/i18n"

const COLOR_BY_TYPE = {
  warning: "orange",
  info: "blue",
  success: "green",
  error: "red"
}

export const showBanner = (type, message) => {
  if (type === "error") console.error(message)
  const typeKey = typeof type === "string" && type.length ? type : "info"
  notifications.show({
    color: COLOR_BY_TYPE[typeKey] || "blue",
    title: i18n.t(typeKey),
    message,
    autoClose: 3000
  })
}

export const useBanner = () => {
  React.useEffect(() => {
    window.addEventListener("unhandledrejection", handleRejection)
    return () => window.removeEventListener("unhandledrejection", handleRejection)
  }, [])
}

const handleRejection = (event) => {
  const { reason } = event || {}
  const { message } = reason || {}
  const text = message || reason
  if (!text) return
  showBanner("error", String(text))
}
