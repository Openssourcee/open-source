"""Checks every pull request before a human looks at it.

    python tools/check_plots.py

Fails (exit 1) when the data files are broken, a plot leaves the canvas or overlaps
another, a painted plot's PNG has the wrong size or uses colours outside the palette,
or the site's code starts talking to a domain that is not on the allow list.
It also flags code patterns a reviewer must look at by hand (wallet signing, eval...).
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "sitio"
errors, warnings = [], []

ALLOWED_DOMAINS = {
    "fonts.googleapis.com", "fonts.gstatic.com", "unpkg.com", "api.github.com", "github.com",
    "pump.fun", "solscan.io", "x.com", "twitter.com", "donate.gg", "www.donate.gg", "openssource.fun", "www.openssource.fun",
}
SUSPICIOUS = [
    (r"\beval\s*\(", "eval()"),
    (r"new\s+Function\s*\(", "new Function()"),
    (r"document\.write\s*\(", "document.write()"),
    (r"signTransaction|signAllTransactions|signMessage", "wallet signing"),
    (r"privateKey|secretKey|seed\s*phrase|mnemonic", "keys or seed phrases"),
    (r"window\.(solana|phantom|solflare)", "wallet connection"),
    (r"atob\s*\(|fromCharCode\s*\(", "decoding hidden strings"),
]


def load(name):
    try:
        return json.loads((SITE / "data" / name).read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        errors.append(f"sitio/data/{name} is not valid JSON: {e}")
        return None


config, plots, changelog = load("config.json"), load("plots.json"), load("changelog.json")

if config and plots is not None:
    cols, rows = config["canvas"]["cols"], config["canvas"]["rows"]
    palette = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in config["palette"]}
    seen = set()
    for p in plots:
        pid = p.get("id", "?")
        for key in ("id", "status", "title", "brief", "category", "x", "y", "w", "h"):
            if key not in p:
                errors.append(f"plot {pid}: missing '{key}'")
        if pid in seen:
            errors.append(f"plot {pid}: id used twice")
        seen.add(pid)
        if p.get("status") not in ("open", "built"):
            errors.append(f"plot {pid}: status must be 'open' or 'built'")
        if p.get("category") not in config["categories"]:
            errors.append(f"plot {pid}: unknown category '{p.get('category')}'")
        x, y, w, h = (p.get(k, 0) for k in ("x", "y", "w", "h"))
        if x < 0 or y < 0 or w < 1 or h < 1 or x + w > cols or y + h > rows:
            errors.append(f"plot {pid}: outside the {cols}x{rows} canvas")
        if p.get("status") == "built":
            if not p.get("author"):
                errors.append(f"plot {pid}: painted plots need an author")
            art = SITE / p.get("art", "")
            if not p.get("art") or not art.is_file():
                errors.append(f"plot {pid}: art file not found ({p.get('art')})")
            else:
                img = Image.open(art).convert("RGBA")
                if img.size != (w, h):
                    errors.append(f"plot {pid}: art is {img.size[0]}x{img.size[1]} but the plot is {w}x{h}")
                raw = img.tobytes()
                pixels = (tuple(raw[i:i + 4]) for i in range(0, len(raw), 4))
                bad = {px[:3] for px in pixels if px[3] > 0 and px[:3] not in palette}
                if bad:
                    sample = ", ".join("#%02X%02X%02X" % c for c in list(bad)[:5])
                    errors.append(f"plot {pid}: {len(bad)} colours outside the palette (e.g. {sample})")
    for i, a in enumerate(plots):
        for b in plots[i + 1:]:
            if a["x"] < b["x"] + b["w"] and b["x"] < a["x"] + a["w"] and a["y"] < b["y"] + b["h"] and b["y"] < a["y"] + a["h"]:
                errors.append(f"plots {a['id']} and {b['id']} overlap")

for f in [*SITE.glob("*.html"), *SITE.glob("js/**/*.js"), *SITE.glob("css/**/*.css"), ROOT / "worker.js"]:
    text = f.read_text(encoding="utf-8", errors="replace")
    for domain in set(re.findall(r"https?://([a-zA-Z0-9.-]+)", text)):
        if domain not in ALLOWED_DOMAINS:
            errors.append(f"{f.relative_to(ROOT)}: talks to a domain that is not allowed: {domain}")
    for pattern, label in SUSPICIOUS:
        if re.search(pattern, text, re.I):
            warnings.append(f"{f.relative_to(ROOT)}: uses {label}, review it by hand")

for w in warnings:
    print("CHECK BY HAND:", w)
for e in errors:
    print("ERROR:", e)
print("OK, everything passes." if not errors else f"{len(errors)} problem(s) found.")
sys.exit(1 if errors else 0)
