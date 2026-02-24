import yaml from "js-yaml";
import path from "path";
import fs from "fs";

import { compile } from "./utils/compile";
import { pluralize } from "./pluralize";
import { I18nContext, type I18nConfig } from "./context";

export type TemplateFn<Ctx extends Record<string, unknown> = Record<string, unknown>> = (ctx: Ctx) => string;

export type ResourceValue<Ctx extends Record<string, unknown> = Record<string, unknown>> =
  | TemplateFn<Ctx>
  | ResourceTree<Ctx>
  | ReadonlyArray<ResourceValue<Ctx>>;

export type ResourceTree<Ctx extends Record<string, unknown> = Record<string, unknown>> = {
  [key: string]: ResourceValue<Ctx>;
};

export type Repository<Ctx extends Record<string, unknown> = Record<string, unknown>> = Record<string, ResourceTree<Ctx>>;

export interface I18nOptions<TemplateData extends Record<string, unknown> = Record<string, unknown>>
  extends Partial<I18nConfig<TemplateData>> {
  directory?: string;
  useSession?: boolean;
  sessionName?: string;
  extensions?: readonly (".json" | ".yaml" | ".yml")[];
}

export type BaseTemplateData = {
  from?: { language_code?: string } | null;
  chat?: unknown;
};

type SessionLike = { __language_code?: string };

export type MinimalCtx = {
  from?: { language_code?: string } | null;
  chat?: unknown;
  reply?: (text: string, extra?: unknown) => unknown;
  [k: string]: unknown;
};

function normalizeLocale(code: string): { full: string; base: string } {
  const full = code.trim().toLowerCase().replace(/_/g, "-");
  const base = full.split("-")[0] as string;
  return { full, base };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function deepMerge<T extends Record<string, any>>(a: T, b: T): T {
  const out: any = { ...a };
  for (const k of Object.keys(b)) {
    const av = out[k];
    const bv = (b as any)[k];
    if (isPlainObject(av) && isPlainObject(bv)) out[k] = deepMerge(av, bv);
    else out[k] = bv;
  }
  return out;
}

function compileTemplates(value: unknown): unknown {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => compileTemplates(item));
  }

  if (isPlainObject(value)) {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src)) {
      out[key] = compileTemplates(src[key]);
    }
    return out;
  }

  if (typeof value === "string") {
    if (value.includes("${")) return compile(value) as TemplateFn;
    const literal = value;
    return (() => literal) as TemplateFn;
  }

  return value;
}

function getTemplateKeysRecursive(root: unknown, prefix = ""): string[] {
  if (!root || typeof root !== "object") return [];

  const obj = root as Record<string, unknown>;
  let keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const subKey = prefix ? `${prefix}.${key}` : key;
    const v = obj[key];

    if (isPlainObject(v)) {
      keys = keys.concat(getTemplateKeysRecursive(v, subKey));
      continue;
    }

    keys.push(subKey);
  }

  return keys;
}

function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf8");
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(text);
}

function readYamlFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf8");
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return yaml.load(text);
}

export class I18n<TemplateData extends Record<string, unknown> & BaseTemplateData = Record<string, unknown> & BaseTemplateData> {
  public repository: Repository<TemplateData>;

  public config: Required<Pick<I18nConfig<TemplateData>, "defaultLanguage" | "allowMissing" | "templateData">> &
    I18nConfig<TemplateData> & {
      directory?: string;
      useSession?: boolean;
      sessionName: string;
      extensions: readonly (".json" | ".yaml" | ".yml")[];
    };

  private keysCache = new Map<string, string[]>();

  constructor(config: I18nOptions<TemplateData> = {}) {
    this.repository = {};

    this.config = {
      defaultLanguage: "en",
      sessionName: "session",
      allowMissing: true,
      templateData: {
        pluralize,
      } as Partial<TemplateData> & { pluralize: typeof pluralize },

      extensions: [".json", ".yaml", ".yml"],

      ...config,
    } as ReturnType<() => I18n<TemplateData>["config"]>;

    if (this.config.directory) {
      this.loadLocales(this.config.directory);
    }
  }

  private invalidate(language?: string) {
    if (!language) this.keysCache.clear();
    else this.keysCache.delete(language.toLowerCase());
  }

  loadLocales(directory: string): void {
    if (!fs.existsSync(directory)) throw new Error(`Locales directory '${directory}' not found`);

    const files = fs.readdirSync(directory);
    for (const fileName of files) {
      const extension = path.extname(fileName) as ".json" | ".yaml" | ".yml" | string;
      if (!this.config.extensions.includes(extension as any)) continue;

      const { full: languageCode } = normalizeLocale(path.basename(fileName, extension));
      const fullPath = path.resolve(directory, fileName);

      let data: unknown;
      if (extension === ".json") data = readJsonFile(fullPath);
      else data = readYamlFile(fullPath);

      this.loadLocale(languageCode, data);
    }
  }

  loadLocale(languageCode: string, i18Data: unknown): void {
    const { full: language } = normalizeLocale(languageCode);

    const compiled = compileTemplates(i18Data);
    if (!isPlainObject(compiled)) {
      throw new Error(`Locale '${language}' must contain an object at root`);
    }

    this.repository[language] = deepMerge(
      (this.repository[language] ?? {}) as any,
      compiled as any
    );

    this.invalidate(language);
  }

  resetLocale(languageCode?: string): void {
    if (languageCode) {
      const { full } = normalizeLocale(languageCode);
      delete this.repository[full];
      this.invalidate(full);
    } else {
      this.repository = {};
      this.invalidate();
    }
  }

  availableLocales(): string[] {
    return Object.keys(this.repository);
  }

  resourceKeys(languageCode: string): string[] {
    const { full } = normalizeLocale(languageCode);

    const cached = this.keysCache.get(full);
    if (cached) return cached;

    const keys = getTemplateKeysRecursive(this.repository[full] || {});
    this.keysCache.set(full, keys);
    return keys;
  }

  missingKeys(languageOfInterest: string, referenceLanguage: string = this.config.defaultLanguage): string[] {
    const interest = new Set(this.resourceKeys(languageOfInterest));
    const reference = this.resourceKeys(referenceLanguage);
    return reference.filter((k) => !interest.has(k));
  }

  overspecifiedKeys(languageOfInterest: string, referenceLanguage: string = this.config.defaultLanguage): string[] {
    return this.missingKeys(referenceLanguage, languageOfInterest);
  }

  translationProgress(languageOfInterest: string, referenceLanguage: string = this.config.defaultLanguage): number {
    const referenceCount = this.resourceKeys(referenceLanguage).length;
    if (referenceCount === 0) return 1;

    const missingCount = this.missingKeys(languageOfInterest, referenceLanguage).length;
    return (referenceCount - missingCount) / referenceCount;
  }

  createContext(languageCode?: string, templateData?: Partial<TemplateData>): I18nContext<TemplateData, Repository<TemplateData>> {
    return new I18nContext(this.repository as any, this.config, languageCode, templateData);
  }

  middleware<Ctx extends MinimalCtx = MinimalCtx>() {
    return (ctx: Ctx, next: () => Promise<unknown>) => {
      const session =
        this.config.useSession && (ctx as any)[this.config.sessionName]
          ? ((ctx as any)[this.config.sessionName] as SessionLike)
          : undefined;

      const languageCode =
        (session && session.__language_code) ||
        (ctx.from && ctx.from.language_code) ||
        undefined;

      (ctx as any).i18n = new I18nContext(this.repository, this.config, languageCode, {
        from: ctx.from ?? undefined,
        chat: ctx.chat ?? undefined,
      } as Partial<TemplateData>);

      return Promise.resolve(next()).then(() => {
        if (session) session.__language_code = (ctx as any).i18n.locale();
      });
    };
  }

  t(languageCode: string | undefined, resourceKey: string, templateData?: Partial<TemplateData>): string {
    return new I18nContext(this.repository as any, this.config, languageCode, templateData).t(resourceKey);
  }

  static match(resourceKey: string, templateData?: Record<string, unknown>) {
    return (text: string, ctx: any) =>
      text && ctx && ctx.i18n && text === ctx.i18n.t(resourceKey, templateData) ? [text] : null;
  }

  static reply(resourceKey: string, extra?: unknown) {
    return ({ reply, i18n }: { reply: (text: string, extra?: unknown) => unknown; i18n: { t: (k: string) => string } }) =>
      reply(i18n.t(resourceKey), extra);
  }

  static pluralize = pluralize;
}