import React from "react"
import { Card } from "@mantine/core"
import { cn } from "app/core"
import { useTranslation } from "react-i18next"
import _ from "lodash"


const STEPS = ["setup_connect", "setup_sync", "setup_match"]

const SetupSteps = ({ current }) => {
  const { t } = useTranslation()

  return (
    <Card className={cn("setup-steps", "mb-4 w-full max-w-[36rem]")}>
      <div className={cn("setup-steps-list", "flex flex-col gap-3")}>
        {_.map(STEPS, (key, index) => {
          const step = index + 1
          const isCurrent = step === current
          const isDone = step < current
          const isUpcoming = !isCurrent && !isDone
          return (
            <div key={key} className={cn("setup-step", "flex items-center gap-3")}>
              <div
                className={cn(
                  "setup-step-index",
                  "flex h-[1.75rem] w-[1.75rem] shrink-0 items-center justify-center rounded-full text-[0.75rem] font-semibold",
                  isCurrent && "bg-cs-text text-cs-bg",
                  isDone && "border border-cs-text text-cs-text",
                  isUpcoming && "border border-cs-border text-cs-muted"
                )}
              >
                {step}
              </div>
              <div
                className={cn(
                  "setup-step-label",
                  "text-[0.875rem] leading-normal",
                  isCurrent && "font-semibold text-cs-text",
                  isDone && "text-cs-body",
                  isUpcoming && "text-cs-muted"
                )}
              >
                {t(key)}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default React.memo(SetupSteps)
