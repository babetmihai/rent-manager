import React from "react"
import AppHeader from "app/components/AppHeader"
import { cn } from "app/core"


const AppLayout = ({ children }) => {
  return (
    <div className={cn("app-layout", "flex h-dvh w-full flex-col overflow-hidden bg-cs-bg")}>
      <AppHeader />
      <div className={cn("app-layout-main", "flex min-h-0 flex-1 flex-col overflow-hidden")}>
        {children}
      </div>
    </div>
  )
}

export default React.memo(AppLayout)
