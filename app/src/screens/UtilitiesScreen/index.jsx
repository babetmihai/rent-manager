import React from "react"
import { Button, CloseButton, Loader, TextInput } from "@mantine/core"
import { useSelector } from "react-redux"
import AppScreen from "app/components/AppScreen"
import SetupSteps from "app/components/SetupSteps"
import UtilityCard from "app/components/UtilityCard"
import { cn, titleClass, STEP_STATUS } from "app/core"
import { fetchPago, listenPago, selectPago } from "app/core/pago"
import { billAmount, fetchBills, listenBills, selectBills, formatAmount } from "app/core/bills"
import { fetchTenants, listenTenants, selectTenants } from "app/core/tenants"
import { fetchUtilities, listenUtilities, selectUtilities } from "app/core/utilities"
import { useLoader } from "app/core/loaders"
import { useTranslation } from "react-i18next"
import { openPago } from "app/components/AuthMenu/actions"
import { syncPago, matchPago, createTenants, confirmDeleteAllBills } from "./actions"
import _ from "lodash"
import dayjs from "dayjs"


const UtilitiesScreen = () => {
  const { t } = useTranslation()
  const pago = useSelector(() => selectPago())
  const allBills = useSelector(() => selectBills())
  const utilities = useSelector(() => selectUtilities())
  const tenants = useSelector(() => selectTenants())
  const { syncStatus, syncError, syncedAt, matchStatus, matchError, tenantStatus, tenantError } = pago
  const hasPago = Boolean(pago.id)
  const hasTenants = !_.isEmpty(tenants)
  const isPending = syncStatus === STEP_STATUS.PENDING
  const isMatching = matchStatus === STEP_STATUS.PENDING
  const isCreating = tenantStatus === STEP_STATUS.PENDING
  const [search, setSearch] = React.useState("")
  const needle = _.toLower(_.trim(search))
  const openUtilities = _.filter(utilities, (utility) => {
    const { tenantId } = utility
    return !tenantId
  })
  const assignedUtilities = _.filter(utilities, (utility) => {
    const { tenantId } = utility
    return Boolean(tenantId)
  })
  const sortedUtilities = _.concat(
    _.orderBy(openUtilities, ["vendor", "name"]),
    _.orderBy(assignedUtilities, ["vendor", "name"])
  )
  const matches = _.filter(sortedUtilities, (utility) => {
    if (!needle) return true
    const { name, address, vendor, tenantId } = utility || {}
    const { name: tenantName } = tenants[tenantId] || {}
    const hay = _.toLower(_.join([name, address, vendor, tenantName], " "))
    return _.includes(hay, needle)
  })
  const hasMatches = !_.isEmpty(matches)
  const isEmpty = _.isEmpty(utilities)
  const openCount = _.size(openUtilities)
  const overdueCount = _.size(_.filter(allBills, { status: "overdue" }))
  const dueBills = _.filter(allBills, (bill) => {
    const { ref, dueAmount } = bill
    return ref && dueAmount
  })
  const totalDue = _.sumBy(dueBills, (item) => billAmount(item))
  const utilityCount = _.size(utilities)
  const loadingPago = useLoader("pago")
  const loadingUtilities = useLoader("utilities")
  const loadingBills = useLoader("bills")
  const loading = loadingPago || loadingUtilities || loadingBills

  React.useLayoutEffect(() => {
    fetchPago()
    fetchTenants()
    fetchUtilities()
    fetchBills()
    const unlistenPago = listenPago()
    const unlistenTenants = listenTenants()
    const unlistenBills = listenBills()
    const unlistenUtilities = listenUtilities()
    return () => {
      unlistenPago()
      unlistenTenants()
      unlistenBills()
      unlistenUtilities()
    }
  }, [])

  return (
    <AppScreen>
      <div className={cn("utilities-screen", "mx-auto flex min-h-full w-full max-w-[42rem] flex-col px-3 py-4")}>
        {loading && !hasPago &&
          <div className={cn("utilities-loading", "flex flex-1 items-center justify-center")}>
            <Loader color="gray" />
          </div>
        }
        {!loading && !hasPago &&
          <div className={cn("utilities-hero", "flex flex-1 flex-col items-start justify-center")}>
            <h1 className={cn("utilities-hero-title", titleClass, "mb-2 text-xl")}>
              {t("utilities")}
            </h1>
            <p className={cn("utilities-hero-copy", "mb-4 max-w-[36rem] text-[0.875rem] leading-normal text-cs-body")}>
              {t("setup_copy")}
            </p>
            <SetupSteps current={1} />
            <Button className={cn("utilities-hero-connect")} onClick={() => openPago(pago)}>
              {t("connect_pago")}
            </Button>
          </div>
        }
        {hasPago &&
          <div className={cn("utilities-list-wrap", "flex flex-col")}>
            <div className={cn("utilities-header", "mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between")}>
              <div className={cn("utilities-heading", "min-w-0")}>
                <h2 className={cn("utilities-title", titleClass, "mt-0 mb-0 text-xl")}>{t("utilities")}</h2>
                <div className={cn("utilities-meta", "mt-1 truncate text-[0.75rem] text-cs-muted")}>
                  <span>{formatAmount(totalDue)}</span>
                  <span> · {t("utility_count", { count: utilityCount })}</span>
                  {openCount > 0 &&
                    <span> · {t("needs_tenant", { count: openCount })}</span>
                  }
                  {overdueCount > 0 &&
                    <span> · {t("overdue_count", { count: overdueCount })}</span>
                  }
                  {syncedAt &&
                    <span> · {dayjs(syncedAt).format("YYYY-MM-DD HH:mm")}</span>
                  }
                  {isPending &&
                    <span> · {t("syncing")}</span>
                  }
                  {isMatching &&
                    <span> · {t("matching")}</span>
                  }
                  {isCreating &&
                    <span> · {t("creating_tenants")}</span>
                  }
                  {syncError &&
                    <span> · {syncError}</span>
                  }
                  {matchError &&
                    <span> · {matchError}</span>
                  }
                  {tenantError &&
                    <span> · {tenantError}</span>
                  }
                </div>
              </div>
              <div className={cn("utilities-header-actions", "flex shrink-0 flex-wrap gap-2 sm:justify-end")}>
                <Button className={cn("utilities-sync")} onClick={syncPago} loading={isPending}>
                  {t("sync")}
                </Button>
                {hasTenants &&
                  <Button className={cn("utilities-match")} variant="outline" color="gray" onClick={matchPago} loading={isMatching}>
                    {t("match")}
                  </Button>
                }
                {!hasTenants && openCount > 0 &&
                  <Button className={cn("utilities-create-tenants")} variant="outline" color="gray" onClick={createTenants} loading={isCreating}>
                    {t("create_tenants")}
                  </Button>
                }
              </div>
            </div>
            <TextInput
              className={cn("utilities-search", "mb-3")}
              placeholder={t("search")}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              rightSection={search &&
                <CloseButton
                  className={cn("utilities-search-clear")}
                  onClick={() => setSearch("")}
                />
              }
              rightSectionPointerEvents="all"
            />
            {isEmpty &&
              <p className={cn("utilities-empty", "mb-0 text-[0.875rem] text-cs-muted")}>{t("no_utility_accounts_sync")}</p>
            }
            {!isEmpty && !hasMatches &&
              <p className={cn("utilities-empty", "mb-0 text-[0.875rem] text-cs-muted")}>{t("no_matches")}</p>
            }
            <div className={cn("utilities-list", "flex flex-col gap-1.5")}>
              {_.map(matches, (utility) => {
                const { id } = utility
                return (
                  <UtilityCard key={id} utility={utility} />
                )
              })}
            </div>
            <div className={cn("utilities-footer", "mt-8")}>
              <Button
                className={cn("utilities-delete-all")}
                variant="outline"
                color="red"
                onClick={confirmDeleteAllBills}
                disabled={_.isEmpty(allBills) && _.isEmpty(utilities)}
              >
                {t("delete_all")}
              </Button>
            </div>
          </div>
        }
      </div>
    </AppScreen>
  )
}

export default React.memo(UtilitiesScreen)
