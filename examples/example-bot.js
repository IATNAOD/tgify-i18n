const { Tgify, session } = require("@tgify/bot");
const path = require("path");

const { I18n } = require("@tgify/i18n");

// i18n options
const i18n = new I18n({
  directory: path.resolve(__dirname, "locales"),
  defaultLanguage: "en",
  sessionName: "session",
  useSession: true,
  templateData: {
    pluralize: I18n.pluralize,
    uppercase: (value) => value.toUpperCase(),
  },
});

const bot = new Tgify(process.env.BOT_TOKEN);
bot.use(session({ defaultSession: () => ({}) }));
bot.use(i18n.middleware());

// Start message handler
bot.start((ctx) => ctx.replyWithHTML(ctx.i18n.t("greeting")));

// Using i18n helpers
bot.command("help", I18n.reply("greeting", { parse_mode: "HTML" }));

// Set locale to `en`
bot.command("en", (ctx) => {
  ctx.i18n.locale("en-US");
  return ctx.replyWithHTML(ctx.i18n.t("greeting"));
});

// Set locale to `ru`
bot.command("ru", (ctx) => {
  ctx.i18n.locale("ru");
  return ctx.replyWithHTML(ctx.i18n.t("greeting"));
});

// Add apple to cart
bot.command("add", (ctx) => {
  ctx.session.apples = (ctx.session.apples || 0) + 1;
  return ctx.reply(ctx.i18n.t("cart", { apples: ctx.session.apples }));
});

// Show cart
bot.command("cart", (ctx) => {
  return ctx.reply(ctx.i18n.t("cart", { apples: ctx.session.apples || 0 }));
});

// Checkout
bot.command("checkout", (ctx) => ctx.reply(ctx.i18n.t("checkout")));

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
