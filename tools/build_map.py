"""Build the illustrated Marloth Park map (images/map/marloth-park.svg).

Road, river and reserve shapes come from OpenStreetMap (© OpenStreetMap contributors, ODbL).
The trimmed extract lives in tools/map/marloth-osm.json; pass a fresh Overpass download as the
first argument to refresh it:

    python -I tools/build_map.py [overpass.json]

The bounds below must match MAP.bounds in assets/js/data.js — the pins are placed with the same
projection.
"""
import json, math, os, sys
from shapely.geometry import LineString, Polygon, box, MultiPolygon, GeometryCollection
from shapely.ops import polygonize, unary_union, linemerge

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRACT = os.path.join(ROOT, 'tools', 'map', 'marloth-osm.json')
OUT = os.path.join(ROOT, 'images', 'map', 'marloth-park.svg')

WEST, EAST, NORTH, SOUTH = 31.748, 31.822, -25.326, -25.404
LAT0 = (NORTH + SOUTH) / 2
K = 1000 / ((EAST - WEST) * math.cos(math.radians(LAT0)))
W = 1000
H = round((NORTH - SOUTH) * K, 1)
ROAD_TYPES = {'residential', 'tertiary', 'unclassified', 'service', 'secondary', 'primary'}


def xy(lat, lon):
    return ((lon - WEST) * math.cos(math.radians(LAT0)) * K, (NORTH - lat) * K)


def load():
    src = sys.argv[1] if len(sys.argv) > 1 else EXTRACT
    data = json.load(open(src, encoding='utf-8'))
    if src != EXTRACT:  # trim a raw Overpass download down to what the map uses
        keep = []
        for e in data['elements']:
            t = e.get('tags', {})
            if e['type'] == 'node':
                continue
            if e['type'] == 'way' and t.get('highway') not in ROAD_TYPES and not (t.get('waterway') or t.get('natural') == 'water'):
                continue
            if e['type'] == 'relation' and t.get('name') not in ('Kruger National Park', 'Lionspruit Nature Reserve', 'Crocodile River'):
                continue
            for g in [e] + e.get('members', []):
                if 'geometry' in g:
                    g['geometry'] = [{'lat': round(p['lat'], 6), 'lon': round(p['lon'], 6)} for p in g['geometry']]
                g.pop('nodes', None); g.pop('bounds', None)
            keep.append({k: v for k, v in e.items() if k in ('type', 'id', 'tags', 'geometry', 'members')})
        os.makedirs(os.path.dirname(EXTRACT), exist_ok=True)
        json.dump({'elements': keep}, open(EXTRACT, 'w', encoding='utf-8'), separators=(',', ':'))
        data = {'elements': keep}
    return data['elements']


def line(geom):
    return LineString([xy(p['lat'], p['lon']) for p in geom])


FRAME = box(-20, -20, W + 20, H + 20)


def area(rel):
    lines = [line(m['geometry']) for m in rel.get('members', []) if m.get('geometry') and m.get('role') in ('outer', '')]
    polys = list(polygonize(unary_union(lines)))
    return unary_union(polys).intersection(FRAME) if polys else None


def d_of(geom, closed=False):
    out = []
    geoms = getattr(geom, 'geoms', [geom])
    for g in geoms:
        if g.is_empty:
            continue
        if isinstance(g, Polygon):
            for ring in [g.exterior, *g.interiors]:
                c = list(ring.coords)
                out.append('M' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in c[:-1]) + 'Z')
        elif isinstance(g, LineString):
            out.append('M' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in g.coords))
        elif hasattr(g, 'geoms'):
            out.append(d_of(g))
    return ''.join(out)


def short(name):
    for suf in (' Street', ' Avenue', ' Road'):
        if name.endswith(suf):
            return name[: -len(suf)]
    return name


def main():
    els = load()
    rel = {e['tags'].get('name'): e for e in els if e['type'] == 'relation'}
    kruger = area(rel['Kruger National Park'])
    lion = area(rel['Lionspruit Nature Reserve'])

    rivers, water = [], []
    for e in els:
        t = e.get('tags', {})
        if e['type'] == 'way' and t.get('waterway') == 'river' and e.get('geometry'):
            rivers.append(line(e['geometry']))
        elif e['type'] == 'way' and t.get('natural') == 'water' and e.get('geometry') and len(e['geometry']) > 3:
            pts = [xy(p['lat'], p['lon']) for p in e['geometry']]
            p = Polygon(pts).buffer(0)
            if p.intersects(FRAME):
                water.append(p.intersection(FRAME))
    for m in rel['Crocodile River'].get('members', []):
        if m.get('geometry'):
            rivers.append(line(m['geometry']))
    river = unary_union(rivers).intersection(FRAME).simplify(0.6)

    roads = {'major': [], 'minor': [], 'service': []}
    named = {}
    for e in els:
        t = e.get('tags', {})
        if e['type'] != 'way' or t.get('highway') not in ROAD_TYPES or not e.get('geometry'):
            continue
        g = line(e['geometry']).intersection(FRAME)
        if g.is_empty:
            continue
        g = g.simplify(0.4)
        kind = 'major' if t['highway'] in ('tertiary', 'secondary', 'primary') else 'service' if t['highway'] == 'service' and 'name' not in t else 'minor'
        roads[kind].append(g)
        if 'name' in t:
            named.setdefault(t['name'], []).append(g)

    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" class="mp-svg" role="img" aria-labelledby="mpSvgTitle">',
           '<title id="mpSvgTitle">Illustrated street map of Marloth Park between the Kruger National Park and Lionspruit Nature Reserve</title>',
           '<defs><pattern id="mpBush" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1.3" fill="#9fb27e" opacity=".55"/><circle cx="10" cy="10" r="1.1" fill="#9fb27e" opacity=".45"/></pattern></defs>',
           f'<rect width="{W}" height="{H}" fill="#efe4cc"/>']
    if kruger:
        svg.append(f'<path d="{d_of(kruger.simplify(0.6))}" fill="#d9dfc0"/>')
        svg.append(f'<path d="{d_of(kruger.simplify(0.6))}" fill="url(#mpBush)" opacity=".7"/>')
    if lion:
        svg.append(f'<path d="{d_of(lion.simplify(0.6))}" fill="#c4d1a1" stroke="#a9bb83" stroke-width="1.2"/>')
        svg.append(f'<path d="{d_of(lion.simplify(0.6))}" fill="url(#mpBush)"/>')
    if water:
        svg.append(f'<path d="{d_of(unary_union(water).simplify(0.5))}" fill="#a9cbe0"/>')
    svg.append(f'<path d="{d_of(river)}" fill="none" stroke="#a9cbe0" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>')
    svg.append(f'<path d="{d_of(river)}" fill="none" stroke="#8db8d3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>')

    # grid (A–J across, 1–n down) like a printed street map
    cell = W / 10
    rows = math.ceil(H / cell)
    grid = [f'M{i * cell:.1f},0V{H}' for i in range(1, 10)] + [f'M0,{j * cell:.1f}H{W}' for j in range(1, rows)]
    svg.append(f'<path d="{"".join(grid)}" stroke="#7a6440" stroke-opacity=".10" stroke-width="1" stroke-dasharray="3 4" fill="none"/>')

    casing = {'major': ('#d6b47f', 11), 'minor': ('#d8c7a4', 8.4), 'service': ('#ddcfb2', 5)}
    fill = {'major': ('#fff4dd', 8), 'minor': ('#fffdf7', 6), 'service': ('#fffdf7', 3)}
    for kind in ('service', 'minor', 'major'):
        if roads[kind]:
            c, w = casing[kind]
            svg.append(f'<path d="{d_of(unary_union(roads[kind]))}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')
    for kind in ('service', 'minor', 'major'):
        if roads[kind]:
            c, w = fill[kind]
            svg.append(f'<path d="{d_of(unary_union(roads[kind]))}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')

    # street names along each street's longest stretch
    labels, defs = [], []
    for i, (name, gs) in enumerate(sorted(named.items())):
        merged = linemerge(unary_union(gs)) if len(gs) > 1 else gs[0]
        parts = [g for g in getattr(merged, 'geoms', [merged]) if isinstance(g, LineString)]
        if not parts:
            continue
        g = max(parts, key=lambda p: p.length)
        text = short(name).upper()
        major = name.startswith('Olifant')
        fs = 6.4 if major else 4.6
        need = len(text) * fs * 0.66 + 4
        if g.length < need * 0.75:
            continue
        g = g.simplify(1.5)
        c = list(g.coords)
        if c[0][0] > c[-1][0]:
            c.reverse()
        pid = f'mpS{i}'
        defs.append(f'<path id="{pid}" d="M' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in c) + '"/>')
        reps = 1 if not major else max(1, int(g.length // 260))
        for r in range(reps):
            off = (r + 0.5) / reps * 100
            labels.append(f'<text class="mp-st{" mp-st-major" if major else ""}" font-size="{fs}" dy="{fs * 0.35:.2f}"><textPath href="#{pid}" startOffset="{off:.0f}%" text-anchor="middle">{text}</textPath></text>')
    svg.append('<defs>' + ''.join(defs) + '</defs>')
    svg.append('<g fill="#6d5f49" font-family="Inter, Arial, sans-serif" font-weight="600" letter-spacing=".4">' + ''.join(labels) + '</g>')

    # area names
    def area_label(text, lat, lon, size, color, rot=0, cls='mp-area'):
        x, y = xy(lat, lon)
        lines_ = text.split('|')
        spans = ''.join(f'<tspan x="{x:.1f}" dy="{0 if j == 0 else size * 1.15:.1f}">{t}</tspan>' for j, t in enumerate(lines_))
        tr = f' transform="rotate({rot} {x:.1f} {y:.1f})"' if rot else ''
        return f'<text class="{cls}" x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" text-anchor="middle"{tr}>{spans}</text>'
    svg.append('<g font-family="Playfair Display, Georgia, serif" font-weight="700" letter-spacing="2">'
               + area_label('KRUGER NATIONAL PARK', -25.3290, 31.7895, 17, '#7d8a5a')
               + area_label('KRUGER|NATIONAL PARK', -25.3700, 31.7505, 13, '#7d8a5a', -90)
               + area_label('LIONSPRUIT|NATURE RESERVE', -25.3690, 31.7840, 17, '#56693f')
               + '</g>')
    svg.append('<g font-family="Inter, Arial, sans-serif" font-style="italic" font-weight="500" letter-spacing="1">'
               + area_label('Crocodile River', -25.3352, 31.8160, 7.5, '#4f86a8', 62)
               + area_label('Crocodile River', -25.3540, 31.7556, 7.5, '#4f86a8', 84)
               + '</g>')

    # grid letters / numbers
    gl = []
    for i in range(10):
        gl.append(f'<text x="{i * cell + cell / 2:.1f}" y="12" text-anchor="middle">{"ABCDEFGHIJ"[i]}</text>')
    for j in range(rows):
        gl.append(f'<text x="7" y="{j * cell + cell / 2 + 3:.1f}" text-anchor="middle">{j + 1}</text>')
    svg.append('<g font-family="Playfair Display, Georgia, serif" font-weight="700" font-size="10" fill="#8a7550" opacity=".75">' + ''.join(gl) + '</g>')
    svg.append(f'<text x="{W - 6}" y="{H - 6}" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="6.5" fill="#8a7a60">Map data © OpenStreetMap contributors</text>')
    svg.append('</svg>')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write('\n'.join(svg))
    print(f'wrote {OUT}: {os.path.getsize(OUT) // 1024} KB, {W}x{H}, {len(labels)} labels')


if __name__ == '__main__':
    main()
