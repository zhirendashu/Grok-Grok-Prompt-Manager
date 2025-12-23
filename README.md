# Grok 快捷助手 (Grok Prompt Manager)

**中文** | [English](#english)

一款专为 Grok AI 设计的强大的提示词管理工具。通过优雅的界面和高效的交互，帮助您整理、管理和快速调用绘画与视频生成的提示词。

## ✨ 功能特性

- **双面板控制**: 专为 **文生图 (Text-to-Image)**（左侧）和 **图生视频 (Image-to-Video)**（右侧）设计的独立操作面板。
- **提示词库系统**: 支持创建、重命名和切换多个提示词库，分类管理不同风格或主题的灵感。
- **智能草稿台**: 底部面板提供草稿编辑区，支持组合、修改提示词，并保留详细的历史记录。
- **快捷修饰词**: 一键添加常用参数（如 `--ar 16:9`、风格标签等），效率倍增。
- **批量管理**: 支持通过 JSON 文件批量导入和导出提示词数据。
- **搜索与筛选**: 实时搜索功能配合分类标签，让您瞬间找到所需的提示词。
- **现代化界面**: 响应式深色主题，完美融入 Grok 原生界面。支持面板拖拽和大小调整。
- **历史记录**: 自动记录使用过的提示词，随时回溯精彩创意。

## 🚀 安装指南

1. **安装脚本管理器**: 首先需要在浏览器中安装 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 或 [Violentmonkey (暴力猴)](https://violentmonkey.github.io/) 扩展。
2. **安装脚本**: 点击安装按钮（如果已发布到脚本网站），或手动新建脚本并将 `src/grok_prompt_manager.user.js` 中的代码复制进去。
3. **启动**: 打开 `https://grok.com/`，您会在页面右下角看到一个机器人图标 (🤖)。

## 🛠 使用说明

- **开启/关闭**: 点击右下角的 🤖 悬浮球即可显示或隐藏管理面板。
- **添加提示词**: 在面板输入框中填写描述，点击 `+` 号保存。
- **使用提示词**: 点击列表中的任意提示词即可填入 Grok 输入框。
  - **追加模式 (Append)**: 将提示词添加到现有文本末尾。
  - **替换模式 (Replace)**: 清空当前输入框并填入新内容。
- **分类管理**: 导入时文件名自动成为分类标签，方便筛选查看。
- **草稿与历史**: 点击底部工具栏图标打开面板，查看历史记录或在草稿区拼接复杂的长提示词。

## 📦 导入示例提示词库

项目包含了演示用的提示词库文件，帮助您快速上手：

1. 在左侧或右侧面板中，点击 **入** (导入) 按钮
2. 选择 `examples/demo_text_to_image.json` (文生图示例) 或 `examples/demo_image_to_video.json` (图生视频示例)
3. 导入后即可在列表中看到示例提示词，点击即可使用

您也可以参考这些示例文件的格式，创建自己的提示词库。

## ☕ 打赏支持

如果这个项目对您有帮助，欢迎请我喝杯咖啡 ☕

<div align="center">

![微信赞赏码](docs/wechat_donate.jpg)

*感谢您的支持！*

</div>

---

<br>

# <a id="english"></a>Grok Prompt Manager

[中文](#grok-快捷助手-grok-prompt-manager) | **English**

A powerful userscript designed to enhance your experience with Grok AI's image and video generation tools. Organize, manage, and deploy your prompts efficiently with a sleek, drag-and-drop interface.

## ✨ Features

- **Dual Control Panels**: dedicated panels for **Text-to-Image** (Left) and **Image-to-Video** (Right) workflows.
- **Prompt Library System**: Create, rename, and switch between different prompt libraries to organize your innovative ideas.
- **Smart Draft Station**: A bottom panel to compose, edit, and mix prompts before sending them to Grok. Includes history logging.
- **Quick Modifiers**: One-click access to common parameters like aspect ratios (`--ar 16:9`), stylization, and more.
- **Batch Management**: Support for bulk import and export of prompts via JSON.
- **Search & Filter**: Instantly find the exact prompt you need with real-time search and category filtering.
- **Modern UI**: A responsive, dark-themed interface that blends seamlessy with the Grok platform. Supports dragging and resizing.
- **History Log**: Never lose a great prompt again with the built-in history tracker.

## 🚀 Installation

1. **Install a Userscript Manager**: You need a browser extension like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. **Install the Script**: Click the install button (if hosted on GreasyFork) or manually create a new script and copy the code from `src/grok_prompt_manager.user.js`.
3. **Open Grok**: Navigate to `https://grok.com/`. You should see the robot icon (🤖) appear in the bottom right corner.

## 🛠 Usage

- **Toggle Interface**: Click the floating 🤖 icon to show/hide the control panels.
- **Add Prompts**: Type your prompt description in the input box within the panel and click `+` to save it.
- **Insert Prompts**: Click on any saved prompt to insert it into the Grok input field.
  - **Append Mode**: Adds the text to the end of your current input.
  - **Replace Mode**: Replaces the entire input field.
- **Manage Categories**: Use the tag system to categorize your prompts for easy access.
- **Draft & History**: Open the bottom panel to view your usage history or construct complex prompts in the scratchpad.

## 📦 Import Demo Prompt Library

The project includes demo prompt library files to help you get started quickly:

1. In the left or right panel, click the **入** (Import) button
2. Select `examples/demo_text_to_image.json` (Text-to-Image examples) or `examples/demo_image_to_video.json` (Image-to-Video examples)
3. After importing, you'll see the example prompts in the list - click to use them

You can also refer to these example files to create your own custom prompt libraries.

## ⚖️ License

MIT License
