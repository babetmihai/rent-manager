import React from "react"
import { Button, Checkbox, CloseButton, Collapse, Loader, TextInput, UnstyledButton } from "@mantine/core"
import { useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import AppScreen from "app/components/AppScreen"
import { cn, STEP_STATUS, titleClass } from "app/core"
import { refreshInvoices, requestInvoiceMail, selectPago } from "app/core/pago"
import { fetchTenants, listenTenants, selectTenants, updateTenant } from "app/core/tenants"
import { useLoader } from "app/core/loaders"
import { showBanner } from "app/core/banner"
import _ from "lodash"


const formatAmount = (value) => Number(value).toLocaleString("ro-RO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const formatSent = (value) => new Date(value).toLocaleDateString("ro-RO")

const TenantsScreen = () => {
  const { t } = useTranslation()
  const tenants = useSelector(() => selectTenants())
  const pago = useSelector(() => selectPago())
  const { id: pagoId, syncStatus, syncError, sendStatus, sendError } = pago || {}
  const refreshing = syncStatus === STEP_STATUS.PENDING
  const sending = sendStatus === STEP_STATUS.PENDING
  const loading = useLoader("tenants")
  const [search, setSearch] = React.useState("")
  const [openIds, setOpenIds] = React.useState({})
  const [activeTags, setActiveTags] = React.useState([])
  const [unsentOnly, setUnsentOnly] = React.useState(false)
  const [pendingOnly, setPendingOnly] = React.useState(false)
  const [selected, setSelected] = React.useState({})
  const [drafts, setDrafts] = React.useState({})
  const [descriptions, setDescriptions] = React.useState({})
  const [emails, setEmails] = React.useState({})
  const [saved, setSaved] = React.useState({})
  const isEmpty = _.isEmpty(tenants)
  const needle = _.toLower(_.trim(search))
  const allTags = _.sortBy(_.uniq(_.flatMap(tenants, (tenant) => {
    const { tags = [] } = tenant || {}
    return tags
  })))
  const matches = _.filter(_.orderBy(tenants, ["name"], ["asc"]), (tenant) => {
    const { name, email, description, tags = [], invoices = [] } = tenant || {}
    const unpaid = _.filter(invoices, "amountDue")
    if (pendingOnly && _.isEmpty(unpaid)) return false
    if (unsentOnly) {
      const hasUnsent = _.some(unpaid, (invoice) => !invoice.sentAt)
      if (!hasUnsent) return false
    }
    if (activeTags.length) {
      const hasTag = _.some(activeTags, (tag) => _.some(tags, (item) => _.toLower(item) === _.toLower(tag)))
      if (!hasTag) return false
    }
    if (!needle) return true
    const hay = _.toLower(_.join([name, email, description, ...tags], " "))
    return _.includes(hay, needle)
  })
  const hasMatches = !_.isEmpty(matches)
  const showList = !loading || !isEmpty
  const pendingInvoices = (invoices) => {
    const pending = _.filter(invoices, "amountDue")
    if (!unsentOnly) return pending
    return _.filter(pending, (invoice) => !invoice.sentAt)
  }
  const visibleKeys = _.flatMap(matches, (tenant) => {
    const { id, email, invoices = [] } = tenant || {}
    if (!_.trim(email)) return []
    return _.map(pendingInvoices(invoices), (invoice) => `${id}:${invoice.id}`)
  })
  const allChecked = visibleKeys.length > 0 && _.every(visibleKeys, (key) => selected[key])
  const someChecked = _.some(visibleKeys, (key) => selected[key])
  const allPartial = someChecked && !allChecked
  const selectedKeys = _.intersection(_.keys(selected), visibleKeys)
  const hasSelection = !_.isEmpty(selectedKeys)
  const recipientIds = _.uniq(_.map(selectedKeys, (key) => _.head(_.split(key, ":"))))
  let sendLabel = t("select_invoices_to_send")
  if (hasSelection && recipientIds.length === 1) {
    const recipient = _.find(tenants, { id: recipientIds[0] })
    const { name } = recipient || {}
    sendLabel = t("send_to_name", { count: selectedKeys.length, name })
  }
  if (hasSelection && recipientIds.length > 1) {
    sendLabel = t("send_to_tenants", { count: selectedKeys.length, tenants: recipientIds.length })
  }

  React.useLayoutEffect(() => {
    fetchTenants()
    return listenTenants()
  }, [])

  const jobStatus = React.useRef({})
  React.useEffect(() => {
    const previous = jobStatus.current
    jobStatus.current = { sendStatus, syncStatus }
    if (previous.sendStatus === STEP_STATUS.PENDING && sendStatus === STEP_STATUS.COMPLETED) {
      setSelected({})
      showBanner("success", t("invoices_sent"))
    }
    if (previous.sendStatus === STEP_STATUS.PENDING && sendStatus === STEP_STATUS.FAILED && sendError) {
      showBanner("error", sendError)
    }
    if (previous.syncStatus === STEP_STATUS.PENDING && syncStatus === STEP_STATUS.COMPLETED) {
      showBanner("success", t("invoices_refreshed"))
    }
    if (previous.syncStatus === STEP_STATUS.PENDING && syncStatus === STEP_STATUS.FAILED && syncError) {
      showBanner("error", syncError)
    }
  }, [sendStatus, sendError, syncStatus, syncError, t])

  const toggleAll = () => {
    if (allChecked) {
      setSelected({})
      return
    }
    const next = {}
    for (const key of visibleKeys) next[key] = true
    setSelected(next)
  }

  const toggleKeys = (keys) => {
    setSelected((current) => {
      const next = { ...current }
      const allOn = _.every(keys, (key) => next[key])
      if (allOn) {
        for (const key of keys) delete next[key]
        return next
      }
      for (const key of keys) next[key] = true
      return next
    })
  }

  const toggleKey = (key) => {
    setSelected((current) => {
      const next = { ...current }
      if (next[key]) delete next[key]
      else next[key] = true
      return next
    })
  }

  const saveTenant = async (id, values) => {
    setSaved((current) => ({ ...current, [id]: "saving" }))
    try {
      await updateTenant(id, values)
    } catch (error) {
      setSaved((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
      throw error
    }
    setSaved((current) => ({ ...current, [id]: "saved" }))
    window.setTimeout(() => {
      setSaved((current) => {
        if (current[id] !== "saved") return current
        const next = { ...current }
        delete next[id]
        return next
      })
    }, 1200)
  }

  const saveTimers = React.useRef({})

  const queueSave = (id, field, raw, stored) => {
    const key = `${id}:${field}`
    window.clearTimeout(saveTimers.current[key])
    const next = _.trim(raw)
    if (next === stored) return
    saveTimers.current[key] = window.setTimeout(() => {
      void saveTenant(id, { [field]: next }).then(() => {
        let clear = setDescriptions
        if (field === "email") clear = setEmails
        clear((current) => {
          if (current[id] !== raw) return current
          const copy = { ...current }
          delete copy[id]
          return copy
        })
      })
    }, 500)
  }

  React.useEffect(() => {
    const timers = saveTimers.current
    return () => {
      for (const key of Object.keys(timers)) window.clearTimeout(timers[key])
    }
  }, [])

  const addTag = async (tenant) => {
    const { id, tags = [] } = tenant
    const raw = _.trim(drafts[id])
    if (!raw) return
    const exists = _.some(tags, (tag) => _.toLower(tag) === _.toLower(raw))
    if (!exists) await saveTenant(id, { tags: [...tags, raw] })
    setDrafts((current) => ({ ...current, [id]: "" }))
  }

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
            <h2 className={cn("tenants-title", titleClass)}>
              <img className={cn("brand-mark")} src="/favicon.svg" alt="" />
              {t("rent_manager")}
            </h2>
            {isEmpty &&
              <p className={cn("tenants-empty")}>{t("no_tenants_yet")}</p>
            }
            <div className={cn("tenants-search-row")}>
              {!isEmpty &&
                <TextInput
                  className={cn("tenants-search")}
                  placeholder={t("search")}
                  aria-label={t("search")}
                  type="search"
                  size="xs"
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
              {pagoId &&
                <Button
                  className={cn("tenants-refresh")}
                  variant="default"
                  aria-label={t("refresh")}
                  loading={refreshing}
                  onClick={refreshInvoices}
                >
                  <span className={cn("tenants-refresh-mark")} />
                </Button>
              }
            </div>
            {!isEmpty &&
              <div className={cn("tenants-tools-row")}>
                <div className={cn("tenants-tools")}>
                  <UnstyledButton
                    className={cn(pendingOnly ? "tenant-filter is-on" : "tenant-filter")}
                    onClick={() => setPendingOnly((current) => !current)}
                  >
                    {t("pending")}
                  </UnstyledButton>
                  <UnstyledButton
                    className={cn(unsentOnly ? "tenant-filter is-on" : "tenant-filter")}
                    onClick={() => setUnsentOnly((current) => !current)}
                  >
                    {t("not_sent")}
                  </UnstyledButton>
                  {_.map(allTags, (tag) => {
                    const on = _.includes(activeTags, tag)
                    let filterClass = "tenant-filter"
                    if (on) filterClass = "tenant-filter is-on"
                    return (
                      <UnstyledButton
                        key={tag}
                        className={cn(filterClass)}
                        onClick={() => {
                          setActiveTags((current) => {
                            if (_.includes(current, tag)) return _.without(current, tag)
                            return [...current, tag]
                          })
                        }}
                      >
                        {tag}
                      </UnstyledButton>
                    )
                  })}
                </div>
                <Checkbox
                  className={cn("tenants-select-all")}
                  aria-label={t("select_all")}
                  size="sm"
                  checked={allChecked}
                  indeterminate={allPartial}
                  disabled={_.isEmpty(visibleKeys)}
                  onChange={toggleAll}
                />
              </div>
            }
            {!isEmpty && !hasMatches &&
              <p className={cn("tenants-no-matches")}>{t("no_matches")}</p>
            }
            <div className={cn("tenants-list")}>
              {_.map(matches, (tenant) => {
                const { id, name, description, email, tags = [], invoices = [] } = tenant || {}
                const expanded = Boolean(openIds[id])
                const unpaid = pendingInvoices(invoices)
                const hasUnpaid = !_.isEmpty(unpaid)
                const canSend = Boolean(_.trim(email))
                const invoiceKeys = _.map(unpaid, (invoice) => `${id}:${invoice.id}`)
                const tenantChecked = canSend && hasUnpaid && _.every(invoiceKeys, (key) => selected[key])
                const tenantPartial = !tenantChecked && _.some(invoiceKeys, (key) => selected[key])
                const hasUnsent = _.some(unpaid, (invoice) => !invoice.sentAt)
                const lastSentAt = _.max(_.map(_.filter(invoices, "sentAt"), "sentAt"))
                let markClass = "tenant-row-mark"
                if (expanded) markClass = "tenant-row-mark tenant-row-mark-open"
                return (
                  <div key={id} className={cn("tenant-row")}>
                    <div className={cn("tenant-row-head")}>
                      <Checkbox
                        className={cn("tenant-row-check")}
                        size="sm"
                        checked={tenantChecked}
                        indeterminate={tenantPartial}
                        disabled={!canSend || !hasUnpaid}
                        aria-label={name}
                        onChange={() => toggleKeys(invoiceKeys)}
                      />
                      <div className={cn("tenant-row-main")}>
                      <div className={cn("tenant-row-title")}>
                        <UnstyledButton
                          className={cn("tenant-row-name-hit")}
                          onClick={() => {
                            if (!hasUnpaid) return
                            setOpenIds((current) => ({ ...current, [id]: !current[id] }))
                          }}
                        >
                          <div className={cn("tenant-row-name", titleClass)}>{name}</div>
                        </UnstyledButton>
                        {saved[id] &&
                          <span className={cn("tenant-row-save", saved[id] === "saved" && "is-saved")}>
                            {saved[id] === "saving" &&
                              <span className={cn("tenant-row-save-spin")} />
                            }
                            {saved[id] === "saved" &&
                              <svg className={cn("tenant-row-save-check")} viewBox="0 0 16 16" aria-hidden="true">
                                <path d="M3.2 8.2 6.4 11.4 12.8 4.6" />
                              </svg>
                            }
                          </span>
                        }
                      </div>
                      <form className={cn("tenant-email-form")} onSubmit={(event) => event.preventDefault()}>
                        <input
                          className={cn("tenant-row-email")}
                          type="email"
                          value={emails[id] == null ? email || "" : emails[id]}
                          placeholder={t("no_email")}
                          aria-label={t("email")}
                          onChange={(event) => {
                            const value = event.target.value
                            setEmails((current) => ({ ...current, [id]: value }))
                            queueSave(id, "email", value, email || "")
                          }}
                        />
                      </form>
                      {hasUnsent && lastSentAt &&
                        <div className={cn("tenant-row-sent")}>{t("last_sent")} {formatSent(lastSentAt)}</div>
                      }
                      <form className={cn("tenant-description-form")} onSubmit={(event) => event.preventDefault()}>
                        <textarea
                          className={cn("tenant-row-description")}
                          value={descriptions[id] == null ? description || "" : descriptions[id]}
                          placeholder={t("description")}
                          aria-label={t("description")}
                          rows={1}
                          onChange={(event) => {
                            const value = event.target.value
                            setDescriptions((current) => ({ ...current, [id]: value }))
                            queueSave(id, "description", value, description || "")
                          }}
                        />
                      </form>
                      <div className={cn("tenant-tags")}>
                        {hasUnpaid &&
                          <span className={cn("tenant-tag is-fixed")}>{t("pending")}</span>
                        }
                        {hasUnsent &&
                          <span className={cn("tenant-tag is-fixed")}>{t("not_sent")}</span>
                        }
                        {_.map(tags, (tag) =>
                          <span key={tag} className={cn("tenant-tag")}>
                            {tag}
                            <button
                              type="button"
                              className={cn("tenant-tag-remove")}
                              aria-label={t("delete")}
                              onClick={() => saveTenant(id, { tags: _.without(tags, tag) })}
                            >
                              ×
                            </button>
                          </span>
                        )}
                        <form className={cn("tenant-tag-form")} onSubmit={(event) => {
                          event.preventDefault()
                          void addTag(tenant)
                        }}>
                          <input
                            className={cn("tenant-tag-input")}
                            value={drafts[id] || ""}
                            placeholder={t("add_tag")}
                            aria-label={t("add_tag")}
                            onChange={(event) => {
                              const value = event.target.value
                              setDrafts((current) => ({ ...current, [id]: value }))
                            }}
                          />
                        </form>
                      </div>
                      {hasUnpaid &&
                        <UnstyledButton
                          className={cn("tenant-row-end")}
                          onClick={() => setOpenIds((current) => ({ ...current, [id]: !current[id] }))}
                        >
                          <span className={cn(markClass)} />
                          <div className={cn("money")}>
                            <span className={cn("money-value")}>
                              {formatAmount(_.sumBy(unpaid, (invoice) => Number(invoice.amountDue)))}
                            </span>
                            <span className={cn("money-unit")}>RON</span>
                          </div>
                        </UnstyledButton>
                      }
                    </div>
                  </div>
                    {hasUnpaid &&
                      <Collapse expanded={expanded}>
                        <div className={cn("tenant-invoices")}>
                          {_.map(unpaid, (invoice) => {
                            const { id: invoiceId, dueDate, amountDue, vendor, pointName, sentAt } = invoice
                            const key = `${id}:${invoiceId}`
                            let due = dueDate
                            if (dueDate) due = dueDate.replace(/^(\d{2})-(\d{2})-(\d{4}).*$/, "$1.$2.$3")
                            let label = vendor
                            if (!label) label = pointName
                            return (
                              <div key={invoiceId} className={cn("tenant-invoice")}>
                                <div className={cn("tenant-invoice-copy")}>
                                  {label &&
                                    <div className={cn("tenant-invoice-vendor")}>{label}</div>
                                  }
                                  {due &&
                                    <div className={cn("tenant-invoice-due")}>{due}</div>
                                  }
                                  {sentAt &&
                                    <div className={cn("tenant-invoice-sent")}>{t("sent")} {formatSent(sentAt)}</div>
                                  }
                                </div>
                                <div className={cn("money", "is-unpaid")}>
                                  <span className={cn("money-value")}>{formatAmount(amountDue)}</span>
                                  <span className={cn("money-unit")}>RON</span>
                                </div>
                                <Checkbox
                                  className={cn("tenant-invoice-check")}
                                  size="xs"
                                  checked={Boolean(selected[key])}
                                  disabled={!canSend}
                                  aria-label={label}
                                  onChange={() => toggleKey(key)}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </Collapse>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        }
        {showList &&
          <div className={cn("tenants-send")}>
            <div className={cn("tenants-send-bar")}>
              <Button
                className={cn("tenants-send-button")}
                loading={sending}
                disabled={!hasSelection}
                leftSection={hasSelection &&
                  <svg className={cn("tenants-send-icon")} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5z" />
                    <path d="M10.3 13.7 21 3" />
                  </svg>
                }
                onClick={() => requestInvoiceMail(selectedKeys)}
              >
                {sendLabel}
              </Button>
            </div>
          </div>
        }
      </div>
    </AppScreen>
  )
}

export default React.memo(TenantsScreen)
