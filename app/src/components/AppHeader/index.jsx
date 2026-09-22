import React from "react"
import { UnstyledButton } from "@mantine/core"
import { NavLink } from "react-router-dom"
import { useSelector } from "react-redux"
import { selectAuthUid } from "app/core/auth"
import AuthMenu from "app/components/AuthMenu"
import { cn } from "app/core"
import { useTranslation } from "react-i18next"
import { goHome } from "./actions"
import _ from "lodash"


const LINKS = [
  { to: "/", label: "tenants", exact: true },
  { to: "/utilities", label: "utilities" }
]

const isLinkActive = (to) => (match, location) => {
  const { pathname } = location || {}
  if (to === "/") {
    if (pathname === "/") return true
    return _.startsWith(pathname, "/tenants")
  }
  if (to === "/utilities") {
    if (pathname === "/utilities") return true
    return _.startsWith(pathname, "/utilities")
  }
  return Boolean(match)
}

const AppHeader = () => {
  const { t } = useTranslation()
  const uid = useSelector(() => selectAuthUid())

  return (
    <header
      className={cn(
        "app-header",
        "flex shrink-0 items-center justify-between gap-3 border-b border-cs-border bg-cs-bg px-3 py-2",
        "pt-[max(0.75rem,env(safe-area-inset-top))]"
      )}
    >
      <UnstyledButton
        className={cn(
          "app-header-logo",
          "text-[0.875rem] font-semibold leading-normal text-cs-text"
        )}
        onClick={goHome}
      >
        {t("rent_manager")}
      </UnstyledButton>
      {uid &&
        <nav className={cn("app-header-nav", "flex min-w-0 flex-1 items-center gap-4")}>
          {_.map(LINKS, (link) => {
            const { to, label, exact } = link || {}
            return (
              <NavLink
                key={to}
                to={to}
                exact={exact}
                isActive={isLinkActive(to)}
                className={cn(
                  "app-header-link",
                  "border-b border-transparent pb-0.5 text-[0.75rem] no-underline"
                )}
              >
                {t(label)}
              </NavLink>
            )
          })}
        </nav>
      }
      <div className={cn("app-header-actions", "flex shrink-0 items-center gap-3")}>
        {uid && <AuthMenu />}
      </div>
    </header>
  )
}

export default React.memo(AppHeader)
