import React from "react"
import { cn } from "app/core"


const AppScreen = ({ children }) => {
  return (
    <div className={cn("app-screen", "relative min-h-0 flex-1 overflow-auto pb-[50vh]")}>
      {children}
    </div>
  )
}

export default React.memo(AppScreen)
