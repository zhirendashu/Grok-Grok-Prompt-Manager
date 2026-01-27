# MCP 服务器安装与配置指南 (2026版)

您好！我已经为您在 `e:\Grok-Prompt\tools\mcp_servers` 目录下下载并安装了核心 MCP 服务器组件。

为了让这些工具在您的 **Claude Desktop** 或 **Cursor** 中生效，请按照以下步骤操作：

## 1. 打开配置文件
- **Claude Desktop**: 点击设置 -> "Developer" -> "Edit Config"。
- **或者手动打开**: `%APPDATA%\Claude\claude_desktop_config.json`

## 2. 复制并粘贴以下配置
将以下 JSON 内容合并到您的 `mcpServers` 节点中：

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-puppeteer"
      ]
    },
    "fetch": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch"
      ]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "e:/Grok-Prompt"
      ]
    }
  }
}
```

## 3. 重启客户端
完成配置后，请彻底退出并重启 Claude Desktop 或 Cursor，您将看到工具栏中出现了新工具：
- **Puppeteer**: 用于自动化浏览器、截屏、分析网页 DOM。
- **Fetch**: 快速读取网页内容。
- **Sequential Thinking**: 辅助我进行复杂的逻辑推理。
- **Filesystem**: 增强对本项目文件的读写控制。

## 4. 特别说明：内置 Skill
以下两个技能已经直接注入到我的“大脑”中，您**不需要**在外面安装任何东西，直接让我执行即可：
1. **tampermonkey-expert (已激活)**: 专门处理您项目的油猴脚本逻辑。
2. **ui-ux-pro-max (已激活)**: 专门提供顶级视觉设计方案。

---
*祝开发愉快！—— Antigravity*
