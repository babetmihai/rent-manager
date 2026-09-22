import React from "react"
import { Button, Modal, ScrollArea, Stack, TextInput, UnstyledButton } from "@mantine/core"
import { useSelector } from "react-redux"
import { hideModal } from "app/core/modals"
import { cn } from "app/core"
import { useTranslation } from "react-i18next"
import { fetchTenants, selectTenants } from "app/core/tenants"
import _ from "lodash"


const AssignModal = ({ tenantId, onSubmit, onClose = hideModal }) => {
  const { t } = useTranslation()
  const tenants = useSelector(() => selectTenants())
  const [search, setSearch] = React.useState("")
  const [pickedId, setPickedId] = React.useState(tenantId)
  const needle = _.toLower(_.trim(search))
  const matches = _.filter(tenants, (tenant) => {
    if (!needle) return true
    const { name, email, phone, description } = tenant || {}
    const hay = _.toLower(_.join([name, email, phone, description], " "))
    return _.includes(hay, needle)
  })
  const hasTenants = !_.isEmpty(tenants)
  const hasMatches = !_.isEmpty(matches)

  React.useEffect(() => {
    fetchTenants()
  }, [])

  const pick = (id) => {
    setPickedId(id)
    onClose()
    onSubmit(id)
  }

  return (
    <Modal className={cn("assign-modal")} opened onClose={onClose} title={t("assign_tenant")}>
      <Stack className={cn("assign-modal-body")} gap="xs">
        {hasTenants &&
          <TextInput
            className={cn("assign-modal-search")}
            placeholder={t("search")}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            autoFocus
          />
        }
        {!hasTenants &&
          <p className={cn("assign-modal-empty", "mb-0 text-[0.875rem] text-cs-muted")}>{t("no_tenants_yet")}</p>
        }
        {hasTenants && !hasMatches &&
          <p className={cn("assign-modal-empty", "mb-0 text-[0.875rem] text-cs-muted")}>{t("no_matches")}</p>
        }
        {hasMatches &&
          <ScrollArea className={cn("assign-modal-results")} mah="20rem" type="auto">
            <Stack className={cn("assign-modal-list")} gap="xs">
              {_.map(matches, (tenant) => {
                const { id, name, email, phone, description } = tenant || {}
                const contact = _.join(_.compact([email, phone]), " · ")
                const isCurrent = id === pickedId
                const rowStyle = {
                  padding: "0.375rem 0.75rem",
                  border: "1px solid var(--color-cs-border)",
                  background: "transparent",
                  color: "var(--color-cs-text)"
                }
                if (isCurrent) {
                  rowStyle.border = "1px solid var(--color-cs-accent)"
                  rowStyle.background = "var(--color-cs-accent)"
                  rowStyle.color = "var(--color-cs-bg)"
                }
                return (
                  <UnstyledButton
                    key={id}
                    className={cn("assign-modal-tenant", "block w-full rounded-md text-left active:opacity-70")}
                    style={rowStyle}
                    onClick={() => pick(id)}
                  >
                    <div className={cn("assign-modal-tenant-name", "truncate text-[0.875rem]")}>{name}</div>
                    {contact &&
                      <div className={cn("assign-modal-tenant-contact", "mt-0.5 truncate text-[0.75rem] opacity-70")}>{contact}</div>
                    }
                    {description &&
                      <div className={cn("assign-modal-tenant-description", "mt-0.5 whitespace-pre-wrap text-[0.75rem] opacity-70")}>{description}</div>
                    }
                  </UnstyledButton>
                )
              })}
            </Stack>
          </ScrollArea>
        }
        {pickedId &&
          <Button
            className={cn("assign-modal-unassign")}
            variant="outline"
            color="gray"
            onClick={() => pick(null)}
          >
            {t("unassign")}
          </Button>
        }
      </Stack>
    </Modal>
  )
}

export default React.memo(AssignModal)
