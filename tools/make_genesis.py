"""Draws the genesis plot (the first painted plot on the canvas), the favicon and the share image.

Run from the repo root:  python tools/make_genesis.py   (writes into sitio/)
Every plot on the canvas is a PNG where 1 image pixel = 1 canvas tile.
Only colours from the 32-colour palette in sitio/data/config.json are allowed.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "sitio"

INK = "#000000"
GRAY = "#515252"
LIGHT = "#898D90"
PALE_YELLOW = "#FFF8B8"
YELLOW = "#FFD635"
BLUE = "#3690EA"
GREEN = "#00CC78"
PINK = "#FF3881"

BIG = {
    "$": ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
    "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "I": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "C": [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
}
SMALL = {
    "B": ["##.", "#.#", "##.", "#.#", "##."],
    "U": ["#.#", "#.#", "#.#", "#.#", "###"],
    "I": ["###", ".#.", ".#.", ".#.", "###"],
    "L": ["#..", "#..", "#..", "#..", "###"],
    "T": ["###", ".#.", ".#.", ".#.", ".#."],
    "Y": ["#.#", "#.#", ".#.", ".#.", ".#."],
    "E": ["###", "#..", "##.", "#..", "###"],
    "V": ["#.#", "#.#", "#.#", "#.#", ".#."],
    "R": ["##.", "#.#", "##.", "#.#", "#.#"],
    "O": ["###", "#.#", "#.#", "#.#", "###"],
    "N": ["#..#", "##.#", "#.##", "#..#", "#..#"],
    " ": ["...", "...", "...", "...", "..."],
}


def put(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), Image.new("RGBA", (1, 1), color).getpixel((0, 0)))


def text(img, s, x, y, font, color, scale=1, gap=1):
    for ch in s:
        rows = font[ch]
        for ry, row in enumerate(rows):
            for rx, c in enumerate(row):
                if c == "#":
                    for sy in range(scale):
                        for sx in range(scale):
                            put(img, x + rx * scale + sx, y + ry * scale + sy, color)
        x += len(rows[0]) * scale + gap * scale
    return x


def logo(img, ox, oy):
    """A fork whose three tines are branches that merge into one handle (20 x 36 tiles)."""
    nodes = [(0, BLUE), (7, GREEN), (14, PINK)]
    for nx, color in nodes:
        # a commit ring, 6 x 6, hollow in the middle
        for y in range(6):
            for x in range(6):
                corner = (x in (0, 5)) and (y in (0, 5))
                inner = 2 <= x <= 3 and 2 <= y <= 3
                if not corner and not inner:
                    put(img, ox + nx + x, oy + y, color)
        for y in range(6, 16):
            put(img, ox + nx + 2, oy + y, color)
            put(img, ox + nx + 3, oy + y, color)
    for y, (x0, x1) in zip(range(16, 20), [(1, 18), (1, 18), (2, 17), (4, 15)]):
        for x in range(x0, x1 + 1):
            put(img, ox + x, oy + y, INK)
    for y in range(16, 18):  # the merge commit
        put(img, ox + 9, oy + y, YELLOW)
        put(img, ox + 10, oy + y, YELLOW)
    for y in range(20, 23):
        for x in range(7, 13):
            put(img, ox + x, oy + y, INK)
    for y in range(23, 35):
        for x in range(8, 12):
            put(img, ox + x, oy + y, INK)
        put(img, ox + 8, oy + y, GRAY)
    put(img, ox + 9, oy + 35, INK)
    put(img, ox + 10, oy + 35, INK)


def genesis():
    w, h = 104, 46
    img = Image.new("RGBA", (w, h), PALE_YELLOW)
    for x in range(w):
        put(img, x, 0, INK)
        put(img, x, h - 1, INK)
    for y in range(h):
        put(img, 0, y, INK)
        put(img, w - 1, y, INK)
    logo(img, 4, 5)
    text(img, "OPEN", 29, 4, BIG, INK, scale=2, gap=1)
    text(img, "SOURCE", 29, 20, BIG, INK, scale=2, gap=1)
    text(img, "BUILT BY EVERYONE", 29, 37, SMALL, GRAY, scale=1, gap=1)
    return img


def favicon():
    img = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
    logo(img, 10, 2)
    return img.resize((160, 160), Image.NEAREST)


def share_image(art):
    W, H, tile = 1200, 630, 10
    img = Image.new("RGB", (W, H), "#FFFFFF")
    d = ImageDraw.Draw(img)
    for x in range(0, W, tile):
        d.line([(x, 0), (x, H)], fill="#EEF0F1")
    for y in range(0, H, tile):
        d.line([(0, y), (W, y)], fill="#EEF0F1")
    scaled = art.resize((art.width * tile, art.height * tile), Image.NEAREST)
    ox = (W - scaled.width) // 2 // tile * tile
    oy = 4 * tile
    img.paste(scaled, (ox, oy), scaled)
    # three open plots waiting under the genesis plot
    for x, y, w, h in [(9, 54, 30, 7), (45, 54, 40, 7), (91, 54, 21, 7)]:
        x0, y0, x1, y1 = x * tile, y * tile, (x + w) * tile, (y + h) * tile
        for px in range(x0, x1, 20):
            d.line([(px, y0), (min(px + 10, x1), y0)], fill=INK, width=3)
            d.line([(px, y1), (min(px + 10, x1), y1)], fill=INK, width=3)
        for py in range(y0, y1, 20):
            d.line([(x0, py), (x0, min(py + 10, y1))], fill=INK, width=3)
            d.line([(x1, py), (x1, min(py + 10, y1))], fill=INK, width=3)
    return img


if __name__ == "__main__":
    art = genesis()
    (ROOT / "plots").mkdir(exist_ok=True)
    art.save(ROOT / "plots" / "genesis.png")
    favicon().save(ROOT / "favicon.png")
    share_image(art).save(ROOT / "og.png")
    print("ok", art.size)
