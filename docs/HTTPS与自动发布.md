# HTTPS 与自动发布

## HTTPS（2026-10-16）

用户同意 Let’s Encrypt 当前订户协议及自动续期。证书覆盖 hrtoolkit.cn、www.hrtoolkit.cn、origin.hrtoolkit.cn，首张到期日2027-01-13。私钥只在服务器 /etc/letsencrypt；不进入 GitHub、CMS 或 OSS。

服务器 hr-tools-certificate-renew.timer 每天检查两次，成功续期后调用 deploy/sync-cdn-certificate.py 同步 CDN 并重新加载 Nginx。同步专用凭据位于服务器 root 私有配置，仅允许更新 hrtoolkit.cn 的 CDN 证书，不允许修改 DNS、上传网站或读取运行数据。

CDN 的条件源站覆盖 /api/* 和 /.well-known/acme-challenge/*，以 HTTPS 回源 origin.hrtoolkit.cn。源站接口要求 CDN 专用请求头；该值不写入仓库，Nginx 配置使用占位模板。不能直接打印生产 Nginx 配置或完整 CDN 配置，避免回显验证值。

续期巡检：systemctl status hr-tools-certificate-renew.timer；journalctl -u hr-tools-certificate-renew.service。证书重签成功和 CDN 同步成功是两项检查，任一失败都需处理。

## 发布边界

工作流 .github/workflows/content-check.yml 分为 validate 和 publish。PR 只检查；main 检查通过且发布门禁全部 ready 才发布。手动 preflight=true 上传 _preflight/提交号/，不会覆盖根目录。过时提交禁止发布；发布任务串行。

OIDC 提供商 issuer=https://token.actions.githubusercontent.com，audience=sts.aliyuncs.com；角色只信任 repo:514698145-lgtm/hr-tools-site:ref:refs/heads/main。ARN 放在 GitHub Variables，不放长期 AccessKey。权限见 deploy/github-publisher-policy.json：仅本静态 Bucket 的必要上传/读取和本域名刷新，不包含删除、授权、DNS 或私有运行数据。

scripts/upload_release.py 先验证整包 SHA256 与路径，再上传资源、HTML，最后上传 release-manifest.json。使用官方 CLI 的传输校验并应用类型、缓存和 SHA256 元数据。当前资源名称没有内容哈希，浏览器必须重新验证；CDN 静态缓存300秒，API不缓存。每次正式发布后刷新目录缓存并验证公网清单提交号。

这是按顺序上传，不是多对象原子切换。OSS 版本控制保留历史对象；有失败时先检查已上传范围，使用上一份核验包恢复受影响文件并刷新 CDN。完整回滚还需处理新加/删除的路径，不能只依靠旧包覆盖宣称自动回退。

OIDC CA 指纹在2026-10-16通过已校验的 TLS 证书链获取。若 GitHub 更换证书链导致身份交换失败，应重新核验官方 issuer 的有效链再更新指纹，不关闭 TLS 校验。

官方参考：

- https://github.com/aliyun/configure-aliyun-credentials-action
- https://help.aliyun.com/zh/cdn/developer-reference/parameters-for-configuring-features-for-domain-names
- https://letsencrypt.org/documents/LE-SA-v1.8-July-06-2026.pdf
