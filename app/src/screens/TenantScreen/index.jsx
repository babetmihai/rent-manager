import React from "react"
import { Button, Card, Loader, UnstyledButton } from "@mantine/core"
import { useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import AppScreen from "app/components/AppScreen"
import AttachmentList from "app/components/AttachmentList"
import BillCard from "app/components/BillCard"
import UtilityCard from "app/components/UtilityCard"
import { cn, labelClass, titleClass, STEP_STATUS } from "app/core"
import { useTranslation } from "react-i18next"
import { fetchTenant, fetchTenants, listenTenant, selectTenant } from "app/core/tenants"
import { fetchAttachments, listenAttachments } from "app/core/attachments"
import { fetchBills, listenBills, formatAmount, billAmount, selectBills } from "app/core/bills"
import { fetchUtilities, listenUtilities, selectUtilities } from "app/core/utilities"
import { useLoader } from "app/core/loaders"
import { goTenants, openEditTenant, confirmDeleteTenant, openUpload, matchUtilities, openAssignUtilities, sendBills } from "./actions"
import { openUpload as openBillUpload } from "app/screens/UtilitiesScreen/actions"
import _ from "lodash"


const TenantScreen = () => {
  const { t } = useTranslation()
  const { tenantId } = useParams()
  const tenant = useSelector(() => selectTenant(tenantId))
  const { name, email, phone, description, assignStatus, assignError, emailStatus, emailError } = tenant || {}
  const allBills = useSelector(() => selectBills())
  const allUtilities = useSelector(() => selectUtilities())
  const utilities = _.filter(allUtilities, { tenantId })
  const bills = _.filter(allBills, (bill) => {
    const { ref, dueAmount, utilityId } = bill
    const { tenantId: assignedId } = allUtilities[utilityId] || {}
    return ref && dueAmount && assignedId === tenantId
  })
  const billDue = _.sumBy(bills, (item) => billAmount(item))
  const isAssigning = assignStatus === STEP_STATUS.PENDING
  const isEmailing = emailStatus === STEP_STATUS.PENDING
  const hasTenant = Boolean(tenant.id)
  const hasBills = !_.isEmpty(bills)
  const hasUtilities = !_.isEmpty(utilities)
  const loadingTenant = useLoader(`tenants.${tenantId}`)
  const loadingTenants = useLoader("tenants")
  const loadingUtilities = useLoader("utilities")
  const loadingBills = useLoader("bills")
  const loading = loadingTenant || loadingTenants || loadingUtilities || loadingBills

  React.useLayoutEffect(() => {
    fetchTenant(tenantId)
    fetchTenants()
    fetchUtilities()
    fetchBills()
    fetchAttachments()
    const unlistenTenant = listenTenant(tenantId)
    const unlistenBills = listenBills()
    const unlistenAttachments = listenAttachments()
    const unlistenUtilities = listenUtilities()
    return () => {
      unlistenTenant()
      unlistenBills()
      unlistenAttachments()
      unlistenUtilities()
    }
  }, [tenantId])

  return (
    <AppScreen>
      <div className={cn("tenant-screen", "mx-auto flex min-h-full w-full max-w-[42rem] flex-col px-3 py-4")}>
        {loading && !hasTenant &&
          <div className={cn("tenant-loading", "flex flex-1 items-center justify-center")}>
            <Loader color="gray" />
          </div>
        }
        {hasTenant &&
        <>
        <div className={cn("tenant-header", "mb-4 shrink-0")}>
          <div className={cn("tenant-header-bar", "mb-3 flex items-center justify-between gap-3")}>
            <UnstyledButton
              className={cn(
                "tenant-back",
                "-ml-1 inline-flex min-h-[2rem] items-center gap-1 rounded px-1 text-[0.875rem] text-cs-muted hover:text-cs-text"
              )}
              onClick={goTenants}
            >
              <svg
                className={cn("tenant-back-chevron")}
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
              {t("tenants")}
            </UnstyledButton>
            <Button className={cn("tenant-edit")} variant="outline" color="gray" onClick={() => openEditTenant(tenant)}>
              {t("edit")}
            </Button>
          </div>
          <Card className={cn("tenant-card")}>
            <div className={cn("tenant-card-top", "flex items-start justify-between gap-3")}>
              <div className={cn("tenant-card-heading", "min-w-0")}>
                <h2 className={cn("tenant-card-name", titleClass, "mt-0 mb-0 text-xl")}>{name}</h2>
                {(email || phone) &&
                  <div className={cn("tenant-card-contact", "mt-1 flex flex-wrap gap-x-2 text-[0.75rem]")}>
                    {email &&
                      <a
                        className={cn("tenant-card-email", "text-cs-muted no-underline hover:text-cs-text")}
                        href={`mailto:${email}`}
                      >
                        {email}
                      </a>
                    }
                    {phone &&
                      <a
                        className={cn("tenant-card-phone", "text-cs-muted no-underline hover:text-cs-text")}
                        href={`tel:${phone}`}
                      >
                        {phone}
                      </a>
                    }
                  </div>
                }
                {description &&
                  <div className={cn("tenant-card-description", "mt-1 whitespace-pre-wrap text-[0.75rem] leading-relaxed text-cs-muted")}>{description}</div>
                }
              </div>
              <div className={cn("tenant-card-due", "shrink-0 text-right")}>
                <div className={cn("tenant-card-bills", "text-[1.125rem] leading-none tabular-nums text-cs-text")}>
                  {formatAmount(billDue)}
                </div>
                <div className={cn("tenant-card-bills-label", "mt-1 text-[0.75rem] text-cs-muted")}>
                  {t("bills_due")}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className={cn("tenant-bills", "mb-8")}>
          <div className={cn("tenant-bills-header", "mb-3 flex items-end justify-between gap-3")}>
            <div className={cn("tenant-bills-label", labelClass)}>{t("bills")}</div>
            <Button
              className={cn("tenant-bills-send")}
              variant="outline"
              color="gray"
              loading={isEmailing}
              disabled={!email || !hasBills}
              onClick={() => sendBills(tenantId)}
            >
              {t("send")}
            </Button>
          </div>
          {emailError &&
            <p className={cn("tenant-bills-error", "mb-3 text-[0.75rem] leading-relaxed text-cs-muted")}>{emailError}</p>
          }
          {!hasBills && !loading &&
            <p className={cn("tenant-bills-empty", "text-[0.875rem] leading-relaxed text-cs-muted")}>{t("no_open_bills")}</p>
          }
          {hasBills &&
            <div className={cn("tenant-bills-list", "flex flex-col gap-1.5")}>
              {_.map(bills, (bill) => {
                const { id } = bill || {}
                return (
                  <BillCard
                    key={id}
                    bill={bill}
                    onUpload={openBillUpload}
                    hideTenant
                  />
                )
              })}
            </div>
          }
        </div>

        <div className={cn("tenant-utilities", "mb-8")}>
          <div className={cn("tenant-utilities-header", "mb-3 flex items-end justify-between gap-3")}>
            <div className={cn("tenant-utilities-label", labelClass)}>{t("utilities")}</div>
            <div className={cn("tenant-utilities-actions", "flex gap-2")}>
              <Button
                className={cn("tenant-utilities-assign")}
                variant="outline"
                color="gray"
                onClick={() => openAssignUtilities(tenantId)}
              >
                {t("assign")}
              </Button>
              <Button
                className={cn("tenant-utilities-match")}
                variant="outline"
                color="gray"
                loading={isAssigning}
                onClick={() => matchUtilities(tenantId)}
              >
                {t("match")}
              </Button>
            </div>
          </div>
          {assignError &&
            <p className={cn("tenant-utilities-error", "mb-3 text-[0.75rem] leading-relaxed text-cs-muted")}>{assignError}</p>
          }
          {!hasUtilities && !loading &&
            <p className={cn("tenant-utilities-empty", "text-[0.875rem] leading-relaxed text-cs-muted")}>
              {t("no_utilities_yet")}
            </p>
          }
          {hasUtilities &&
            <div className={cn("tenant-utilities-list", "flex flex-col gap-1.5")}>
              {_.map(_.orderBy(utilities, ["vendor", "name"]), (utility) => {
                const { id } = utility
                return (
                  <UtilityCard key={id} utility={utility} hideTenant />
                )
              })}
            </div>
          }
        </div>

        <div className={cn("tenant-attachments")}>
          <AttachmentList
            parentType="tenant"
            parentId={tenantId}
            label="documents"
            onUpload={() => openUpload("tenant", tenantId)}
          />
        </div>
        <div className={cn("tenant-footer", "mt-8")}>
          <Button
            className={cn("tenant-delete")}
            variant="outline"
            color="red"
            onClick={() => confirmDeleteTenant(tenant)}
          >
            {t("delete_tenant")}
          </Button>
        </div>
        </>
        }
      </div>
    </AppScreen>
  )
}

export default React.memo(TenantScreen)
