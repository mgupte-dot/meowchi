#!/usr/bin/env python3
"""Build the Meowchi web app into dist/: an installable PWA with no CDN dependencies.

    python3 tools/build.py

Needs esbuild and Pillow. The sources in src/ are concatenated in the order below into one
script, so they share a scope and are not ES modules; see web/README.md.
"""
import os, subprocess, json, shutil, hashlib, sys
from PIL import Image, ImageDraw

TOOLS = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(TOOLS)
SRC = os.path.join(WEB, "src")
OUT = os.path.join(WEB, "dist")
sys.path.insert(0, TOOLS)
import gen_sprites as gs

ESBUILD = shutil.which("esbuild") or "/opt/npm-tools/node_modules/esbuild/bin/esbuild"
if not os.path.exists(ESBUILD):
    sys.exit("esbuild not found. Install it with: npm install -g esbuild")

# concatenation order: helpers first, then data, then components, then the app
ORDER = ["dsp.js", "sounds.js", "analysis.js", "needs.js", "sprites.js",
         "components.jsx", "app-logic.jsx", "app-view.jsx"]

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, "icons"))

app = "const { useState, useRef, useEffect } = React;\n" + "".join(open(os.path.join(SRC, f)).read() for f in ORDER)
entry = os.path.join(OUT, "_entry.jsx")
open(entry, "w").write('import React from "react";\nimport * as ReactDOM from "react-dom/client";\n' + app)
subprocess.run([ESBUILD, entry, "--bundle", "--minify", "--jsx=transform", "--charset=utf8",
                '--define:process.env.NODE_ENV="production"', "--target=es2019",
                "--outfile=" + os.path.join(OUT, "app.js"), "--log-level=warning"], check=True, cwd=WEB)
os.remove(entry)

RESET = (":root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }\n"
         "html, body { margin: 0; }\n[hidden] { display: none !important; }\n"
         "html { -webkit-text-size-adjust: 100%; }\nbody { overscroll-behavior-y: none; -webkit-tap-highlight-color: transparent; }\n")
open(os.path.join(OUT, "style.css"), "w").write(RESET + open(os.path.join(SRC, "style.css")).read())

# icons, drawn from the same pixel cat the app uses
frame = gs.frame("idle")
cols = [x for r in frame for x, ch in enumerate(r) if ch != "."]
rws = [y for y, r in enumerate(frame) if r.strip(".")]
crop = [r[min(cols):max(cols) + 1] for r in frame[min(rws):max(rws) + 1]]

def icon(size, px, path, grid="#E8D2C1"):
    im = Image.new("RGB", (size, size), "#F1DFD0")
    d = ImageDraw.Draw(im)
    off = (size % px) // 2
    for i in range(off, size, px):
        d.line([(i, 0), (i, size)], fill=grid, width=max(1, px // 13))
        d.line([(0, i), (size, i)], fill=grid, width=max(1, px // 13))
    cat = gs.draw(crop, px)
    im.paste(cat, (((size - cat.width) // 2 - off) // px * px + off,
                   ((size - cat.height) // 2 - off) // px * px + off + px), cat)
    im.save(path)

icon(1024, 26, os.path.join(OUT, "icons", "icon-1024.png"))   # for app store listings
icon(512, 13, os.path.join(OUT, "icons", "icon-512.png"))
icon(192, 5, os.path.join(OUT, "icons", "icon-192.png"))
icon(512, 10, os.path.join(OUT, "icons", "icon-maskable-512.png"))  # cat inside the safe zone for round masks
icon(180, 4, os.path.join(OUT, "icons", "apple-touch-icon.png"))
icon(32, 1, os.path.join(OUT, "icons", "favicon-32.png"), grid="#F1DFD0")

json.dump({
    "name": "Meowchi", "short_name": "Meowchi",
    "description": "Record your cat and get a best guess at what it wants. Plus sounds to call your cat over.",
    "start_url": "./", "scope": "./", "display": "standalone", "orientation": "portrait",
    "background_color": "#F6EEE2", "theme_color": "#F6EEE2",
    "categories": ["lifestyle", "entertainment"],
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}, open(os.path.join(OUT, "manifest.webmanifest"), "w"), indent=2)

shutil.copy(os.path.join(WEB, "index.html"), os.path.join(OUT, "index.html"))
shutil.copy(os.path.join(WEB, "config.js"), os.path.join(OUT, "config.js"))

# offline cache; the version is a hash of everything shipped, so updates roll out on the next visit
shell = ["index.html", "app.js", "config.js", "style.css", "manifest.webmanifest",
         "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
         "icons/apple-touch-icon.png", "icons/favicon-32.png"]
h = hashlib.sha256()
for f in shell:
    h.update(open(os.path.join(OUT, f), "rb").read())
sw = open(os.path.join(WEB, "sw.template.js")).read()
open(os.path.join(OUT, "sw.js"), "w").write(
    sw.replace("__VERSION__", h.hexdigest()[:10]).replace('"__SHELL__"', json.dumps(shell)))

total = 0
for root, _, files in os.walk(OUT):
    for f in sorted(files):
        p = os.path.join(root, f)
        total += os.path.getsize(p)
        print(f"  {os.path.relpath(p, OUT):32s} {os.path.getsize(p):>8d}")
print(f"built {OUT}  ({total} bytes)")
