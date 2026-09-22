import React from "react"
import { Modal, ScrollArea, Stack, TextInput, UnstyledButton } from "@mantine/core"
import { useSelector } from "react-redux"
import { hideModal } from "app/core/modals"
import { cn } from "app/core"
import { fetchUtilities, selectUtilities } from "app/core/utilities"
import { useTranslation } from "react-i18next"
import _ from "lodash"


const AssignUtilityModal = ({ tenantId, onSubmit, onClose = hideModal }) => {
  const { t } = useTranslation()
  const utilities = useSelector(() => selectUtilities())
  const [search, setSearch] = React.useState("")
  const needle = _.toLower(_.trim(search))
  const matches = _.filter(utilities, (utility) => {
    if (!needle) return true
    const { name, address, vendor } = utility
    const hay = _.toLower(_.join([name, address, vendor], " "))
    return _.includes(hay, needle)
  })
  const hasUtilities = !_.isEmpty(utilities)
  const hasMatches = !_.isEmpty(matches)

  React.useEffect(() => {
    fetchUtilities()
  }, [])

  const pick = (utility) => {
    const { id, tenantId: currentId } = utility
    onClose()
    if (currentId === tenantId) {
      onSubmit(id, null)
      return
    }
    onSubmit(id, tenantId)
  }

  return (
    <Modal className={cn("assign-utility-modal")} opened onClose={onClose} title={t("assign_utility")}>
      <Stack className={cn("assign-utility-modal-body")} gap="xs">
        {hasUtilities &&
          <TextInput
            className={cn("assign-utility-modal-search")}
            placeholder={t("search")}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            autoFocus
          />
        }
        {!hasUtilities &&
          <p className={cn("assign-utility-modal-empty", "mb-0 text-[0.875rem] text-cs-muted")}>{t("no_utility_accounts")}</p>
        }
        {hasUtilities && !hasMatches &&
          <p className={cn("assign-utility-modal-empty", "mb-0 text-[0.875rem] text-cs-muted")}>{t("no_matches")}</p>
        }
        {hasMatches &&
          <ScrollArea className={cn("assign-utility-modal-results")} mah="20rem" type="auto">
            <Stack className={cn("assign-utility-modal-list")} gap="xs">
              {_.map(matches, (utility) => {
                const { id, name, address, vendor, tenantId: currentId } = utility
                const isCurrent = currentId === tenantId
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
                    className={cn("assign-utility-modal-utility", "block w-full rounded-md text-left active:opacity-70")}
                    style={rowStyle}
                    onClick={() => pick(utility)}
                  >
                    <div className={cn("assign-utility-modal-utility-name", "truncate text-[0.875rem]")}>
                      {_.join(_.compact([vendor, name]), " · ")}
                    </div>
                    {address &&
                      <div className={cn("assign-utility-modal-utility-address", "mt-0.5 truncate text-[0.75rem] opacity-70")}>{address}</div>
                    }
                  </UnstyledButton>
                )
              })}
            </Stack>
          </ScrollArea>
        }
      </Stack>
    </Modal>
  )
}

export default React.memo(AssignUtilityModal)
