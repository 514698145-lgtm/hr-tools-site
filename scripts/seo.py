"""CMS-authored SEO; static output only, no runtime administration API."""
import json
from html import escape
from urllib.parse import urlparse
try:
    from .check_content import parse_article
except ImportError:
    from check_content import parse_article

def validate_fields(data):
    for key in ('seoTitle','seoDescription','shareImage'):
        if key in data and not isinstance(data[key],str): raise ValueError(f'{key} must be text')
    if 'noindex' in data and not isinstance(data['noindex'],bool): raise ValueError('noindex must be boolean')
    image=data.get('shareImage','')
    if image and (not image.startswith('/media/') or '..' in image or '?' in image or '#' in image): raise ValueError('分享图必须是 /media/ 内的图片')

class SEO:
    def __init__(self,root,fallback=None):
        self.root=root
        self.settings,_=parse_article((root/'content/seo/site.md').read_text(encoding='utf-8'))
        self.site=(self.settings.get('siteUrl') or fallback or '').rstrip('/')
        if self.site:
            u=urlparse(self.site)
            if u.scheme!='https' or not u.netloc or u.username or u.query or u.fragment or u.path: raise ValueError('正式域名必须为不含路径的HTTPS网址')
        if not isinstance(self.settings.get('allowIndexing'),bool):raise ValueError('allowIndexing must be boolean')
        self.pages={};self.seen=set();self.entries=[]
        for file in (root/'content/seo/pages').glob('*.md'):
            data,_=parse_article(file.read_text(encoding='utf-8'));validate_fields(data)
            route=data.get('path','')
            if not route.startswith('/') or not route.endswith('/') or '//' in route or '..' in route or '?' in route or '#' in route:raise ValueError(f'{file.name}: invalid page path')
            if route in self.pages:raise ValueError('重复SEO页面路径: '+route)
            self.pages[route]=data
    def metadata(self,path,title,description,kind,article=None):
        values={**(article or {}),**self.pages.get(path,{})};validate_fields(values);self.seen.add(path)
        title=values.get('seoTitle') or title;description=values.get('seoDescription') or description
        full_title=title+' · '+self.settings.get('titleSuffix','HR工作站')
        index=bool(self.site and self.settings['allowIndexing'] and kind not in ('workspace','admin','feedback','404','redirect') and path!='/tools/date-calculator/' and not values.get('noindex',False))
        image=values.get('shareImage') or self.settings.get('shareImage','');validate_fields({'shareImage':image})
        if image and not (self.root/'public'/image.lstrip('/')).is_file():raise ValueError('分享图文件不存在: '+image)
        tags={'description':description,'robots':'index,follow' if index else 'noindex,follow','twitter:card':'summary_large_image' if image else 'summary','twitter:title':title,'twitter:description':description}
        html='<title>'+escape(full_title)+'</title>'+''.join(f'<meta name="{k}" content="{escape(v)}">' for k,v in tags.items())
        og={'og:title':title,'og:description':description,'og:type':'article' if kind in ('article','policy-detail') else 'website','og:site_name':self.settings.get('siteName','HR工作站'),'og:locale':'zh_CN'}
        if self.site:
            url=self.site+path;html+=f'<link rel="canonical" href="{escape(url)}">';og['og:url']=url
            if image:og['og:image']=self.site+image;html+=f'<meta name="twitter:image" content="{escape(self.site+image)}">'
        for key in ('google-site-verification','msvalidate.01','baidu-site-verification'):
            token=self.settings.get({'google-site-verification':'googleVerification','msvalidate.01':'bingVerification','baidu-site-verification':'baiduVerification'}[key])
            if token:html+=f'<meta name="{key}" content="{escape(str(token))}">'
        html+=''.join(f'<meta property="{k}" content="{escape(v)}">' for k,v in og.items())
        self.entries.append({'path':path,'title':full_title,'description':description,'indexable':index,'noindex':values.get('noindex',False),'shareImage':values.get('shareImage',''),'lastmod':str((article or {}).get('updatedAt') or (article or {}).get('publishedAt') or (article or {}).get('checkedAt') or '')})
        return html
    def finish(self,dist):
        unknown=self.pages.keys()-self.seen
        if unknown:raise ValueError('SEO配置指向不存在的页面: '+', '.join(unknown))
        if self.site:
            urls=''.join('<url><loc>'+escape(self.site+x['path'])+'</loc>'+('<lastmod>'+escape(x['lastmod'])+'</lastmod>' if x['lastmod'] else '')+'</url>' for x in self.entries if x['indexable'])
            (dist/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>',encoding='utf-8')
        robots='User-agent: *\nAllow: /\nSitemap: '+self.site+'/sitemap.xml\n' if self.site and self.settings['allowIndexing'] else 'User-agent: *\nDisallow: /\n'
        (dist/'robots.txt').write_text(robots,encoding='utf-8')
        warnings=[]
        for x in self.entries:
            if len(x['title'])>70:warnings.append(x['path']+'：搜索标题较长')
            if len(x['description'])>160:warnings.append(x['path']+'：搜索描述较长')
        titles=[x['title'] for x in self.entries]
        if len(titles)!=len(set(titles)):warnings.append('存在重复搜索标题，请检查页面SEO')
        (self.root/'reports').mkdir(exist_ok=True)
        (self.root/'reports/seo-report.json').write_text(json.dumps({'siteUrl':self.site,'indexablePages':sum(x['indexable'] for x in self.entries),'warnings':warnings,'pages':self.entries},ensure_ascii=False,indent=2),encoding='utf-8')
