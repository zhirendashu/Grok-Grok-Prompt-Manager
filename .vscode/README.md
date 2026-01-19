# VS Code 开发环境配置完成

## 📦 已创建的配置文件

### 1. `.vscode/settings.json`
**项目级配置文件**，包含：
- ✅ 编辑器基础设置（字体、缩进、换行等）
- ✅ 文件关联（`.user.js` → JavaScript，小程序文件识别）
- ✅ Git 配置（自动拉取、智能提交）
- ✅ 终端配置（PowerShell）
- ✅ 图像预览设置（摄影师友好）
- ✅ 性能优化（排除 node_modules 等）

### 2. `.vscode/extensions.json`
**扩展推荐列表**，VS Code 会自动提示安装：
- 油猴脚本开发工具
- 微信小程序开发工具
- 图像预览插件
- CSS/UI 美化工具
- Git 可视化工具

### 3. `.vscode/userscript.code-snippets`
**代码片段库**，快捷输入：
- `gpm-header` → 油猴脚本头部模板（含署名）
- `gpm-component` → 组件基类
- `gpm-storage` → 存储服务类
- `gpm-comment` → 中文注释块
- `gpm-try` → Try-Catch 错误处理
- `gpm-event` → 事件监听器（带清理）
- `gpm-image` → 图像处理函数
- `gpm-xhr` → API 请求封装
- `gpm-debounce` → 防抖函数
- `gpm-throttle` → 节流函数

### 4. `Tools/install-vscode-extensions.ps1`
**扩展批量安装脚本**，一键安装所有推荐扩展。

---

## 🚀 正在安装的扩展

### 核心扩展
- ✅ `qiu8310.minapp-vscode` - 小程序开发增强
- ⏳ `wechat-miniprogram.vscode-wechat-miniprogram` - 微信官方小程序工具
- ✅ `kisstkondoros.vscode-gutter-preview` - 图像预览（摄影师必备）
- ✅ `bradlc.vscode-tailwindcss` - TailwindCSS 智能提示
- ✅ `stylelint.vscode-stylelint` - CSS 代码检查

### Git 工具
- ✅ `mhutchie.git-graph` - Git 可视化图表
- ✅ `eamodio.gitlens` - Git 增强工具

### 开发效率
- ✅ `dbaeumer.vscode-eslint` - JavaScript 代码检查
- ⏳ `esbenp.prettier-vscode` - 代码格式化
- ⏳ `formulahendry.auto-rename-tag` - 自动重命名标签
- ⏳ `christian-kohler.path-intellisense` - 路径智能提示
- ⏳ `visualstudioexptteam.vscodeintellicode` - AI 代码补全

### 视觉增强
- ⏳ `aaron-bond.better-comments` - 注释高亮
- ⏳ `naumovs.color-highlight` - 颜色预览

### 中文支持
- ⏳ `ms-ceintl.vscode-language-pack-zh-hans` - 中文语言包

---

## 📝 使用指南

### 1. 代码片段使用
在 JavaScript 文件中输入快捷键，按 `Tab` 自动展开：

```javascript
// 输入 gpm-header 然后按 Tab
// ==UserScript==
// @name         脚本名称
// @namespace    https://link3.cc/zhirendashu
// @version      1.0.0
// ...
```

### 2. 图像预览
在代码中写入图片路径，左侧会自动显示缩略图：
```javascript
const icon = 'https://example.com/icon.png'; // 左侧会显示图片
```

### 3. Git 可视化
- 点击左侧活动栏的 "Git Graph" 图标
- 或按 `Ctrl+Shift+P` 输入 "Git Graph"

### 4. 小程序开发
- 创建 `.wxml`, `.wxss`, `.wxs` 文件会自动识别
- 支持语法高亮、智能提示、代码片段

---

## ⚙️ 下一步操作

### 1. 重启 VS Code
```powershell
# 关闭所有 VS Code 窗口后重新打开
code "c:\Users\trees\下载\Grok prompt"
```

### 2. 检查扩展安装状态
- 按 `Ctrl+Shift+X` 打开扩展面板
- 查看已安装的扩展列表

### 3. 测试代码片段
- 新建 `.user.js` 文件
- 输入 `gpm-header` 测试

### 4. 配置 Git Graph
- 打开 Git Graph
- 查看项目提交历史
- 可视化分支结构

---

## 🔧 故障排除

### 扩展安装失败
如果某些扩展安装失败，手动安装：
1. 按 `Ctrl+Shift+X` 打开扩展市场
2. 搜索扩展 ID（如 `mhutchie.git-graph`）
3. 点击"安装"

### 配置未生效
1. 确保在项目根目录打开 VS Code
2. 检查 `.vscode/settings.json` 是否存在
3. 重启 VS Code

### 中文乱码
1. 安装中文语言包：`ms-ceintl.vscode-language-pack-zh-hans`
2. 按 `Ctrl+Shift+P` → 输入 "Configure Display Language"
3. 选择 "中文（简体）"

---

## 📚 相关文档

- [VS Code 官方文档](https://code.visualstudio.com/docs)
- [油猴脚本开发指南](https://www.tampermonkey.net/documentation.php)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

---

**配置完成时间：** 2026-01-18
**维护者：** 植人大树
**项目：** Grok Prompt Manager
