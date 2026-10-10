# SEO与CMS管理

当前阶段只开发页面和管理配置，不连接GitHub或部署OSS。用户于2026-09-30再次确认先不部署。

## 管理入口

- `/admin/`：网站管理入口，汇总SEO、Pages CMS和匿名反馈管理。
- `/admin/seo/`：本地SEO编辑与搜索展示预览。导出Markdown草稿，不自动写入代码或发布；同一路径的配置应替换原文件，不能重复新增。它不保存敏感信息，不代替正式CMS登录。
- 正式编辑后台采用Pages CMS，通过GitHub授权访问仓库。`.pages.yml`已配置HR资讯、单份使用导览、全站SEO和页面SEO。当前没有关联真实仓库，不能声称后台已经接通。

## 内容文件

- `content/articles/*.md`：标题、摘要、分类、发布状态、发布时间、来源、正文，以及可选SEO标题/描述/分享图/noindex。
- `content/seo/site.md`：全站名称、标题后缀、正式域名、收录开关、分享图、搜索平台公开meta验证码。
- `content/seo/pages/*.md`：现有工具和栏目页面的SEO覆盖。路径不能创建新页面；错路径与重复路径阻止构建。
- `content/guide.md`：始终只有一份当前使用导览，直接更新，无版本列表。

页面SEO优先于文章SEO；留空标题/描述回退文章标题/摘要或工具默认值；分享图回退全站设置。规范网址由正式域名与页面路径唯一生成，避免编辑多份域名。

## 自动构建与部署准备

1. Pages CMS提交Markdown到GitHub。
2. GitHub Actions运行内容、计算及SEO测试，生成静态HTML、规范网址、OG/Twitter标签、结构化数据、robots.txt和Sitemap。
3. 构建产物与SEO检查报告打包为Actions artifact，便于审核。当前工作流没有部署步骤。
4. 页面确认后，按真实Bucket与CDN信息接入OSS上传和CDN刷新；凭据只放GitHub Secrets。先上传静态资源，再上传HTML；不得同步整个仓库或`.local/`到OSS。
5. OSS启用子目录首页，默认首页index.html、错误页404.html并保留404状态。HTTPS、主域名301和去掉index.html的规范跳转在CDN/OSS层配置，不能用静态HTML声称已经实现301。
6. 上线核对响应码、跳转、证书与正式Canonical后，开启收录并提交百度/必应。提交任务需要真实站点验证和凭据，当前不发送提交请求。

预览强制noindex；管理页、工作台和旧日期计算页不进入Sitemap。单页noindex不使用robots禁止抓取，以便搜索引擎读取该标记。Sitemap的文章lastmod取实际内容修改时间，不每次构建伪造新日期。分享图必须存在于公开media目录。

留言和管理员回复需要独立API及持久存储，OSS仅承载静态页面；正式接入时须单独配置反馈服务。计算数据和工作台继续保留在本机。

## 验证与资料

执行 `python scripts/build.py`、`python scripts/check_site.py`、`python -m unittest discover -s tests`。SEO报告在 `reports/seo-report.json`，不会公开复制至dist。

- [Pages CMS内容配置](https://pagescms.org/docs/configuration/content/)
- [Google robots与noindex](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google规范网址](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [阿里云OSS静态托管](https://www.alibabacloud.com/help/zh/oss/user-guide/hosting-static-websites)
- [阿里云CDN刷新接口](https://www.alibabacloud.com/help/en/cdn/developer-reference/api-cdn-2018-05-10-refreshobjectcaches)

搜索结果标题、排名及收录由搜索引擎决定；后台预览不是实际排名或流量统计。

## 内容生产要求

HR资讯与政策知识库的新增/修订稿统一遵循[SEO-GEO内容生产标准](SEO-GEO内容生产标准.md)：研究搜索需求与长尾词、核验引用、真实正面脱敏案例、FAQ及去AI化编辑。详情以该标准为准。
