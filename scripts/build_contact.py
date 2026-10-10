"""Public contact rail; contact details share the CMS service content."""
from html import escape as e
from check_content import parse_article
import re

def contact_widget(root):
    data, _ = parse_article((root/'content/enterprise-services.md').read_text(encoding='utf-8-sig'))
    qr = data.get('wechatQr', '')
    if not qr.startswith('/media/') or not (root/'public'/qr.lstrip('/')).is_file():
        raise ValueError('联系栏缺少有效的微信二维码图片')
    phone = data.get('contactPhone', '')
    dial = re.sub(r'[^0-9+]', '', phone)
    email = data['contactEmail']
    return f'''<link rel="stylesheet" href="/assets/contact-widget.css">
<aside class="contact-dock" aria-label="联系与帮助">
<button class="contact-mobile-toggle" aria-label="打开联系与帮助" aria-expanded="false" aria-controls="contact-actions"><span data-contact-icon="chat"></span><span>联系</span></button>
<div id="contact-actions" class="contact-actions">
<button data-contact-open="wechat" aria-haspopup="dialog"><span data-contact-icon="chat"></span><span>微信咨询</span></button>
<button data-contact-open="phone" aria-haspopup="dialog"><span data-contact-icon="phone"></span><span>电话联系</span></button>
<a id="contact-feedback" href="/feedback/"><span data-contact-icon="feedback"></span><span>问题反馈</span></a>
<button id="contact-top"><span data-contact-icon="top"></span><span>返回顶部</span></button>
</div></aside>
<dialog class="contact-dialog" id="contact-dialog" aria-labelledby="contact-title">
<div class="contact-dialog-head"><div><small>CONTACT & HELP</small><h2 id="contact-title">微信咨询</h2></div><button id="contact-close" aria-label="关闭联系面板">×</button></div>
<section id="contact-wechat"><p>用微信扫一扫，添加好友后联系。</p><img src="{e(qr)}" width="912" height="1349" loading="lazy" alt="微信联系二维码：人力窝本窝"><a class="contact-save" href="{e(qr)}" download="微信联系二维码.jpg">保存二维码</a><small>手机可保存图片后，在微信扫一扫中选择相册识别。</small></section>
<section id="contact-phone" hidden><p>人力窝官方联系电话</p><a class="contact-number" href="tel:{e(dial)}">{e(phone)}</a><div class="contact-phone-actions"><a href="tel:{e(dial)}">拨打电话</a><button id="contact-copy" data-phone="{e(phone)}">复制号码</button></div><div class="contact-mail"><span>商务邮箱</span><a href="mailto:{e(email)}">{e(email)}</a></div><p id="contact-status" role="status"></p></section>
<p class="contact-relationship">人力窝服务咨询入口，非本站工具与政策内容的审核或担保方。<a href="/disclaimer/">查看声明</a></p>
</dialog><script type="module" src="/assets/contact-widget.js"></script>'''
