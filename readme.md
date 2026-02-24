[![NPM Version](https://img.shields.io/npm/v/@tgify/i18n.svg?style=flat-square)](https://www.npmjs.com/package/@tgify/i18n)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)

# i18n for @tgify/bot

Internationalization middleware for [@tgify/bot](https://github.com/@tgify/bot).

## Installation

```js
$ npm install @tgify/i18n
```

## Example

```js
const { Tgify } = require('@tgify/bot')
const TgifyI18n = require('@tgify/i18n')

/* 
yaml and json are ok
Example directory structure:
├── locales
│   ├── en.yaml
│   ├── en-US.yaml
│   ├── it.json
│   └── ru.yaml
└── bot.js
*/

const bot = new Tgify(process.env.BOT_TOKEN)

// @tgify/i18n can save current locale setting into session.
const i18n = new TgifyI18n({
  defaultLanguageOnMissing: true, // implies allowMissing = true
  directory: path.resolve(__dirname, 'locales'),
})

bot.use(i18n.middleware())

bot.start((ctx) => {
  return ctx.reply(
    ctx.i18n.t('greeting', {
      username: ctx.from.username,
    })
  )
})

bot.launch()
```

See full [example](/examples)
