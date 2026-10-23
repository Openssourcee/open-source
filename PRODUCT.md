# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS, no framework and no build step (user's choice), served by a small Cloudflare Worker with a D1 database for contributions sent from the page (user chose on-site contributions, 2026-10-23). Repo files: sitio/ (page), worker.js, schema.sql, wrangler.jsonc.

## Users

- Crypto Twitter / pump.fun memecoin crowd who land from a tweet and decide in seconds whether the coin has a real idea behind it.
- Anyone who lands on the page and wants to add something: pixel art, lore, code or tech, ideas. No account, no fee, no reward money.

## Product Purpose

Open Source ($OS, set in data/config.json) is a new Solana memecoin whose website is a real open-source project: the code lives in a public GitHub repo, anyone can contribute for free, either from the page itself (paint a plot, write lore, propose code or ideas) or by pull request; the maintainer approves before anything goes live. There is no money for contributors (user decision 2026-10-23: open source means free to contribute). Creator fees are routed by pump.fun (Charity Coins via Donate.gg) straight to Software Freedom Conservancy, the Apache Software Foundation and the Mozilla Foundation, chosen by the user 2026-10-23; the dev never holds them. Hosting runs on Cloudflare's free tier. Success: people actually contribute and the site visibly grows over time.

## Positioning

A reaction to another "$OS" coin (October 2026), which called itself "the first open-source coin" by posting the dev wallet's private key, a gimmick where bots drain everything and nobody builds anything. $OS makes "everyone is the dev" literally true: the site is the shared codebase, contributions are free, and the dev key is posted too, but only after everything it could control is given away (fees locked to the charities, no tokens, no SOL). Decided by the user 2026-10-23.

## Operating Context

- Maintainer: the user (non-programmer), approving contributions at /admin.html with a review key, with Claude reviewing code proposals and pull requests.
- Flow on the page: pick an open plot or drag out your own, paint / write / propose, send, maintainer approves, it appears for everyone. Contributed code is never executed; accepted code is integrated into the repo by hand with credit.
- Data: sitio/data/plots.json (genesis + suggested open plots), sitio/data/changelog.json, and the D1 table of contributions; contributors are derived from approved work; site config (ticker, CA, repo URL, fee wallet) in one place.

## Capabilities and Constraints

- Website text always in English.
- Small backend (Cloudflare Worker + D1): rate limit 6 sends per hour per visitor, own plots 4x4 up to 48x40, overlap checks, review queue protected by ADMIN_TOKEN.
- Coin not launched yet: CA, repo URL and fee wallet are placeholders until launch.
- Name chosen by the user 2026-10-23: Open Source, ticker $OS (the name must say the website is open source; sharing the ticker with the other coin is accepted). Undecided: exact fee split.

## Evidence on Hand

None yet. No contributors, no holders. Do not fabricate contributors, payouts, quotes or numbers; the genesis version is built by the maintainer and empty slots must read as open invitations.

## Product Principles

1. Prove, don't claim: everything shown (plots, lore, contributors) comes from real files or approved contributions.
2. No keys, ever: safety is part of the pitch.
3. Contributing must look easy and free within one screen; no money language around contributions.
4. The site itself is the demo: it should visibly change as people build it.
