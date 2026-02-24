type PluralRuleKey =
  | "english"
  | "french"
  | "russian"
  | "czech"
  | "polish"
  | "icelandic"
  | "chinese"
  | "arabic";

type Form = string | ((n: number) => string);

const langToRule: Record<string, PluralRuleKey> = Object.create(null);

const warned = new Set<string>();

const pluralRules: Record<PluralRuleKey, (n: number) => number> = {
  english: (n) => (n !== 1 ? 1 : 0),
  french: (n) => (n > 1 ? 1 : 0),
  russian: (n) => {
    if (n % 10 === 1 && n % 100 !== 11) return 0;
    return n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
  },
  czech: (n) => (n === 1 ? 0 : n >= 2 && n <= 4 ? 1 : 2),
  polish: (n) => {
    if (n === 1) return 0;
    return n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
  },
  icelandic: (n) => (n % 10 !== 1 || n % 100 === 11 ? 1 : 0),
  chinese: () => 0,
  arabic: (n) => {
    if (n >= 0 && n < 3) return n; // 0,1,2
    if (n % 100 <= 10) return 3;
    if (n >= 11 && n % 100 <= 99) return 4;
    return 5;
  },
};

const normalizeLang = (code: string) =>
  code.trim().toLowerCase().replace(/_/g, "-");

const mapping: Record<PluralRuleKey, readonly string[]> = {
  english: ["da", "de", "en", "es", "fi", "el", "he", "hu", "it", "nl", "no", "pt", "sv", "br"],
  chinese: ["fa", "id", "ja", "ko", "lo", "ms", "th", "tr", "zh", "jp"],
  french: ["fr", "tl", "pt-br"],
  russian: ["hr", "ru", "uk", "uz"],
  czech: ["cs", "sk"],
  icelandic: ["is"],
  polish: ["pl"],
  arabic: ["ar"],
};

for (const ruleKey of Object.keys(mapping) as PluralRuleKey[]) {
  for (const lang of mapping[ruleKey]) {
    langToRule[normalizeLang(lang)] = ruleKey;
  }
}

export function pluralize(
  number: number,
  forms: readonly Form[],
  langCode = "en"
): string {
  const norm = normalizeLang(langCode);
  const base = norm.split("-")[0] as string;

  const ruleKey = langToRule[norm] ?? langToRule[base] ?? "english";

  if ((langToRule[norm] == null && langToRule[base] == null) && !warned.has(norm)) {
    warned.add(norm);
    console.warn(`i18n::pluralize: Unsupported language "${langCode}", fallback to "${ruleKey}"`);
  }

  const idx = pluralRules[ruleKey](number);
  const form = forms[idx] ?? forms[forms.length - 1];

  if (!form) return String(number);

  return typeof form === "function" ? form(number) : `${number} ${form}`;
}