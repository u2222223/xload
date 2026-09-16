# xload 静态网站

本目录是独立 Git 子仓库，保存部署制品、页面模板与共享 panel SDK。生产状态、发布文案和测试证据以父项目数据库为准。

## 生产入口

父项目的 .opencode/skills/userscript-research-and-build/SKILL.md 是油猴生产流程唯一权威。正常新增和更新经 pipeline postdev 构建、pipeline ship 部署；不手改 scripts-data.json、聚合页或线上制品来绕过 DB 和质量门。

- scripts/userscripts/<task_id>/：发布详情页、user.js 与 panel.html。
- assets/panel/：共享面板样式与通信 SDK。
- scripts/_template.html 和 tools/add_program.py：底层页面生成器，供 release.js 调用。
- assets/js/main.js 和 assets/css/style.css：网站公共交互和样式。
- scripts-data.json、index.html、listing.html、sitemap.xml：由父项目 build-site.js 从 DB/实际 release 生成。
- about/contact/privacy/cookie/terms 页面与站点资源：维护网站本身，不用其示例替代脚本真实隐私说明。

[生成工具说明](ADDING_A_PROGRAM.md)仅描述底层工具边界，不是第二条生产发布流程。

## 预览和部署

本地可运行 python -m http.server 8000 预览静态文件。生产部署由父项目 pipeline ship 执行，并核验 GitHub/服务器 commit 与任务制品，不以本地文件存在判断上线成功。

广告标识与开关必须使用真实配置；修改广告或 Cookie 行为时同步核对对应政策页面。
