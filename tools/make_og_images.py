"""Make the 1200x630 link-preview images WhatsApp, Facebook and Google use.

Usage (from the site folder):  python tools/make_og_images.py
Writes images/og/<stay-id>.jpg from each stay's cover photo (01.jpg)
and images/og/home.jpg, a collage with the logo for the home page.
Re-run after changing a property's cover photo.
"""
import os
from PIL import Image, ImageDraw, ImageOps

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAYS = os.path.join(SITE, 'images', 'stays')
OUT = os.path.join(SITE, 'images', 'og')
W, H = 1200, 630
HOME_PHOTOS = ['phai-thong', 'kruger-naledi', 'moepel']   # big left, top right, bottom right


def cover(stay_id, size):
    im = Image.open(os.path.join(STAYS, stay_id, '01.jpg')).convert('RGB')
    # Bias the crop slightly upward so rooflines and skies aren't cut off
    return ImageOps.fit(im, size, Image.LANCZOS, centering=(0.5, 0.42))


def save(im, name):
    # WhatsApp only shows previews for small images — stay well under 300 KB
    path = os.path.join(OUT, name)
    for q in (82, 74, 66):
        im.save(path, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(path) < 250_000:
            break
    print(name, os.path.getsize(path) // 1024, 'KB')


def home_image():
    canvas = Image.new('RGB', (W, H), (28, 46, 28))
    gap = 8
    left_w = 760
    right_w = W - left_w - gap
    half = (H - gap) // 2
    canvas.paste(cover(HOME_PHOTOS[0], (left_w, H)), (0, 0))
    canvas.paste(cover(HOME_PHOTOS[1], (right_w, half)), (left_w + gap, 0))
    canvas.paste(cover(HOME_PHOTOS[2], (right_w, H - half - gap)), (left_w + gap, half + gap))

    # Round transparent badge, made from the full-size logo for a crisp result
    logo = Image.open(os.path.join(SITE, 'logo.jpg')).convert('RGB').resize((250, 250), Image.LANCZOS)
    mask = Image.new('L', (1000, 1000), 0)
    ImageDraw.Draw(mask).ellipse([4, 4, 995, 995], fill=255)
    mask = mask.resize(logo.size, Image.LANCZOS)
    canvas.paste(logo, (28, H - logo.height - 28), mask)
    return canvas


os.makedirs(OUT, exist_ok=True)
for stay_id in sorted(os.listdir(STAYS)):
    if os.path.exists(os.path.join(STAYS, stay_id, '01.jpg')):
        save(cover(stay_id, (W, H)), f'{stay_id}.jpg')
save(home_image(), 'home.jpg')
