import en from "./en.json";
import ko from "./ko.json";

const resources = { en, ko };

export const DEFAULT_LANGUAGE = "en";
export const SUPPORTED_LANGUAGES = Object.freeze(["ko", "en"]);

const locales = Object.freeze({
  ko: "ko-KR",
  en: "en-US",
});

const readMessage = (resource, key) =>
  key.split(".").reduce((value, part) => (value && typeof value === "object" ? value[part] : undefined), resource);

export const resolveLanguage = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "ko" || normalized.startsWith("ko-")) return "ko";
  return DEFAULT_LANGUAGE;
};

export const getLocale = (language) => locales[resolveLanguage(language)];

export const getMessages = (language, namespace) => {
  const resolvedLanguage = resolveLanguage(language);
  return readMessage(resources[resolvedLanguage], namespace)
    ?? readMessage(resources[DEFAULT_LANGUAGE], namespace)
    ?? {};
};

export const translate = (language, key, variables = {}) => {
  const resolvedLanguage = resolveLanguage(language);
  const template = readMessage(resources[resolvedLanguage], key) ?? readMessage(resources[DEFAULT_LANGUAGE], key) ?? key;

  return String(template).replace(/\{\{(\w+)\}\}/g, (_, variable) =>
    Object.prototype.hasOwnProperty.call(variables, variable) ? String(variables[variable]) : `{{${variable}}}`,
  );
};
