"""Package the current editable files for static hosting; never alter originals."""
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
from template_fonts import normalize_library


def add_file(archive, source, name):
    # Checkout timestamps vary on every runner. Identical contents must produce
    # identical bundles, otherwise unchanged fonts are uploaded every release.
    item = ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
    item.compress_type = ZIP_DEFLATED
    item.external_attr = 0o100644 << 16
    archive.writestr(item, source.read_bytes())


def build_template_packs(root):
    normalize_library(root)
    public = root / 'public'
    font_files=sorted((public/'downloads/template-fonts').glob('*'))
    font_files=[p for p in font_files if p.suffix in ('.otf','.txt')]
    with ZipFile(public/'downloads/template-fonts/font-package.zip','w',ZIP_DEFLATED) as archive:
        for font in font_files:add_file(archive,font,font.name)
    catalog = json.loads((public / 'data/hr-templates.json').read_text(encoding='utf-8'))
    manifest = {t['id']: t for t in json.loads((public / 'data/hr-template-manifest.json').read_text(encoding='utf-8'))}
    folder = public / 'downloads/hr-templates'
    entries = []
    for t in catalog:
        item = manifest[t['id']]
        source = (public / item['download'].lstrip('/')).resolve()
        if not source.is_relative_to(folder.resolve()) or not source.is_file():
            raise ValueError(f'Missing or unsafe template file: {t["id"]}')
        if any(c in t['title'] + t['category'] + t['categoryId'] for c in '/\\'):
            raise ValueError(f'Unsafe template label: {t["id"]}')
        entries.append((t, source, t['title'] + source.suffix))
    groups = {t['categoryId'] for t in catalog}
    for category in sorted(groups):
        with ZipFile(folder / (category + '-collection.zip'), 'w', ZIP_DEFLATED) as archive:
            for font in font_files:add_file(archive,font,'字体与授权/'+font.name)
            for t, source, name in entries:
                if t['categoryId'] == category:
                    add_file(archive,source,name)
    with ZipFile(folder / 'all-templates.zip', 'w', ZIP_DEFLATED) as archive:
        for font in font_files:add_file(archive,font,'字体与授权/'+font.name)
        for t, source, name in entries:
            add_file(archive,source,t['category'] + '/' + name)
