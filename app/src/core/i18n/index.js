import i18n from "i18next"
import dayjs from "dayjs"
import { initReactI18next } from "react-i18next"
import _ from "lodash"
import { actions } from "app/core/store"
import translations from "./translations.json"
import localizedFormat from "dayjs/plugin/localizedFormat"
import customParseFormat from "dayjs/plugin/customParseFormat"
import duration from "dayjs/plugin/duration"


export const DEFAULT_LANGUAGE = "en"
const SUPPORTED_LANGUAGES = ["en"]

dayjs.extend(localizedFormat)
dayjs.extend(customParseFormat)
dayjs.extend(duration)

export const loadI18n = async () => {
  let language = actions.get("language", DEFAULT_LANGUAGE)
  if (!SUPPORTED_LANGUAGES.includes(language)) language = DEFAULT_LANGUAGE

  i18n
    .use(initReactI18next)
    .init({
      returnEmptyString: false,
      keySeparator: ".",
      interpolation: {
        escapeValue: false
      },
      fallbackLng: DEFAULT_LANGUAGE,
      resources: {
        en: { translation: translations }
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
  setTimeout(() => i18n.changeLanguage(language))
}

export default i18n
