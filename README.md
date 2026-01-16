# 植人大树 Prompt Manager 3.0

> The Next-Gen Prompt Manager for Grok - 新一代智能提示词管理工具

[![Version](https://img.shields.io/badge/version-4.3.0-blue.svg)](https://github.com/zhirendashu/Grok-Grok-Prompt-Manager)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/zhirendashu/Grok-Grok-Prompt-Manager/blob/main/LICENSE)
[![Tampermonkey](https://img.shields.io/badge/tampermonkey-compatible-brightgreen.svg)](https://www.tampermonkey.net/)
[![GitHub Stars](https://img.shields.io/github/stars/zhirendashu/Grok-Grok-Prompt-Manager?style=social)](https://github.com/zhirendashu/Grok-Grok-Prompt-Manager)

## ✨ 特性

- 🎬 **差异化随机模式** - 文字面板5个模式，视频面板2个精简模式
- 🎓 **首次使用引导** - 所有7个随机模式配备精美引导弹窗
- 📸 **专业写真生成** - 一键生成专业级写真提示词
- 🎬 **视频精准生成** - 避免提示词过多，精准单条生成
- 🎨 **Glassmorphism UI** - 现代化毛玻璃效果界面
- 💾 **云端同步 (即将推出)** - 跨设备数据同步
- 🔍 **提示词检查器** - 一键查看图片原始提示词

## 🚀 快速开始

### 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 打开 `src/grok_prompt_manager.user.js`
3. Tampermonkey 会自动识别并提示安装
4. 点击"安装"完成

### 基础使用

1. **访问 [grok.com](https://grok.com)**
2. **左侧/右侧面板会自动显示**
3. **点击 🎲 骰子按钮** 打开随机模式菜单
4. **选择模式**，首次使用会显示引导

详细使用方法请查看 → [📖 快速上手指南](QUICK_START.md)

## 📦 v4.3.0 更新内容

### 🎯 核心更新

- ✨ **新增**：视频随机和R18视频的首次使用引导
- ✨ **新增**：视频面板专用精简随机模式（2个）
- 🎨 **重构**：面板差异化菜单（文字5个，视频2个）
- 🎓 **新增**：全部7个模式的首次使用引导系统

### 📸 随机模式列表

#### 文字面板（左侧）

- 📸 写真模式 - 专业写真提示词生成
- 🔞 R18写真 - 成人写真双库组合
- 🎲 三连抽取 - 快速随机3条
- 🎨 多类混合 - 跨分类混搭
- 🌀 混沌生成 - 完全随机生成

#### 视频面板（右侧）

- 🎬 视频随机 - 精准单条视频提示词
- 🔞 R18视频 - 双库组合视频生成

详细更新说明 → [📋 完整发布说明](RELEASE_NOTES_v4.3.0.md)

## 📚 文档

- [📖 快速上手指南](QUICK_START.md) - 3分钟快速开始
- [📋 完整发布说明](RELEASE_NOTES_v4.3.0.md) - v4.3.0详细更新
- [🎬 视频模式说明](C:\Users\trees\.gemini\antigravity\brain\f4d860b9-780e-4b39-9c23-fb3d19f4ee1b\v4.2.0_视频模式说明.md) - 视频库配置指南
- [📐 JSON格式规范](JSON_FORMAT_SPEC.md) - 导入导出格式
- [🔍 导入导出审计](IMPORT_EXPORT_AUDIT.md) - 功能审计报告

## 🗂️ 项目结构

```
Grok prompt/
├── src/                          # 源代码
│   └── grok_prompt_manager.user.js  # 主脚本文件
├── docs/                         # 文档目录
├── examples/                     # 示例文件
├── library/                      # 提示词库
├── backup/                       # 备份文件
├── RELEASE_NOTES_v4.3.0.md      # v4.3.0发布说明
├── QUICK_START.md               # 快速上手指南
└── README.md                     # 本文件
```

## 💡 使用技巧

### 库的创建位置很重要

- ✅ **文字库** → 在**左侧面板**创建/导入
- ✅ **视频库** → 在**右侧面板**创建/导入

### 专用库命名

以下库名必须精确匹配：

- `写真模式标准描述` - 文字写真开头
- `成人模式标准添加词` - 成人修饰词
- `视频提示词` - 视频基础描述
- `R18视频添加提示词` - 视频R18修饰

### 视频提示词编写

```
推荐格式：类别: 详细描述

示例：
Fabric: 细致黑色蕾丝边缘动作微微晃动，露出圆润头
Legs: 双膝缓慢弯曲并下蹲，腿部肌肉线条轻微绷紧
Atmosphere: 浓密蒸汽汽中身体轻摇摆出现，玻璃反射出阴影
```

## 🐛 故障排查

### 问题：提示"未找到XXX库"

**解决方案**：

1. 检查库名是否完全正确
2. 确认库中至少有1条提示词
3. 确认在正确的面板创建（文字/视频）

### 问题：视频模式抽到文字内容

**解决方案**：

1. 删除该库
2. 切换到**右侧视频面板**
3. 重新创建/导入库

更多问题 → [完整发布说明 - 故障排查章节](RELEASE_NOTES_v4.3.0.md#-故障排查)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

- 🐛 [报告问题](https://github.com/zhirendashu/Grok-Grok-Prompt-Manager/issues)
- 💡 [功能建议](https://github.com/zhirendashu/Grok-Grok-Prompt-Manager/discussions)
- 🔧 [提交PR](https://github.com/zhirendashu/Grok-Grok-Prompt-Manager/pulls)

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有贡献者和用户的支持！

---

**⭐ 如果这个项目对你有帮助，请给个Star！**
