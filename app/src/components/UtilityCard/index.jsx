import React from "react"
import { Link } from "react-router-dom"
import { Button, Card } from "@mantine/core"
import { useSelector } from "react-redux"
import { cn, EMPTY_OBJECT, STEP_STATUS } from "app/core"
import { selectTenant } from "app/core/tenants"
import { billAmount, formatAmount, selectBills } from "app/core/bills"
import { useTranslation } from "react-i18next"
import { openAssignUtility, unassignUtility, createTenantFromUtility, openUtility } from "./actions"
import _ from "lodash"


const UtilityCard = ({ utility, hideTenant }) => {
  const { t } = useTranslation()
  const { id, name, address, vendor, assignedBy, tenantId, createStatus } = utility || {}
  const isCreating = createStatus === STEP_STATUS.PENDING
  const tenant = useSelector(() => {
    if (!tenantId) return EMPTY_OBJECT
    return selectTenant(tenantId)
  })
  const { name: tenantName } = tenant
  const allBills = useSelector(() => selectBills())
  const bills = _.filter(allBills, (bill) => {
    const { ref, dueAmount, utilityId } = bill
    return ref && dueAmount && utilityId === id
  })
  const billDue = _.sumBy(bills, (item) => billAmount(item))
  const overdueCount = _.size(_.filter(bills, { status: "overdue" }))
  let dueLabel = t("bill_count", { count: _.size(bills) })
  if (overdueCount > 0) dueLabel = t("overdue_count", { count: overdueCount })
  const isAuto = assignedBy === "ai"
  const title = vendor || name
  const detail = _.find([address, name], (part) => part && part !== title)
  const showTenant = !hideTenant
  const isOpen = showTenant && !tenantId
  const hasStatus = Boolean((showTenant && tenantName) || isOpen || isAuto)

  return (
    <Card className={cn("utility-card", "cursor-pointer")} onClick={() => openUtility(id)}>
      <div className={cn("utility-card-top", "flex items-start justify-between gap-3")}>
        <div className={cn("utility-card-heading", "min-w-0")}>
          <div className={cn("utility-card-name", "min-w-0 truncate text-[0.875rem] text-cs-text")}>{title}</div>
          {detail &&
            <div className={cn("utility-card-address", "mt-0.5 truncate text-[0.75rem] text-cs-muted")}>{detail}</div>
          }
        </div>
        <div className={cn("utility-card-due", "shrink-0 text-right")}>
          <div className={cn("utility-card-bills", "text-[0.875rem] leading-none tabular-nums text-cs-text")}>
            {formatAmount(billDue)}
          </div>
          <div className={cn("utility-card-bills-label", "mt-1 text-[0.75rem] text-cs-muted")}>
            {dueLabel}
          </div>
        </div>
      </div>
      <div className={cn("utility-card-footer", "mt-1.5 flex items-center justify-between gap-1")}>
        {hasStatus &&
          <div className={cn(
            "utility-card-status",
            "min-w-0 truncate text-[0.75rem] text-cs-muted",
            isOpen && "text-cs-text"
          )}>
            {showTenant && tenantName &&
              <Link
                className={cn("utility-card-tenant", "text-inherit no-underline hover:text-cs-text")}
                to={`/tenants/${tenantId}`}
                onClick={(event) => event.stopPropagation()}
              >
                {tenantName}
              </Link>
            }
            {isOpen && t("no_tenant")}
            {((showTenant && tenantName) || isOpen) && isAuto && " · "}
            {isAuto && t("matched")}
          </div>
        }
        <div
          className={cn("utility-card-actions", "ml-auto flex shrink-0 items-center gap-1")}
          onClick={(event) => event.stopPropagation()}
        >
          {!tenantId &&
            <Button
              className={cn("utility-card-create")}
              variant="outline"
              color="gray"
              size="compact-xs"
              onClick={() => createTenantFromUtility(utility)}
              loading={isCreating}
            >
              {t("new_tenant")}
            </Button>
          }
          {!hideTenant &&
            <Button
              className={cn("utility-card-assign")}
              variant="outline"
              color="gray"
              size="compact-xs"
              onClick={() => openAssignUtility(utility)}
            >
              {t("assign")}
            </Button>
          }
          {tenantId &&
            <Button
              className={cn("utility-card-unassign")}
              variant="outline"
              color="gray"
              size="compact-xs"
              onClick={() => unassignUtility(id)}
            >
              {t("unassign")}
            </Button>
          }
        </div>
      </div>
    </Card>
  )
}

export default React.memo(UtilityCard)
