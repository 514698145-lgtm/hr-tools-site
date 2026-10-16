#!/usr/bin/env python3
"""Run as root from certbot deploy hook; never print credentials or PEM files."""
import json
from pathlib import Path
import subprocess
import re
import time
from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.request import CommonRequest

def main():
    config = json.loads(Path('/etc/hr-tools/certificate-deployer.json').read_text())
    client = AcsClient(config['accessKeyId'], config['accessKeySecret'], 'cn-hangzhou')
    request = CommonRequest()
    request.set_accept_format('json')
    request.set_domain('cdn.aliyuncs.com')
    request.set_method('POST')
    request.set_protocol_type('https')
    request.set_version('2018-05-10')
    request.set_action_name('SetCdnDomainSSLCertificate')
    request.add_query_param('SSLProtocol', 'on')
    request.add_query_param('CertType', 'upload')
    certificate = Path('/etc/letsencrypt/live/hrtoolkit.cn')
    request.add_query_param('SSLPub', (certificate/'fullchain.pem').read_text())
    request.add_query_param('SSLPri', (certificate/'privkey.pem').read_text())
    try:
        for domain in ('hrtoolkit.cn', 'www.hrtoolkit.cn'):
            request.add_query_param('DomainName', domain)
            request.add_query_param('CertName', domain.replace('.', '-')+'-'+str(time.time_ns()))
            reply = json.loads(client.do_action_with_exception(request))
            if not reply.get('RequestId'):
                raise ValueError('Certificate API returned no request identifier')
    except Exception as error:
        # SDK exception text may include request details; do not log it.
        code = getattr(error, 'get_error_code', lambda: '')()
        if not isinstance(code, str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}', code):
            code = type(error).__name__
        raise SystemExit('CDN certificate synchronization failed ('+code+')') from None
    subprocess.run(['nginx','-t'],check=True)
    subprocess.run(['systemctl','reload','nginx'],check=True)
    print('CDN certificate synchronized; Nginx reloaded.')

if __name__ == '__main__':
    main()
