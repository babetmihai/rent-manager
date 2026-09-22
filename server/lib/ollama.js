import axios from "axios"
import _ from "lodash"
import { OLLAMA_URL, OLLAMA_MODEL } from "./index.js"


export const createOllama = ({
  url = OLLAMA_URL,
  model = OLLAMA_MODEL,
  http = axios.create({
    baseURL: url,
    timeout: 120000,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  })
} = {}) => {
  let resolved = model

  const postGenerate = async ({ prompt, name, options }) => {
    const { data } = await http.request({
      method: "POST",
      url: "/api/generate",
      data: {
        model: name,
        prompt,
        stream: false,
        format: "json",
        options
      }
    })
    return data
  }

  const generate = async ({ prompt, options }) => {
    let data
    try {
      data = await postGenerate({ prompt, name: resolved, options })
    } catch (error) {
      const { response } = error || {}
      const { data: body } = response || {}
      const { error: ollamaError } = body || {}
      const isMissing = /not found/i.test(ollamaError || "")
      if (!isMissing) {
        if (ollamaError) throw new Error(ollamaError)
        throw error
      }
      const { data: tags } = await http.request({
        method: "GET",
        url: "/api/tags"
      })
      const { models = [] } = tags || {}
      const names = _.map(models, "name")
      const family = _.first(_.split(resolved, ":"))
      const next = _.find(names, (item) => {
        if (item === family) return true
        return _.startsWith(item, `${family}:`)
      })
      if (!next) throw new Error(ollamaError)
      resolved = next
      data = await postGenerate({ prompt, name: resolved, options })
    }
    const { response } = data || {}
    let text = _.trim(String(response || ""))
    if (_.startsWith(text, "```")) {
      text = _.replace(text, /^```(?:json)?\s*/, "")
      text = _.replace(text, /\s*```$/, "")
    }
    return JSON.parse(text)
  }

  return { generate }
}
