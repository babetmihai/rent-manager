import _ from "lodash"
import { z } from "zod"
import { createServices } from "../services.js"
import { STEP_STATUS, TRUE } from "../index.js"
import { createOllama } from "../ollama.js"


const utilityService = createServices("utilities")
const tenantService = createServices("tenants")
const ollama = createOllama()

export const TUtility = z.object({
  id: z.string(),
  pagoId: z.string(),
  name: z.string(),
  address: z.string(),
  vendor: z.string(),
  tenantId: z.string().optional(),
  assignedBy: z.enum(["ai", "user"]).optional(),
  createStatus: z.enum([STEP_STATUS.PENDING, STEP_STATUS.COMPLETED, STEP_STATUS.FAILED]).optional(),
  createError: z.string().nullable().optional(),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number()
})

export const TUtilitySync = TUtility.pick({
  pagoId: true,
  name: true,
  address: true,
  vendor: true,
  createdBy: true
})

const TAssignOne = z.object({
  tenantId: z.string().nullable()
})

const TTenantGroups = z.object({
  tenants: z.array(z.object({
    name: z.string(),
    description: z.string(),
    utilityIds: z.array(z.string())
  }))
})

const tenantFieldsFromUtility = (utility) => {
  const { address, name } = utility
  const parts = _.compact(_.map(_.split(address, ","), _.trim))
  const extras = _.filter(_.tail(parts), (part) => /\d|mansarda/i.test(part))
  let label = _.join([_.first(parts), ..._.take(extras, 2)], " ")
  label = _.trim(_.replace(label, /^(strada|str\.?)\s+/i, ""))
  return {
    name: label || name,
    description: address
  }
}

const groupsFromAddress = (open) => {
  const groups = _.groupBy(open, (utility) => {
    const { address } = utility
    return _.toLower(_.trim(_.replace(address, /\s+/g, " ")))
  })
  return _.map(groups, (rows) => {
    const { name, description } = tenantFieldsFromUtility(rows[0])
    return {
      name,
      description,
      utilityIds: _.map(rows, "id")
    }
  })
}

const assignTenantUtilities = async (tenant, utilityIds, byId) => {
  const { id: tenantId, utilities } = tenant
  const nextUtilities = { ...utilities }
  for (const utilityId of utilityIds) {
    if (!byId[utilityId]) continue
    nextUtilities[utilityId] = TRUE
    await utilityService.update(utilityId, { tenantId, assignedBy: "ai" })
  }
  await tenantService.update(tenantId, { utilities: nextUtilities })
}

const matchOpenUtilities = async (createdBy, tenants) => {
  if (_.isEmpty(tenants)) return
  const list = await utilityService.list({ createdBy })
  const open = _.filter(list, (utility) => {
    const { tenantId } = utility
    return !tenantId
  })
  if (_.isEmpty(open)) return
  const byTenantId = _.keyBy(tenants, "id")
  const tenantPayload = _.map(tenants, ({ id, name, description }) => ({ id, name, description }))
  for (const utility of open) {
    const { id, name, address } = utility
    const parsed = await ollama.generate({
      prompt: `Each tenant has a name and a description. First extract the street or building address from the tenant description when one is present. Then decide if this utility name or address is similar to that tenant name or extracted address. Similar means the same street or building, even if word order, diacritics, prefixes (Strada, STR., JUD., MUN.), floor, apartment number, or leading account ids differ. Do not require an exact string. Return that tenant id, or null if none are similar.

Tenants:
${JSON.stringify(tenantPayload)}

Utility:
${JSON.stringify({ name, address })}

Return JSON only:
{"tenantId": string|null}
`
    })
    const { tenantId } = TAssignOne.parse(parsed)
    if (!byTenantId[tenantId]) continue
    await utilityService.update(id, { tenantId, assignedBy: "ai" })
    const tenant = byTenantId[tenantId]
    const { utilities } = tenant || {}
    const nextUtilities = { ...utilities, [id]: TRUE }
    await tenantService.update(tenantId, { utilities: nextUtilities })
    byTenantId[tenantId] = { ...tenant, utilities: nextUtilities }
  }
}

const proposeTenantsFromUtilities = async (createdBy) => {
  const list = await utilityService.list({ createdBy })
  const open = _.filter(list, (utility) => {
    const { tenantId } = utility
    return !tenantId
  })
  if (_.isEmpty(open)) return []
  const byId = _.keyBy(open, "id")
  const used = {}
  const tenants = []
  const payload = _.map(open, ({ id, address }) => ({ id, address }))
  try {
    const parsed = await ollama.generate({
      prompt: `Group these Pago utilities into distinct rental tenants by address. Same street and building is one tenant, even if word order, diacritics, prefixes (Strada, STR., JUD., MUN.), floor, apartment number, or leading account ids differ. Different streets or buildings are different tenants.

name: shorten the address — street + number, and apt/unit if present. No vendor, no account id, no city.
description: the full address, unchanged.

Utilities:
${JSON.stringify(payload)}

Return JSON only:
{"tenants":[{"name":"Ipatescu 8","description":"Strada Ipatescu Ana, Nr. 8, Brasov","utilityIds":["id"]}]}

Every utility id must appear in exactly one tenant. Use only the given ids.
`
    })
    const { tenants: groups } = TTenantGroups.parse(parsed)
    for (const group of groups) {
      const { name, description, utilityIds: ids } = group
      const validIds = _.filter(ids, (id) => byId[id] && !used[id])
      if (_.isEmpty(validIds)) continue
      if (!name) continue
      tenants.push({ name, description, utilityIds: validIds })
      for (const id of validIds) {
        used[id] = TRUE
      }
    }
  } catch (error) {
    console.error("propose tenants failed", error.message)
  }
  const leftover = _.filter(open, ({ id }) => !used[id])
  return [...tenants, ...groupsFromAddress(leftover)]
}

export const createTenantFromUtility = async (utility) => {
  const { id, tenantId, createdBy } = utility
  if (tenantId) return
  const { name, description } = tenantFieldsFromUtility(utility)
  const tenant = await tenantService.create({
    name,
    description,
    createdBy
  })
  await assignTenantUtilities(tenant, [id], { [id]: utility })
}

export const createTenantsFromUtilities = async (createdBy) => {
  const tenants = await proposeTenantsFromUtilities(createdBy)
  const list = await utilityService.list({ createdBy })
  const byId = _.keyBy(list, "id")
  for (const group of tenants) {
    const { name, description, utilityIds: ids } = group
    const tenant = await tenantService.create({
      name,
      description,
      createdBy
    })
    await assignTenantUtilities(tenant, ids, byId)
  }
}

export const assignUtilitiesForTenant = async (tenant) => {
  const { createdBy } = tenant
  await matchOpenUtilities(createdBy, [tenant])
}

export const assignUtilitiesForUser = async (createdBy) => {
  const tenants = await tenantService.list({ createdBy })
  await matchOpenUtilities(createdBy, tenants)
}
