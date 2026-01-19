---
description: 发布正式版前的标准检查清单（包含洗词）
---

# 发布正式版标准实操流程 (SOP)

在生成最终的【正式版】脚本之前，必须严格执行以下步骤。

## 1. 🔍 代码审查 (Code Reivew)
- [ ] 检查头部 Metadata (`@version`, `@name`, `@description`) 是否已更新。
- [ ] 确保 Changelog 已包含最新功能的详细说明。
- [ ] 移除所有的 `console.log` 调试信息（只保留必要的 Error 或 Info）。
- [ ] **[重要] 隐私与合规清洗 ("洗词")**：
    - 全局搜索代码中的示例提示词（如 `showGPMPasteImport` 中的 `protocol` 变量）。
    - **删除**：所有涉及个人隐私、特定癖好、NSFW、过于露骨的描述（如具体体位、特定身体部位特写等）。
    - **替换**：使用通用、安全、科技感或艺术感强的示例。
        - *推荐示例*：赛博朋克城市、印象派风景、吉卜力风格人像。
    - 检查代码注释，确保没有遗留个人开发环境的路径或敏感信息。

## 2. 🧪 最终测试 (Final Test)
- [ ] 在 `Grok-Prompt-Manager-Release` 文件夹中生成候选版文件。
- [ ] 在浏览器中安装并运行，验证核心功能。
- [ ] **重要**：检查弹窗、帮助文档中的示例文本是否已变成通用版本。

## 3. 📦 归档与发布 (Archive & Publish)
- [ ] 将文件移动到 `Grok-Prompt-Manager-Release` 文件夹。
- [ ] 命名格式：`【正式版】Grok_Prompt_Manager_v[版本号].user.js`。
- [ ] 同步更新根目录下的 `Grok_Prompt_Manager_v[大版本].user.js`。

## 4. 🗄️ 版本控制 (Git)
- [ ] `git add .`
- [ ] `git commit -m "发布正式版: v[版本号] (已完成洗词验证)"`
- [ ] `git tag v[版本号]-[日期]-Release`
- [ ] `git push --tags`
