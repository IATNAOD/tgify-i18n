const test = require("ava");

const { I18n, I18nContext } = require("@tgify/i18n");

test("can translate", (t) => {
  const i18n = new I18n();
  i18n.loadLocale("en", {
    greeting: "Hello!",
  });
  t.is(i18n.t("en", "greeting"), "Hello!");
});

test("allowMissing false throws", (t) => {
  const i18n = new I18n({
    allowMissing: false,
  });
  t.throws(() => {
    i18n.t("en", "greeting");
  }, { message: "@tgify/i18n: 'en.greeting' not found" });
});

test("package root exports I18n and I18nContext", (t) => {
  const i18n = new I18n();
  t.true(i18n.createContext("en") instanceof I18nContext);
});

test("I18n.reply calls ctx.reply with translation", async (t) => {
  const i18n = new I18n();
  i18n.loadLocale("en", { greeting: "Hello!" });
  const ctx = {
    i18n: i18n.createContext("en"),
    sent: [],
    // like Context methods, relies on `this`
    async reply(text, extra) {
      this.sent.push([text, extra]);
    },
  };
  await I18n.reply("greeting", { parse_mode: "HTML" })(ctx);
  t.deepEqual(ctx.sent, [["Hello!", { parse_mode: "HTML" }]]);
});

test("I18n.match matches translated text", (t) => {
  const i18n = new I18n();
  i18n.loadLocale("en", { menu: "Menu" });
  const ctx = { i18n: i18n.createContext("en") };
  const trigger = I18n.match("menu");
  t.is(trigger("Menu", ctx)[0], "Menu");
  t.is(trigger("Other", ctx), null);
});

test("locale accepts codes with underscore", (t) => {
  const i18n = new I18n();
  i18n.loadLocale("en_US", { greeting: "Howdy!" });
  const ctx = i18n.createContext("ru");
  ctx.locale("en_US");
  t.is(ctx.locale(), "en-us");
  t.is(ctx.t("greeting"), "Howdy!");
});
