"""Check production prerequisites without contacting or changing cloud resources."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse

from check_content import parse_article


def check_release(root):
    config = json.loads((root / 'config/release.json').read_text(encoding='utf-8-sig'))
    services, _ = parse_article((root / 'content/enterprise-services.md').read_text(encoding='utf-8-sig'))
    seo, _ = parse_article((root / 'content/seo/site.md').read_text(encoding='utf-8-sig'))
    missing = []
    for key in ('repository', 'siteUrl', 'ossBucket', 'ossRegion', 'cdnDomain'):
        if not config.get(key):
            missing.append(f'尚未配置 {key}')
    site = config.get('siteUrl') or ''
    if site:
        url = urlparse(site)
        if url.scheme != 'https' or not url.hostname or url.username or url.path not in ('', '/') or url.query or url.fragment:
            missing.append('siteUrl 需要有效的 HTTPS 站点根地址')
        if seo.get('siteUrl') and seo['siteUrl'].rstrip('/') != site.rstrip('/'):
            missing.append('SEO 正式域名与部署域名不一致')
    if config.get('pageApproval') != 'approved':
        missing.append('生产页面验收尚未标记 approved')
    if not config.get('deploymentEnabled'):
        missing.append('生产发布开关尚未开启')
    if not config.get('runtimeApiReady'):
        missing.append('反馈、管理回复和排行榜后端尚未部署验收，不能仅上传 OSS 后宣称全部功能可用')
    if not services.get('consultationFormUrl'):
        missing.append('尚未配置咨询表单')
    if not services.get('launchConfirmed'):
        missing.append('企业服务上线资料尚未完成最终确认')
    for item in services.get('services', []):
        if not item.get('source'):
            missing.append('尚未确认官网介绍链接：' + item['title'])
    return {'ready': not missing, 'missing': missing}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--audit', action='store_true', help='List prerequisites without failing a preparation run.')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    result = check_release(root)
    (root / 'reports').mkdir(exist_ok=True)
    (root / 'reports/release-readiness.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if args.audit or result['ready'] else 1)
