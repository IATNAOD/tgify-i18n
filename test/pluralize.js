const test = require("ava");

const { I18n } = require("@tgify/i18n");

test("can pluralize", (t) => {
  const i18n = new I18n();
  i18n.loadLocale("en", {
    // eslint-disable-next-line no-template-curly-in-string
    pluralize: "${pluralize(n, 'There was an apple', 'There were apples')}",
  });
  t.is(i18n.t("en", "pluralize", { n: 0 }), "0 There were apples");
  t.is(i18n.t("en", "pluralize", { n: 1 }), "1 There was an apple");
  t.is(i18n.t("en", "pluralize", { n: 5 }), "5 There were apples");
});

test("can pluralize using functional forms", (t) => {
  const i18n = new I18n();
  i18n.loadLocale("en", {
    // eslint-disable-next-line no-template-curly-in-string
    pluralize:
      "${pluralize(n, n => 'There was an apple', n => 'There were ' + n + ' apples')}",
  });
  t.is(i18n.t("en", "pluralize", { n: 0 }), "There were 0 apples");
  t.is(i18n.t("en", "pluralize", { n: 1 }), "There was an apple");
  t.is(i18n.t("en", "pluralize", { n: 5 }), "There were 5 apples");
});

test("pluralize follows context locale", (t) => {
  const i18n = new I18n();
  i18n.loadLocale("ru", {
    // eslint-disable-next-line no-template-curly-in-string
    apples: "${pluralize(n, 'яблоко', 'яблока', 'яблок')}",
  });
  t.is(i18n.t("ru", "apples", { n: 1 }), "1 яблоко");
  t.is(i18n.t("ru", "apples", { n: 3 }), "3 яблока");
  t.is(i18n.t("ru", "apples", { n: 11 }), "11 яблок");
  t.is(i18n.t("ru", "apples", { n: 21 }), "21 яблоко");
});

test("pluralize accepts forms array and explicit language", (t) => {
  t.is(I18n.pluralize(5, ["яблоко", "яблока", "яблок"], "ru"), "5 яблок");
  t.is(I18n.pluralize(2, ["apple", "apples"]), "2 apples");
});
