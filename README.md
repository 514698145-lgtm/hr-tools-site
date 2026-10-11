# HR 工作站

响应式 HR 工具网站，包含7个大厅计算工具、Excel/CSV批量计算、个人工作台、HR资讯、政策知识库、64份Word/Excel模板、企业服务、匿名反馈和休闲游戏排行榜。

## 部署进度

2026-10-10 用户已要求开始部署。源码已上传 GitHub 仓库 514698145-lgtm/hr-tools-site；Pages CMS 已由用户授权，云端构建正在验收。阿里云域名、OSS、CDN及后端资源均未创建，尚未正式上线。

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

构建输出为 dist/；预览地址 http://127.0.0.1:4321/ 。发布检查不带 --audit 时，缺少生产配置会返回失败。GitHub工作流目前只执行检查和生成静态产物，不访问云资源。

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

正式域名未配置前保持 noindex；实际发布、CMS授权、搜索平台提交和定时政策更新均需分别验证，不代表已启用。
