# 🛡️ GitHub仓库清理指南

## ⚠️ 重要：清理已上传的隐私内容

### 第一步：停止追踪已上传的文件

```bash
# 进入项目目录
cd "c:\Users\trees\下载\Grok prompt"

# 从Git中移除已追踪的隐私文件（但保留本地文件）
git rm -r --cached backup/
git rm -r --cached library/
git rm -r --cached raw_data/
git rm -r --cached examples/
git rm -r --cached 视频相关/
git rm -r --cached 自动重试/
git rm -r --cached "Grok prompt/"
git rm --cached *.json
git rm --cached 植人大树*.user.js
git rm --cached tests/ 2>$null
git rm --cached temp*/ 2>$null

# 提交删除
git commit -m "安全: 移除所有隐私和个人数据文件"
```

### 第二步：推送更改到GitHub

```bash
# 强制推送（覆盖远程仓库）
git push origin main --force
```

### 第三步：清理Git历史记录（可选但推荐）

**注意**：这会完全重写Git历史，删除所有历史记录中的隐私文件

```bash
# 使用 git filter-repo（推荐）
# 首先安装 git filter-repo
pip install git-filter-repo

# 删除指定文件夹的所有历史记录
git filter-repo --path backup --invert-paths
git filter-repo --path library --invert-paths
git filter-repo --path raw_data --invert-paths
git filter-repo --path 视频相关 --invert-paths

# 强制推送
git push origin main --force
```

**或者使用BFG（更简单）**：

```bash
# 下载 BFG: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-folders backup
java -jar bfg.jar --delete-folders library
java -jar bfg.jar --delete-folders raw_data

git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin main --force
```

### 第四步：验证清理结果

```bash
# 查看远程仓库文件列表
git ls-tree -r main --name-only

# 应该只看到以下文件：
# .gitignore
# README.md
# RELEASE_NOTES_v4.3.0.md
# QUICK_START.md
# 完整功能介绍.md
# src/grok_prompt_manager.user.js
```

---

## ✅ 应该上传的文件（公开安全）

### 必需文件

- ✅ `README.md` - 项目说明
- ✅ `RELEASE_NOTES_v4.3.0.md` - 发布说明
- ✅ `QUICK_START.md` - 快速上手
- ✅ `完整功能介绍.md` - 功能介绍
- ✅ `src/grok_prompt_manager.user.js` - 主脚本
- ✅ `.gitignore` - Git配置
- ✅ `LICENSE` - 许可证（如果有）

### 可选文件

- ✅ `docs/` - 文档目录（如果有公开文档）
- ✅ `images/` - 截图和演示图片（如果有）

---

## ❌ 绝不上传的文件（包含隐私）

### 个人数据

- ❌ `backup/` - 备份文件
- ❌ `library/` - 个人提示词库
- ❌ `raw_data/` - 原始数据
- ❌ `examples/*.json` - 示例提示词（可能含隐私）

### 旧版本

- ❌ `植人大树*.user.js` - 旧版本脚本
- ❌ `*.backup` - 备份脚本

### 测试和临时

- ❌ `tests/` - 测试文件
- ❌ `temp*/` - 临时文件夹
- ❌ `Grok prompt/` - 重复的项目文件夹

### 视频相关

- ❌ `视频相关/` - 视频数据
- ❌ `grok_image_to_video*.json` - 视频提示词
- ❌ `视频通用.json` - 视频库

### 文档草稿

- ❌ `IMPLEMENTATION_PLAN*.md` - 实现计划
- ❌ `GIT_SAFETY_REPORT.md` - Git安全报告
- ❌ `V3.3_UPDATE_LOG.md` - 更新日志草稿

---

## 🔒 GitHub隐私设置建议

### 1. 仓库设置

- 考虑设置为 **Private** 如果包含敏感信息
- 或确保 `.gitignore` 完全覆盖所有隐私文件

### 2. GitHub Secrets

- 不要在代码中硬编码API密钥
- 使用GitHub Secrets存储敏感配置

### 3. 历史记录

- 定期检查commit历史
- 避免commit message包含隐私信息

---

## 📝 快速清理命令（一键执行）

```powershell
# 复制以下命令到PowerShell执行

# 1. 移除缓存
git rm -r --cached backup/ library/ raw_data/ examples/ 视频相关/ 自动重试/ "Grok prompt/" *.json 植人大树*.user.js

# 2. 提交
git commit -m "安全: 移除所有隐私数据"

# 3. 推送
git push origin main --force
```

---

## ⚠️ 重要提醒

1. **执行前备份**：在执行强制推送前，确保本地有完整备份
2. **团队协作**：如果有协作者，需要通知他们重新克隆仓库
3. **彻底清理**：使用 `git filter-repo` 或 `BFG` 彻底删除历史记录
4. **检查GitHub**：清理后访问GitHub网页确认文件已删除

---

**完成后记得在GitHub网页上检查，确保所有隐私文件已被删除！**
