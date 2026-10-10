"""Create renamed OFL web subsets; preserve complete source Unicode coverage.

Run explicitly when changing font sources. Ordinary content additions are covered
by lazily loaded remainder subsets, so CMS publishing needs no font rebuild.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/fonts/hr-sans'
OUT.mkdir(parents=True, exist_ok=True)
sources = {
    400: ROOT / 'public/downloads/template-fonts/NotoSansCJKsc-Regular.otf',
    500: ROOT / '.local/tools/NotoSansCJKsc-Medium.otf',
}
common = set(range(32, 256))
for folder in ['public/assets', 'content', 'config', 'scripts']:
    for p in (ROOT / folder).rglob('*'):
        if p.suffix in ('.js', '.css', '.md', '.json', '.py', '.mjs'):
            common.update(map(ord, p.read_text(encoding='utf-8-sig')))

def ranges(values):
    runs = []
    for cp in sorted(values):
        if runs and cp == runs[-1][1] + 1:
            runs[-1][1] = cp
        else:
            runs.append([cp, cp])
    return ','.join(f'U+{a:X}' + (f'-{b:X}' if b != a else '') for a, b in runs)

rules = []
report = []
for weight, source in sources.items():
    original = TTFont(source)
    all_chars = set(original.getBestCmap())
    original.close()
    primary = all_chars & common
    rest = sorted(all_chars - primary)
    groups = [sorted(primary)] + [rest[i:i + 2048] for i in range(0, len(rest), 2048)]
    covered = set()
    for i, chars in enumerate(groups):
        font = TTFont(source)
        options = subset.Options()
        options.name_IDs = ['*']
        options.name_legacy = True
        options.name_languages = ['*']
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=chars)
        sub.subset(font)
        style = 'Regular' if weight == 400 else 'Medium'
        for record in font['name'].names:
            replacements = {1: 'HR Workspace Sans', 2: style, 3: f'HRWorkspaceSans-{style}-subset-{i}', 4: f'HR Workspace Sans {style}', 6: f'HRWorkspaceSans-{style}', 16: 'HR Workspace Sans', 17: style}
            if record.nameID in replacements:
                record.string = replacements[record.nameID].encode(record.getEncoding())
        if 'CFF ' in font:
            cff = font['CFF '].cff
            cff.fontNames = [f'HRWorkspaceSans-{style}']
            top = cff.topDictIndex[0]
            top.FamilyName = 'HR Workspace Sans'
            top.FullName = f'HR Workspace Sans {style}'
        name = f'hr-sans-{weight}-{i:02}.woff2'
        font.flavor = 'woff2'
        font.save(OUT / name)
        actual = set(font.getBestCmap())
        assert set(chars).issubset(actual), (name, sorted(set(chars)-actual))
        assert not covered.intersection(chars)
        covered.update(chars)
        rules.append(f'@font-face{{font-family:"HR Workspace Sans";font-style:normal;font-weight:{weight};font-display:swap;src:url("/fonts/hr-sans/{name}") format("woff2");unicode-range:{ranges(chars)}}}')
        print(name, len(chars), (OUT / name).stat().st_size, flush=True)
        font.close()
    assert covered == all_chars
    report.append({'weight': weight, 'source': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'unicodeCount': len(covered), 'commonCount': len(primary), 'parts': len(groups)})
shutil.copyfile(ROOT / 'public/downloads/template-fonts/LICENSE.txt', OUT / 'LICENSE.txt')
(OUT / 'fonts.css').write_text('\n'.join(rules) + '\n', encoding='utf-8')
(OUT / 'manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
