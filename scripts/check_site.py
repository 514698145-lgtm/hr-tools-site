"""Check generated static routes/resources and preview indexing boundaries."""
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.h1 = 0
        self.title = 0
        self.meta = {}
        self.links = []
        self.canonical = []
        self.images = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == 'h1': self.h1 += 1
        if tag == 'title': self.title += 1
        if tag == 'meta': self.meta[data.get('name')] = data.get('content')
        if tag == 'link' and data.get('rel') == 'canonical': self.canonical.append(data.get('href'))
        if tag in ('a', 'link') and data.get('href'): self.links.append(data['href'])
        if tag in ('img', 'script') and data.get('src'): self.links.append(data['src'])
        if tag == 'img': self.images.append(data)


def main():
    manifest = json.loads((DIST / 'route-manifest.json').read_text(encoding='utf-8'))
    errors=[]
    files=list(DIST.rglob('*.html'))
    for file in files:
        relative=file.relative_to(DIST).as_posix()
        route='/'+relative.removesuffix('index.html')
        doc=Document();doc.feed(file.read_text(encoding='utf-8'))
        if doc.h1 != 1: errors.append(f'{relative}: expected one H1')
        if doc.title != 1 or not doc.meta.get('description'): errors.append(f'{relative}: missing metadata')
        if doc.meta.get('viewport') != 'width=device-width, initial-scale=1': errors.append(f'{relative}: viewport missing')
        if manifest['mode'] == 'preview' and 'noindex' not in doc.meta.get('robots',''): errors.append(f'{relative}: preview must be noindex')
        if manifest['mode'] == 'production' and len(doc.canonical)!=1: errors.append(f'{relative}: canonical missing')
        for image in doc.images:
            if not image.get('alt'): errors.append(f'{relative}: image alt missing')
        for link in doc.links:
            parsed=urlparse(urljoin('https://local.test'+route,link))
            if parsed.netloc != 'local.test': continue
            target=DIST/unquote(parsed.path).lstrip('/')
            if not target.is_file() and not (target/'index.html').is_file(): errors.append(f'{relative}: broken link {link}')
    for bad in ('content','docs','.memory','.env','uploads-private','insights/editor-example'):
        if (DIST/bad).exists(): errors.append(f'private/draft path leaked: {bad}')
    report={'htmlPages':len(files),'mode':manifest['mode'],'errors':errors}
    (ROOT/'reports').mkdir(exist_ok=True)
    (ROOT/'reports/site-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
    return bool(errors)


if __name__=='__main__': raise SystemExit(main())
