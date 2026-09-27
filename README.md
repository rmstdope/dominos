# Dominos 🍕

A tiny static web app: type your name, pick your toppings, send the order to the baker on
WhatsApp. Live at [dominos.kurelid.se](https://dominos.kurelid.se).

## Configure the menu

Everything a baker changes lives in **`config/menu.json`**:

- `recipient.name` (in both languages) and `recipient.whatsappNumber` – who receives the order.
  The number is in international format with digits only (no `+`, spaces or leading zeros), e.g.
  `46701234567`.
- `note` – optional text shown above the toppings, in both languages, e.g. that every pizza comes
  with tomato sauce and cheese. Remove it to show nothing.
- `toppings` – the list on offer. Each has an `id` (lowercase, dashes), an `emoji`, and a `name`
  and `group` given in both languages: `{ "en": "Ham", "sv": "Skinka" }`. Groups appear in the
  order they are first used.
- `maxToppings` – optional cap per pizza. Remove it for no limit.

The test suite validates the file, so a typo fails CI with a message naming the field.

## Languages

The app is in English and Swedish. A toggle in the header switches between them, the choice is
remembered in the browser, and the first visit follows the browser language. All UI strings live in
`src/i18n/translations.ts`; topping and group names come from `config/menu.json`. The message to
the baker is written in whichever language the customer is using.

## How sending works

The last screen is a [`wa.me`](https://faq.whatsapp.com/5913398998672934) link with the recipient
and message pre-filled. On iOS and Android it opens the WhatsApp app; on a desktop it opens
WhatsApp Web. The user just taps send. There is no backend and no data is stored anywhere except
the customer's name in their own browser.

## Develop

```sh
pnpm install
pnpm dev            # Vite dev server with hot reload
pnpm test:watch     # Vitest in watch mode
pnpm check          # everything CI runs: lint, types, format, unit, build, e2e
```

Stack: Vite, React 19, TypeScript, Tailwind CSS 4, Vitest + Testing Library, Playwright.

## Deploy

`pnpm build` writes a plain static site to `dist/`, servable by any HTTP server.

Every push to `main` runs CI, and a green CI run triggers the `Deploy` workflow, which builds,
re-verifies the build end to end, uploads it over SFTP to one.com and checks the live site serves
the new build. It can also be run by hand from the Actions tab. The workflow needs these
repository settings:

| Kind     | Name                    | Meaning                                    |
| -------- | ----------------------- | ------------------------------------------ |
| secret   | `ONECOM_FTP_SERVER`     | SFTP host                                  |
| secret   | `ONECOM_FTP_USERNAME`   | SFTP user                                  |
| secret   | `ONECOM_FTP_PASSWORD`   | SFTP password                              |
| variable | `ONECOM_FTP_SERVER_DIR` | Directory that `dominos.kurelid.se` serves |
| variable | `ONECOM_SFTP_PORT`      | Optional, defaults to 22                   |
