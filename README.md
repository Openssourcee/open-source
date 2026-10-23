# Open Source ($OS)

The coin whose website is built by everyone.

This repo **is** the website: a pixel canvas anyone can add to. Paint a plot, write a chapter of
the lore, or propose code and tech, for free, straight from the page or through GitHub.

The dev key is public too, and it controls nothing: the creator fees are locked through pump.fun to
open-source charities (Software Freedom Conservancy, Apache Software Foundation, Mozilla Foundation),
and the dev wallet holds no $OS and no SOL. Don't send anything to it.

## Two ways to contribute

1. **On the site, no account:** press **Contribute**. Your first painting, chapter or idea goes live
   at once; later ones, and all code, wait for a person to approve them.
2. **On GitHub:** fork, change anything (pages, features, the canvas engine), open a pull request.
   See [CONTRIBUTING.md](CONTRIBUTING.md).

Contributing is free and always will be.

## Run it on your computer

Needs Node.js. From the repo root:

```
npx wrangler d1 execute os-contributions --local --file schema.sql
npx wrangler dev --local
```

Put `ADMIN_TOKEN=any-local-test-value` in a `.dev.vars` file to use the review page at `/admin.html`.
A plain static server (`python -m http.server --directory sitio`) also works, read-only.

## What lives where

| Path | What it is |
| --- | --- |
| `sitio/` | The page: `index.html`, `css/`, `js/` (canvas engine), `data/`, `plots/` |
| `sitio/data/config.json` | Name, ticker, links, palette, canvas size |
| `sitio/data/plots.json` | The genesis plot and the open plots (ideas to start from) |
| `worker.js` | The small server: approved contributions, the send form, the review queue |
| `schema.sql` | The database table for contributions |
| `tools/check_plots.py` | The automatic check every pull request must pass |

$OS is a memecoin. No roadmap promises, no expectation of profit.
