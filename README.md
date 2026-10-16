# HR 工作站

响应式 HR 工具网站，包含7个大厅计算工具、Excel/CSV批量计算、个人工作台、HR资讯、政策知识库、64份Word/Excel模板、企业服务、匿名反馈和休闲游戏排行榜。

## 部署进度

2026-10-16：源码已接入 GitHub 仓库 514698145-lgtm/hr-tools-site，Pages CMS 已授权。正式网站 https://hrtoolkit.cn/ 已上线。CMS 保存、清单同步、自动构建、OIDC 上传与 CDN 刷新均已实测；122页公网检查通过。三个域名免费 HTTPS、续期同步、独立 API、每日私有 OSS 备份均已运行。百度/必应站长平台验证尚未完成。

首期企业服务经用户确认不显示五项官网介绍入口，保留五类服务、咨询表单和联系方式。正式域名已用于 canonical，公开栏目允许收录；工作台、管理页与反馈页不收录。候选发布包只包含静态站点和文件校验清单，不能代替发布验收。

目标链路：Pages CMS 编辑 Markdown → GitHub → 自动构建与检查 → OSS → CDN。匿名反馈、管理员回复和排行榜另需后端，不能由 OSS 静态托管替代。正式配置与进度见 [部署接入清单](docs/部署接入清单.md)。

## 本地构建与检查

需要 Python 3.12+、Node.js 22+。安装 requirements-dev.txt 后运行：

```text
python -m unittest discover -s tests -v
node --test tests/*.test.mjs
python scripts/build.py
python scripts/check_site.py
python scripts/check_release.py --audit
node scripts/serve.mjs
```

构建输出为 dist/；预览地址 http://127.0.0.1:4321/ 。Windows 本项目使用 `.venv/Scripts/python.exe`，避免系统 Python 占位命令。发布检查不带 --audit 时，缺少生产配置会返回失败。GitHub 工作流执行检查、隔离恢复演练和打包；全部门禁通过才自动发布。手动 preflight 只上传隔离目录。

发布包、回滚准备与私有数据恢复操作见 [发布与恢复操作](docs/发布与恢复操作.md)。`python scripts/package_release.py --candidate` 会重新构建并校验站点；不带 `--candidate` 时还必须通过全部生产门禁且源码已提交。云端部署使用仅信任本仓库 main 的 OIDC 临时凭据，不保存长期部署密钥。

## 内容管理

- .pages.yml：Pages CMS 配置。
- content/articles/：HR资讯Markdown。
- content/policies/：政策知识库Markdown。
- content/enterprise-services.md：企业服务介绍及咨询表单。
- content/seo/：SEO标题、摘要与索引设置。
- config/release.json：部署配置，不存放密钥。

## 数据与发布边界

计算、批量文件解析和个人工作台在浏览器内完成。城市政策覆盖与缺项以页面提示为准，不承诺所有参数实时完整。反馈与游戏数据由单进程后端存储；生产需持久化、备份、HTTPS和访问控制。

仅发布 dist/，不发布项目根目录。本机密码、用户反馈、上传文件、研究资料、环境变量文件已排除出Git；不要将其加入公开内容目录。模板ZIP由构建自动生成，不纳入源码。字库与第三方库保留各自授权文件。

公开页面、CMS 保存与自动发布已验收；搜索平台验证/提交仍需分别完成。每周云端来源巡检和本机智能复核已启用：可靠证据确认的更新提交到 main 后经检查发布；来源变化不会直接变成未经核验的政策数字。
