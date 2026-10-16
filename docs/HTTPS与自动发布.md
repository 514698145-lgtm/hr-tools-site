# HTTPS 与自动发布

## HTTPS（2026-10-16）

用户同意 Let’s Encrypt 当前订户协议及自动续期。证书覆盖 hrtoolkit.cn、www.hrtoolkit.cn、origin.hrtoolkit.cn，首张到期日2027-01-13。私钥只在服务器 /etc/letsencrypt；不进入 GitHub、CMS 或 OSS。

服务器 hr-tools-certificate-renew.timer 每天检查两次，成功续期后调用 deploy/sync-cdn-certificate.py 同步根域名与www的 CDN 证书并重新加载 Nginx。同步专用凭据位于服务器 root 私有配置，仅允许更新这两个域名的 CDN 证书，不允许修改 DNS、上传网站或读取运行数据。2026-10-16用户指定www为主域名，旧根域名以301转www，证书SAN及续期路径不变。

CDN 的条件源站覆盖 /api/* 和 /.well-known/acme-challenge/*，以 HTTPS 回源 origin.hrtoolkit.cn。源站接口要求 CDN 专用请求头；该值不写入仓库，Nginx 配置使用占位模板。不能直接打印生产 Nginx 配置或完整 CDN 配置，避免回显验证值。

续期巡检：systemctl status hr-tools-certificate-renew.timer；journalctl -u hr-tools-certificate-renew.service。证书重签成功和 CDN 同步成功是两项检查，任一失败都需处理。

## 发布边界

工作流 .github/workflows/content-check.yml 分为 validate 和 publish。PR 只检查；main 检查通过且发布门禁全部 ready 才发布。手动 preflight=true 上传 _preflight/提交号/，不会覆盖根目录。过时提交禁止发布；发布任务串行。

OIDC 提供商 issuer=https://token.actions.githubusercontent.com，audience=sts.aliyuncs.com；角色只信任本仓库 main。当前 GitHub 使用含不可变账号及仓库 ID 的 subject，必须从 GitHub 官方 API 的 actions/oidc/customization/sub 核验实际前缀，不能套旧版纯名称示例。ARN 放在 GitHub Variables，不放长期 AccessKey。权限见 deploy/github-publisher-policy.json：仅本静态 Bucket 的必要上传/读取和本域名刷新，撤回已管理文件时仅允许创建可恢复删除标记，无删除历史版本、授权、DNS或私有运行数据权限。

CMS 保存后，inventory 任务自动同步维护清单并记录实际提交号，再按该提交检查、打包与发布；避免要求编辑者手改 JSON。只有该任务有 contents:write，PR 不运行它。验证任务只读；发布任务仅增加获取临时身份所需的 id-token:write。官方凭据 Action 与 CLI 的环境变量前缀不同，工作流显式适配，不输出凭据。

scripts/upload_release.py 先验证整包 SHA256 与路径，再上传资源、HTML、release-manifest.json，最后写完成标记。使用官方 CLI 的传输校验并应用类型、缓存和 SHA256 元数据。只有上次完成标记匹配清单时才跳过未变文件；中断或状态不明时完整补传，避免回退时遗漏被部分覆盖的对象。当前资源名称没有内容哈希，浏览器必须重新验证；CDN 静态缓存300秒，API不缓存。每次正式发布后刷新目录缓存并验证公网清单及完成标记提交号。

首次本机与云端隔离上传均通过。云端演练：GitHub Actions 38833797705，包含正式构建的政策页面、计算参数与模板；CMS 草稿保存为786cbd7提交并保持不公开。新上传器另用明确标注的运输测试文件验证空目录首次上传、再次发布跳过未变文件。已通过 OSS 历史版本取回与 CDN 读取演练；不等于整站自动原子回退。

CLI 的全局 region 不应被当作 ossutil 子进程 region，上传明确同时指定香港 region 和 endpoint。云端首先串行初始化 ossutil，再并发传输，避免首次自动安装时多个进程竞争同一可执行文件。

这是按顺序上传，不是多对象原子切换。OSS 版本控制保留历史对象；有失败时先检查已上传范围，使用上一份核验包恢复受影响文件并刷新 CDN。完成标记记录已管理路径；撤回文章或转草稿时，仅清理旧清单及未完成发布计划中的失效文件，先核验OSS版本控制已启用，再创建可恢复删除标记，保留历史版本。未纳入发布清单的站长验证文件不动。隔离场景已实测新增页面、下一包撤回、历史保留；这不等于整站原子切换或失败后自动回退。

OIDC CA 指纹在2026-10-16通过已校验的 TLS 证书链获取。若 GitHub 更换证书链导致身份交换失败，应重新核验官方 issuer 的有效链再更新指纹，不关闭 TLS 校验。

## 私有备份

每日快照存储在服务器 /var/backups/hr-tools，并在恢复 API 后上传独立的 hrtoolkit-runtime-backups-hk 私有 Bucket。Bucket 已阻止公共访问并使用 AES256 服务端加密；CDN 角色只可读取网站 Bucket，不能读取这个备份 Bucket。上传专用用户无控制台登录，仅有 runtime/* 的 PutObject，不可读取或删除。凭据只在服务器 root 私有配置；失败仅记录错误类型。

首次真实匿名身份快照已上传、重新下载并通过 SHA256 校验；无测试留言混入公开讨论。备份还不含管理员密码，恢复保留原密码配置。当前不自动删除旧备份；定期检查容量与费用，保留期须另行确定。

官方参考：

- https://github.com/aliyun/configure-aliyun-credentials-action
- https://help.aliyun.com/zh/cdn/developer-reference/parameters-for-configuring-features-for-domain-names
- https://letsencrypt.org/documents/LE-SA-v1.8-July-06-2026.pdf

模板合集 ZIP 使用固定归档元数据，避免 GitHub checkout 时间变化导致内容未变却重复上传；字体授权及文档内容保留。
