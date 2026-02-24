export type TemplateFn<Ctx extends Record<string, unknown> = Record<string, unknown>> =
  (ctx: Ctx) => string;

export type ResourceValue<Ctx extends Record<string, unknown> = Record<string, unknown>> =
  | TemplateFn<Ctx>
  | ResourceTree<Ctx>
  | ReadonlyArray<ResourceValue<Ctx>>;

export type ResourceTree<Ctx extends Record<string, unknown> = Record<string, unknown>> = {
  [key: string]: ResourceValue<Ctx>;
};

export type Repository<Ctx extends Record<string, unknown> = Record<string, unknown>> =
  Record<string, ResourceTree<Ctx>>;

export interface I18nConfig<TemplateData extends Record<string, unknown> = Record<string, unknown>> {
  defaultLanguage: string;
  defaultLanguageOnMissing?: boolean;
  allowMissing?: boolean;
  templateData?: Partial<TemplateData>;
}

export class I18nContext<
  TemplateData extends Record<string, unknown> = Record<string, unknown>,
  Repo extends Repository<TemplateData> = Repository<TemplateData>
> {
  public readonly repository: Repo;
  public readonly config: I18nConfig<TemplateData>;

  public languageCode!: string;
  public shortLanguageCode!: string;

  public templateData: Partial<TemplateData>;

  constructor(
    repository: Repo,
    config: I18nConfig<TemplateData>,
    languageCode?: string,
    templateData?: Partial<TemplateData>
  ) {
    this.repository = repository;
    this.config = config;

    this.locale(languageCode || config.defaultLanguage);

    this.templateData = {
      ...(config.templateData ?? {}),
      ...(templateData ?? {}),
    } as Partial<TemplateData>;
  }

  locale(languageCode?: string): string | void {
    if (!languageCode) return this.languageCode;

    const code = languageCode.toLowerCase();
    const shortCode = code.split("-")[0] as string;

    if (!this.repository[code] && !this.repository[shortCode]) {
      this.languageCode = this.config.defaultLanguage;
      this.shortLanguageCode = this.languageCode.split("-")[0] as string;
      return;
    }

    this.languageCode = code;
    this.shortLanguageCode = shortCode;
  }

  getTemplate(languageCode: string, resourceKey = ""): unknown {
    const root = this.repository[languageCode];
    if (!root) return undefined;

    if (!resourceKey) return root;

    return resourceKey
      .split(".")
      .reduce<unknown>((acc, key) => {
        if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
          return (acc as Record<string, unknown>)[key];
        }
        return undefined;
      }, root);
  }

  t(resourceKey: string, templateData?: Partial<TemplateData>): string {
    let template =
      this.getTemplate(this.languageCode, resourceKey) ??
      this.getTemplate(this.shortLanguageCode, resourceKey);

    if (!template && this.config.defaultLanguageOnMissing) {
      template = this.getTemplate(this.config.defaultLanguage, resourceKey);
    }

    if (!template && this.config.allowMissing) {
      template = (() => resourceKey) as TemplateFn<TemplateData>;
    }

    if (typeof template !== "function") {
      throw new Error(`@tgify/i18n: '${this.languageCode}.${resourceKey}' not found`);
    }

    const ctx: Record<string, unknown> = {
      ...this.templateData,
      ...(templateData ?? {}),
    };

    for (const key of Object.keys(ctx)) {
      const v = ctx[key];
      if (typeof v === "function") {
        ctx[key] = (v as Function).bind(this);
      }
    }

    return (template as TemplateFn<Record<string, unknown>>)(ctx);
  }
}