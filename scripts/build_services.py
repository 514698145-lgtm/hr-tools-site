"""CMS-maintained service introduction with explicit, user-initiated contact links."""
import re
from html import escape as e
from urllib.parse import urlparse
from markdown_it import MarkdownIt
from check_content import parse_article
from disclaimers import notice


def build_services(root, page, production=False):
    data, body = parse_article((root / 'content/enterprise-services.md').read_text(encoding='utf-8-sig'))
    for key in ['title', 'description', 'headline', 'intro', 'contactEmail', 'officialUrl']:
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError('企业服务缺少字段: ' + key)
    if not re.fullmatch(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', data['contactEmail']):
        raise ValueError('企业服务联系邮箱无效')
    def https(url):
        parsed = urlparse(url)
        if parsed.scheme != 'https' or not parsed.netloc:
            raise ValueError('企业服务链接需为有效 HTTPS 网址')
        return e(url)
    official = https(data['officialUrl'])
    form_url = data.get('consultationFormUrl', '').strip()
    phone = str(data.get('contactPhone', '')).strip()
    if production and (not data.get('launchConfirmed') or not form_url or not phone or any(not item.get('source') for item in data['services'])):
        raise ValueError('上线前请向用户确认咨询表单链接、五项官网介绍链接、联系电话和邮箱；填齐后设置 launchConfirmed。')
    consultation_href = https(form_url) if form_url else '#service-contact'
    consultation_target = ' target="_blank" rel="noopener noreferrer"' if form_url else ' data-open-service-contact' 
    cards = []
    ids = set()
    for i, item in enumerate(data['services'], 1):
        if not re.fullmatch(r'[a-z][a-z0-9-]*', item['id']) or item['id'] in ids:
            raise ValueError('服务标识需唯一且为英文短标识')
        ids.add(item['id'])
        tags = ''.join('<li>' + e(tag) + '</li>' for tag in item['tags'])
        intro_link = f'<a href="{https(item["source"])}" target="_blank" rel="noopener noreferrer">官网介绍 ↗</a>'  if item.get('source') else ''
        cards.append(f'<article class="enterprise-card" id="{item["id"]}"><div class="service-title"><span class="service-number">{i:02}</span><h2>{e(item["title"])}</h2><p class="service-scenario">{e(item["scenario"])}</p></div><div class="service-detail"><p>{e(item["description"])}</p><ul class="service-tags">{tags}</ul></div><div class="service-card-actions"><a href="{consultation_href}"{consultation_target} aria-label="咨询{e(item["title"])}">咨询此服务 →</a>{intro_link}</div></article>')
    service_notice = notice(('independence', 'services'), '服务与网站声明')
    if body.strip():
        service_notice = service_notice.replace('</section>', MarkdownIt('commonmark', {'html': False}).render(body) + '</section>')
    html = f'''<link rel="stylesheet" href="/assets/enterprise-services.css"><section class="enterprise-hero"><div><div class="eyebrow">ENTERPRISE SERVICES</div><h1>{e(data['title'])}</h1><h2>{''.join('<span>'+e(part)+'</span>' for part in data['headline'].split('，'))}</h2><p>{e(data['intro'])}</p><div class="resource-actions"><a class="button primary" href="{consultation_href}"{consultation_target}>联系咨询</a><a class="button" href="#service-list">浏览服务 ↓</a></div></div><div class="enterprise-brand"><img src="/media/renliwo/logo.png" alt="人力窝 WOWOOHR" width="244" height="80"><p>科技让 HR 更温暖</p><span>企业人力资源服务</span></div></section>
    <div class="service-section-heading"><div><div class="eyebrow">SERVICE DIRECTORY</div><h2>从日常运营，到下一步发展</h2></div><p>五类服务，回应不同阶段的企业需求。</p></div><section id="service-list" class="enterprise-grid" aria-label="人力窝服务">{''.join(cards)}</section>
    <section class="service-contact" id="service-contact"><div><div class="eyebrow">LET’S TALK</div><h2>聊聊企业的需求</h2><p>人力窝企业服务联系方式</p></div><dl class="contact-details"><div><dt>官网地址</dt><dd>{e(data['officialUrl'])}</dd></div><div><dt>联系电话</dt><dd>{e(phone) if phone else '待确认'}</dd></div><div><dt>邮箱地址</dt><dd>{e(data['contactEmail'])}</dd></div></dl></section>
    {service_notice}'''
    page('/enterprise-services/', data['title'], data['description'], html, 'enterprise-services', article=data)
