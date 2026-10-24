#!/usr/bin/env python3
"""Logoyu Android projesine uygular: ikonlar, uyarlanabilir ikon, açılış ekranı.
Kullanım: python3 tools/apply_branding.py <android/app/src/main/res> <logo.png>
"""
import os, subprocess, sys

try:
    from PIL import Image, ImageDraw
except ImportError:                      # derleme sunucusunda Pillow yoksa kur
    for extra in (['--break-system-packages'], ['--user'], []):
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--quiet', 'pillow'] + extra)
            break
        except Exception:
            continue
    from PIL import Image, ImageDraw

BG = (8, 10, 11, 255)            # logonun kendi zemin rengi (#080A0B)
BG_HEX = '#080A0B'
DENS = {'mdpi': 1.0, 'hdpi': 1.5, 'xhdpi': 2.0, 'xxhdpi': 3.0, 'xxxhdpi': 4.0}


def fit(logo, size):
    return logo.resize((size, size), Image.LANCZOS)


def legacy_square(logo, px):
    return fit(logo, px)


def legacy_round(logo, px):
    # Köşeli kare logo daireye kesilince çerçeve bozulur: logoyu küçültüp koyu daire üzerine ortala.
    inner = int(px * 0.80)
    small = fit(logo, inner).convert('RGBA')
    disc = Image.new('RGBA', (px, px), BG)
    disc.paste(small, ((px - inner) // 2, (px - inner) // 2), small)
    mask = Image.new('L', (px * 4, px * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, px * 4 - 1, px * 4 - 1), fill=255)
    mask = mask.resize((px, px), Image.LANCZOS)
    out = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    out.paste(disc, (0, 0), mask)
    return out


def adaptive_fg(logo, px):
    # 108dp tuval; güvenli alan ortadaki 66dp. Logo bu alanın içine sığacak şekilde küçültülür.
    canvas = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    inner = int(px * 0.66)
    l = fit(logo, inner)
    canvas.paste(l, ((px - inner) // 2, (px - inner) // 2), l)
    return canvas


def splash(logo, w, h):
    canvas = Image.new('RGBA', (w, h), BG)
    s = int(min(w, h) * 0.40)
    l = fit(logo, s)
    canvas.paste(l, ((w - s) // 2, (h - s) // 2), l)
    return canvas.convert('RGB')


def main(res, logo_path):
    logo = Image.open(logo_path).convert('RGBA')
    n = 0
    for d, k in DENS.items():
        folder = os.path.join(res, 'mipmap-' + d)
        os.makedirs(folder, exist_ok=True)
        legacy_square(logo, round(48 * k)).save(os.path.join(folder, 'ic_launcher.png'))
        legacy_round(logo, round(48 * k)).save(os.path.join(folder, 'ic_launcher_round.png'))
        adaptive_fg(logo, round(108 * k)).save(os.path.join(folder, 'ic_launcher_foreground.png'))
        n += 3
    vals = os.path.join(res, 'values')
    os.makedirs(vals, exist_ok=True)
    with open(os.path.join(vals, 'ic_launcher_background.xml'), 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
                '    <color name="ic_launcher_background">%s</color>\n</resources>\n' % BG_HEX)
    # Açılış ekranı: var olan splash.png dosyalarını aynı boyutta logolu olanlarla değiştir.
    for root, _dirs, files in os.walk(res):
        for fn in files:
            if fn == 'splash.png':
                p = os.path.join(root, fn)
                with Image.open(p) as old:
                    w, h = old.size
                splash(logo, w, h).save(p)
                n += 1
    print('Marka uygulandı: %d dosya' % n)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    res = sys.argv[1]
    if not os.path.isdir(res):
        # Android projesi henüz yoksa (ör. "cap add" öncesi) sessizce geç; senkronda tekrar çalışır.
        print('Android res klasörü yok, atlandı: ' + res)
        sys.exit(0)
    try:
        main(res, sys.argv[2])
    except Exception as e:                # ikon üretilemese de derleme sürsün
        print('UYARI: marka uygulanamadı: %s' % e)
        sys.exit(0)
