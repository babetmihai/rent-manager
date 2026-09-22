import React from "react"
import { Button, Card, CloseButton, Loader, TextInput, UnstyledButton } from "@mantine/core"
import { useSelector } from "react-redux"
import AppScreen from "app/components/AppScreen"
import SetupSteps from "app/components/SetupSteps"
import { cn, titleClass, STEP_STATUS } from "app/core"
import { fetchTenants, listenTenants, selectTenants } from "app/core/tenants"
import { fetchUtilities, listenUtilities, selectUtilities } from "app/core/utilities"
import { formatAmount, billAmount, fetchBills, listenBills, selectBills } from "app/core/bills"
import { fetchPago, listenPago, markPagoOnboarded, selectPago } from "app/core/pago"
import { useLoader } from "app/core/loaders"
import { useTranslation } from "react-i18next"
import { openPago } from "app/components/AuthMenu/actions"
import { syncPago } from "app/screens/UtilitiesScreen/actions"
import { openCreate, openTenant, openUtilities, createTenants } from "./actions"
import _ from "lodash"


const TenantsScreen = () => {
  const { t } = useTranslation()
  const tenants = useSelector(() => selectTenants())
  const utilities = useSelector(() => selectUtilities())
  const bills = useSelector(() => selectBills())
  const pago = useSelector(() => selectPago())
  const loadingTenants = useLoader("tenants")
  const loadingUtilities = useLoader("utilities")
  const loadingBills = useLoader("bills")
  const loadingPago = useLoader("pago")
  const loading = loadingTenants || loadingUtilities || loadingBills || loadingPago
  const [search, setSearch] = React.useState("")
  const isEmpty = _.isEmpty(tenants)
  const needle = _.toLower(_.trim(search))
  const matches = _.filter(_.orderBy(tenants, ["createdAt"], ["desc"]), (tenant) => {
    if (!needle) return true
    const { name, email, phone, description } = tenant || {}
    const hay = _.toLower(_.join([name, email, phone, description], " "))
    return _.includes(hay, needle)
  })
  const hasMatches = !_.isEmpty(matches)
  const openCount = _.size(_.filter(utilities, (utility) => {
    const { tenantId } = utility
    return !tenantId
  }))
  const dueBills = _.filter(bills, (bill) => {
    const { ref, dueAmount } = bill
    return ref && dueAmount
  })
  const totalDue = _.sumBy(dueBills, (item) => billAmount(item))
  const tenantCount = _.size(tenants)
  const { syncStatus, syncError, tenantStatus, tenantError, onboardedAt } = pago
  const hasPago = Boolean(pago.id)
  const hasUtilities = !_.isEmpty(utilities)
  const isOnboarded = Boolean(onboardedAt)
  const isPending = syncStatus === STEP_STATUS.PENDING
  const isCreating = tenantStatus === STEP_STATUS.PENDING
  let setupStep = 0
  if (!isOnboarded) {
    if (!hasPago) setupStep = 1
    else if (!hasUtilities) setupStep = 2
    else if (isEmpty) setupStep = 3
  }

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

  React.useLayoutEffect(() => {
    if (!hasPago || isEmpty || !hasUtilities || isOnboarded) return
    void markPagoOnboarded()
  }, [hasPago, isEmpty, hasUtilities, isOnboarded])

  return (
    <AppScreen>
      <div className={cn("tenants-screen", "mx-auto flex min-h-full w-full max-w-[42rem] flex-col px-3 py-4")}>
        {loading && isEmpty && !isOnboarded &&
          <div className={cn("tenants-loading", "flex flex-1 items-center justify-center")}>
            <Loader color="gray" />
          </div>
        }
        {!loading && isEmpty && !isOnboarded &&
          <div className={cn("tenants-hero", "flex flex-1 flex-col items-start justify-center")}>
            <h1 className={cn("tenants-hero-title", titleClass, "mb-2 text-xl")}>
              {t("tenants")}
            </h1>
            <p className={cn("tenants-hero-copy", "mb-4 max-w-[36rem] text-[0.875rem] leading-normal text-cs-body")}>
              {t("setup_copy")}
            </p>
            <SetupSteps current={setupStep} />
            {setupStep === 1 &&
              <Button className={cn("tenants-hero-connect")} onClick={() => openPago(pago)}>
                {t("connect_pago")}
              </Button>
            }
            {setupStep === 2 &&
              <>
                {syncError &&
                  <p className={cn("tenants-hero-sync-error", "mb-3 text-[0.875rem] leading-normal text-cs-muted")}>
                    {syncError}
                  </p>
                }
                <Button className={cn("tenants-hero-sync")} onClick={syncPago} loading={isPending}>
                  {t("sync")}
                </Button>
              </>
            }
            {setupStep === 3 &&
              <>
                {tenantError &&
                  <p className={cn("tenants-hero-tenant-error", "mb-3 text-[0.875rem] leading-normal text-cs-muted")}>
                    {tenantError}
                  </p>
                }
                <Button className={cn("tenants-hero-create")} onClick={createTenants} loading={isCreating}>
                  {t("create_tenants")}
                </Button>
              </>
            }
          </div>
        }
        {(!isEmpty || isOnboarded) &&
          <div className={cn("tenants-list-wrap", "flex flex-col")}>
            <div className={cn("tenants-header", "mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between")}>
              <div className={cn("tenants-heading", "min-w-0")}>
                <h2 className={cn("tenants-title", titleClass, "mt-0 mb-0 text-xl")}>{t("tenants")}</h2>
                <div className={cn("tenants-meta", "mt-1 truncate text-[0.75rem] text-cs-muted")}>
                  <span>{formatAmount(totalDue)}</span>
                  <span> · {t("tenant_count", { count: tenantCount })}</span>
                  {openCount > 0 &&
                    <UnstyledButton
                      className={cn("tenants-unassigned", "text-[0.75rem] text-cs-muted hover:text-cs-text")}
                      onClick={openUtilities}
                    >
                      {" · "}{t("unassigned_utility", { count: openCount })}
                    </UnstyledButton>
                  }
                </div>
              </div>
              <Button className={cn("tenants-create", "self-start sm:self-auto")} onClick={openCreate}>
                {t("add_tenant")}
              </Button>
            </div>
            {setupStep > 0 &&
              <div className={cn("tenants-setup", "mb-4")}>
                <p className={cn("tenants-setup-copy", "mb-2 max-w-[36rem] text-[0.875rem] leading-normal text-cs-body")}>
                  {t("setup_copy")}
                </p>
                <SetupSteps current={setupStep} />
                {setupStep === 1 &&
                  <Button className={cn("tenants-setup-connect")} onClick={() => openPago(pago)}>
                    {t("connect_pago")}
                  </Button>
                }
                {setupStep === 2 &&
                  <>
                    {syncError &&
                      <p className={cn("tenants-setup-sync-error", "mb-3 text-[0.875rem] leading-normal text-cs-muted")}>
                        {syncError}
                      </p>
                    }
                    <Button className={cn("tenants-setup-sync")} onClick={syncPago} loading={isPending}>
                      {t("sync")}
                    </Button>
                  </>
                }
                {setupStep === 3 &&
                  <>
                    {tenantError &&
                      <p className={cn("tenants-setup-tenant-error", "mb-3 text-[0.875rem] leading-normal text-cs-muted")}>
                        {tenantError}
                      </p>
                    }
                    <Button className={cn("tenants-setup-create")} onClick={createTenants} loading={isCreating}>
                      {t("create_tenants")}
                    </Button>
                  </>
                }
              </div>
            }
            <TextInput
              className={cn("tenants-search", "mb-3")}
              placeholder={t("search")}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              rightSection={search &&
                <CloseButton
                  className={cn("tenants-search-clear")}
                  onClick={() => setSearch("")}
                />
              }
              rightSectionPointerEvents="all"
            />
            {isEmpty &&
              <p className={cn("tenants-empty", "mb-0 text-[0.875rem] text-cs-muted")}>{t("no_tenants_yet")}</p>
            }
            {!isEmpty && !hasMatches &&
              <p className={cn("tenants-empty", "mb-0 text-[0.875rem] text-cs-muted")}>{t("no_matches")}</p>
            }
            <div className={cn("tenants-list", "flex flex-col gap-2")}>
              {_.map(matches, (tenant) => {
                const { id, name, email, phone, description } = tenant || {}
                const tenantUtilities = _.filter(utilities, { tenantId: id })
                const tenantBills = _.filter(bills, (bill) => {
                  const { ref, dueAmount, utilityId } = bill
                  const { tenantId } = utilities[utilityId] || {}
                  return ref && dueAmount && tenantId === id
                })
                const billDue = _.sumBy(tenantBills, (item) => billAmount(item))
                const overdueCount = _.size(_.filter(tenantBills, { status: "overdue" }))
                let dueLabel = t("bill_count", { count: _.size(tenantBills) })
                if (overdueCount > 0) dueLabel = t("overdue_count", { count: overdueCount })
                return (
                  <Card
                    key={id}
                    className={cn("tenant-card", "cursor-pointer")}
                    onClick={() => openTenant(id)}
                  >
                    <div className={cn("tenant-card-top", "flex items-start justify-between gap-3")}>
                      <div className={cn("tenant-card-heading", "min-w-0")}>
                        <div className={cn("tenant-card-name", titleClass, "text-[1.125rem]")}>{name}</div>
                        {(email || phone) &&
                          <div className={cn("tenant-card-contact", "mt-1 flex flex-wrap gap-x-2 text-[0.75rem]")}>
                            {email &&
                              <a
                                className={cn("tenant-card-email", "text-cs-muted no-underline hover:text-cs-text")}
                                href={`mailto:${email}`}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {email}
                              </a>
                            }
                            {phone &&
                              <a
                                className={cn("tenant-card-phone", "text-cs-muted no-underline hover:text-cs-text")}
                                href={`tel:${phone}`}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {phone}
                              </a>
                            }
                          </div>
                        }
                        {description &&
                          <div className={cn("tenant-card-description", "mt-1 whitespace-pre-wrap text-[0.75rem] leading-relaxed text-cs-muted")}>{description}</div>
                        }
                        <div className={cn("tenant-card-meta", "mt-2 text-[0.75rem] text-cs-muted")}>
                          {t("utility_count", { count: _.size(tenantUtilities) })}
                        </div>
                      </div>
                      <div className={cn("tenant-card-due", "shrink-0 text-right")}>
                        <div className={cn("tenant-card-bills", "text-[1.125rem] leading-none tabular-nums text-cs-text")}>
                          {formatAmount(billDue)}
                        </div>
                        <div className={cn("tenant-card-bills-label", "mt-1 text-[0.75rem] text-cs-muted")}>
                          {dueLabel}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        }
      </div>
    </AppScreen>
  )
}

export default React.memo(TenantsScreen)
