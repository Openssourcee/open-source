# Contributing to Open Source ($OS)

Anyone can build this site, for free. There are no bounties and no fees: you build because it is fun
and your name stays on what you made.

## The easy way: from the site

Press **Contribute** on the page.

- **Paint:** take an open art plot, or drag out your own plot (up to 48x40 tiles) on any empty space,
  and paint it with the 32-colour palette.
- **Lore:** write a chapter of the $OS story.
- **Code & tech:** paste code or describe a feature, with a link to a repo or gist if you have one.
- **Idea:** anything the site should have.

Your first painting, chapter or idea goes live straight away. After that, and always for code or
anything with a link, it waits in a review queue until a person approves it. Anything live can be
taken down if it breaks the house rules.
Code sent this way is read by a person and never run automatically; accepted code is added to the
repo by hand, with credit.

## The developer way: GitHub

1. Fork the repo and make your change: a feature, a fix, a new section, the canvas engine itself.
2. To paint a plot in the repo, draw a PNG exactly the plot's size (one image pixel per tile, palette
   colours only), save it in `sitio/plots/`, and set the plot to `"status": "built"` with your
   `author` handle and `art` path in `sitio/data/plots.json`.
3. Run `pip install pillow` and `python tools/check_plots.py`. It must pass.
4. Open a pull request. It is reviewed in public.

## House rules (anything that breaks one is not approved)

- No new external scripts, trackers, analytics or calls to new domains.
- Nothing that connects to, asks for or signs with a wallet. The site never touches anyone's funds.
- No obfuscated or minified code. Readable or it does not get in.
- No content that is hateful, sexual, or targets a real person.
