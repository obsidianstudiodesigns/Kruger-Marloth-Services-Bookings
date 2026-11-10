"""Resize the owner's source photos into web-ready images for the site.

Usage (from the site folder):
  python -I tools/process_images.py "kruger marloth services and bookings data files" .
Writes images/stays/<slug>/NN.jpg, thumb/NN.jpg, flyer.jpg, images/services/*.jpg
and images/manifest.json (photo lists per stay). Re-run after adding photos,
then: python tools/make_og_images.py && node tools/build-pages.cjs

Screenshots of chats/notes are excluded on purpose: several contain guest
details, bank details or Wi-Fi passwords that must never be published.
"""
import json, os, sys
from PIL import Image, ImageOps

SRC, SITE = sys.argv[1], sys.argv[2]
ACC = os.path.join(SRC, '01 - Accommodation Listings')
SVC = os.path.join(SRC, '02 - Service Directories')

# slug: (folder, cover — or a list of first photos in order, flyer, excluded files,
#        files to trim black bars from[, extra photos from other folders])
STAYS = {
  'tarentaal':        ('2794 Tarentaal@Marloth', 'IMG-20261021-WA0310.jpg', 'IMG-20261021-WA0314.jpg', [], []),
  'afrika-safari':    ('Afrika Safari Gastehuis', 'IMG-20260612-WA0204.jpg', None, [], []),
  'bosgenade':        ('Bosgenade', 'Screenshot_20260724_070336_Gallery.jpg', 'file_00000000d7ec71f491180b0d612f6511.png', [], []),
  'buffalo-chalets':  ('Buffalo Chalets', 'IMG-20250923-WA0360.jpg', None, [], []),
  'buffalo-zebra':    ('Buffalo Chalets/Zebra', 'IMG-20260505-WA0070.jpg', None, ['Screenshot_20261106_071247_WhatsApp.jpg', 'Screenshot_20261106_071256_WhatsApp.jpg'], []),
  'buffalo-vlakvark': ('Buffalo Chalets/Vlakvark', 'IMG-20260505-WA0088.jpg', None, ['Screenshot_20261106_080112_WhatsApp.jpg', 'Screenshot_20261106_080120_WhatsApp.jpg'], []),
  # Buffel's own photos first; the rest of its folder repeats Vlakvark's photos
  'buffalo-buffel':   ('Buffalo Chalets/Buffalo uniy',
                       ['IMG-20260505-WA0104(1).jpg', 'IMG-20260505-WA0107.jpg', 'IMG-20260505-WA0102(1).jpg',
                        'IMG-20260505-WA0105(1).jpg', 'IMG-20260505-WA0103(1).jpg'], None,
                       ['IMG-20260505-WA0107(1).jpg', 'Screenshot_20261106_072228_WhatsApp.jpg',
                        'Screenshot_20261106_072235_WhatsApp.jpg', 'Screenshot_20261106_072243_WhatsApp.jpg'], []),
  'bushfire-mongoose':('Bushfire Mongoose@Marloth', 'IMG-20260920-WA0084.jpg', None, [], []),
  'bushveld-paradise':('Bushveld paradise', 'IMG-20261013-WA0174.jpg', None,
                       ['Screenshot_20261028_090649_WhatsApp.jpg', 'Screenshot_20261028_090653_WhatsApp.jpg',
                        'Screenshot_20261028_090703_WhatsApp.jpg', 'Screenshot_20261028_090711_WhatsApp.jpg'], []),
  'cheetah':          ('Cheetah@Marloth', 'IMG-20260515-WA0074.jpg', 'file_000000006a2071f49392460443486b3f.png',
                       ['file_000000006a2071f49392460443486b3f(1).png', 'IMG-20261028-WA0047(1).jpg',
                        'IMG-20261028-WA0048(1).jpg', 'IMG-20261028-WA0060(1).jpg'], []),
  # Doringpoort's photos are screenshots of its website; the text panels are left out
  'doringpoort':      ('Doringpoort Safari Lodge', 'Screenshot_20261107_082159_Gallery.jpg', None, [], [],
                       ['Doringpoort Safari Lodge/Doringpoort luxury holiday home/Screenshot_20261107_065748_Gallery.jpg',
                        'Doringpoort Safari Lodge/Doringpoort luxury holiday home/Screenshot_20261107_065955_Gallery.jpg',
                        'Doringpoort Safari Lodge/Apiesdoring/Screenshot_20261107_080639_Gallery.jpg',
                        'Doringpoort Safari Lodge/Soetdoring/Screenshot_20261107_081322_Gallery.jpg',
                        'Doringpoort Safari Lodge/Lemoendoring/Screenshot_20261107_070757_Gallery.jpg',
                        'Doringpoort Safari Lodge/Delgoadoring/Screenshot_20261107_081846_Gallery.jpg']),
  'doringpoort-luxury-home': ('Doringpoort Safari Lodge/Doringpoort luxury holiday home', 'Screenshot_20261107_065748_Gallery.jpg', None,
                       ['Screenshot_20261107_065948_Gallery.jpg', 'Screenshot_20261107_070023_Gallery.jpg', 'Screenshot_20261107_070030_Gallery.jpg'], []),
  'doringpoort-apiesdoring': ('Doringpoort Safari Lodge/Apiesdoring', 'Screenshot_20261107_080639_Gallery.jpg', None,
                       ['Screenshot_20261107_080700_Gallery.jpg', 'Screenshot_20261107_080706_Gallery.jpg', 'Screenshot_20261107_080710_Gallery.jpg'], []),
  'doringpoort-soetdoring': ('Doringpoort Safari Lodge/Soetdoring', 'Screenshot_20261107_081322_Gallery.jpg', None,
                       ['Screenshot_20261107_081255_Gallery.jpg', 'Screenshot_20261107_081300_Gallery.jpg', 'Screenshot_20261107_081313_Gallery.jpg'], []),
  'doringpoort-lemoentjiedoring': ('Doringpoort Safari Lodge/Lemoendoring', 'Screenshot_20261107_070743_Gallery.jpg', None,
                       ['Screenshot_20261107_070818_Gallery.jpg', 'Screenshot_20261107_070823_Gallery.jpg', 'Screenshot_20261107_070828_Gallery.jpg'], []),
  'doringpoort-delagoadoring': ('Doringpoort Safari Lodge/Delgoadoring', 'Screenshot_20261107_081846_Gallery.jpg', None,
                       ['Screenshot_20261107_081856_Gallery.jpg', 'Screenshot_20261107_081900_Gallery.jpg', 'Screenshot_20261107_081909_Gallery.jpg'], []),
  'elephant-bush-house': ('Elephant Bush House, Butterfly street', 'IMG-20260606-WA0101.jpg', 'file_00000000f20871fb848f4d8dcfac3219.png', ['IMG-20260818-WA0114.jpg'], []),
  'genet-house':      ('Genet House', 'IMG-20261028-WA0104.jpg', None, ['Screenshot_20261028_212250_WhatsApp.jpg'], []),
  'indabush':         ('Indabush', 'IMG-20260313-WA0039.jpg', 'IMG-20260815-WA0090.jpg', ['IMG-20260815-WA0090(1).jpg'], []),
  'kruger-naledi':    ('Kruger Naledi', 'IMG-20260818-WA0310.jpg', 'file_00000000b9b081f68da97969255d64e2.png', ['IMG-20260820-WA0079.jpg'], []),
  'mamba-house':      ('Mamba house', 'IMG-20260924-WA0075.jpg', None,
                       ['IMG-20260924-WA0045.jpg', 'IMG-20260924-WA0046.jpg', 'IMG-20260924-WA0055.jpg',
                        'IMG-20260924-WA0058.jpg', 'IMG-20260924-WA0059.jpg', 'IMG-20260924-WA0068.jpg',
                        'IMG-20260924-WA0069.jpg', 'IMG-20260924-WA0070.jpg',  # router label shows the Wi-Fi password
                        'Screenshot_20261029_155619_Samsung Notes.jpg'], []),
  'melmar-estate':    ('Melmar Estate', 'FB_IMG_1779909924637.jpg', 'FB_IMG_1779909914677.jpg', [], []),
  'moepel':           ('Moepel 187', 'IMG-20260727-WA0055.jpg', 'file_00000000d3b081f4ad7571022f7dab76.png', ['file_00000000d3b081f4ad7571022f7dab76(1).png'], []),
  'my-africa-chalet': ('My Africa Chalet', 'Screenshot_20260911_105518_Gallery.jpg', 'file_0000000085b48211b56d480859fd890c.png', [], []),
  'phai-thong':       ('Phai Thong Hide Away', 'IMG-20260812-WA0269.jpg', 'file_00000000c1a0824386393e7cec6fc66d.png', ['IMG-20260812-WA0257.jpg'], []),
  'porcupine':        ('Porcupine@Marloth', 'IMG-20260828-WA0229.jpg', 'file_000000003ab88210a3576cddd350b5a9.png', [], ['IMG-20260828-WA0221.jpg', 'IMG-20260828-WA0223.jpg']),
  'salamah':          ('Salamah', 'IMG-20260721-WA0368.jpg', None, ['Screenshot_20260724_072322_WhatsApp.jpg', 'Screenshot_20260724_072329_WhatsApp.jpg'], []),
  'shingwedzi':       ('Shingwedzi@Marloth', 'Screenshot_20250801_134330_Chrome.jpg', None, [], 'ALL_SCREENSHOTS'),
  'waterpeer':        ('Waterpeer@Marloth', 'IMG-20250827-WA0182(2).jpg', 'file_00000000c5a48243a19912c4aae79e30.png', ['IMG-20250827-WA0180(3).jpg'], []),
  'wild-about-shawu': ('Wild about Shawu', 'IMG-20261029-WA0190.jpg', 'IMG-20260912-WA0025.jpg', ['Screenshot_20261029_231146_Samsung Notes.jpg'], []),
}

# slug: (folder, file, crop box or None)
SERVICES = {
  'one-call-maintenance': ('Handyman & Maintenance Services', 'file_00000000d4d881f58a326e258eef786c.png', None),
  'de-langen-plumbing':   ('Handyman & Maintenance Services', 'IMG-20260916-WA0459.jpg', None),
  'lappies-handyman':     ('Handyman & Maintenance Services', 'IMG-20260907-WA0166.jpg', None),
  'bc-electrical':        ('Handyman & Maintenance Services', 'IMG-20260828-WA0267(1).jpg', None),
  'kruger-marloth-laundry': ('Laundry Services', 'file_00000000efec81f485344fbf73623b9c.png', None),
  'marloth-photography':  ('Photographers', 'file_000000008b708209b7fee8242205e055.png', None),
  'afrika-safari-drives': ('Game Drives and Sunset Drives/Afrika Safari Drives', 'file_0000000002b081fa964da065062aaf9e.png', None),
  'bushwise-safaris':     ('Game Drives and Sunset Drives/Bushwise Safari', 'FB_IMG_1793180340060.jpg', None),
  'sunset-adventure':     ('Game Drives and Sunset Drives/Sunset Adventure Travel', 'IMG-20261028-WA0132.jpg', None),
  # Top of the flyer only: the rest advertises a July special that has ended
  'bushveld-horse-safaris': ('Activities (Horse Riding, Game Drives, etc.)/Bushveld Horse Safaris', 'IMG-20260713-WA0012.jpg', (0, 0, 821, 285)),
  'wild-wheels':          ('Shuttle Services', 'IMG-20260917-WA0011(1).jpg', None),
  'busy-bee-shuttle':     ('Shuttle Services', 'IMG-20261016-WA0076.jpg', None),
  'giraffe-pub':          ('Restaurants/Girraffe pub and grill', 'Screenshot_20261029_162936_Facebook.jpg', (0, 866, 1080, 1474)),
  'phai-tong-thai':       ('Restaurants/PHAI Tong', 'FB_IMG_1793283350601.jpg', None),
  'shawus-boma':          ('Restaurants/Shawu Boma Komatipoort', 'FB_IMG_1793283053775.jpg', None),
  'eat-inn-foods':        ('Private Chefs/Eat Inn', 'IMG-20261029-WA0121.jpg', None),
  'clean-living':         ('House Cleaning Services', 'IMG-20261029-WA0118.jpg', None),
  'marloth-medical':      ('Emergency services/Dr', 'IMG-20261028-WA0101.jpg', None),
  'field-security':       ('Emergency services/Field', 'IMG-20261028-WA0082.jpg', None),
  'juans-reptile-rescue': ('Emergency services', 'IMG-20261028-WA0081.jpg', None),
  'ingwe':                ('Shops/Ingwe', 'FB_IMG_1793283267700.jpg', None),
  'waterkloof-gas':       ('../04 - Business and Legal Details', 'IMG-20261028-WA0014.jpg', None),
  'africa-breeze':        ('Spa_s/Africa Breeze', 'IMG-20261028-WA0133.jpg', None),
  'tourist-info-centre':  ('../Tourist Information Centre', 'IMG-20260917-WA0008.jpg', None),
}


def load(path, trim=False):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    if trim:
        # Remove black letterbox bars from phone screenshots
        mask = im.convert('L').point(lambda v: 255 if v > 18 else 0)
        box = mask.getbbox()
        if box:
            im = im.crop(box)
    return im


# Screenshots taken inside a gallery viewer come out dimmed by its dark overlay
DIMMED = ('doringpoort',)


def lift(im):
    # Stretch the tones so the brightest 0.5% are white again (at most 1.8x)
    hist = im.convert('L').histogram()
    total, acc, top = sum(hist), 0, 255
    for v in range(255, -1, -1):
        acc += hist[v]
        if acc >= total * 0.005:
            top = v
            break
    f = min(1.8, 245 / max(top, 1))
    return im.point(lambda x: min(255, int(x * f)))


def save(im, path, size, quality):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im = im.copy()
    im.thumbnail((size, size), Image.LANCZOS)
    im.save(path, 'JPEG', quality=quality, optimize=True, progressive=True)
    return im.size


manifest = {}
for slug, (folder, cover, flyer, excluded, trim, *extra) in STAYS.items():
    d = os.path.join(ACC, folder)
    files = sorted(f for f in os.listdir(d) if f.lower().endswith(('.jpg', '.jpeg', '.png')))
    # Notes screenshots hold prices for us, not photos for guests
    photos = [f for f in files if f != flyer and f not in excluded and not f.startswith('file_') and 'Samsung Notes' not in f]
    first = cover if isinstance(cover, list) else [cover]   # a list fixes the order of the first photos
    for f in reversed(first):
        photos.remove(f)
        photos.insert(0, f)
    # extra: photos borrowed from other folders, e.g. a property's gallery made from its units
    photos += [os.path.relpath(os.path.join(ACC, x), d) for x in (extra[0] if extra else [])]
    out = os.path.join(SITE, 'images', 'stays', slug)
    entries = []
    for i, f in enumerate(photos, 1):
        do_trim = trim == 'ALL_SCREENSHOTS' and f.startswith('Screenshot') or f in (trim if isinstance(trim, list) else [])
        im = load(os.path.join(d, f), do_trim)
        if slug.startswith(DIMMED):
            im = lift(im)
        name = f'{i:02d}.jpg'
        w, h = save(im, os.path.join(out, name), 1600, 80)
        save(im, os.path.join(out, 'thumb', name), 720, 74)
        entries.append({'src': name, 'w': w, 'h': h})
    entry = {'photos': entries}
    if flyer:
        save(load(os.path.join(d, flyer)), os.path.join(out, 'flyer.jpg'), 1600, 82)
        entry['flyer'] = 'flyer.jpg'
    manifest[slug] = entry
    print(slug, len(entries), 'photos', 'flyer' if flyer else '')

for slug, (folder, f, crop) in SERVICES.items():
    im = load(os.path.join(SVC, folder, f))
    if crop:
        im = im.crop(crop)
    save(im, os.path.join(SITE, 'images', 'services', slug + '.jpg'), 1400, 82)
    print('service', slug)

with open(os.path.join(SITE, 'images', 'manifest.json'), 'w') as fh:
    json.dump(manifest, fh, indent=1)
