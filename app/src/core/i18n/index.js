import i18n from "i18next"
import dayjs from "dayjs"
import { initReactI18next } from "react-i18next"
import _ from "lodash"
import { actions } from "app/core/store"
import translations from "./translations.json"
import romanian from "./ro.json"
import localizedFormat from "dayjs/plugin/localizedFormat"
import customParseFormat from "dayjs/plugin/customParseFormat"
import duration from "dayjs/plugin/duration"
import "dayjs/locale/ro"


export const DEFAULT_LANGUAGE = "en"
const SUPPORTED_LANGUAGES = ["en", "ro"]

dayjs.extend(localizedFormat)
dayjs.extend(customParseFormat)
dayjs.extend(duration)

const primaryLanguage = (tag) => {
  const value = String(tag || "").toLowerCase()
  const dash = value.indexOf("-")
  const score = value.indexOf("_")
  const cuts = [dash, score].filter((index) => index >= 0)
  const cut = cuts.length ? Math.min(...cuts) : -1
  return cut >= 0 ? value.slice(0, cut) : value
}

const deviceLanguage = () => {
  const web = typeof navigator !== "undefined" ? navigator.language : ""
  return primaryLanguage(web)
}

export const loadI18n = async () => {
  const stored = actions.get("language", "")
  let language = SUPPORTED_LANGUAGES.includes(stored) ? stored : deviceLanguage()
  if (!SUPPORTED_LANGUAGES.includes(language)) language = DEFAULT_LANGUAGE

  await i18n
    .use(initReactI18next)
    .init({
      lng: language,
      returnEmptyString: false,
      keySeparator: ".",
      interpolation: {
        escapeValue: false
      },
      fallbackLng: DEFAULT_LANGUAGE,
      resources: {
        en: { translation: translations },
        ro: { translation: romanian }
      },
      parseMissingKeyHandler: (value) => {
        value = value || ""
        if (value.toUpperCase() === value) value = value.toLowerCase()
        return _.upperFirst(value.split("_").join(" "))
      }
    })

  await changeLanguage(language)
}

export const changeLanguage = async (language) => {
  actions.set("language", language)
  dayjs.locale(language)
  if (typeof document !== "undefined") document.documentElement.lang = language
  setTimeout(() => i18n.changeLanguage(language))
}

export default i18n
