import { twMerge } from "tailwind-merge"
import clsx from "clsx"

export const EMPTY_OBJECT = {}
export const EMPTY_ARRAY = []

export const cn = (...inputs) => twMerge(clsx(inputs))

export const labelClass = cn("ui-label", "text-[0.75rem] text-cs-muted")
export const titleClass = cn("ui-title", "font-semibold leading-tight")

export const TRUE = "TRUE"
export const FALSE = "FALSE"

export const STEP_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
}
