import React from "react"
import { Button, Card, Loader, UnstyledButton } from "@mantine/core"
import { Link, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import AppScreen from "app/components/AppScreen"
import BillCard from "app/components/BillCard"
import { cn, labelClass, titleClass, EMPTY_OBJECT, STEP_STATUS } from "app/core"
import { useTranslation } from "react-i18next"
import { fetchTenants, listenTenants, selectTenant } from "app/core/tenants"
import { fetchAttachments, listenAttachments } from "app/core/attachments"
import { fetchBills, listenBills, formatAmount, billAmount, selectBills } from "app/core/bills"
import { fetchUtility, listenUtility, selectUtility } from "app/core/utilities"
import { useLoader } from "app/core/loaders"
import { openAssignUtility, unassignUtility, createTenantFromUtility } from "app/components/UtilityCard/actions"
import { openUpload } from "app/screens/UtilitiesScreen/actions"
import { goUtilities } from "./actions"
import _ from "lodash"


const UtilityScreen = () => {
  const { t } = useTranslation()
  const { utilityId } = useParams()
  const utility = useSelector(() => selectUtility(utilityId))
  const { name, address, vendor, assignedBy, tenantId, createStatus } = utility || {}
  const tenant = useSelector(() => {
    if (!tenantId) return EMPTY_OBJECT
    return selectTenant(tenantId)
  })
  const { name: tenantName } = tenant
  const allBills = useSelector(() => selectBills())
  const bills = _.orderBy(_.filter(allBills, (bill) => {
    const { ref, dueAmount, utilityId: billUtilityId } = bill
    return ref && dueAmount && billUtilityId === utilityId
  }), ["dueDate", "ref"])
  const billDue = _.sumBy(bills, (item) => billAmount(item))
  const isCreating = createStatus === STEP_STATUS.PENDING
  const isAuto = assignedBy === "ai"
  const hasUtility = Boolean(utility.id)
  const hasBills = !_.isEmpty(bills)
  const title = vendor || name
  const detail = _.find([address, name], (part) => part && part !== title)
  const loadingUtility = useLoader(`utilities.${utilityId}`)
  const loadingBills = useLoader("bills")
  const loading = loadingUtility || loadingBills

  React.useLayoutEffect(() => {
    fetchUtility(utilityId)
    fetchTenants()
    fetchBills()
    fetchAttachments()
    const unlistenUtility = listenUtility(utilityId)
    const unlistenTenants = listenTenants()
    const unlistenBills = listenBills()
    const unlistenAttachments = listenAttachments()
    return () => {
      unlistenUtility()
      unlistenTenants()
      unlistenBills()
      unlistenAttachments()
    }
  }, [utilityId])

  return (
    <AppScreen>
      <div className={cn("utility-screen", "mx-auto flex min-h-full w-full max-w-[42rem] flex-col px-3 py-4")}>
        {loading && !hasUtility &&
          <div className={cn("utility-loading", "flex flex-1 items-center justify-center")}>
            <Loader color="gray" />
          </div>
        }
        {hasUtility &&
        <>
        <div className={cn("utility-header", "mb-4 shrink-0")}>
          <div className={cn("utility-header-bar", "mb-3 flex items-center justify-between gap-3")}>
            <UnstyledButton
              className={cn(
                "utility-back",
                "-ml-1 inline-flex min-h-[2rem] items-center gap-1 rounded px-1 text-[0.875rem] text-cs-muted hover:text-cs-text"
              )}
              onClick={goUtilities}
            >
              <svg
                className={cn("utility-back-chevron")}
                width="0.75rem"
                height="0.75rem"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M10 3 5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("utilities")}
            </UnstyledButton>
            <div className={cn("utility-header-actions", "flex gap-2")}>
              {!tenantId &&
                <Button
                  className={cn("utility-create")}
                  variant="outline"
                  color="gray"
                  onClick={() => createTenantFromUtility(utility)}
                  loading={isCreating}
                >
                  {t("new_tenant")}
                </Button>
              }
              <Button
                className={cn("utility-assign")}
                variant="outline"
                color="gray"
                onClick={() => openAssignUtility(utility)}
              >
                {t("assign")}
              </Button>
              {tenantId &&
                <Button
                  className={cn("utility-unassign")}
                  variant="outline"
                  color="gray"
                  onClick={() => unassignUtility(utilityId)}
                >
                  {t("unassign")}
                </Button>
              }
            </div>
          </div>
          <Card className={cn("utility-card")}>
            <div className={cn("utility-card-top", "flex items-start justify-between gap-3")}>
              <div className={cn("utility-card-heading", "min-w-0")}>
                <h2 className={cn("utility-card-name", titleClass, "mt-0 mb-0 text-xl")}>{title}</h2>
                {detail &&
                  <div className={cn("utility-card-address", "mt-1 text-[0.75rem] leading-relaxed text-cs-muted")}>{detail}</div>
                }
                {tenantName &&
                  <Link
                    className={cn("utility-card-tenant", "mt-1 block truncate text-[0.75rem] text-cs-muted no-underline hover:text-cs-text")}
                    to={`/tenants/${tenantId}`}
                  >
                    {tenantName}
                    {isAuto && ` · ${t("matched")}`}
                  </Link>
                }
                {!tenantId &&
                  <div className={cn("utility-card-tenant", "mt-1 truncate text-[0.75rem] text-cs-text")}>
                    {t("no_tenant")}
                  </div>
                }
              </div>
              <div className={cn("utility-card-due", "shrink-0 text-right")}>
                <div className={cn("utility-card-bills", "text-[1.125rem] leading-none tabular-nums text-cs-text")}>
                  {formatAmount(billDue)}
                </div>
                <div className={cn("utility-card-bills-label", "mt-1 text-[0.75rem] text-cs-muted")}>
                  {t("bills_due")}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className={cn("utility-bills")}>
          <div className={cn("utility-bills-header", "mb-3")}>
            <div className={cn("utility-bills-label", labelClass)}>{t("bills")}</div>
          </div>
          {!hasBills && !loading &&
            <p className={cn("utility-bills-empty", "text-[0.875rem] leading-relaxed text-cs-muted")}>{t("no_open_utility_bills")}</p>
          }
          {hasBills &&
            <div className={cn("utility-bills-list", "flex flex-col gap-1.5")}>
              {_.map(bills, (bill) => {
                const { id } = bill
                return (
                  <BillCard
                    key={id}
                    bill={bill}
                    onUpload={openUpload}
                    hideTenant
                    hideUtility
                  />
                )
              })}
            </div>
          }
        </div>
        </>
        }
      </div>
    </AppScreen>
  )
}

export default React.memo(UtilityScreen)
