import assert from "node:assert/strict"
import { test } from "node:test"
import { createOllama } from "../server/lib/ollama.js"
import { mockHttp } from "./mock.js"


test("generate posts json format and parses response", async () => {
  let body
  const client = createOllama({
    model: "llama3.2:3b",
    http: mockHttp(async (config) => {
      body = config.data
      return { data: { response: JSON.stringify({ assignments: [{ invoiceId: "inv-1", apartmentId: "apt-1" }] }) } }
    })
  })
  const parsed = await client.generate({ prompt: "assign" })
  assert.equal(body.model, "llama3.2:3b")
  assert.equal(body.stream, false)
  assert.equal(body.format, "json")
  assert.equal(body.prompt, "assign")
  assert.equal(parsed.assignments[0].apartmentId, "apt-1")
})

test("generate strips markdown fences", async () => {
  const client = createOllama({
    http: mockHttp(async () => {
      return { data: { response: "```json\n{\"ok\":true}\n```" } }
    })
  })
  const parsed = await client.generate({ prompt: "x" })
  assert.equal(parsed.ok, true)
})

test("generate throws ollama error body", async () => {
  const client = createOllama({
    http: mockHttp(async (config) => {
      if (config.url === "/api/tags") return { data: { models: [] } }
      return { status: 404, data: { error: "model 'llama3.2' not found" } }
    })
  })
  await assert.rejects(() => client.generate({ prompt: "x" }), { message: "model 'llama3.2' not found" })
})

test("generate uses installed family tag when model is missing", async () => {
  const bodies = []
  const client = createOllama({
    model: "llama3.2",
    http: mockHttp(async (config) => {
      if (config.url === "/api/tags") return { data: { models: [{ name: "llama3.2:3b" }] } }
      bodies.push(config.data)
      if (config.data.model === "llama3.2") {
        return { status: 404, data: { error: "model 'llama3.2' not found" } }
      }
      return { data: { response: JSON.stringify({ ok: true }) } }
    })
  })
  const parsed = await client.generate({ prompt: "x" })
  assert.equal(bodies[0].model, "llama3.2")
  assert.equal(bodies[1].model, "llama3.2:3b")
  assert.equal(parsed.ok, true)
})
