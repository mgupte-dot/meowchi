#!/usr/bin/env python3
"""Original pixel-art sprites for Meowchi: the mochi cat (one frame per mood) and small icons."""
import json, os, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 40, 32
PAL = {
    "o": "#5E433C", "c": "#FFF8EC", "s": "#F1E2CC", "b": "#E6BC8E", "d": "#CC9A68",
    "p": "#F7BCC0", "n": "#EC8F9A", "w": "#FFFFFF", "e": "#4A332E",
    "l": "#B5A6CE", "y": "#F0C96F", "k": "#A9C3DC", "g": "#D3C6BA", "m": "#AFCDBF",
    "x": "#F7BCC0",
}

def blank():
    return [["." for _ in range(W)] for _ in range(H)]

def in_tri(px, py, a, b, c):
    def s(p, q, r):
        return (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1])
    d1, d2, d3 = s((px, py), a, b), s((px, py), b, c), s((px, py), c, a)
    neg = d1 < 0 or d2 < 0 or d3 < 0
    pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (neg and pos)

def base_cat():
    g = blank()
    cx, cy, rx, ry, n = 20.0, 19.5, 12.2, 9.2, 2.7
    earL = [(8.6, 15.0), (10.6, 5.6), (18.0, 11.0)]
    earR = [(31.4, 15.0), (29.4, 5.6), (22.0, 11.0)]
    innerL = [(11.0, 12.6), (11.6, 8.2), (15.0, 11.0)]
    innerR = [(29.0, 12.6), (28.4, 8.2), (25.0, 11.0)]
    # tail: discs along a quadratic bezier, curling up on the right
    P0, P1, P2 = (30.5, 25.8), (38.2, 27.2), (36.6, 20.2)
    tail = []
    for i in range(41):
        t = i / 40
        tail.append(((1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
                     (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1], t))
    for y in range(H):
        for x in range(W):
            px, py = x + 0.5, y + 0.5
            body = (abs((px - cx) / rx) ** n + abs((py - cy) / ry) ** n) <= 1 and y <= 27
            eL, eR = in_tri(px, py, *earL), in_tri(px, py, *earR)
            tl = None
            for tx, ty, t in tail:
                if (px - tx) ** 2 + (py - ty) ** 2 <= 1.75 ** 2:
                    tl = t
            if body or eL or eR:
                col = "c"
                # caramel patch over the left ear and brow
                if (px - 11.5) ** 2 + (py - 9.5) ** 2 <= 6.3 ** 2 and px < 17.2:
                    col = "b"
                if in_tri(px, py, *innerL) or in_tri(px, py, *innerR):
                    col = "p"
                if body and y == 27:
                    col = "s"
                g[y][x] = col
            elif tl is not None and y <= 27:
                g[y][x] = "d" if (0.38 < tl < 0.52 or 0.70 < tl < 0.84) else "b"
    # outline: empty pixels 4-adjacent to the shape
    out = [row[:] for row in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] != ".":
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < W and 0 <= yy < H and g[yy][xx] != ".":
                    out[y][x] = "o"
                    break
    g = out
    # seam between tail and body
    for y in range(H):
        for x in range(W - 1):
            if g[y][x] in "cs" and g[y][x + 1] in "bd" and x > 26:
                g[y][x] = "o"
    # blush, nose, little feet
    for x, y in [(11, 21), (12, 21), (11, 22), (12, 22), (27, 21), (28, 21), (27, 22), (28, 22)]:
        g[y][x] = "p"
    g[20][19] = g[20][20] = "n"
    for fx in (15, 22):
        for x in (fx, fx + 1, fx + 2):
            g[25][x] = "o"
        g[26][fx - 1] = g[26][fx + 3] = "o"
        g[27][fx - 1] = g[27][fx + 3] = "o"
    return g

EX, EY = (14, 24), 16   # eye columns (left edge of each 2px eye), top row

def put(g, pts, ch):
    for x, y in pts:
        if 0 <= x < W and 0 <= y < H:
            g[y][x] = ch

def stamp(g, rows, ox, oy):
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != ".":
                put(g, [(ox + i, oy + j)], ch)

def eyes(g, kind):
    for i, ex in enumerate(EX):
        if kind == "open":
            put(g, [(ex + a, EY + b) for a in (0, 1) for b in (0, 1, 2)], "e")
        elif kind == "big":
            put(g, [(ex + a, EY - 1 + b) for a in (-1, 0, 1, 2) for b in (0, 1, 2, 3)
                    if not (a in (-1, 2) and b in (0, 3))], "e")
            put(g, [(ex, EY)], "w")
        elif kind == "round":
            put(g, [(ex + a, EY + b) for a in (0, 1) for b in (0, 1)], "e")
        elif kind == "happy":
            put(g, [(ex - 1, EY + 2), (ex, EY + 1), (ex + 1, EY + 1), (ex + 2, EY + 2)], "e")
        elif kind == "closed":
            put(g, [(ex - 1, EY + 1), (ex, EY + 2), (ex + 1, EY + 2), (ex + 2, EY + 1)], "e")
        elif kind == "line":
            put(g, [(ex - 1, EY + 2), (ex, EY + 2), (ex + 1, EY + 2), (ex + 2, EY + 2)], "e")
        elif kind == "upset":
            if i == 0:
                put(g, [(ex - 1, EY), (ex, EY + 1), (ex + 1, EY + 2), (ex, EY + 2), (ex - 1, EY + 3)], "e")
            else:
                put(g, [(ex + 2, EY), (ex + 1, EY + 1), (ex, EY + 2), (ex + 1, EY + 2), (ex + 2, EY + 3)], "e")
        elif kind == "up":
            put(g, [(ex + 1 + a, EY - 1 + b) for a in (0, 1) for b in (0, 1)], "e")

def mouth(g, kind):
    if kind == "smile":
        put(g, [(18, 21), (21, 21), (19, 22), (20, 22)], "o")
    elif kind == "open":
        put(g, [(18, 21), (19, 21), (20, 21), (21, 21), (18, 22), (21, 22), (19, 23), (20, 23)], "o")
        put(g, [(19, 22), (20, 22)], "n")
    elif kind == "frown":
        put(g, [(19, 22), (20, 22), (18, 23), (21, 23)], "o")
    elif kind == "o":
        put(g, [(19, 22), (20, 22), (19, 23), (20, 23)], "o")
    elif kind == "w":
        put(g, [(17, 21), (18, 22), (19, 21), (20, 21), (21, 22), (22, 21)], "o")

SPARK = ["..y..", "..y..", "yyyyy", "..y..", "..y.."]
SPARK_S = [".y.", "yyy", ".y."]
NOTE = ["..ll", "..l.", "..l.", "lll.", "lll."]
ZBIG = ["lllll", "...l.", "..l..", ".l...", "lllll"]
ZSML = ["llll", "..l.", ".l..", "llll"]
QM = [".lll.", "l...l", "...l.", "..l..", ".....", "..l.."]
ANGER = ["n.n", ".n.", "n.n"]

def frame(mood):
    g = base_cat()
    if mood == "idle":
        eyes(g, "open"); mouth(g, "smile")
    elif mood == "blink":
        eyes(g, "line"); mouth(g, "smile")
    elif mood == "happy":
        eyes(g, "happy"); mouth(g, "open")
        stamp(g, SPARK, 1, 6); stamp(g, SPARK_S, 35, 4); stamp(g, SPARK_S, 5, 1)
    elif mood == "excited":
        eyes(g, "big"); mouth(g, "open")
        stamp(g, SPARK, 34, 3); stamp(g, SPARK_S, 2, 8); stamp(g, SPARK_S, 6, 2)
    elif mood == "sleepy":
        eyes(g, "closed"); mouth(g, "w")
        stamp(g, ZBIG, 32, 6); stamp(g, ZSML, 36, 0)
    elif mood == "upset":
        eyes(g, "upset"); mouth(g, "frown")
        stamp(g, ANGER, 34, 6)
    elif mood == "think":
        eyes(g, "up"); mouth(g, "o")
        put(g, [(33, 10)], "l")
        put(g, [(35, 7), (36, 7), (35, 8), (36, 8)], "l")
        put(g, [(a, b) for a in (36, 37, 38) for b in (2, 3, 4)], "l")
    elif mood == "surprised":
        eyes(g, "round"); mouth(g, "o")
        stamp(g, QM, 33, 4)
    elif mood == "listen":
        eyes(g, "open"); mouth(g, "smile")
        stamp(g, NOTE, 1, 5); stamp(g, [r.replace("l", "n") for r in NOTE], 34, 3)
    return ["".join(r) for r in g]

MOODS = ["idle", "blink", "happy", "excited", "sleepy", "upset", "think", "surprised", "listen"]

ICONS = {
    "paw": [
        "............",
        "....xx.xx...",
        ".xx.xx.xx.xx",
        ".xx.xx.xx.xx",
        ".xx.......xx",
        "....xxxx....",
        "...xxxxxx...",
        "..xxxxxxxx..",
        "..xxxxxxxx..",
        "..xxxxxxxx..",
        "...xx..xx...",
        "............",
    ],
    "heart": [".xx.xx.", "xxxxxxx", "xxxxxxx", ".xxxxx.", "..xxx..", "...x..."],
    "purr": [
        "............",
        ".....lllll..",
        "........l...",
        ".......l....",
        "......l.....",
        ".....lllll..",
        "............",
        ".llll.......",
        "...l........",
        "..l.........",
        ".llll.......",
        "............",
    ],
    "birds": [
        "............",
        "....oooo....",
        "...okkkko...",
        "..okkkekkoy.",
        "..okkkkkkyy.",
        ".ookkkkkko..",
        "okkkcccckо..".replace("о", "o"),
        "okkccccccko.",
        ".ookcccckо..".replace("о", "o"),
        "...oooooo...",
        "....o..o....",
        "............",
    ],
    "mouse": [
        "............",
        ".oo......oo.",
        "ogpo....opgo",
        "ogpgoooogpgo",
        ".oggggggggo.",
        ".oggeggeggo.",
        ".oggggggggo.",
        "..oggnnggo..",
        "...oooooo...",
        "............",
        "............",
        "............",
    ],
    "mew": [
        "............",
        ".oo......oo.",
        "opco....ocpo",
        "occcooooccco",
        "occcccccccco",
        "occeccccecco",
        "ocpccnnccpco",
        "occcccccccco",
        ".occcccccco.",
        "..oooooooo..",
        "............",
        "............",
    ],
    "crinkle": [
        "............",
        "............",
        "o...oooo...o",
        "oo.onppno.oo",
        "opopnppnpopo",
        "opopnppnpopo",
        "oo.onppno.oo",
        "o...oooo...o",
        "............",
        "............",
        "............",
        "............",
    ],
}
ICONS["pspsps"] = ICONS["paw"]

def check():
    for k, rows in ICONS.items():
        w = len(rows[0])
        for r in rows:
            assert len(r) == w, (k, r, len(r))
            for ch in r:
                assert ch == "." or ch in PAL, (k, ch)

def draw(rows, scale, colors=None):
    colors = colors or PAL
    im = Image.new("RGBA", (len(rows[0]) * scale, len(rows) * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != ".":
                d.rectangle([x * scale, y * scale, (x + 1) * scale - 1, (y + 1) * scale - 1], fill=colors[ch])
    return im

def app_icon(rows, path, size=1024):
    """Full-bleed app icon: milk-tea ground, graph-paper grid, the cat centred."""
    px = 26
    im = Image.new("RGB", (size, size), "#F1DFD0")
    d = ImageDraw.Draw(im)
    off = (size % px) // 2
    for i in range(off, size, px):
        d.line([(i, 0), (i, size)], fill="#E8D2C1", width=2)
        d.line([(0, i), (size, i)], fill="#E8D2C1", width=2)
    cols = [x for r in rows for x, ch in enumerate(r) if ch != "."]
    rws = [y for y, r in enumerate(rows) if r.strip(".")]
    x0, x1, y0, y1 = min(cols), max(cols), min(rws), max(rws)
    crop = [r[x0:x1 + 1] for r in rows[y0:y1 + 1]]
    cat = draw(crop, px)
    gx = ((size - cat.width) // 2 - off) // px * px + off
    gy = ((size - cat.height) // 2 - off) // px * px + off + px
    im.paste(cat, (gx, gy), cat)
    im.save(path)

if __name__ == "__main__":
    check()
    frames = {m: frame(m) for m in MOODS}
    json.dump({"pal": PAL, "cat": frames, "icons": ICONS}, open(os.path.join(HERE, "sprites.json"), "w"))
    # contact sheet for a look
    S = 8
    sheet = Image.new("RGB", (3 * W * S + 40, 3 * H * S + 12 * 14 + 60), "#F6EEE2")
    for i, m in enumerate(MOODS):
        sheet.paste(draw(frames[m], S), ((i % 3) * W * S + 10, (i // 3) * H * S + 10), draw(frames[m], S))
    for i, k in enumerate(["paw", "heart", "purr", "birds", "mouse", "mew", "crinkle"]):
        ic = draw(ICONS[k], 12)
        sheet.paste(ic, (10 + i * 136, 3 * H * S + 30), ic)
    sheet.save(os.path.join(HERE, "sprite-sheet.png"))
    app_icon(frames["idle"], "/mnt/user-data/outputs/meowchi-icon.png")
    print("ok", sheet.size)
