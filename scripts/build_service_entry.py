"""Reuse the original service card below public HR content."""
KINDS = {'home', 'tool', 'workspace', 'insights', 'insights-category', 'article',
         'policies', 'policy-detail', 'templates', 'template-detail',
         'official-sites', 'contract-reminders', 'guide'}


def service_entry(kind):
    if kind not in KINDS:
        return ''
    return '<aside class="tool-service-link"><div><small>服务对接 · 人力窝</small><strong>需要企业人力资源服务支持？</strong></div><a class="button" href="/enterprise-services/">了解服务 →</a></aside>'
