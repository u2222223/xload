# 网站生成工具边界

此页说明 tools/add_program.py 的低层接口。油猴生产流程以父项目 .opencode/skills/userscript-research-and-build/SKILL.md 为唯一权威。

## 正常生产路径

1. 经用户选择、开发节点实现和 check-output 校验。
2. 主流程 pipeline postdev 调用 release.js，读取 DB release_json、分配版本并调用本站生成器。
3. release.js 核验复制后的源码与面板，转义填满 config/usage/privacy 契约，清除 REPLACE 占位后运行生成器 --check。
4. build-site 从 DB/实际 release 更新聚合数据；pipeline ship 核验部署后才进入人工测试。

不要手工新增 scripts-data.json 条目，不用示例安装量或评分，不把生成的骨架当作完成品。只有底层生成器 --check 通过也不代表生产门禁、人工测试或部署已经完成。

## 维护生成器

python tools/add_program.py --help 查看实际参数，--check 仅验证本站文件。--apply 是写操作，生产中由 release.js 传入真实制品及文案。单独排查生成器应在隔离 fixture 中进行，避免修改当前网站目录或绕过父项目状态机。

程序发布文件位于 scripts/userscripts/<task_id>/，包含 <task_id>.html、<task_id>.user.js 与 panel.html。网站部署副本与开发源码各有用途，不因内容相同删除其中一份；应由构建保持一致。
