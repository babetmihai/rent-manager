import React from "react"
import { CloseButton, Collapse, Loader, TextInput, UnstyledButton } from "@mantine/core"
import { useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import AppScreen from "app/components/AppScreen"
import { cn, titleClass } from "app/core"
import { fetchTenants, listenTenants, selectTenants } from "app/core/tenants"
import { useLoader } from "app/core/loaders"
import { openCreate, openEdit } from "./actions"
import _ from "lodash"


const formatAmount = (value) => Number(value).toLocaleString("ro-RO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const TenantsScreen = () => {
  const { t } = useTranslation()
  const tenants = useSelector(() => selectTenants())
  const loading = useLoader("tenants")
  const [search, setSearch] = React.useState("")
  const [openIds, setOpenIds] = React.useState({})
  const isEmpty = _.isEmpty(tenants)
  const needle = _.toLower(_.trim(search))
  const matches = _.filter(_.orderBy(tenants, ["name"], ["asc"]), (tenant) => {
    if (!needle) return true
    const { name, email, description } = tenant || {}
    const hay = _.toLower(_.join([name, email, description], " "))
    return _.includes(hay, needle)
  })
  const hasMatches = !_.isEmpty(matches)
  const showList = !loading || !isEmpty

  React.useLayoutEffect(() => {
    fetchTenants()
    return listenTenants()
  }, [])

  return (
    <AppScreen>
      <div className={cn("tenants-screen")}>
        {loading && isEmpty &&
          <div className={cn("tenants-loading")}>
            <Loader color="gray" />
          </div>
        }
        {showList &&
          <div className={cn("tenants-scroll")}>
            <h2 className={cn("tenants-title", titleClass)}>{t("tenants")}</h2>
            {isEmpty &&
              <p className={cn("tenants-empty")}>{t("no_tenants_yet")}</p>
            }
            {!isEmpty &&
              <TextInput
                className={cn("tenants-search")}
                placeholder={t("search")}
                aria-label={t("search")}
                type="search"
                size="md"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                rightSection={search &&
                  <CloseButton
                    className={cn("tenants-search-clear")}
                    aria-label={t("search")}
                    onClick={() => setSearch("")}
                  />
                }
                rightSectionPointerEvents="all"
              />
            }
            {!isEmpty && !hasMatches &&
              <p className={cn("tenants-no-matches")}>{t("no_matches")}</p>
            }
            <div className={cn("tenants-list")}>
              {_.map(matches, (tenant) => {
                const { id, name, notifications, invoices = [] } = tenant || {}
                const enabled = notifications === true
                let status = t("inactive")
                let statusClass = "tenant-row-status"
                if (enabled) {
                  status = t("active")
                  statusClass = "tenant-row-status is-on"
                }
                const expanded = Boolean(openIds[id])
                const unpaid = _.filter(invoices, "amountDue")
                const hasUnpaid = !_.isEmpty(unpaid)
                const hasInvoices = !_.isEmpty(invoices)
                let markClass = "tenant-row-mark"
                if (expanded) markClass = "tenant-row-mark tenant-row-mark-open"
                return (
                  <div key={id} className={cn("tenant-row")}>
                    <div className={cn("tenant-row-head")}>
                      <UnstyledButton
                        className={cn("tenant-row-open")}
                        aria-expanded={hasInvoices ? expanded : undefined}
                        onClick={() => {
                          if (!hasInvoices) {
                            openEdit(tenant)
                            return
                          }
                          setOpenIds((current) => ({ ...current, [id]: !current[id] }))
                        }}
                      >
                        <div className={cn("tenant-row-name", titleClass)}>{name}</div>
                        <div className={cn("tenant-row-meta")}>
                          <div className={cn(statusClass)}>
                            <span className={cn("tenant-row-status-mark")} />
                            {status}
                          </div>
                          <div className={cn("tenant-row-end")}>
                            {hasInvoices &&
                              <span className={cn(markClass)} />
                            }
                            {hasUnpaid &&
                              <div className={cn("money")}>
                                <span className={cn("money-value")}>
                                  {formatAmount(_.sumBy(unpaid, (invoice) => Number(invoice.amountDue)))}
                                </span>
                                <span className={cn("money-unit")}>RON</span>
                              </div>
                            }
                          </div>
                        </div>
                      </UnstyledButton>
                      <UnstyledButton className={cn("tenant-row-edit")} onClick={() => openEdit(tenant)}>
                        {t("edit")}
                      </UnstyledButton>
                    </div>
                    <Collapse expanded={expanded}>
                      <div className={cn("tenant-invoices")}>
                        {_.map(invoices, (invoice) => {
                          const { id: invoiceId, dueDate, amount, amountDue, vendor, pointName } = invoice
                          const value = amount || amountDue
                          const isUnpaid = Boolean(amountDue)
                          let due = dueDate
                          if (dueDate) due = dueDate.replace(/^(\d{2})-(\d{2})-(\d{4}).*$/, "$1.$2.$3")
                          let label = vendor
                          if (!label) label = pointName
                          let amountClass = "money"
                          if (isUnpaid) amountClass = "money is-unpaid"
                          return (
                            <div key={invoiceId} className={cn("tenant-invoice")}>
                              <div className={cn("tenant-invoice-copy")}>
                                {label &&
                                  <div className={cn("tenant-invoice-vendor")}>{label}</div>
                                }
                                {due &&
                                  <div className={cn("tenant-invoice-due")}>{due}</div>
                                }
                              </div>
                              {value &&
                                <div className={cn(amountClass)}>
                                  <span className={cn("money-value")}>{formatAmount(value)}</span>
                                  <span className={cn("money-unit")}>RON</span>
                                </div>
                              }
                            </div>
                          )
                        })}
                      </div>
                    </Collapse>
                  </div>
                )
              })}
            </div>
          </div>
        }
        {showList &&
          <UnstyledButton className={cn("tenants-create")} aria-label={t("add_tenant")} onClick={openCreate}>
            <span className={cn("tenants-create-mark")} />
          </UnstyledButton>
        }
      </div>
    </AppScreen>
  )
}

export default React.memo(TenantsScreen)
