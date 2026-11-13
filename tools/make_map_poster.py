"""Render tools/map-poster.html to images/map/marloth-park-map.jpg (the offline map download).

    python -I tools/make_map_poster.py

Needs Microsoft Edge (or set EDGE to a Chrome/Edge executable). Re-run after changing MAP in
assets/js/data.js or rebuilding the map with tools/build_map.py.
"""
import os, pathlib, subprocess, tempfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Headless browser: $EDGE if set, else Chrome, else Edge
_CANDIDATES = [os.environ.get('EDGE'), r'C:\Program Files\Google\Chrome\Application\chrome.exe',
               r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']
EDGE = next(p for p in _CANDIDATES if p and os.path.exists(p))
OUT = os.path.join(ROOT, 'images', 'map', 'marloth-park-map.jpg')
SCALE = 1.5

page = pathlib.Path(ROOT, 'tools', 'map-poster.html').as_uri()
with tempfile.TemporaryDirectory() as tmp:
    shot = os.path.join(tmp, 'poster.png')
    # its own profile folder, so a normal Edge window that is already open doesn't swallow the job
    subprocess.run([EDGE, '--headless=new', f'--user-data-dir={os.path.join(tmp, "profile")}', '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
                    f'--force-device-scale-factor={SCALE}', '--virtual-time-budget=10000',
                    f'--screenshot={shot}', '--window-size=1400,3600', page],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    img = Image.open(shot).convert('RGB')
    # crop off the white page below the poster
    w, h = img.size
    px = img.load()
    bottom = h
    while bottom > 0 and all(px[x, bottom - 1] == (255, 255, 255) for x in range(0, w, 37)):
        bottom -= 1
    img = img.crop((0, 0, w, bottom))
    img.save(OUT, quality=86, optimize=True, progressive=True)
print(f'wrote {OUT}: {img.size[0]}x{img.size[1]}, {os.path.getsize(OUT) // 1024} KB')
