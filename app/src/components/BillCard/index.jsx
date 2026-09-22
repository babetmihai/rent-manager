import React from "react"
import { Link } from "react-router-dom"
import { Button, Card } from "@mantine/core"
import { useSelector } from "react-redux"
import { cn, EMPTY_OBJECT } from "app/core"
import AttachmentList from "app/components/AttachmentList"
import { useTranslation } from "react-i18next"
import { formatAmount, billAmount } from "app/core/bills"
import { selectTenant } from "app/core/tenants"
import { selectUtility } from "app/core/utilities"
import _ from "lodash"
import dayjs from "dayjs"


const BillCard = ({ bill, onUpload, hideTenant, hideUtility }) => {
  const { t } = useTranslation()
  const { id, ref, dueDate, status, utilityId } = bill
  const utility = useSelector(() => selectUtility(utilityId))
  const { id: linkedId, name, address, vendor, tenantId } = utility
  const tenant = useSelector(() => {
    if (!tenantId) return EMPTY_OBJECT
    return selectTenant(tenantId)
  })
  const { name: tenantName } = tenant
  const title = hideUtility ? ref : vendor || name || ref
  const detail = hideUtility ? null : _.find([address, name, ref], (part) => part && part !== title)
  const amount = billAmount(bill)
  const showTenant = !hideTenant
  const isOpen = linkedId && !tenantId

  return (
    <Card className={cn("bill-card")}>
      <div className={cn("bill-card-row", "flex items-start justify-between gap-3")}>
        <div className={cn("bill-card-heading", "min-w-0")}>
          <div className={cn("bill-card-name", "min-w-0 truncate text-[0.875rem] text-cs-text")}>{title}</div>
          {detail &&
            <div className={cn("bill-card-detail", "mt-0.5 truncate text-[0.75rem] text-cs-muted")}>{detail}</div>
          }
          {showTenant && tenantName &&
            <Link
              className={cn("bill-card-tenant", "mt-0.5 block truncate text-[0.75rem] text-cs-muted no-underline hover:text-cs-text")}
              to={`/tenants/${tenantId}`}
            >
              {tenantName}
            </Link>
          }
          {showTenant && isOpen &&
            <div className={cn("bill-card-tenant", "mt-0.5 truncate text-[0.75rem] text-cs-text")}>{t("no_tenant")}</div>
          }
        </div>
        <div className={cn("bill-card-due", "shrink-0 text-right")}>
          <div className={cn("bill-card-amount", "text-[0.875rem] leading-none tabular-nums text-cs-text")}>
            {formatAmount(amount)}
          </div>
          <div className={cn("bill-card-meta", "mt-1 text-[0.75rem] leading-snug text-cs-muted")}>
            {_.join(_.compact([t(status), dueDate && dayjs(dueDate, "DD-MM-YYYY").format("YYYY-MM-DD")]), " · ")}
          </div>
        </div>
      </div>
      <div className={cn("bill-card-footer", "mt-1.5 flex items-center justify-between gap-1")}>
        <AttachmentList
          parentType="bill"
          parentId={id}
          compact
        />
        <Button className={cn("bill-card-attach", "ml-auto")} variant="outline" color="gray" size="compact-xs" onClick={() => onUpload(id)}>
          {t("attach")}
        </Button>
      </div>
    </Card>
  )
}

export default React.memo(BillCard)
