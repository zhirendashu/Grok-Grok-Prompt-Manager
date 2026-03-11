// ==UserScript==
// @name         【海伯利安】Grok Prompt Manager v6.1.4 (Hyperion)
// @name:zh-CN   Grok Prompt Manager v6.1.4 (Hyperion) | 植人大树出品
// @namespace    http://tampermonkey.net/
// @version      6.1.4
// @description  GPM v6.1.0 代号：Hyperion | 工业级架构重构版 | 一站式 AGI 生产力套件
// @author       植人大树
// @match        https://grok.com/*
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-start
// @grant        GM_download
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.min.js
// @require      https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js
// @require      https://cdn.jsdelivr.net/npm/dayjs@1.11.13/plugin/utc.js
// @connect      raw.githubusercontent.com
// @connect      twitter.com
// @connect      x.com
// @connect      pbs.twimg.com
// @connect      video.twimg.com
// @compatible   chrome
// @compatible   firefox
// @compatible   edge
// ==/UserScript==

/**
 * 📜 Changelog
 *
 * v6.1.4 (2026-03-08):
 * - **🔧 修复**: 点击提示词后无法置入 Grok 输入框的问题
 *   - 根因 ①：`getInput()` 第二级回退找到 `lastActiveInput` 后直接 return，没有先调用 `.focus()`
 *   - 修复 ①：在 return 之前增加 `this.lastActiveInput.focus()` 调用
 *   - 根因 ②：`insert()` 中换行符写成了 `'\\n'`（字面两字符）
 *   - 修复 ②：将两处 `'\\n'` 统一修正为 `'\n'`
 *
 * v6.1.3 (2026-03-08):
 * - **🔇 静默修复**: 拦截 Grok 网页改版后触发的 ResizeObserver 无害警告弹窗
 *   - 问题：Grok 页面更新导致 `ResizeObserver loop completed with undelivered notifications` 反复弹出
 *   - 修复：在脚本入口注入 `error` 事件拦截器，静默处理该类错误，不影响任何功能
 *
 * v6.1.2 (2026-02-07):
 * - **🔧 修复**: 三连抽取、多类混合、混沌生成三种模式现已正确实现全局随机
 *   - ✅ 三连抽取 (Random3): 从所有库全局随机3条（修复前：仅当前库）
 *   - ✅ 多类混合 (CatMix): 从全局每分类随机1条（修复前：仅当前库分类）
 *   - ✅ 混沌生成 (Chaos): 从全局随机5-12条（修复前：仅当前库1-5条）
 * - **📝 代码清理**: 移除未使用的 setOnRandomReq 方法
 * - **📖 文档更新**: 更新使用指南准确描述全局随机机制
 * - **🎯 实现细节**: 三个模式都采用与写真模式相同的全局提示词池收集策略
 *
 * v6.1.1 (2026-02-04):
 * - **随机模式全面迁移**: 完整迁移v5.0.2的所有7种随机模式到v6.1.0架构
 *   - ✅ 写真模式 (Portrait): 1前缀 + 10条全局随机
 *   - ✅ R18写真 (Adult Portrait): 1前缀 + 1成人词 + 10条全局随机
 *   - ✅ 视频随机 (Video Random): 1条专用库
 *   - ✅ R18视频 (Video R18): 1视频 + 1R18修饰
 *   - ⚠️ 三连抽取 (Random3): 当前库3条（v6.1.2已修复为全局）
 *   - ⚠️ 多类混合 (CatMix): 当前库每分类1条（v6.1.2已修复为全局）
 *   - ⚠️ 混沌生成 (Chaos): 当前库1-5条（v6.1.2已修复为全局5-12条）
 * - **首次使用引导**: 每个模式都有详细的使用说明弹窗
 * - **Toast提示**: 成功生成后显示来源和数量信息
 * - **逻辑审计**: 确认全局随机池正确从所有同类型库收集提示词
 * -  **架构验证**: 功能与v5.0.2完全一致，逐行代码对比通过
 *
 * v6.1.0 (2026-01-29):
 * - **逻辑链修复**: 修复了由于变量名不匹配导致高清图标点击无法触发布控逻辑的隐蔽 Bug。
 * - **全局绑定**: 正确挂载 `upscaleManager` 到全局窗口，确保 UI 状态切换与逻辑引擎同步。
 *
 * v6.0.9 (2026-01-28):
 * - **双塔物理切换**: 采用独立的红/绿源码图标进行 InnerHTML 强更，彻底根除变色失效问题。
 * - **逻辑重连**: 修复了上个版本中因代码段匹配失败导致高清点击失效的隐蔽 Bug。
 *
 * v6.0.8 (2026-01-28):
 * - **物理级修复**: 在图标源码层级锁定红/绿色彩。彻底解决高清模块点击后图标不换色的“死穴”。
 * - **兼容性重写**: 弃用 CSS 类逻辑，回归最高级别的硬编码切换，确保任何系统下视觉 100% 对齐。
 *
 * v6.0.7 (2026-01-28):
 * - **终极修复**: 采用 CSS 类驱动机制重写“自动高清”图标变色逻辑，彻底解决点击后不换色的 BUG。
 * - **反馈增强**: 视觉状态切换响应速度提升，红/绿语义更加鲜明且不可被覆盖。
 *
 * v6.0.6 (2026-01-28):
 * - **UI 深度修复**: 解决“高清模块”点击后图标颜色不跟随状态切换的视觉 Bug。
 * - **反馈对齐**: 参考预览模式，实现红/绿双态像素级实时反馈。
 *
 * v6.0.5 (2026-01-28):
 * - **品牌化文案**: 移除平庸的中英对照，升级为文艺感核心词：图片面板 -> “映 画”，视频面板 -> “视 阈”。
 * - **UI 气质**: 提升整体视觉的高级感与排版美感。
 *
 * v6.0.4 (2026-01-28):
 * - **视觉对齐**: 规范“自动高清”模块色彩语义。开启显示绿色 HD+状态点，关闭显示红色 HD+禁用斜杠。
 * - **交互细节**: 点击高清按钮时，图标会实时通过颜色反馈状态切换。
 *
 * v6.0.3 (2026-01-28):
 * - **完美修复**: 彻底解决“自动高清”模块无法切换的 Bug。恢复了 UI 控制权与逻辑链路。
 * - **状态同步**: 高清图标现在支持绿/红双态实时切换，直观展示后台扫描状态。
 *
 * v6.0.2 (2026-01-28):
 * - **视觉增强**: 重塑“自动高清”图标。将原本难以识别的胶片图标更换为直观的“HD”专用矢量图标。
 * - **UI 细节**: 优化侧边栏底部操作区图标的对齐逻辑。
 *
 * v6.0.1 (2026-01-28):
 * - **视觉优化**: 全面移除 UI 界面中的 Emoji 图标，替换为精致的 SVG 矢量图标。
 * - **图标语义**: 修正“自动重试”图标。将不相关的五角星更换为符合语义的“循环时钟”图标。
 * - **规范化**: 确立小版本连续升级机制。
 *
 * v6.0.0 (2026-01-27):
 * - **架构重构**: InputManager 全面切为原生指令驱动 (document.execCommand)，彻底解决光标跳动与状态丢失。
 * - **UI 2.0**: Prompt Inspector 引入 SVG 矢量图标与毛玻璃动效，视觉体验大幅提升。
 * - **健壮性**: 移除语言依赖的选择器，实现跨语言环境的高效定位。
 *
 * v5.0.2 (2026-01-20):
 * - **性能优化**: 引入全局防抖 (Debounce) 机制，重构 DOM 监听器，显著降低内存占用与卡顿
 * - **健壮性**: 修复 App_ID 硬编码隐患，提升长期维护稳定性
 * - **体验优化**: 批量视频生成增加中断保护，防止误操作无法停止
 * - **修复**: 修正 AutoRetryManager 启动时可能因初始化顺序导致的报错
 *
 * v5.0.1 (2026-01-19):
 * - **修复**: 严格限制 GPM 面板仅在 grok.com 域名加载,防止在 X.com 意外展开
 * - **优化**: 完善域名隔离机制,确保 Grok 提示词管理器和 X-Lens 模块互不干扰
 *
 * v5.0.0 (2026-01-19):
 * - **新增**: 集成 X-Lens (原推特女秘书) 核心模块，打造 "Grok + X" 双核终极版
 * - **新增**: X.com 专属功能面板 (自动化点赞/转发, 高清媒体下载, 沉浸式影院模式)
 * - **优化**: 智能双核驱动 - 在 Grok 显示提示词面板，在 X 显示 X-Lens 面板，互不干扰
 * - **修复**: 解决了 X.com 页面上的 UI 冲突与启动逻辑
 *
 * v4.9.2 (2026-01-18):
 * - **BUG 修复**: 彻底解决下拉菜单操作时面板自动收起问题
 *   - 机制：引入 Focus/Blur 交互状态追踪
 *   - 效果：当用户聚焦于下拉菜单或输入框时，强制锁定面板显示
 *
 * v4.9.1 (2026-01-18):
 * - **交互优化**: 优化自动隐藏逻辑 (Smart Auto-Hide)
 *   - 修复：操作下拉菜单或输入框时，面板不再自动收起
 *   - 逻辑：检测焦点元素，若正在输入或选择，暂停自动隐藏监测 2 秒
 *
 * v4.9.0 (2026-01-18 03:05):
 * - **UI 优化**: 全新极简线条风格图标集
 *   - 🎲 骰子：简化为 5 点骰子
 *   - 🎞️ 胶片：简洁的胶片条设计（HD/HD_ON/HD_OFF 统一更新）
 *   - 📷 光圈：六边形光圈叶片
 *   - ❤️ 心形：简洁心形轮廓
 *   - 💾 导入：简洁向下箭头
 *   - 📤 导出：简洁向上箭头
 *   - 📦 备份：简洁盒子设计
 *   - 📝 草稿：简洁文档图标
 * - **BUG 修复**: 修复图标 CSS 样式问题
 *   - 问题：`.gpm-svg-icon` 的 `fill: currentColor` 导致线框图标被填充成实心
 *   - 修复：改为 `fill: none; stroke: currentColor;` 确保线框图标正确显示
 * - **设计理念**: 统一 UI，极简线条，易于识别
 *
 * v4.8.0 (2026-01-18):
 * - **新功能**: 批量生成视频 - 集成到自动重试面板
 *   - 🎬 勾选框：启用/禁用批量生成功能
 *   - 🎬 一键生成全部：自动查找可见范围内所有"生成视频"按钮并点击
 *   - 智能识别：只点击 aria-label="生成视频" 的按钮（跳过已生成的）
 *   - 防限流：每个视频间隔 2 秒
 *   - 进度提示：显示成功/失败统计
 * - **优化**: 自动重试功能默认开启
 *
 * v4.7.0 (2026-01-17):
 * - **稳定版发布**: 图标风格全面统一，UI 体验优化完成
 *   - ✅ 所有功能图标统一为 SVG 格式
 *   - ✅ 统一的线条风格和视觉语言
 *   - ✅ HD 功能指示器（绿色胶片 + 呼吸动画）
 *   - ✅ 自动重试图标（专业循环箭头）
 *   - ✅ 智能面板显示逻辑（根据场景自动调整）
 *
 * v4.6.2 (2026-01-17):
 * - UI: **HD 图标恢复**为功能指示器（绿色胶片 + 呼吸动画）
 *   - 展示自动高清功能正在运行
 *   - 不可点击切换，保持常驻开启
 *   - Tooltip 说明："自动高清: 已开启 (Auto Upscale: Always ON)"
 *
 * v4.6.0 (2026-01-17):
 * - **重大更新**: 移除 HD 切换按钮，功能保持默认开启，简化 UI
 * - **体验优化**: 重构面板显示逻辑，参考早期版本实现更智能的行为：
 *   - 🏠 首页：默认隐藏所有面板，提供干净的对话界面
 *   - ⭐ 收藏页：完全隐藏面板，沉浸式浏览作品
 *   - 🎬 视频详情页：自动展开右侧面板（视频提示词）
 *   - 🎨 生成页面：恢复用户上次的偏好设置
 *   - 所有场景都支持手动切换，不会强制干扰
 *
 * v4.5.5 (2026-01-17):
 * - Fix: **HD Toggle Complete Fix**. 修复 HTML 模板中硬编码的 HD_OFF，现在默认显示绿色 HD_ON 图标
 *   - 刷新后：绿色胶片（开启）
 *   - 点击后：红色胶片 + 斜杠（关闭）
 *   - 功能与图标完全同步
 *
 * v4.5.4 (2026-01-17):
 * - Fix: **HD Toggle Final Fix**. 彻底修复 HD 按钮切换问题：
 *   - 开启 (ON): 绿色胶片图标 (#00ba7c)
 *   - 关闭 (OFF): 红色胶片图标 + 斜杠 (#ff4d4f)
 *   - 颜色直接硬编码在 SVG 中，不再依赖 CSS 继承，确保 100% 可见
 *   - 默认状态：开启
 *
 * v4.5.3.4 (2026-01-17):
 * - Feat: **Home Auto-Hide**. 首页 (grok.com) 默认自动隐藏侧边面板，提供沉浸式体验 (除非手动开启).
 *
 * v4.5.3.3 (2026-01-17):
 * - Fix: **HD Icon Glitch**. 修复了 `+ undefined` 显示问题，确保状态文本正确。
 * - UI: **HD Button Polish**. 升级为"胶片 (Film Strip)"图标，增加红/绿状态指示灯 (Red/Green Status)。
 * - UI: **Icon Refresh**. 更新导入/导出图标为更具质感的托盘风格 (Tray Style)。
 *
 * v4.5.1 (2026-01-17):
 * - UI: **Claymorphism**. 新增软陶风格微交互 (Soft 3D Shadows & Hover Effects)。
 * - UI: **Icon Evolution**. 导入/导出图标统一为托盘风格；HD 开关升级为动态电视图标 (TV On/Off)。
 *
 * v4.5.0 (2026-01-17):
 * - UI: **Total Icon Overhaul**. 全面重绘 UI 图标，采用 iOS 风格极简线条设计 (1.5px Stroke)，统一视觉语言。
 * - UI: **Premium Aesthetics**. 替换了所有旧版填充图标，提升整体科技感与精致度。
 *
 * v4.4.1 (2026-01-17):
 * - UI: **Icon Polish**. 优化 HD 开关图标，使用更清晰的几何线条风格。
 * - Fix: **Logic Refined**. 优化收藏页自动隐藏逻辑，仅在首次进入时触发，允许用户手动展开。
 *
 * v4.4.0 (2026-01-17):
 * - Feat: **Auto Upscale Integration**. 自动高清模块已集成至主脚本。
 * - UI: **Video Panel Exclusive**. HD 开关仅在视频面板 (右侧) 显示。
 * - Feat: **Favorites Auto-Hide**. 进入 /imagine/favorites 收藏页时自动隐藏所有面板，提供沉浸式浏览体验。
 *
 * v4.3.1 (2026-01-17):
 * - UI: **Iconography Upgrade**. 全面替换为 SVG 单色图标，统一极简深色风格。
 * - Refactor: **Video Library Standard**. 视频随机模式库名标准化为 "随机视频专用" (严格匹配)。
 * - Fix: **Clean Slate**. 移除实验性 Gemini 代码，回归纯净稳定版。 *
 * v3.3.3 (2026-01-17):
 * - Feat: **📸 写真模式 (Portrait Mode)**
 *   - 在随机骰子菜单中新增 "写真模式"。
 *   - 允许设定固定的开头提示词 (Prompt Prefix)，支持持久化记忆。
 *   - 随机部分逻辑升级：**从该类型的所有库中**随机抽取 3-5 个提示词进行组合，不再局限于当前库。
 *   - 提供多样化的创作灵感，同时保持统一的画风框架。
 *
 * v3.2.2 (2026-01-17):
 * - Fix: **CRITICAL** - 实现真正的文字/视频库分离
 * - 导入时自动设置 libraryType 字段 ('text' 或 'video')
 * - 加载时按 libraryType 过滤库列表
 * - 文字面板只显示文字库,视频面板只显示视频库
 * - 导入到视频面板的库不会再出现在文字面板
 *
 * v3.2.1 (2026-01-16):
 * - Fix: **CRITICAL** - 修复粘贴导入标题丢失问题。重构 addNewPrompt 参数传递机制，改用对象模式避免参数错位。
 * - Fix: 粘贴导入按钮现在正确传递 name 字段，确保 【标题】 格式被正确识别和保存。
 *
 * v3.2.0 (2026-01-16):
 * - Feat: **Gold Standard Import Protocol**. Full support for Markdown `###`, Book Titles `《》`, and Tab-delimited imports.
 * - Feat: **Robust Paste Logic**. Added "Emergency Giant Block Detection" to handle missing newlines in pasted text.
 * - Feat: **Smart Draft Routing**. Prompts and Variables now intelligently route to Draft Panel if open.
 * - Refactor: Import UI now includes a "Copy AI Protocol" button for standardized prompt generation.
 *
 * v3.0.1 (2026-01-12):
 * - Baseline established.
 * - Version bump to 3.0.1 to allow strict versioning.
 *
 * v3.0.2 (2026-01-12):
 * - Fix: Modifiers (Tags) now follow the same smart insertion logic as prompts.
 *   (Insert to Input if draft closed / Insert to Draft if draft open)
 *
 * v3.0.3 (2026-01-12):
 * - Feat: Restored panel state persistence (Size & Position).
 * - Panels now remember their last position and size after reload.
 * - Added storage size monitoring (Log warning if > 4MB).
 *
 * v3.0.6 (2026-01-12):
 * - Feat: Integrated "Prompt Inspector" (Sniffer) functionality.
 * - Inspect original tags, prompts, and remix history directly on image cards.
 * - Stores prompt data locally via API fetch interception.
 *
 * v3.1.0/v3.1.1 (2026-01-13):
 * - Feat: Integrated Auto Retry & Auto Fix independently for Video Panel.
 * - Feat: Independent Quick Tags (Modifiers) for Image vs Video panels.
 * - Feat: Auto-hide panels on Favorites page for clean gallery view.
 * - UX: Smart Layout - Preview Windows and Auto Retry Panel now intelligently pop out to the left to avoid screen overflow.
 * - UX: Refined tooltip behaviors and visual alignment.
 *
 * v3.1.3 (2026-01-14):
 * - Fix: Restored "Image Inspector" (✦) button on image cards by user request.
 * - UX: Removed explicit "Edit" button from list items to reduce clutter (Edit accessible via Right-Click).
 * - UX: Clarified "Paste Import" instructions to support Tab-separated values and double line breaks.
 *
 * v3.1.4 (2026-01-14):
 * - Feat: Added "Right-Click to Rename" for Library Selector.
 * - Feat: Added Category Management (Add/Import/Export) buttons to the category bar.
 * - Feat: Auto-expand "Inspector" panel on Post Detail pages.
 * - UX: Standardized "Paste Import" description to Chinese format.
 */

(function () {
    'use strict';

    // 🔇 静默 ResizeObserver 无害警告（Grok 网页更新触发，不影响功能）
    window.addEventListener('error', e => {
        if (e.message?.includes('ResizeObserver loop')) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);

    // ✨ SELF-EXCLUSION: Do not run UI in the Assist Popup
    if (window.name === 'GrokAssist') {
        console.log('[GPM] Running in Assist Mode - UI Disabled');
        return;
    }

    // --- CONSTANTS ---
    const DB_KEY = 'grok_v2_data';
    const OLD_DB_KEY = 'grok_prompt_manager_data';
    const APP_ID = 'grok-prompt-manager-v2';

    // 核心 UI 主题配置 (硬核深色风格)
    const UI_THEME = {
        primary: '#6366F1',
        glassBg: 'rgba(18, 18, 23, 0.98)', // 接近实色的深黑
        glassBorder: 'rgba(255, 255, 255, 0.15)', // 略微增强边框感
        blur: 'none', // 移除透明感
        shadow: '0 12px 48px rgba(0, 0, 0, 0.6)', // 增强阴影以区分层次
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        radius: '12px' // 略微收窄圆角，更显硬朗
    };

    // --- UTILS ---
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // --- PROMPT INSPECTOR STORE & HOOK ---
    const GLOBAL_POST_STORE = {};

    // 🔥 Fetch Hook - Intercept API requests to cache Prompt data
    // NOTE: Must use unsafeWindow because we are in a sandbox (GM_ grants)
    const originalFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = async function (...args) {
        // console.log('[GPM-Hook] Fetch:', args[0]); // Optional spam log
        const res = await originalFetch.apply(this, args);
        try {
            const url = args[0]?.toString() || '';
            if (url.includes('/rest/media/post')) {
                console.log('[GPM-Hook] Captured Post API:', url);
            }
            // ✅ list page
            if (url.includes('/rest/media/post/list')) {
                res.clone().json().then(data => {
                    data.posts?.forEach(post => {
                        GLOBAL_POST_STORE[post.id] = post;
                        if (post.originalPostId) GLOBAL_POST_STORE[post.originalPostId] = post;
                        post.childPosts?.forEach(child => GLOBAL_POST_STORE[child.id] = post);
                    });
                }).catch(() => { });
            }
            // ✅ post detail page
            if (url.includes('/rest/media/post/get')) {
                res.clone().json().then(data => {
                    if (data?.post?.id) {
                        GLOBAL_POST_STORE[data.post.id] = data.post;
                        if (data.post.originalPostId && data.post.originalPost) {
                            GLOBAL_POST_STORE[data.post.originalPostId] = data.post.originalPost;
                        }
                    }
                }).catch(() => { });
            }
        } catch (e) {
            console.error('[GPM] Fetch hook error:', e);
        }
        return res;
    };


    // --- ICONS & ASSETS ---
    // User can replace these SVG strings to customize icons.
    // User can replace these SVG strings to customize icons.
    const ICON_SET = {
        Dice: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3"></rect>
            <circle cx="8" cy="8" r="1.2" fill="currentColor"></circle>
            <circle cx="16" cy="8" r="1.2" fill="currentColor"></circle>
            <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
            <circle cx="8" cy="16" r="1.2" fill="currentColor"></circle>
            <circle cx="16" cy="16" r="1.2" fill="currentColor"></circle>
        </svg>`,
        HD: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7v10M10 7v10M4 12h6M14 7v10a4 4 0 0 0 4-4v-2a4 4 0 0 0-4-4z"></path></svg>`,
        HD_ON: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="#00ba7c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#00ba7c !important;"><path d="M4 7v10M10 7v10M4 12h6M14 7v10a4 4 0 0 0 4-4v-2a4 4 0 0 0-4-4z"></path><circle cx="21" cy="7" r="2.5" fill="#00ba7c" style="fill:#00ba7c !important;"></circle></svg>`,
        HD_OFF: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round" style="color:#ff4d4f !important;"><path d="M4 7v10M10 7v10M4 12h6M14 7v10a4 4 0 0 0 4-4v-2a4 4 0 0 0-4-4z"></path><line x1="2" y1="2" x2="22" y2="22" style="stroke-width:2.5; stroke:#ff4d4f !important;"></line></svg>`,
        AddLib: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L19 6.5V17.5L12 22L5 17.5V6.5L12 2Z"></path>
            <path d="M12 8L16 10.5V15.5L12 18L8 15.5V10.5L12 8Z"></path>
        </svg>`,
        DelLib: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>`,
        Import: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
            <path d="M20 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"></path>
        </svg>`,
        Export: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
            <path d="M20 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"></path>
        </svg>`,
        Backup: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
        </svg>`,
        Draft: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
        </svg>`,
        Paste: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>`,
        Sort: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>`,
        AddPrompt: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
        PreviewToggle: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
        Minimize: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
        AiAssist: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><polyline points="21 3 21 8 16 8"></polyline><path d="M12 7v5l3 3"></path></svg>`,
        Menu: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
        Pin: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v9l3 3v2h-7v5l-1 1-1-1v-5H4v-2l3-3V6Z" fill="currentColor"></path></svg>`,
        Edit: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
        Trash: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
        Close: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        ArrowDown: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`
    };

    // --- ICONS (Base64) ---
    const APP_ICON_BASE64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAAAXNSR0IArs4c6QAAIABJREFUeF7svQlgVOW5Pv6dZfbJTLbJSkLIQljCDgKCIC4oKkVBULRWpV5q663/6q1ttbWm1V57a9vbnxYVrQgVBUH2RUT2TQIESCCEQFaykX3P7Of8fb5zvskhhk3ASzDTxmFmzpw5y7s87/s+7/txpOfRcwW+x1eA+x6fe8+p91wB0qMAPULwvb4CPQrwvb79PSffowA9MvC9vgI9CvC9vv09J9+jAD0y8L2+Aj0K8L2+/T0n36MAPTLwvb4CPQrwvb79PSffowBXKANFRUXGuro6q8/nEyRJEnme50wmk0eSJE9wcLArISHBzXGcfIU/0/P1a3QFehTgIhdWllEsVOT3vffeE91ud2R9fX2/5ubWtOqzZ0c2NNXHCYJoNej1oizLnCCKkt1ud4mi2CxJUonJZNrucDi+fOmll2oJ29E1upk9u738K9CjAOo1W7ZsmWCIMZhr884EtbS0B5nNVhMhRCcIghhkMgmNrU3Clm07+xfml0zzeDyDPR5vWITDYejXvx9JSkoiwSHBROAFYrVaSEhIKNHr9cTn83nPnj1bcqbszApnm/ODwYMHF86aNct/+bep5xvX6gp8rxXg0KFDOpPJE3TkyMmo/KLCRIvRNCQ4OHiQz+fv5Zf9VsLxBr2gE6xWk1xaWiasWbvW7vXI9jFjxur69u1LHA4HCQkOpsKOhyzLxC9JRBR16v2SZb/fL1VVVVXk5eUt5nl+wSuvvFLIcZx0rW5oz34v7wp8LxUAuD0nJ6dPXWP1CIMoDvL5fQNO5Z1K8Xg8EQ5HhNXj9ehaWloI4TgSFRFBwh3h5NixY2TD+s+JxWIj99xzLxk5ciTR6XTE6/USQRCxKZElifCCQDiOo8rA8wJFPS6n019aVlZaWlr6rtvtXvTGG2+cvbzb1LP1tboC3ysFAEZfsGBBdG7u8SmcwE2Nj48bFGQNCm93thqPZR8XTp/O45qbWrn6+nqu3ekkoiiQ4OBgauk9Xi/xe/1k/LgJZNSom0hwSAgVcgi7IAj03xIUAEIvywT/Y16BEI40NTd6co7nfNXU1PTXMWPGbJ01a5bzWt3Unv1e+hX43ihATk6OfsWKFSO2bds698SJnLtFUQiPiIzgBYHnfF4f5/V5qTV3u91UmMPCwkh873gSGxNLoqKiqGWHIPdLHUBCgkOosEP4OY4PXG0ojOT3E6/PRzieJ7zqCQSeRzzgzzlxoqKgoGCzXq+fN2bMmOyeeODSBfVabXlDKwAs/o4dO4Tm5uaIvXv33rV165YnT5/OG+FyuU08r8AUs9nMRUVHk16xsSTc4SCOsDAS2yuOxMfHk8jICCKKIoFyOJ1O4vX6iEFvou/B6iM/JPlh9RUlwP7wkCTlGRcX0AjKI8uy3NDQ4Dt27NiZmpqaxREREe+lp6dX9mSGrpVoX9p+b0gFgOBv3rzZbLPZ4kWRH9rY2Dgp48CBCdu2ftmnqqpKbzAaSWtrOzlbWUUF22Ixk9jYXmTw4EHk9jvuIAm9exOOcESSJVWoYek5wkFpINyAPTxPBV2WO+JZKvD0fXwPiqB4CZ1OhAfAv+Wqqip3bm5uTnt7+zsGg2Hln//854ZLu1U9W12LK3DDKQCEf8mSJRGESHf27dt3emho6Gin0xlWVFSkz83N4fySn8KWY9nHyb59+0lDQwOx2WykT58+ZOyYsWTEiJHEHmxnWRxqxxnWpwqgFAYCFh8C7vdLxOf3IdglLa0t1CuEhoQQs8VMlYXneOL3K9lPv98vl5SUuAoKCg63tbW9nZaWtvaZZ55pvRY3t2efF78CN5QCQPjfe++9OKfTOaNfauqjA9MGDvD7/aaqqrOksrKSlJadIWVlZaSosIgUFhYTv08ivRMSyIABA0jv3r1JZGQksVqt37hqCtbnqEVntSx4Bzyam5pJUVExqTp7lrS2tRCfXyLBNjtJ7ZdKoqIiiU6nV+ASg0gchzhDLiwoaD916tQ+nuf/OmXKlJ333HOP++K3q2eLq30FbigF+Pjjj1NOHD8xJz4hfvrEiRMToqKi9I2NjeR4znGybetWcvDQAVJdXU0sZgtJTEwiaWmDSHJyMgkNCaUwBRkcZG+YwHe+2LD+NNsjS8Tn9VHvUVBYQM6cOUNfIxbweDw0PQqPYDQYSWKfRIJiGRQL34MygBjR7nTKhw4faj518tRKURTf+Oijj3Kv9s3t2d/Fr8ANowBbt25NOnr46H/ag+0Pjb15bJTdbueKiorIjh07yPp160hRUSFNad48bhy5adRNJDauF7Hb7NSqszQmcPo51rrT9WNeAPl+n99PDmUeIgcPHqQKA6WC8LtcLppNguK1trWR6KgoMmrkSIK4w2gykdS+fRF4U0gEBdqzZ09hbW3tG2PHjl363HPPNV78lvVscTWvQLdXgNOnTxsKCwtHnD1b8bTdHnxvcnJKSHNzM7dnzx6ydetWkpmZSZqamonJZCS3TJhA7po8mdTV1ZGGhnoyaNBg0qtXL3o9Yb0NBoMawCpe4HweAAoA3O/2uEnmoUNk+44ddJ8Wi4XoRB31IsgUYZ8mk4mEhIQQg95A4uLjSGpqKn1tNBhoujQnJ8d5+vTpPSaT6a3k5OTtPfHA1RTvi++rWyuALMtCSUnJYKez/Rcej3tadVW1PePAAQgVqayoJBUVFaS8opK43S5isVjJgAH9SVBQELXSAwcOJGPGjCExMTEdaUzAH8LR1yyl+c1LiHhAyfAgoG5qbCIZGRlk166dpLyigmaJ4GkQT4SGhlKloqlUr1JniIuLI0OGDKGfI5NUXFLs37Vrd2NDQ8PWuLi4+X379v3q+eef7ymSXVx2r8oW3VoBampqgnien2U263/l90spBQWFHIQfge6BAwfIvr1fkdq6Ogo3gO9R3IIFhtBHRkWSoUOG0CIXBFSL+1nWp6srTFOckkyhEjA9U4JTp04R/JWXl9M4A8EyAmDAHSgBPEGw3U7swcGkT58EGoPg/UOHDpEtW7b46+rqakJCQrYMHDhwwf3337+vJyi+KvJ90Z10awVobGwM4Tj5CYNB/0tB4GN8Pj9xOl2ktLSULFy4iHy8+GNSX1+P5DwVxujoKBIXF0+amhqp0N955x1k9OjR1CvAOkMJYP3Z84WuHhTK7/MpuX4eqVA/3UdTUxNVQHgZ/FVXV5Hi4hLSUF9PwsLDqRKGhoWSlOQUkpiYSOMGBNGFhYX+6urqekmStoSHR7318MMPHpw0aZLvonewZ4MrugLdWgHq6+vtOh33I73R8GtREGJpJoYTSHVNDfnwww/JBx8sIGVl5TSXb7UGUYsL5ia4PaGhwSQ2NpZSmaEMEMzY2Bgi6nQUx5/vwQJhCWQ3NT3KskO0+oVcv6TUCvB+Q2MDycrKIsVFxSQ0NIQkp6TQuAOeAaxRQVDqCFCkpqYmKTs7uyY/P39FSEjIP+bPn3/6iu5uz5cvegW6tQKcPHkyKDY2arZer/+dIPBxrPp6POcEeeWVV8iuXbuIx+2lAqbTGxQBTEyiwarRZKBCCIGOjo6mefteveKIThQDFVxcPcryxD80PV2IExS6W8ebVPZR/ZX99JkXeAqVQI+GdzDq9TQ96vH5iM/rDQTe+AfNQhGZeoOamlpp7949xWUVZX+Zdt+0pT/5yU+aLnoXezb41legWyvA2bNnLWaz4SGDwfgyx5MECBxgEKjL//h//4/s3buPBqmgOwCyREVFk76pqSTC4SAGg54EB9spDElKSiQWq5W4XUotShAV4huz6OdcXZXghkwQixuYBwB8wh8EngbRUAqOVn/paygX1RNKlVYCbXgfWH+kYLEdMks5x4+7jxw+skmS5T8NHjw4Mz09vad/4FuL+IW/2K0VQJZLTdXVwoNGoyndZDb24Tmeg9w1NzeTLVu3kr/97e/kyOEjlLODIDQlJYX0S+1PzGYTxe19+6aQfv36UWhEC1SqcIMqwbKgVJA5/F+hQUCAkb1hzS/4N4VFqAzD8qufsTQqhJrtF96AwSYWayjVZeVB6RIcIbXVtWTX7l0n6uvr/zJgwIBV6enpzdfo/n/vd9vNFUDWFxaenmqxBL0WGhqcKskyB3mqqa4hK1euJO+8+w4pPVNK8+3g+wxKG0QpD0iLQuiHDh1KYwBAIUp3Vvn9ASutagHF80xUIOyqRQfxjXoJDkqh0B0UIpxCmMNneE0tvN+npEQFgUIytq3T5aSNNFAwxASASc3NTWTvvn1VpaWln0RERLw9b968gp7G+mujq91aAcDx9/v9U0JDQ191OMLTADg8bg/ZsXMn+ee8eeSrr76iBDVAmqjIKJLSty+x24JoBxdSoWlpaQRUaINeT4UWXgBWGoLLKM4U/qtwhtp/1Quw9xkMgvUGhgfxTW/QUy/R5nSS+ro62mOAY6BVZpkQq8VKLFYL9VTIGGH/4WFhtECm0+spXMvPz289fDjzgMEg/v2mm8ZuffLJJ13XRgS+33vt9gpwtqzsrtj4+Ff7JCYOBhkOpLe3/vkW+WjRR7TaCwEFznZEOCjjExkYZHt6906gKVGj0ahwdHiBbscEO5DZoYGwSodW6c6w7l6Ph/6hcwxp19OnT5O2tjaCXuH+/ftTj1NVVUWOHDlC34fnQfoT/CDwggDJXG6kSt3UK+A48Ps0VtCJyF5JO3fubGxvb103YEDaPwcMGHCkp4Hm6itrt1eAxpbGKRFhEa9GR0encRzHbf5yM3njL2+QEydOkPb2drXpxUShzqhRoyjmR/oTkxsY0FcaVzoYnzR2VXt8gW+oN5Bl2hYJ/g4KXWfPVtGiV2VlBXG2O2n6NDw8nIwcOYL079efCjmEubmlhfh8Xgp/kH2C90EPAYJeRpdgcIjGAIBhPEdcbg+pq62VTp06VV9WVva53W7/Z1hY2KGrFRDDWCxfvpyfOXOm/H1u0u/WClBRUWEuKyt7ICIi4rcx0dH9PB4P99HixWTBhwtocamxoYFy8/skJpLJd02mJLiIiAiKs2l2xuen+ByZFwgxrDC1xGhy1xS3YMGLi4vJyZMnSXl5GWlpbaWCjGwSOsfgWZBKpVwgnU6lTit5UcWrcLRizC524KJrYgxm21j8ge8CCrW3t0snT548m5eXtzwsLOyfr7/++hXHAxD+F154wdHY2JgmiqIUFxeXFx4eXvuTn/xEyc9+jx7dWgFQB5B80kNh4aG/CQ0NTXS6XNwXX3xBPv74Y5JxIIPU1mAWFSEjRowgU6dOpZif5f4hjSic1dc3kLy8kxSuICWKTJHZZKJtkNXVNRTaQPBh9ZFNAnzCNhD60LAwYrVYAtDpHLlhWVC1jsAaabRwCm5GjZWVDJP6x7rPaF1BkkhNTY1v3759hcWlxfNum3jb4ueff77+SmR0+/bt4vvvvz88Nzf3Z16vNyk+Pv5AVFTUnpiYmKP3339/WWFhIfc1Q9USHh4O+WidNWuW50p+73r+brdWgCNHjgSbTKbHwx2OX5rNpl6w6KAnz5v3T7J16zYaZOKBgHfosKHkjtvvoBgdVhpjT+AlAJXA5ARxLdgeTGnOgsBTOnNJSQmlNgDP9+vfn1KZYekBb9gsIApf0DopdeT28Z6SBlXyR1piHbI9aAhQnpUWy0APAiuwqT0HCKixH8ClvFOn2rKOHt1rtVr/PnTo0J1XEhTDAzz++OMxx7Ky5pSWlj4h6HQWk9lcbTaZssNDwo+7fW6uqakpXKfT+eLi4jIHDx58oE+fPuU3oofo1gqwYcOGqF69ev1nbGzs09Ygaxgs+rp168gbb7xBsrOz1TEl4AHpSEx0NBl/y3iSlJRMYc7ZyrOksKiACieyMuDuQ+CrqqtoZjMsNIwkJyWStEGDKIHO4QinfKJA9gf5fzVDpC2IsepXhwLQpkrle+p/qKVX9ID2ECteQFEUekPwBrwDoBOtIxBkmHw5OTk1BQUFK81m89t//etfT14Jdv/www+N77///l0ncnJ+297ePpxHAC5J4B6hGshJkiTIsux3OBzF/fr125GcnLx00KBBmc8+++wN1bnWrRVgyZIlCcnJyb9JTEp81G6zWwvyC8j//OV/yMpVK0lrS6vKAuVpjy+gDzg+wPa2IBsNbBG04hn4vqy8jH7HbrfToVdjRo+mkAmTIrRNMgEOkNofDKlWCl2Ko6fKoNh9peKLz84pJHwTEHR8v4NaQffCK3GKQtTjidPZLmUcOHCyuqrqrZSUlE9ffPHFK2qonzt3bvS2bdueLSoq+rksSRZa5FMLgjgheENRFP0RERFVSUlJGQMGDFg2cuTIzU899dQVQbDrCRJ1bwVYtSqhX0LCi0lJSY/IkmRd8ulS8u4771KBBhOTTWVg6UWPx00FCRkZBMP9+qXSbdDTCyFLSEig7FAUyKAcgigSv99HZL9Ce1CsspYWpEyKoLUBtYjGqr4BT9Gpsabjgiv/YpMnWGWYZYTY/hCQ02oxVTKJHD9+vG3fvn3bOY773wceeGDP+fA5YM5bb72lR8NQTU1N6NdjGeNlWbZLkqSTZVnU6/WeqKio/Ly8PGtWVtZzlZWV98qybMHvUK9Dz0epeOt0oicoKKjdYrVWR0dHrxs3bty/WlpaCt57771uHzR3ZwXg1mzalJQYF/diYu+Eh0rOlFjeeecdmndH8AuLjiIYAldOUCJRxr0JCQmmeXlUXpHhAa6H4CO4BTUaEAkZGFXmFZiigTBaJiiyOzDxsPQqfuly1A+jRrB4gO2P4n+Yek2sAKWiA9VVJh62AfUaxwHGaGZmZmlxcfGHRqPx/QULFtDZQhD4hQsXGg4ePBh86tQph9vtjuA4LgFBbmNjY//q6up+mI4hSZKB53nJbDbXJSX12TB27LhVx48fH3XkyJFnm5qbeimBN4Rf9WxU+Qgt8MmyLFmDgmqTk5M3xMfHLxw8ePDhV155pa07V6m7rQJgmnNkZORgh8Pxu5iYmHv2Z2QY9+7eQy3q7t17yJEjh4nT5aIWnHV5wb2j2oqOLVqdFQQyaNAgMnHiRJKUnEx0okAFHxPe2PwfrUVn1WFUiwMcIA2XR+vaA001NBukQBvWewwqhFJ7gAcIxMrn8I86GnSwpcIzwj7dHg8pKipqP3HixAGPx7MgNjb2K7fbLVZXV4dVVFSkFhcXj2hoaEzzej3RHo/H5vP5zLIs6/2SX5T8ksDOR6/XSUE221mrxXpC0Ol0NdVVQ1paWoIDnA8aoCuUDW1VnOM4v8ViaYyOjt6ZnJz87xEjRuxMT08HY7VbroHQbRUAk539fv8Yu83+UkRk5KTi4iJDdlY2mszJ5i+/JGfPniUSrLOKx2HBjEZ0ZpmpNQX7c/z48WTcuHEU+ugNBlVZwAYVlSyNyulh1lvpBeiwjozlyeALxf0SBF0ZjsVmCgG6aNsssVsgJ1h0CDWDavRYaYON8v45XkOWKasVv1leUSHt27evJSs7q6iltaXE5XSZJb8USngS3trSGupxeYDnqdtSYhKlyCcThafE9qvGL5La4xBwc+rrQAyjsgE158BJUILY2JgtAwYM+GdaWlpGenp6t0yVdlsF2LhxoyEmJmai1Wr9dXRMzDiX02lYsGABAQxCerMjFakIAYQffcGIDUxmEyXG3XHHHTRFyqgJEHw6MpFOfOsIYhXh6Rh9qOxcsXk0VSmoTFG1XRLYGZ6ICRogE6w96BYdzFC/4mXUwBl0CCUtijZLiXayIT1rMBiJzRZEGhsaidfrobHJocxMsmbtGrmwsFD2eX0QYBwNryggDbkDv9ORgu2IXrTKGPA06pjHQLoKsEcd+aj0OZw7AQ8LgdhstjMxMTELhg4dOv+jjz5CH2i3e3RbBdi3b59Jp9Pd43A4/svhcIw4eOCA/o+vvkr27dtHqQfA97B8YIJCqJEFCrIFEUe4g1p8cHFQE8BcIOT08TkgCiAQLHjASmqEiQWjkHxGbEMMwEYkIg7A+0jHQpmwPSXjCQIxmIy0Ks3ozyDOgarR2tpKBb2utpacKS1FayR9DUWFxQfz1OPzEp0gkoQ+fei+8gsKSGtrC81qsT4CrZdiU+iYNCqFNTXOkCDYypAvvA8hF0VRtlqtksfj9bmcTtnn90GnQG8VJL9fDUeUOIfhHJrh4nmX1WpdNWzYsN/v2LGjoDvCoG6rAGvWrAkyGAwPJvTp84woioM/XPCh7v3336PCgxsLjA4hNJnNxNneTt9L7NOHChGsvpLd0JHBgwdTZQCNAU3rLP+uAPJAblPN9Kj0IRVGIE2ojETvKFhBqFFEw0SK7GPZpLysnBLxEGBjqjSOw+N2k+bWFtLW2kYdiaKcNlpRRqbK7fZQxYAyoFAH/hFiFihNoOagTrD4BoRi+diA9KvuSsNwZcxX7Au/3X9Af3dMTGxJc0tTodPpPNnS1NJUU1MzpK62bpLX57Uzb6f1FtAKQRRawsMdS0aNGvX66tWri7ud+VcdeXc8bvLJJ5+EE4n8MD6h949LSopT33zzLd2xY9mUwgBLqwc5zRFOzGaLGg9I1OJjLElMbAyxBdlJbU016T9gAImNiaE5b9QAaAYIsAYgXeX30yYW+lpJRSqhgQJ7YIGZFYfQgzoBoS0tK6UCDu+CwDsxKZEMGphGIiIjqSdCtgmVZ8AvCD6sdltrKxV2UKRPn86nE+0w3AsVbVZTUOCUko7FAx6IQja1aYfGEZomHnZzlWwTS9sqgTlLDsAQII1kNpvz+6em/m3U6NGfbtu2bUxZadnfGpsaB3TUNTpgoOo5WsPDw5cOHTr0tY0bN5Z0R0Hqth7g/fffx2J1T4mi+GROTk7C+vUbhLq6WiocDN5AoMHYBJ5ua2uno1AwkgSj0OPje9PPHOHhNO8PBYAgUE6+DmNSOmYD0TyMJJG29nZqiTHUCpmcs1Vnac0BlppWkauqSLuzndisNhIRGUGb7+FtMG26V1wczT6hBkGDTHW8IoS3praG5JzIIXkn80hZaSllmjY2NVIYxDA8PBq8Eo0tmCBjgjVTANXyX6jmRj0VAmwKfwgN/JFwdblcNIwQBKEtMjJy3YgRI/5XEATvwYMH/1heXj4FVWHGWWLxD4wEz/Pu4ODg9TfffPPvV69endsd06HdVgH+/ve/x2ZmZj5TUVn5o5KS4ugzZ0p53Fi4dAjdTTfdRC3r4cOHQSajlhUCCBIbhlJhIG5tbS0V5LFjx1KhhwWOjomhFprZWAigFo7gNzBBoqi4mBw7dpz2HOCB3wTVOikxkURGRtF92IKCiNliIXq9jsYJ6P5qb2unigLFqa6qptadDe5taGikMEdZX6AjQFYypQpxTglwlf/QPp1OI9q1wX/AG2hMs9rzIOt0utqY2NgTfp/PWF5ePsjv95t5npcNBmN1TEz0Rw888MCnn3322Q/Ly8ufkvySBelkmtdSM0v0iDjOGxwSsmPibbf9fnD//geuFlX7u/Qk3VUBuPT09N47d+589tixY4+2tLQ4OI7nIiIcNLUZHhZOhR9C+OXmL9FdRZpbMB7RRHrH9yaRUVHAvRTOgBPEimAQPkAgWGlYS1jXmppasmfvXnJg/37iUlePAZEOUAveIjkpmQwZMpgG0+HhDgp5WBoTykJhkt9HamtqSFZWNh3YhQFasPCgOdC2SZZxUpvqGa5XMlGqOFDTzmIShUekfXRspjbvsOKfegxKkKxAIFh6taL7Xl1dXVxmZuav6+vrB6jqJQUHhxSPGXPTv+tra83Hc3LmtjudwfTnte5FUQQpJDjk6PDhw1+12+3rli9f3u1WwOyWCoCq52uvvZa4ffv2/y8rK+thp9MZPnDgQA6U5yFDh5CW5hZQBii+3v/VV+TgoUM0awL5gfXHNDh4ADxDGBMS+pBbbrmFUpsh9H5ZJu1tbaSosJA21x88eIi4XFgzTKQV5OHDR9DFNNBYg+BZybCoKVHQrDHhQfJTa49uMcQEWUePkvz8Arp+AJtEh/EoVMg7p1iv0ASy7A6t3moqzBROybJkt9kyBg4a9Pr06dO3HD9+PHrHjh2/LTlT8qjklwxo3eR53h8bE3s6KSmpLjs7O62mpoYumECNgoa0B48REhJSmpaW9vbjjz8+/8knn+x2w327rQK8/vrrKZ9//vkvTp8+PSsxMTF0zpw5HIQYeB9dWseOH6eBJZpiNmzcSKqqqmkLI+ICCD4CYoxIARTB4NpJt95K+UFNzU0kvyCfHDqUSfLUPgBcJJDikEG6eexYMmzYcBJktdC4gS2TBLwO6nRtXS2FNoA1JcUlpLCokPYSIHZQ0qgKuglkc9RCmBa6BIx754yOVjEuBPbV1C2jczCPghjeaDBWxsfGvjF+4sR/f/DBB/Vvvvmm7dNPP519/PjxX7W0tCSydGpYWJh72LBhJcXFxUGnT5+OPqdYx+INnpNtNltD2sC05ffdd99fX3zxxfwr1N3v/OvdVgFefvnlfrt27fqlThRnzJw1y/7AAw/QIPbkyTwqiPn5p0l5WRkxWczk842f04G5SC8qyyHF0kwQWhfR04vFLYYNHUp7Ao4cPUKOH8+huB9QKjo2mkRGRFLLD84Q4gjAJDzQgI/Jb8D0CIThTZAJUoLuNhrEwhtQSoHactmxvIySUdGORWEBZqByq1GAjoLWJcqIyt/RbC0LgtAcFRW1ZNiwYX9bs2YN7SxLT0/nCwsL07744os/1tTU3MNxHBYHR6zkHjNmTPWRI0esJ3JOhDBl7yA8KGqq0+k8sbGx+4cPH56+cuXK7Zd4dNfNZt1WAf7whz8MzMjIeLF///7TnnjiSUtqal/K6MRQLNCagbHREwDBO5adTXbu3EmFGlMXesfHU2FGbh6ZGgSzGEUCxYEwQ9gRRONzBLyIHaBc8CgoTkHAq6qrSU11NU1Twosg0KaxAYM1Kn4PBK6q5DNekBJjdBTGAhJBsTUyLIFWsgBEuhwlYAQ+paeZg/C3BQcHb7l51M1/m/2j2Qe0LNL58+fb33nnnf84fTrIb6WhAAAgAElEQVT/5+3tbXGCIHBhYWH+4JBgqbamVmhqauIDxTXGiO1IBwMGnR4yZMiftm3btgSB8XUj3ZdwIN1WAV544YVBhw8f/u2I4SPu+4//eMqMNCNk7GTuSZrxAQY/euQIQWalpqaarFu7jrY/YhtkbIYPG0aDYQj00aNHSUFBIS1CIQ4YN348zQwhGEaWB16ipaWVVmuxj9raGgp1nG3tNGuDarOWY4NUJWoRDDezmkGACapqBaNbgAbB8vusJoBN6IxSZUkltbfh3L4D9v3O9zlQsFI+gKn28DyfbzKZFvbr12/xgQMHqrXNNKGhoTZZlu/zer3POJ3O4ZLfb6TLvKosWBwbJeOxcZAqhUNWlAHM0orQ0NCFPp/vX6mpqeU7duzoNkN9u60CvPTSS/0zMjJ+m5qaOm3u3LkWsDrBoUH/bmlJCU0/ApagMIV894rPPqP/htVFHIAYAPAERSeqMIzzT2QaPGPZJDza2lopAxMVXlj3ACeG4XhqqdnK8CrpTGVuMqVQa2r0+BS6hTI+UdsDAA+j0+uooMHjIEjHeBXAqF27dpOi4iJKi2D8HOY9OnsFLSUCGSlZlr0ej6dMluUv+vXrtzQ3N/cgx3HtGqWhxWij0ThGkqQf+Xy+O4hMIniB55Fs8Pv9Sk2cFd/YXCS18AYYZTAa64JDQjbpBOHfsbGxmfv27Wu8km61SzDcV22TbqsAzz77bGJxScmLo28aPevRRx8JgjWHgFRWniW5uSeo9UShCsOxILiZmYdofABBR6ZDB86O30c8HsVjM0E6lwCmkNg6Plc4/0ouXBmVwqww3UwzXl1NuASCXra2MBuMq9D9OZo2hacxm8yUpIfxKqBkAIKBrAdlXL58OVnyySeUYqG0UKrkO/X3O0sDPAq2w4qUPM/Xy7K8OzY29pN58+Ztv+++++q6KFhhHHaixWS6nxOEe4xGY5LH4w5ubW0zo0KGGIZ6gS4eyAQZjcY2u92+12g0rnC5XHtSU1OLduzY0S0GeXVLBcB9+NnPfhZ35syZFwcNGvTo7NmzbUhvNjY1keLiIrJ/31ekpOQMKa8op14A2B8WvL29TWF/cKRjPQC14qu1pFqoolCXlfx5R8AaIAd00IXQxKLOEFIEtKMPQGkmUejRSk+ARFOhSKHiuNFzjLlFGLOCYy0tKyNh4WFk9E2j6diVgoIC8t5775E9u/dQpe1gmSrN+NoH+wyKrBN1ktfnrfD7/RtCQkIWP/HEE5n/+7//29XqM3zfvn1Da2pqRhFCJhkM+lEul7t/c3Ozg7JMqdVXadSqd9P+psFgcIWGhZ60mC3bJEnajvlFCQkJNd2hLtBtFeCxxx6Lz8vLe8liMT8yYsSIIFRPUfBCHwD+AGuA7wPWm2ZFFD6/Ysw0ldZAS6Ni2QNWXS0eQWCZ1Q1YX8aIZilBjqcsUm3qsaNPuIM7hO8rlItgMnjwENqMg6Ic1hVGOrapuZnk5eVReAbWanR0DFXWTZs+Jx988AGpPHuWKlBgRHsXCqCJAXCSDRzH7TcYDJ/27dt3y+HDh892BU/efPNNw5/+9KeY9vb2obzI3+1xee5wuVy9OQ5DTzuuFa5cYP6p6sUEQfAbDIYWu91+3GQybZZledPAgQNz1q1bp4VaVw22XM0ddUsFADadMWPGsIyMjD80NTVNFkVRz9bgwsVhGQs2vJat4qIUghRevoTmEFV4WNO7lkbM8LvC7VfGm9O2x8CUaHXwTyDnzit8f3gCFaKw4FFJ/NOUIYVmIMJhnTAE2gPT0khkRARpa2+j9QKMc2dUCWyHdcwQr0Cp3333HTruBcrB4Nf5oEkAcvn9PlEQKkVR3O7z+ZbExcXty8/P72raNI0FLBZLsslkesDlcs1qb2/vi3XYtNdCbU37BiTS6XSS0WiqMxoNB/R6/adGo/GLgoKCmuudIt3tFECWZf7pp59O2rlz509KzpQ84nK6orUCzGb0MxvP2voCJDI1H0/n/6idV1rIQ4lq6hhz2D3WAaaNEwIWljaKKLwd5XfVJZZAUoNXUbEzyHPWoCCqHEi7jh6lTJwwW810qdbCggKy6YtNdDVLTKRA+hW9zfAEEP7p06fT1OzGjRvJAtULdDBTO2NztTdZXXtAtdhuURQLRZ5flZSSsjQ7OzuP47iuOrhEg8HQR6/XP+D3+Wc7Xc6BaKBnrGFGp1DgnPIIjJJX6NY+QRQL9Hr9CpPJ9OnEiRNPLl++/LruFLteFYBbtmwZX1BQYANJq7y8vJ3neT40NDRq167tE7Oyjs1tbm4ZyHOcCEH7RjGJ3ZzLMD/fKKwy0hcdXNXxYDQD5j2wEgxTNq1C0f6C4BA6kgV9AKgnhIeFkqHDhtHsDiz9ybyTtECHOgJqCxjc+8ILvyK33jqR5Obmkn/96wNSXlZKJt12G51rCuLc22+/TTD9DqlRBtVYTwLjFSlhjvbWyjLH8W2CIGQKgvAJx3Gf33fffRWdMTqs/Q9/+MPoTZs23ep2ux/0+Xy3eL3eYFmSeOrVOsbYBSgcihIEfgv1hmq73b41LCxs8SOPPLL3el/b4LpSAFQlq6urzaWlpb1cLu+wysqy29ta21IsVovL6/Xqa2tre7W0tkT7vF6UYgVqfOkQ22vXjx1ghbKhD/SOK7wfWH26WqTaPI5/4w9FtkmTJlGIg6lySGsim4NsDxinJ3JzKYwBrKmrrSOTbptE55Pu37+fjBkzltx112RSdbaKBvJgYWJ0OvaB39u9Zw/517/+RavO+F2WvkW/r3KsSoZIPUyFwKbQ4CS9XlcriuKOtLS0T+bMmbO3srKyXsvgBLScNWuWZfPmzYA+0z0ez0M+n6+POiRL7SumbZfnmBitAoiiiFjgkMFgWOZ0Ojd8TVkvu5qY/Wrv67pRAARhe/fu7Z2fX3hHeXn53S0tTUN8Pl8kxnjgggPCKClKOZBDV9z7uaMHr/YF6hh1ok49UX+A4nmdsg4AoA1eo18XvQWAN2i8QQYH1AkM0kX2Bmla1B0Ab6KiIklERGRgIW1UoeENoDD4LkhzSIdiah3WG2Ayh2LcJ598QtavX095Syi4aYNtLVTTXgsVvvh4XjhjMurX9k5I+GzmzJlZXYw1AeTprdfrZ3Ic96TP50tS+gHYCjkdsU/na437o9fpnDa7Pc9gMGz0eDxLqqqqjl/1e3IVd3hdKACGtS5YsGBoVlb2Y+Xl5fc2NzfHy7KkC6T7cJM1QER5vyMHfyHO2FW8VkqrpaCsI4Ame2RtoICoKyCdedddd9HcPXoSINBsDIsyPAtFtTZKmcBngERIeQL6BDwJxjRardTiA+LUVFWR2F69aI8CjTsIRzxeDx38u2jhItpEg/7jDqKa0rHGYAlLdtGbzCtei3DEKXB8ltliWTJ9+vT1jz322BntcqwYN/PCCy/EV1dXz/D5fE9KktSX4ziRwa0uq8+aDjVkhIwmY41Ob9gm+/3zGxsbd13Ne3C19/V/ogDz5s2ziqIoVFZWgpfOrVixYmxhcfHPaqpqJra1tTr8kl+gGRc2wkO1PmyaAV2iiM2N0nLmr9rV0UQEmlYo9BgjoEV2Bo01IcHBtJEd2By5/EdmP0J7AwxGI30Pwo2eAVhwHDDIedgengJ/qEyDr2Sz2UmvXrF0ZAtSqWjnxLoCoFn0Te1LIhwRKtVCWYIVXWNLly4ln3/+OVUq9gjUMjQCqVwoZQs1QYDiWKUgCOvDw8M/Gj16dOby5csDtQHAoNTU1LDS0tLbJUl6wufzjSGE2DiOU+oBqjfu7F00MAgGok2v1++zhYT8s/zMmU2EEO/12i32nSsAhP/1119/QpKkMX369DnldrsN+fn5U9ra2gb6/X5UJNWGJzo4R2n5U8G+8qxkXKiIqqb/fKnAK9UHLWUZCgkMDxpFUkoymfaDaWTgwIHkyJGjZNu2bVQxpv5gKhkxciSFPmiAQQELzFEoDCAShBV9CvAAyO6gYWf/V/vJjh07KRnPERFBM0CDBw2iMAhwCMcAj4MKMRQfXgDK8cXmTeSjjxZTpQqoq2owzllSMlCnUG41hZEcaRZ1+t02q3Xhgw8+uPWdd945Z8YoBmnddNNNKUeyjkznZG6G3y/1JYSY6OKwagPPN+CPpo9ap9O5TSbTCR3PL41LSFhx6NChEo7jrkt+0HeuAHPmzElds2bNnxsaGqYQQkSU2v1+P02laAWO3SwWYAaautU0JbM4l8OQvByFYMfCZvyAXgA8D+gCqw7uEXL0YaGhdE5PS3MzmXjrJCrAqDofPpxJck/mUpjEaNRQHpfTRSoqK2gcg20R3CIYBpMUtAhQstGzDBgFkp0y15T2sVB6A5QAATTiCCwGjpZPvGZUDO31+EZmS70Aok5060TdkaCgoH9Pnz597TvvvFOhtdDwAoQQy7hx44YfPHjwUcnvv1uWZeAwCoVonKGw4wI1D3r/EIAr9Q5fkMVyRm8wfJ6amvrpm2++eXjIkCEdrupybsQ13vY7V4Dp06eP2rlz5/80NjZOlCSJulWt+2RBHG3do0UoFesrHyiXQ72zyox9NkKzY0jtlV4zejxqKpFSFySJCvGUe+6hlhss04LCQor3QVoDAQ/jV0aNHEkFecOGDSTvVB7N8SM2CA0NI+HhYVS4IdAQWPxBkQCFlKWTQJFQrgUtuglKYY2dsjKNQqZBN64JaNiLFi0iX375JY0Xznlo+wg6XQyV6+QTRKFQEIVlIi9+MmXKlFNdpET5cePGhWdlZd3l8/kekvzSaL/kD1Gybyo1QptxUusr+EwURV9QUFC5yWTC2Mb1QUFBWwoLC8FAvXbpum95079zBZg6deqYPXv3/qWhvmE8g6paOMPGewSUItAyqNidcx/s8K/ydVVrAGrQSJdMQq/xT37yE9pMc+jQIVq1BQQCrMEkOigGAljAIaQokQmCl8BaZCYsvWTCwF2lB4AVlESdSJWapU/ZuQW20eTztdYcQoYpFFgJZ9OmTQHKh2Kaz61bdIXVMeSW47gqo9G43mq1LvznP/95qKsp07Is6+65556UPXv2THG2O6fKRB5MCAmWJInTGq7OXlgQBAzRrQ+yWk97vd7tI0aMWL5hwwZMjbju1hb47hVg+vQx+/ft+Z/6mvpbcB+UNXKVB8OuAeEHu1KFPF1DnQ4FOJ+778owXGzbQKVX3T0Wy0DL5O133EEhEMP12DdSl6Bh9IrrRXsR0P+LJZkwcxQeCnAIw3bhIeDVEEQyKjQL6hkDVZk0rRwxOEX0nNX6A6tQ09y/JNEA+pNPPibbtm6jHoB5LYUi0bU51HKEOJ5vMOiN20JDgz945513dk2dOrVL3g5ittdeey21pqrqXkLID2SOG8hxnDHQzKNZRJzBMERxoih6g6zWerPZvNtqtS4aM2bMng8//LDpevMC37kCzJgxY/SuPbv+p7am7hYiyZQqT+dxsuhXtfMK4UqZqIxH53F/HViIln4CvoGN79MS3s4RB7oyC6sOdQiL8o76X1pvgKVW1hIYNmwYQcslHZ9uVUad4LjQEXY8J4dWewF3EPSC5AaCGygPGRkZtK+434D+JCoymuJ4CnXUc8Y/Arwl1jLZ2cchdakGn8owXqwW4yaZmZk0E3Q4M5P2K9CjD8wyOr9HZGNRZCI3QzgjHBELFi1atGX8+PEtXakN4oEFCxZYV6xYMWzPnl2znE73vX6/P47neYGR4hhsU45BgXAQ9KCgoCaHw3FUluWlSUlJG7/44gvEGtfV5IjvXAEefuyxkXt37vzv6qqqSX6/X+TUacq4ZRg1EhAO9W7QmxroQGJFGHbYeFZXZlcFuHONoPNNVeIGbSVThVYdJVP6FQSh4O9AoVDcmjHjQRIXH0cDVYvZTFOUgDsYxYiKL9YAxr6RuQG2h6dAY/2XmzeT0WNG07EpzPJrG8xZjeAc4VHrBp0b0VlCABkmTMBeu2YNKS4pUZdRUq7JpSQFVMjVajQav4qNjV3w9ttvb5o0adJ5JzqAfzVhwoSwjIyMCR6P51FCyARBEELwPhV29Xi1sIjjOcwbrXeEO7I5jtvYv3//1WvWrCn63ivA7373uz5r169/pezMmWkup9OEnLdep/e73G4f4WT4ctnv95rcHq8JtHkqGOo6WkpzrNpMHqA0s0qwOvpPHeCqMDE7WUKNurPG866sHiq3qMIm9EmgOH/kyFEkJSU5MMYQNxrjTjZv3kwnTCA+gLIgU4SiGLwE3odH+OTjT0hsr1gy4ZYJCgSSAYEkwqtze/D7lN2pWZ5IWWyjQ6C1wTG2Be0b2H/v3r2koryCDgNWiHvnJEC/cWpKX4NC9+Y5zqXT67MiIyMXvfDCC6ueeeaZqgtRpxAPzJgxI27r1q2T3S73DK/XO8wv+YMxRPecJAYN4AW0STZHRESU2IJsBS63a2fv3r03bNy4sfh7rwB///vfTVu2bPlpRUXFLIHnveHh4VVWq7W6saHprMzJRT6fT2poqEutqqqeWN/QMFLyS2ban6pORkPlVVlWiN3fc4W8g7Lc0cUUcNEBPo9CWWYPRnADPADkQUALoQZlGYvrhYSGKk3qdBShROf9HMw8SIqLS8i4m28miYlJgTUBQE0AyzM6Kpo01DdQ3g5WhEeVGF4F8QMLeuERUA1GdRh1AhZfsM8VZVHqIAy/I6ZAEA4FyD2RSyoqKwPrIDCPcT4vEEjtKkbFx3NciU6vXxMeHv5xenr6iQutPKmmRg1PPvlkwsqVK+9qa2ubSmR5iEwIzQyxYcJKpkrwBgUFldrt9mxBEPIlSdqdkpKy/4svvqi93lolv3MIhAv5Hz/72XB3a+vdYWFhlbGxsQeMRmN9ZGRk88yZM9v/8Ic/QC5tGRkZw0/k5v64pqbmLo/bHXC3AaigLi/KkHtgmSE2vg8rLKqpww5cyliSLM1JYK0C80RRwALcwXwhVHbRIK9EF8r2Cu8GyxX5SUkpoIdEJ04DFrGgENVfwCMoD76KRbuRFQLvHzEEJlJ0LLEqUwo0UpqYQIdgFmsAAEZhW6ReQbmAstP9yxJdJ2D79u20gozZpkjBom/4kuoiKvqj54w2X55vMhgMh0NCQlZOmTJl68svv1zSq1cvDArtMohgSjB06NCkY8eO3clx3D2EkCFEJmEczwuBVK0gtFut1lyTybSF47g9QUFBx8eMGXP2ww8/dH/vg2AIbHp6OtYbDbdYLL7evXvXzZo16xuB0fz583V7Dx7sn3Xw4I9LSkqmtrS0RPv9fj1K8nTUh2aFFXq7Oi/iEIBCGligdoUxgQbUQYoSlhnUhilTppCv59vQAVmgPUDyaGYGrYwBXK5kZmjwqk5uoEQ9jif1DfXky81b6MzRHz81h+7n3Xffpdmhu+++m6ZFkSplTTM4ZvQIe31+OmkCaxvQuKK2li7ZdPPNN5PRN91EB+3S0yaEZn+2bt1KYRMUYPfu3YEhutpgtCtop8DJjhVjBFHwCTxfZ7VajjockRunTp269c9//nMhx3FdtU0GdvnEE08Y6+rqkvbu3XtnS3PLNJ7nh/slv00dmw2qRavVat0fHR0NSvSXJSUltfPnz8eiA1c5X32+s7z0979zD3Dph0YVhW9vb4/Kz88f1tDQMKCtrS1ckiQHyHKVlZWJTqcTJBkT2BGsbVHhRxPF+ndq5aPYF3BKUAJrFKYQnAL2IG//4IMP0movqq2YBA24gUZ1o9EU6MBigSYlxolKtyD2i/bLvXv3kCWfLKUC+9JvX6Ljz//xj3/QGUVz5swhiX0S6XQ6WGBIgs/rIT4fXYqUKhSwfXZ2Fh3MhVEtOM6xY8bSVe77pabS9Cco01nZWbR3IOtoFo1D2PCti0kXm0LB6hFUgQXRbzAZm4OsQVkWi2XVvffeu+lvf/sbsPoFG1lmzpxp2rBhwwCXyzWTEHK/TOQkUdSJFChyHLhAB/v37//hli1bNgQFBdVfj8LP0MPlyOR1se2yZctMRUVF8RkZGUNzjuVMragov93tdkfyPM9BGAIjCOkypIrFhsSxbjF8HhYWTiZPvpP0iu1FG1N6J/SmggavgA4twAo6QS4mhi5TBF6+ojhQLKUHgVVvAY2A41etXkVHIj7yyCM0M1RRXk4Wf7yYjmafNWsWrQpTOoNa+wDuh7JBsNGhBosOSgX6g/dn7CcZ+zMozEJvwZ2T76QEO/CGAJMA1zDxbuu2rUqcgOM6Z4Z517eKKQGrNuO13WaXQkJCkAXazXHcYqvVuiMzM7PuIkEx98gjj4StX7/+lra2toclSbqV4/lwIsu8KIoeq9WaZzabl6ekpCyfN29e4cCBA6/LzrDr2gNcTNtAo/7oo4+SMjIynjhTcuZJl9MZGQiNMZxKQ6PQFIFowImxIz/72c9ovh5T4zAINzEpiXi8XsrPGTF8OB1zDsiAwJqunYsGGHUsCV5r8+D5p/PJ2nVrKfZ/6qmnKNQBxwcr1x88eJB2gWE1GvQEG0ClNhgDRD9UkzGMF7EBJtfZbTY6jAsKgaWesK6B1WwmdfX1lGEKThGa/j9csIDs2LmTegCWObpQJkgbJ0B5Af3wHr4fF9fLExERkavXG1YMHjx4dVxcXP5zzz133nhA9YQ6TOdYvXr1HfX19TP9fv9Imch2gRf8Vqu1LDQ0FKMSV4eGhu7NyMigXkCNIzjEeunp6Sp4vdidvnafd2sFwGVBrLB69eqbs48eTa+trZuIC6wwFjvqA/Qqq5kUZGEQYN5///3k4YcfplYcc3dWrFhBt5k8eTK5c/Jk2saIzA8TGlqJZalVTfUT3wFUghIhO4P+3WnTplFhRjB8NCuLrFq5knoGu91G1yhDWyQUBDUEVJHR/ohq8ahRN1Gvg2OCgtXV1dPzAO1ar9PTXgC8j30XFxUTLAnFFECb1TpfFkibBsX2IOqBjgEFiIqK9vXuHV+u0+l2eDyez30+35E77rijLD09/YKTHWRZNk6ZMqXvti3bZvgk34Nfe5BkjueEkOCQ6sjIyGxJknZZrdYN48aNO9WvXz/fzp07rUajMaSlpUXndrsbo6Ki6v8vF9zu9goAJXjmmWd6b1i//veVFZWP+/3+AFmL4XXQqhnHABgflVpYaaQ6cfMRSC5c+CFpbmomP/zRY2TIkKEUNbG0IoMNTAHwPm2FhBeQZToQd/XqVXS84uNPPE6mPzCdEtyQLcJaYMeysumArrr6WroyTXxcHDl1+jQpKS5WYxJlvWKkX+3BwTTeoJOma2qJzW4jYWGhtA8A1HC3S1krrL6ujixctIhmhJQ6Qgfx/0LFMFZZV0lr1NuhW83r9UlhoaGNffv2PWEymQ5WVVXtI4TsO98YlQ5PK3Mvvvhi8Mcffzyhuroa/QMTsCK90Wh0ORyOUovFcliSpPVjxoz5qrm5Wa6oqBhgt9sHWK1WI8dxuampqRmvvfYaRrX8n1SIbwgFeP755+NWrVjxcnl5+ZOEKJRdunZWJ8+J9yGYSHU+/fTTlN2Jqi6EbdvWrTS3nqbSnBk8YFiZcfHZZDYGfyB8SEUuX7aMjmSHB3nmmWeo98jOPkb3DYuNqW6ARHjA8tfU1tIsEajPGIrVp08iDbgZMRDwB3EICmo4ZvwO4BlaKjGTFIH0p8s+Jdu3b6NdYYH08EXa45gCsEZ6JABwjm6PWzabLK5hw4bUBgVZ886cOfOFyWRZeeDAAQTEF6ywoUiWlpaWcvr06UckWXpQkiSMWRdMRlNbeHjEKb0o7vLL/l0Gg0G2BAWNCbbZkoPtdp7jeZDlPh8yZEhmenp667UDOuff8w2hAI/MmJGy98CBP1ZUVs7CVcXpglZBPUAnegBgAKwsuD1QAlR6DXo9qa6pIcuWLSPZx46RiRMm0KwLijvaohWDEHT/3o4hyGerqsjOHTuoNQaeR8rTrI5lh9Cz6dLA/5gxhJQmCHPTpt1PYxCK/bGsqizR1e3ra+voACxYf0AiKCNWloTigP+PrBRWw8HxIiWKQBlnerE0KC34qRkw5dqgItwxCMxsMknRMTFOnudPNDc3f2qxWJbl5+eXX4ICcDabLdTr9U6RZflJr9d7E2wNML/JZHTzPH9abzTu1otis1GvHywTMqipqckaFxd3ODklZfmoUaM2/+Y3vyn9v/ACN4QCTJo0acip3FP/fbbq7D2sP4BZaO2yPoFOMkJoUPrzn/+cZn5QgYWgY3bou++8Ta3rnXfeSbM2bCy61sLSVB+bnKwunodiF1oUQVIDrsbqlFAYpFphxdnKNLDqyBgBit1+++2UcoGUK+sVRqM7Al0M54Xwo6JsNJloxfj48WPk+LFjdGVLKMfijxaTHTt2BPg/FPpciA6tEubQHywIgqwXdT69Xu+WZFl2Op16URQ5g8FQ75OkfUSSFjscjm0FBQXNl5LCRCyQmJh4E7wwz/N3+SU/EhK85Mfe5VabzZZvsVoaXE5XL6Sx0Wjft2/fw7GxcbtEkd84ZswYrDH2nU+SuyEUYPzo8SNOF53+c21t9R1sDgib4qzAICUPCoFky/zAqiK9iFhgwoQJNChFZgXcnW3bt5EBAweQwYMG06os/mCllQDUoI5CUbJAzU1NpLWtldKXkU79at9XdFu0NKKSCwIdW7MMFhj4HXOAUPWFEmJbzDBFgQsxCMXkPh9dTjU5KYk2yMMTYXzKnr17aJFt/LhxpLW9jSxcuJAu38SGfzGa94ViAIX2Ac8mylaLpd0eHFzH83xbU1OT0N7e3iTLcp7EcXv0grCjpaWlEM7uUqAJZgpNnDgxMTs7++HW1tZZaKYnhKDgievlM5pMLWaTydXa2mpxtrdbwRfqFRtbEN+7d7bNZts5evTozePHjy/SNuhfyu9e6TY3hAKMHTt2WEF+wZ/r6monM+BPM0FsoGsX05+hCMDgs2fPJo8++igtiKGvN+/UafLpp0splRnWH1YYASosOYQ3Pi6ehISG0OIV4A5aE2GdQXUIslqpgEKobXY7hQr2RKMAACAASURBVC2oHzidLqo0wPKMMoFsFBSLrTGsDO9tpx1leCDPD69hMhnpBGsoCKw96hKoEKMPYeGiheRkbh6RsVr9JYzGCPD1FamRTQZTS3BocJFOpytyu91nXS7XKYfDcSwkJKTA7/dXZWZmXpZFXrlyZdhzzz1319nKyh/5/f6xMiFBdP1VQlAd9jscDkny+4Wa2loBFEaDwdAeFRlVFBERscPhcKx65ZVX9o8cOfKyfrNHAcDNnTCh/6mck6/V1tc+gCWjGe5XqNUKhSAwPU3DWYeggvMzY8YMWrzC+EFYZowk/Pe//01HEUKRMJUNuXdsf9ttt9Ht8D66soDJ0daI/D9rbcRv4TPwdeA18AcYhP2wKiwEHcqCbWH1oSBgj0KwExMTaUMNFATbQ9FQAYZS3nrrrTRuQQX4o48+ohmozhb/omQ4pfcAXWE1JpNpP+aGEkJyU1JSiubOnXt2zpw5oEL4LwX6aAUwPT3dOG/evJHNzc2Peb3ee2VZjqZrB6qxVFBQEBSBQ2IA10QURX9oaGhZfHz8PovFsiMlJWXT/PnzEXN8ZxmhG8IDTJ48Oe7wwUO/rW+of5IjnJ5lf5TOVU2njeZu0ZvCdzS8zJ07l9x77710ggOUAFRj0BiA6TGlGRYbggm6BOANXYCvsZEOsgWehxJgn2wUO2KCrKwsarHxRzM+vXpRGjXeB+2BYv3QUGrt8YzvglIBZYJissU0sN2aNWtoGyYqyoBrn376KVm5ciWtDl/qQ1sJh4ALgoC8/zpBED5OSkrK/elPf9o2d+7cb83ZYXNb165dO7OhoWH214OxUrHmGFPIwMBetSdar9dLdru9PioqKtdmsx2UZXk9RquvWbOm9XKV71KvQeftbggFSP9FevC7i99+rrau9nlCiBWBb8c0CfWUFZKK6vzV91TYgHgAlvVXv/oVhRcQZAj2kiVLKJ0ZQgYBRWfYzJkzqUCzkYgsn46sEIQX6xFAOQCd2GeAUtgfvAWgDAQBQo/0J/YFz4LgGN+DAsKTwCswjhDSrJgGh23hqZBZQj8wiHNsBDzFNJcAg1RMjm1ZX/DnZrP5Q4PBkFlWVnZBEtzFhAxFyGeffTb8s88+u7uhoeGJrwtqozmOs3R1bOz6qZ1jDb179z4UFBS0+uvx7KszMzMrL/ZbV+vzG0MB0tPFlUuW319SfuZPTqcTk8yIF6MIuxIIDS9Ie2OQjkRq9Mc//jENXiFMyMVD8OANYJ0xAeKhhx6iBStYU1R3EdACosBrQIghtGCWQsCRtgQMgrXH9vAg+AzKhNeUGcpx9HMoB74PigZijsBKlB4PrTIjwwSaNhQUccdnn30W6EfWCsPFAmBNqhSDbFuMRuPBIUOGfDZ69OivampqKmfPnt3U2trqa2tr0+3evVuXm5vr++qrr9DMfuFuG/UgJk+ebMnMzBztcrmgAHf7/X4sshEY5MuOVRn3oqRuLRZLU0pKytHQ0NA9ZrN57bRp07Iv1JtwtYSfgoOrubP/y309OnPmgC3bd/53Q0P9vZhfQ7k6lBHa6cFSJZqpxrgJuCEQTFh4ZIcgjBBqNtBq165dFLLcc889VEixPTA83oeCII3JKsaAOviDF2Lcfgg+rB48ARQL+wZsQsYHXgMeBLAHrFSG/XHkjE8ERQPFAt5q9erVtHoNBdO2TV7MC7DzVFPEwOMtJpPppMFg2Mfz/GGj0XiiX79+aGRxFxcXh5WXl2N94Ea73X7m5MmTlwRLRowYoWtqaupbV1c3G2sMuN1uzBZVAjHN7CftXTEajc7IyMjSiIiI43q9fl1sbOzmJUuWdLmQx9WWsRtGAdLT080ffvDB87W1dc+63W4H4wKdjyLMyHHMYrLXsNJQAFSLEcgCsgDz4wFBReoSfQOAKhAkKAEaWiDQgC34DpQBwgzIBE8AZQGMgjBD+PGbEGTsg02GgDcA9GGvoSxQDuxvy5Yt9Ds4Llh/xANQCFaMY5YUzxfyACwhoPKGJIwyNxqNWNBilyiKuUOGDClvbm5uM5vNks/nC8vLy+vP83xzWlpa5qU2tCMOmD17dtT27dsx4/Xxr+cCjcSAY22RjvGW2PHAQYii6I6MjDwdFxe3ymw2r+rXr1/uW2+9dc3HqNwwCgABvXn0zZNPnjr5x6amxlF06NYFzIWWPMb+zYI0BLUIdn/wgx9QSwuBQ0oSDzS8wxJDwJlFozQFj4fSFJCtwWvgdQg0gl8oASANtsFnwPzsNyHoWmWkpDu1txdejMUO+A5+G5kf9ArAQ7GHthXyQgqA82P7l2XZr9PpKiwWy5bk5OSVjzzySLbFYpEWLVoUGR4eLiBrtXLlyn46nU4eP358xtKlS9HQftGaAOKAMWPGBBUWFt7c3t7+hMvlusvv99u1aEOpRajrKgSWp+Lk2NjYgoSEhO1tbW1rm5ubd51nJZur6gRuKAV46IGH0rbu2vrfTY2Nd0uSpNMCoPMyJNX1cDVBGYU9EFrgfcQFWHx73rx51IrDG8ASg1DHWJsQLNxQCCvoEHv27KFwCVAGuB1VZcCdQCOKOuYFr7W/yyAM2w7P8Cyw9vAesP5YHAP7ZuNU2DFoz+9CaVCcm6oEWNerymKx7DYajeseeuihQ7feeqvv1VdfTa6oqLDyPO91Op3xsiy7b7311j1Lly7NvxQFwDnk5OTo/+u//qvfoUOHHm1tbX3I7XbHwTMwg0H5VaoCMOWXJEm22+1ghx4jhCzzeDzLCwoKqq+qtHexsxtKAebMmROzeeOml2rqax/zSxJWlznnlLsSjM5QiN0cPCPY/eUvf0nrBCDKISMEIYdVR9YIigAhZ1MdWGAHAcX3AWuQ78dreAB4ETx3HnfCoIv2WLTQjNUBkJXC4C06C5StQ0bnJ12sF0y5DNpmGAS1er2+Ligo6JDJZNr19XoAOffdd1/L0aNHE6qrq/vwPB/c3t4e5Ha7c4YPH75h7dq1BZeqABD222+/PfrIkSM/cLlcT3o8nsGyLBu058RuTCcICihUYrPZQMN4/8SJE2d6FOAyrsDYsWNNjfWNc0vLS59vb2+H9bqoAjCrxKyvNlBjC1b/6Ec/opwhpCORfkSDCwJmwCQExBBq9lssd8+UD+8DrkBogftZF5nWGjLBZ0LN9gWBBWxCcQw5f8ArKBRTOOyDcZ4u5TJpYAcCYOT7kQU6GRQUlCEIAh1ZotPp4k0m02BRFKOdTmd9e3v7qvj4+LV79+4tu5wC1ZQpU2wnTpy4paam5imXy3UrKNIMBmljFnbc7BrodLrqiIiIFYMGDVowc+bM49c6G3RDeYC5c+fq8vLy7j527NjvmpqaRoCfwvC0FvNrhf18gqPdHszNl19+mfYPIOBFFgY5eASxCIjxOYQbN1atcAYEUxPoBbA++/2uBF/rDfBvFL8wABdpUEAh7B+KqUyQ8H4jvXghRdD0AviMRmOjKIrgATXr9XpUXzEi3cTzfIwgCFGo0kqSlGmz2T4dOXLkZY81xIj1CRMmpGVlZSEQfsDr9cbgfnRW8s7HazQaW2JjY/f17t176W233fblb3/728qLsVEvRfnPe5+v5MvX23exusnixYuHHT58+KXq6uq7vV6v6RuWneWkL+HgmfAimAVz84knnqAUBUASBMcQTNQP8B6ewa3HgwWbWpjChF37s1ph13oEKC0EHb+DqjFwP+oEsP74DUbc0y6OcQmnExgzKcuyx2AwlJlMpgIEwz6fL5zjOKskSWawNHU6XSXGpXAct2PIkCGY5wPrf9EAuNO58QMGDIgrKyt70OVy/UiSpH4gx2kzVV1BN4PB0JacnHwkISEBVeFVTqez4FouuH1DeQDcgB/84Acxubm5vygrK/ux2+0OZTAhAG0uUQGY8DNIAyVAEQpKAPYosjLg7oA3BIwPBWCBLqviMi+ife4qVdk5IwUFAPTBYhpIgSLrA6IcMjOgXyDNCuGn0yAuEf+zGEBNs/qQAtXpdCdEUcRC2n3cbneyx+MxCYJQqdfrN8fExKx5/PHHj3i93rr09PRv1dC+b9++0Oeee+7eo0eP/ofX6x2BiZOdPVxnxTWZTO2pqanH4AWwztjjjz+eMW3atC7nll6K0l9smxtOAebOnWvPzMx8/OTJk8+73W7EARyFQYGVE5VRupeSItWmKnHjYNmxji86vu677z5qjRGUohiGLA1+BwUw5P9ZRxltptfMztfidm1Qiv1rG9oRN8DDYDE8VJyVrrE+NP5gdAvm3S5VCVghTO0TckHYdTpdrV6vt3m93l5tbW28JEnZmOfzm9/8Zs2zzz57RSs8yrIcNHbs2Fuzs7PnejyeCX6/38bOmU286yygWGPMZrM1RkRE5IWFha00mUyrtmzZctGutIsJ+vcCAuEkMXpxxYoVU3Nycl5qb2sfJMsSTwNSOldXmR/KxP9iuRPtzWLBK6w7YgHQqPGM3Dya2iGogCkgsiE7hO2xLStuMWutZacyAWZKAl4PqrtgS6I3AU32+MN+Ro8eTYtuoEQz6MOs6aUG+/g9TRAuY/aPLMsoKKCn0s/zfLUoirsNBsMKnU53oLa29oosryzLpuHDh9906tSpn7jd7smEEHhkOrpGWxjrLJyIPxwOR1lcXNznwcHBC7/44ouD1yoOuOE8AKZEfPzxx7fknjiR3tzcPFaWZJE1x9AlVVXbfzlWs1OqjmJwMETBHkWdAMQ3VGwRqLIVIJEeBW2ZdZsBwsCqAzqpI8oprAHHCALN2KSsqgzWKDwAhB5eB/wkvAbs0ubQtalebXZFG/xrs0qs0qwqn6zT6TDEqlQQBKwef4oQcsxsNh+7+eabS5ctW4ZusG+9thd6hVNSUtJKS0vnfj1lYposy5GsHnCh66/T6fwhISG1ERERX4WGhr6/c+fOTT0KcIk+DpAHDTIlxSWv1tfV3UkI0aEpBVMV6BjvLohZ53WPasVSi9sZjMAzqr3gBgEOoWYAoYUnwDMoExBcKACKT7DuEHZ24yG4DDYB70OJ0HMAAYf1R1UZHCPUHOBpkAFC9oktv6odmqsVfHasXc0HYoU3Jvzo9hJFsdJkMmWIoriP47gyLGyBdKfVaq267bbbCt5++20sanFJRLjO1xHCHhERkdTQ0DBHluWHZFkGJKULPpxPAdQqsazX613BwcGnoAAJCQmfrF+//lsfx4VE54bzADjZe++9N/F0Xt5LpaVlj/j9fhObFBdolGELvWnW5OrqIjH+vBa3s2CSlfOhBLD0ILGBPwTBRL4elhtKgAlxsO6ANtgfFAEpTNQOIOiIFeARkNLENoA4qDfggVoDsk/oVkMhDrUAeA28Bl0DKVL8HvaH70KRmGB1JWA4ZpV6gUvhFgShThAEENC26fX6Q3q9vpnn+SCv14u/ervdnnf69Om6b6sAOIdFixbFvvLKKz8sKyt7jBDSV10J9LwKoPFuksViOetwONampqZ+sGHDhmPXYomlG1IB/nPOf8bszdz7bGFhwdNut9uOgVJY58uH1sHAGl0dw7LOZ5GYxewcoDKLyzJLgDUIiBEAo+sLzwiOkbYEDQKKAAsOa856i1EVhpIgg4TMDqNNYzvsHytQItsECjYEGw0wq1atovEAYBeG+CI+APSCUkFpoARMWc+n0GoMgIIXmKCloige9/v9+0GLnjp16pkJEyb4jh49qjt58qT3ueeea5o0aVIH6egSvbB2M1mWwwYOHDgjLy8Pi24P5XneiM87V+nZdzQ8IdlkMjVHR0fvtdvtC3w+39ajR4+edxGPb3Fo9Cs3pAKkp6eHb1y/fm5FReUvdKLowAweWEk2J1Q70pBduAtZTKYA2lw+2wcdaYIZnxhfrtKfwecH9GF4HnwgsEyZpYe1x+fg9qDjDIILIcb7CJoRRCO+QOslo1Bjeh16ABBboIcZXCSkR6EUgEtQNtYcw4J3dkw4fm3cgE4s9OPyPN8oyzLSoKWyLO+RJOlLvV5/sqamBn253wr2dAGDrH379r2rtLQUqdBxkiRZLwaBmJe1WCwt4AaZTKYV9fX1S7+OJSq+raCfF+Ze7R1eD/tbtmyZ9R//+Mfshrr634aEhPRGGhG9s2iSYRdfa8Uv5YZ0DoSZ9YfwQwmYIkBJoGysMgzrjRoBskXYB1vQThm6a6DZEHgArDSJYBiWHdwjpjBQGngJCD8gEKrPTz75JPUO8CBo2EHwjd9hmRXGamX1BDyzega2MRqNyABJTqdT8ng8oEU4IfgWi2Xz6NGjvxw1alTOgAEDmroaW3+59xeBsMPhuLm1tRWBMBpksNbDeQ0vq1bjOHU6nScoKKjMarWutVgs87OzsxGoXyx5d1mHeEN6ALARf/rTn95XX1v3qslkGgAWJwJTp8tJ2yK7SsFdTlaI1QdgVYHl8YcsDYbfgiaNPD1+j7E5YZ2ROYLAQ1EAiZAuhWLghkOQgfEBg1BsQ9wASw8vAUWCgmBBPATBYKNiqC9qDRB6NMovWLCApmK12R4cIwSfTcvW1hxYbMMG/KoN8m2iKBaIorhTEITPU1JSMg8dOgT8f0UCB2GfOHFi2uHDh+c4nc7pHMf1Ygujn++aM4o4JFkQhEaTybQ1MTHx7ZEjR+5/7733rurUiBtSAXDRp0yZMqaitOxPtXV1kyB0CB4bmhoDSw5dqsCfD0szyjKEH8INiw1OEDI2CHphzZkAQgGA3ZkSAOZAGSDAEH5kg1BMA+kN2SRkhBBUQ1FYsAxLj74EFMR++tOfUmVj3gMTqDHclzXbaM9Nm8FiXkv7OcPcqqBjKlyxIAgQuNXHjx8/RAhpuVIluP/++xN27tz5cFNTExbYQyOF7nyxCjsejYd22my2o5GRkQuTk5M3rFu37qpyg25IBcDF/fnPf560f9++X588mfeEwWDQYew4pq4BgmgDsAsVZLoSfi2tgaVEIdj9+vWjWSB4AAgn3uucimRQBPUA4H0cB4QeK8PgGVQHeAYoLOIICDsUANkeWHmMQsFvAAIhOGZKCIo20q9QEChT50yQ1jN0/owJnFofkCVJcoqimG8ymb6YMmXK6iVLlhy/UiWYPXt2+Pr166e6XC6kQ0cSQjrWGe50kbXkQVwvsFZRFe7Vq9fy4cOHr5w/fz5g0LeiZnR5Py8LMHWjjd/87zcdy9Yu/VlO7on/amtrC4LFxbxQDJjVWp9vowAMXgD/w7LjpsFqIx2KFCW8AOCNxrpSoWRFKAY98H0EwKBYo4qMhfTwh/fxx3A7gmkoAOoCgD4IghErsKou9g0lWbx4MY0HAJm0ysfOUcs50t5KTeYFSgnI4xQEoUCn022SZXmdy+VCkwrmr3yrwPixxx6zrFixYkJ7e/tTPM/fxvO8HavNd1Wr6GxgeJ6XQ0JCasLCwr4QBGFBeHj4/h07dlxRZuqcc+9GMn1Zh7px8WLb3z748ImTJ3NfrqurC/eqxDFUhdlF1gbClwOJtBgVcAbCCuuN6jBgC4ZnscoutoXXgZXGA4oBq45jgBdAzQD4HlgdwS8abfA5PsM2eB/eAUqCtCcUDWsQIL2KgJjtB8KEVOiiRYtoXKAdl8IUoHPgzy4oy24xJQXkkSTJJctykSiKGwRBWD169Ojs7du3t30bOIRG+YKCgoFut/sxn8833e/3x9O5oV0s66o9FvZvdKfZbLZDNpvt3bS0tI1r16694tgkcO6XJVXdaONDhw7p/vynP00tLCr+c2FRUUpzS8cAKS0u1irDpZ4euzHItkBYEagiOIXQIxjGiHR4Alh8Zu0Z9GKFL+wDcQJgC4M2aLBBDYFlpbRKghgA41NQLUaQjAU+oHDYhrVFAlohloAnwGCuzkqtTf92jgPwm514SsgUoViWZTKZltx1111rly1bduZymmLY9URF+PHHH49es2bN1Pb29scJIcP8fr+hKwXQxima45FtNltxdHT08rFjxy655557TsyaNeuqwKAbIgZA0NuVZXr6xz++Kfd0/hslxcW31NbVchg9zh5YlwsM0ctVAE1XVQCmQAnoJGesKRwSQhWABaldCRpTICgH6gBr166lWR802yOYRgzAlAcZLHgJKAoUAMKO2OCHP/xhYNSiFjbQtcpWraJBMQJsrUXtXNDrDIO0HkH1FriwZw0Gw7rU1NSF06ZNO5Kenv6t4MevfvWroLVr144tLi7GvCAQ48IupAAa5aH/xFrSkZGRX4SFhX2clpa2b8GCBVdE1LthPAA6j9SsQntnJXjxxRf7bd+2/bXqmur7m1taBPBosBqKYmKx0N25cOhSPIAWL7PtAYFQ5YUXQEwACAQrDWvPcL82F68VNMQAaHhB2hSwBnEEmxoBIYQQo2CGDjSkSZE5grJgRCKmVrCBu9rgFooCKARvwLrGmLCdT+i6Onf1XFsFQdhjMpk+GD9+/Nb169c3fhsYhHrArFmzUj7//POHXS7Xw36/PxFZzvNBz84w1Ww2N8XGxgIGrTYajRvvuOOOM+np6d+aqHfDKEBdXZ3NZDLZTSYTViE/Z7TfG2+80WfDunWvVFSdnd3Y2KhvaGykKzKy/gBkuLX4+FIUgLlobWAJBQA0Ab0BQo9cPiq1wOisOUYLMbRWGQINC49CGL4HD8CUBttBadF0AwXAMksg1CEuwLZYehVZJ2bZ1axJgI/0/vvv07iAzQ/qHPBfLO5Rj9PL83xucHDw4qeffvqzV199teTbcIPgpceNG+fIysqa4na7f+z3+0dhTYHOx3Q+RRRF0Wc2m6scDsf2uLi4xb///e/3Tpo06YpXlen2EAgXsa64MsHLe4Wo+HhMLgi46L+//nryirVr/1DX0DDT6/XqkB1pamlW0qCAPyoTpHOu/GKKoLVOEFZYbKQ92VoCSGUCBkEx8NBWffFa2xjPlliCJ0AAjSAZx8Ma6bEthB5eAlCJjURB0I1mfZDlsI22+ovjQxCMFWQQYAMWMWHviiZ9vvNVFQBZIUTwn9tstoW/+MUvsJDFt4JBsixbpk2bdvPWrVufcjqdkyVJoo3yna19V4qJbQwGgzMqKirLbrd/LIriiqsxQ/RGUAC+rLAwydXmGurzSzUWk+5UdWtrzciRI72/+MUvhm5cv+Ev5eVld2JeP+AC4gAUphCAds6JawXhQtZRa7UgfEixIg6AEMLioyaAEYvwBowaDYjEAlb2fWbpwQqFwILhyYJkQB8Q41ANhieB8GMsCn4LCoVzAGcIK13icxY4s2YTHAu8CqAQllGCJ+kcj1yiB8CunRzHHYuKivr017/+9Zqf//zn8AKXDT8wGuXee+8dunv3blSFH0AvcmcFuJDx0ev1nrCwsHyHw7FRluV/H8PApit8dHsFwPlXVlY6GqpqxzfV16X8/+2dCXiU5bXHZ80OIYGEEEyAQABNEATxAtaCELVWvAIVnnJxvaJQUcGK1dvWOigoYm/F9ZFdIVCN1mrFViuIFGQRQQgQZZUtZCN7CJnM8l1/kzm5L5+TZSaBDNTh4ZnJzPe933aW//mf857XaDIXWUPMGw6dOJG/aMGCMXt273nq1KlTPawhVs/avJ4WJgbNUOEtHtMHwapwNwefChOEF0AZeGfqIk21gDM8I9ghElgqDakeF48ETGF/vAaKAa9PRSkNugisqQYlsMW7MAmf+cJ8TzBM2bQa4KpjM4WSbnLEEWTDBX7xrsYDDVld7/Zuk8kE9bglLi7uvQcffPCzxx57jN6dfjExxAEjR468bPv27XfZ7Xb6hrJ+gHfdDmOT85stFos7PDy8vF27dps6dOjwalpa2tp33nnHr3PQ68tFoQCaplmO7znYrfh0WXp1VVU7h8F1dOvWrWHv/uW9ydnZ2bcYDIZQhMrpCXrrIAgrs4u19GVEGoNFarZSpj5K8goLTTBMyTJMEPgdeENgLNlhtVqT43AeQBvGwgvwTgEf9T3QqUArqE2YIKAVE3BQLJQEOhQlQVClX5DQolwXUIr4ARqVPqcom/74jRlRURjvRJlCTdO2xMfHv3/rrbdufOGFF076owQ8p2HDhvXau3fvpJqamkkOh6Mb7KsvpkyMhfqb977Xtm/ffl9SUtLKvn37ZmVlZbG4nt/e6KIJguVCtCzNfDD5YOSuw9u6b/9q58h9B/YN3713z38cPXo0QfOCfXWJUymHaCgIa0gBhAUSC6p6AL5DEShTIKkFpqcKFeuL5eZ7CVTlwfJQgScEq3xmHxSFmWGwOfI364EBgxiXRBjwBg9BsM3C3wTTkqBTmSfOCQVkX7yIdLEWyNRU/KPCNhJSLJ30/SJ4m+Pi4j68/fbbv3j22WcpUbY3hxkiH5CWlnbJ8ePHJ9AxzuFw0Mres6ytkAtyXj+w1N61HUwmkzsmJia3e/fufx8wYMDKRYsWbTcajQEXyF0UHkBuFo2xysvLM/ZkZ884mZc3xF5bG+VwOOqb5CIgZrPJ4HS66ha59tKgPAARHlEMgQfyG8dQOzwIq8PvxBZAK35HAShTIKkFQ0OsgQXme5poESOIdZN6feH6SZbB7hAvAHEQcrwI++ABKHojtgBesS3JLoJmYg4RHIE/Yrk5J66NWAQlYgy5bj01qodBMka9taxrx0hHucKQkJBtISEhH0dERKyfMmXKd80NjKOiouLdbvcYh8NBeXQ/L43dJJJXrstTGpGSkrIuPDx8VUhIyPo1a9aUNzlAAxtcVArwyCOPdFuzZs2jhw8fnlRdXd0Biy9rBPBwpQzYI/ysrev9Tqy42mdHyohF6EURZJYY7+wn/0WoJUhlrWBgD8ILfQmHT50PSSy2ldVfhPGhfAEYxEwwEmqUPWCtmVfMmFhvFOn222/3zENmP35HuIkBREBEMRFujsG7wB480SuvvOKBT6ql1ecG1LFUDymexbt+WKnZbKZ5Fq1LPpkxYwa8fJO1Qpqmxdx8880//+STT6Y6HA5PYVxzhFeUkeVdzWZzTZcuXQiGl9XU1KzMzs4OuInuRaUAP/vZz36yZcuWpysqKq7RBGmgSQAAIABJREFUPEkWt7Iskresna7E3vV0hQaV4BWhEmERHM3fgq0RAOAJwScWn+9lwjusDPsj8Ah5RkZGfdsULDkL7uERSJBJN2k5BtacDnDM7KL9CSwPSsOYTLFEAaA0v/zyS09jLr7juKKkMolEqkNV6y94n3e8EVligmLiBxFufeGcCkfqIaZiQLzlHbRRKWL+QHx8/NuTJ09e/+STTzK7rNH5A6WlpR3Gjx9//eeffz7V6XT+B82ymqsACmzUIiIi8jp16rQoJiZm4ddffx3wTLGLRgFYIOONN96YXlBQMN1ut3cm2iXTW7dInqcNQd19ZoFr8KRbM1jM5h/08BQak3JkcDWVmAgw1hmBg5Yk6UVwKRWb5BdgcaAwCVgRdKw9WV0UhW1lFRkwOxZeAmmEif9AHub30mwXi06JNPsCp6BIEVosPks4wTKpuFniEZVl8gT9Tme915MuElzPggULPOfDOUt9kAqhVA+geoo6CGmuX/mSAJimuiaTiXXG3snIyNiVlZXVaMGcpmntR40aNWr9+vVTXS7X1QaDwbOGWFMv3TlpUVFRJXFxcSu6dOny+nXXXXco0KzwRaMA3xdrDdz59dfPlpSWjoRt8Nl5zFi3wrvJWOcFeJhQlLAoUtqMcDGxhYkp3HTwOYJJWQFrdfE3XgDunX3xBlhTFISAlf35jTFkTi/nwiwx6n5gdaBEpY8oAoggEtAyoQXIgyJBXxILcB4EwygAxW8kv6T8QYEk9QtfqBSoHr7wN16AdouwQgTaEvP4YmL0QinwT2AV1t5sNlebzeZvvi9w++Dqq6/+25o1aw5APtEi9eGHH45cuHBhuM1m0x599FGy9PwPy8jI+KlXAX5K97imAmD1PMSj0c8oKSlpbY8ePZb16dPni5deeimg7hUXhQJMnjy588Z//WvqiRO599vtNXGS5PXVeaBOAYwGkzeBRTKJ+nqEFosvySiBFWJVEXICyI8++sjDqrAd1pnafwQXy4rAI7B4AYSXdwRdpj2C61EUeHyqPiUu4Z2kF4wRCsI+KAylFYxDqQTHpVaI/6Lc0mBLmCUVrqhCoyoC2wK1SKoxd0AW5vaVB/AFhfTewVsWUWkymVjxffX06dM3PPHEEwVz586Nfvnll3uXl5cnW61WZ4cOHb6LioraPX/+/LI5c+Zc+cUXX0xxOp2j8Aiq52roPCS2kesKCQmx9+jRYxs9gy677LK///GPf/SrfXt9YN+U6wn23/9n2rSOG7766pff7tv/cEVlZQoLMXPOUv/vceHebnBg/vpqToNmCI+I8EwuZ4ohuB0hl3m7EvzKohfsh7CwAgx4HFiE9Wd/uHnYGIQbCIVHkQfGA8XCo1wwMQS77AcUAkoJE0S5A8dnHCCQQCzOg0wu+B/6E2iGEIpyy/mJUkiZheoJhOoUj8HYzEGGWeI6GmpRUi8kXgpSpW5VRWDJVbfbXWmxWA6EhoZmU0Hqcrk6OByOS6n9p7O0xWLZAUyaM2fO9vfee6/Pxo0bgUAZlEMIK6XCrabkzmq1Onr06JGTmpr6N5PJ9OGgQYP2Pvnkk2Ss/ZrDfCF7AOPYsWPj4JRzc3OnVlZUpNrtdk/7bdqfyMPSu3ahOyXwY+4tq8AgxGRKEVQEVqooJSj2jOuFK8ATSSwRE7B4BhSn1PFIhwbxIrLSpBS2EfASHxAQy4oxHAesz7Z8J4rKWMwXIE9A2QNeRoRdz5+rAiRQQYSf39Q6IBJ0KADQTjLE6j2TfIcaI+jZIfEQ3v0QPLKyxABAICstUIxGIwvkuSwWy+64uLjls2bN+jgzM/OSL7/88l7WD3O73R0as/oNeTLyAe3bt6/q0qULzXxXDR06dPXs2bNZ56BJJuqsMZvStGD9fezYsfHHjx8fT7+Z4uLiNJfLZVEfWkOzjdQsKNdGuQIegAWoKWOgLkcWvUP4xGqKm+YYsDb05KFVCYKE96A8memKjEGwyjZYcsHrnI/07iHDy9hQnngD1QIKXBHloSYIj8OYrGbPvIPGMtjq82oI14uy0YUOJSDG8CWEcs0NjSPnqt9XnoN4KprdWq3W7zp37pxls9neXbFiRfTmzZtRgBvdbneMCtGa4wVke5SgU6dO3yUmJkLF/rm2tnbP9u3b/VrH4IL0AL/61a9itm3bNj43N/e+0tLStNraWmYX/aCq0NfNVMsYuJFgeaDFAw884MHf4gUQUARWmBK99UOImKpIXACMoPkVzA9egECZmABLDhxCCRBagVX8joIg/EAuiQVUiypChbIgpATG9957ryd2kPJmX8ZJB03O2kT1GJwLkAvlot8QwXE9PPQyZv7MHWjIUHoNjqeiNDY29qOxY8euPHLkiOuLL76gHmi0y+VicY6z6oEaOq4+/gDdxsTEFHbp0oWk2HKr1fr55s2b/Vrt/oJTAIKrDz744BeHDx/+VVlZWTrCD9Hpy4LpLYs+qON3LDbZ11//+tee6kogCBgZBQCX4xEkm6pCBIFEZGMpVQa+wP3D8DAugSbsEZBF1goWvK/GF2rgKlZftuOd4JiSZgQJClQ8gFyLivV9WX/1HvCZ/yJgKCXJsSVLlnjeBS7poVBzrHJjCmCxWAgSKplY06dPnxVJSUm569evpxziFy6XK0FfENdUQK7+brVaaZuyJyYm5o3o6Ogsf3sZXVAKYLPZOqxbt27svn37HiwpKbmMeaXiZv3BkeoDRejA4w899JCnzgY2CMHgP0ItpcriCSSbLEknFAUPwNKoWHVwvawhDLXJ/pQzwOZwjgg/1hblIgiWAjmBG2rmme8Yn+WYOAblFXgYmTAvAi3KqCqFKJFsI4IvMY2cP3EJCkxMQ0sVCd69ya6AEbAKNb1KaLdYLDlpaWmrhg0btj0zM3NUTU3NRG9BXKMdoxvydN5rY7nXEzTRveSSS5a/+OKLuyiFb+6JXzAK8Nhjj0Xv3Llz3M6dO2cWFRVdJsEjAiIC3Rwl8IXpybySYaXfDhNNpNcnQoBQA1lIdklMIPQjx5VEFgIKVQlWZ5IKxW8oF9QnioSXQeA5RwQNyhOlANIIZmY7IBheCTaJ7yVHAKRiXBSA89AzJ3Lt+uBX9RD8xti8OJYktjgXvAy0qDTYVZWqucLkazuZrMOt0jQt32q1fuJyudaHhISk4gGcTmcvyqRVz9TU8dRnCAwKDw9nfeENUVFRy/Ly8tb6s7BH0CvAXXfdFXbkyJG+eXl544qLi39x+vTpnsAesZi+WIrGFEHFkTwc9gejMyF9+vTpHh5f2paINURYUADB7nJMjoOyCI0IU0PNDtsChxB6PAmsEZ6Aqk1YJ8Yn8KRVChWiwh4h/HyHgqGUnCtBMNQr8QjnyPdS+SmCIuejCoawXWzD9ngdWXmGz/yO94HF4j8ULfMNSJLJOscqFGpKKPW/66EZ9CRTVs1m82HWJDaZTBF2u72/0+lMJGnWHCMmcE7/DCMiIqri4uK2mUymLIfD8f6RI0fqXFkzXsGsAMZJkya1y87OHnnixIl7Kysrr3E6nXQWbpVzVuEDwkB9zeOPP+4JZhFQmZgi20lQjBAhqNLkVn0YWGtKGhAkiQmo7eEznduwrigGkAghgw4l2cXfnAMJNWATcQMBOS+CYKwzwoqHQgFUalZgjxgEyTlIDRPnS1KNgJ35ACgYMQ7KguJzLLLPzGHg3AnqiV1U5VIhYzNkqsFNvBQla5NVWq1WzeVytXM6neGUScv5B3IsmujSNiU8PPxvNM86cuTIt83NB7SKMLXkpvja12azWbKzs7vm5OTcfPLkyTuqq6v7uVyusOZAHH/PRQQYKDJ16lRPqQHsDFYYJVCDSCytQCIEC0FS6VHJE1DyALOCkAFbEDC2h3ZEGcgeE8wCj/AWKAl/oxBYYP4W70EOAIWizAIaFIURGlS1iAg8Y1HegBIBs1BUjotiAc04tlr6wP4oO0wYigXsYn+UpKnkmL/3WRTVK+D1XL3RSF1K3SuQ5+s1UJRklEVERHweERGxoF+/fhv/+c9/nm7OOQadAowfPz4kJyenf1FREQss//zMmTN0E7a2FiaVm6IKjwgCdOhvfvMbD68vdS9qvY08RIQD4RJYJEGpPEACXOqGmIQCfQl0QaDZnkwwQkkZBWOgFMQd/A0MoeyBMmopsYACJQvM37BA1B9JkZuqfLBFlEuT2JJFMwQaqZBNTQRy3fI3nzlXlATFlvujJs/0AhWowKrjBDKGur/ET7R4DwsL2xkaGrq8a9euH+7cubNZTXSDSgHGjx9vLioq6peXl/dgaWnpTVVVVZ1YuFlftdgczW5qGxWjymeEjBXhscACgaR0WX1QooycF8KOYIOrUQyJCaTeBvxOERuJNgrksMaUOgM9KGtAUYA55AOASOzPpBfiBahJFsZgfOhVVqZEWTiuKCgeCWgDdEGZiBmEAVLPWYJjuS/CNnE8WbhDoJVYYwm0hR5t6p629Hd93NCc8QSiMmWzXbt2B0NDQ9/t3bt31rp16/Y3Z7pmUCnAXXfd1aG8vPyXeXl5U48fP947Pz+fLsL159hSa9HQDRVrBx3629/+1pPQku4Mws2rWFssqtTdIPwEyAS6fEaYESagCBw7jW+ZtUXJBFADPA/mhpGB3aE0maCYQBf2iNVhwOewSigLRXV4Jeb/kl0WQUX58ChAJDLT4omkVEIESqy4XIvAG31WnGvUJ8OagkKBCK3+OagwszlC78sDEF+EhYUVtW/ffq3dbl8SGhq65eTJk01OlQwaBcD6JyUlXb53796Hvv3229EFBQWxLKQglY68N/Uw/L15KhziIcDGwAQRBwA1VCZFDXb1vDvjiDdAEfjP9lhn6coAQ0StPyUTMD+yOgzXBF4XxUE5wORYcunpg9BTsoECCY2J8GPxaZqLB9AzNsLzq0ItFl2spngKNTsu44hyi6dozr31x0Cp99Nf/K8qjORlvGMAg1hSaVFCQsKHu3fvLmwqGA4mBYg7ePDg7SdOnJhSWlra0+VymdWH6O9NauqB6SEQfwMFaDMyY8YMDwsjCqDHzYwtLIvgaIkVUAQgi+QNpAP0smXLPEJOtwhKmskJiKWWplaiWIxFjRECzrERds4HBeCFgpF3wHMAfeDxRWBVuCIC2ZSwiUDpy0TUGIPj6uMBPTTyRwF8PR9/PIF6TfKZoruQkJAT368KlJWQkLBq1KhR37z88sv2xmQhKBQgKysrfO7cuZQ3zKiqqrrc6XR6EiOtLfQN3XTVIlKgRiBMWQQMCS8pOZbtRBhkDrGS7KkvVSbQldiAYBc8D6MD2wQVShIMD0FMwP58DwsjVhrWBkgFLCLLDAtEMI1CEfDyO56DvANQSxGCH5Q0NGUMBN7pt5M4Q0266Qv3RClam6RozjnroRBEUlhYWElYWNg/TCbTm3379t26cePGqsa8QFAowHXXXXdlzu49TxUUFY10upzU9pw1ybullqUhwVcVTFwpSaEHH3zQcOedd3qEVL5X4YOMp1pEthOLLtYYRgW+X6pAoUdRBGhW8grgfoJlhJuJ7uB8BFlgB2MCb+gHBEuEB2A/WBrGZrzFixd7eghJ1lqssr/3TNgU9hNvxvVxLaonZjs1+Sj34nwFyo0pBotphIWFVYeFhW0xGo1vJicnf7xjxw56xjY4R6DNFeC/xo3rtumrHTMKCwruqnXWdvAsZep1t2Jxz8XN1aXT6y09GJsglDkCUs6glhf4sDpnUYZ6pcBLYMml/IG6G+AN1wQkQpj5TwBOt2dRAlE4ukmwOB4TaFAASWIxHhQpCTbGkgI+VSADtKJSnaqFhoZSxCYKaTSZTC6Hw0HtCcushkBPOxwOjwz5q3D+nlujMEZZ+NBqtVJ6vc9kMmX26tVr1Y4dO2ic1eAcgbZUAOMN19yQsGvfrvvKy8oecmvuWBayFgujWtxzoQDqDVWrMBF2KEiCYYrjYGDkdz1DokIiEQCxlsLUsA1WG4HFUoPb8QpSG8R1kqWFDaKIjlIJGYN9YXdIqrFyDBAIy894wjCRTBP4oWJofVDclMDpIRRxvdFopMsDGJqJLXRvKGHpJK9S9NQ0LY7GVnLcc/2cGroGFcLiBYxG4wmz2bwqKSlp8cGDBw8HpQJQ47Nh3bobC4pO/f77+o0BmkHzMD54AF/BVlMPsCW/q+6fz1CgUKEoAZNc1N4/eg8ggiOwQI1dEGRwPrEAHD/vn376qccDAHkQdl54CX5je6pRJSgG75MEwwMQk+ABJBuNIkGxwi7xQkn1LJm/AqkElprFYikPCQnZUVtbm6tpWi+TydTN7Xbvdzqdm6xWK4tbZBgMhm40IBAP0JZeQJ6LVxmOWyyWPyclJS0KWgVIT0/vfCq/8P7SstKpDpcz3rNghdcfnc8bqbIJYuF5p4YfRogJ83D2guslPhGlUeMB/XljqQlWKS2QgBJrTzDM+CiB0JoCs8QD8o5iUApNDIDwsz1KAQtEjgAIpK4KKefmr+D7UGrNarVCIX6UkpLydVFR0RUlJSXp8fHxX8fHx+/Yt2/fIKfTeZPb7aa5raeUoSXHbInxaiC+O2a1WlcmJycvOXDgwHdB5wFsNpspMzNzQEFewVNnzlRfJ+3x6OLm6ecjPXxa+840MJ4+1oCjJwCGt588ebIHf5MxVR+yKrB6ulGsNKUNBL3QmLRLgc8H95O8QikYl8SYZHbVMTlVcD21QcQNzAXAK0kJBskvOjvgOUTwW4rFFRiEAhRYrdb3b7vtto2bN2++PDs7u9eVV165rW/fvvmZmZmjDQbDKIPB0EG9pepz84fSbM3H7DVixywWy8revXsv2b17d/ApAD08P/3002vzcvNmO12OQZq7rhqw7t/5f6kQiPMA9xOUogQUspEYgx2SWEC29/WQRUmwzLKyI7w/1aYiqExFpPyB8Yk3RAHFA8m44H2EH9hEP1Am7qNACD1TGfmvtjVpRaEDAp2yWCyrb7vtts927tzZbefOnbERERE7TCZTSFlZ2X+ZTKahLHjB9cr8CLVGqS2MmJS3u91uFGBV9+7dFwelBxgxYkTY4QOH/zO/MM/mdDgvFZFH+NtCBfTBLDEAVZwIJ300SV4Bh6TEQeCM6hFUL4LlprMbHdjIKNPNAepTBARoBHbHmlMPRPZX70XA84yDAtAWhQwyioRSAKvIEtPmUBRAhT8tMSHe68ADoAB/HzNmzGoC9NLSUsuIESPyVqxY0ddut9/lcrkGGI1GT6IEjyd9SCVz31Z5AW8N1zFN01YlJycHpwJcf/31kfu/3X9bQWH+Y3a7vYf06PS0M2kTH3B2DQwPk8I1aEnYFgJYaoSw4nrow4NWA2EEgMwsASqFcPTyR5nUojq2gRGiTh9oRBJMZX5EGRB2eopS4UkhHJAJpSB5Bv7nNzyCGgAGanl1tDBU4gmLxfLX4cOHZ7Vr1y6/qKiIfpztNmzY8HO73X5HbW1tqpcB8sxpVxNkbREPqLGcpmnB7QFSUlKiq6uq7ystKZnhdDkTPTdQc9dh7JaYrxbuq1KB9O+kCwNVm1hyKjSBQsAjUQKxdoK9CU5JbsHcgM9JYgFb8B7qwtnsh+UmCUb2l7kAEgzLWJwLwk2pA1QnwTgKiPegZn/58uUeBcOLtPSlCo/Xk9hNJlNOaGhoZs+ePf+6a9euXL4fNmxYcnZ29i8cDscETdMuoQkZ7WhYgIQ+QNRueev7PU0KfCmjwLRWhGuey1eficFgOG42m//crVu34GSBevXq1b6qoure0pKSh2udtV0VE3beA2C98IgwIOiUMANfmDAO/CEgxmLLOr6q4CDU1OEDS2BomNyCQsAg0dIcT8B+IhgIMp4FWIRyyBxgdUyUBAUgXkABKKKDVsUrsfYXcwfwCC19yTG9QuS2WCzw/xs7d+78xpgxYz5/4YUX6L9vHDhwYMfs7OyrzGbzEIvFEuNyuYzM0jObzZ0NBgM5gVin09nB7XaHe5euxTv4zDX5Uo5AvZcogAIjc81m89tJSUkLDh06dDDoWKDLLrssqqq8fFJBUdHjDoej+/9DIG8355Y+0VbYH2FlYgrQhxtL8RkCCH0JZtfPFsMSU9v/4osveipA+Vs8BAE1s82YZ8BYwtdLdwhKn/mvxhbsKx4ADI4CoHwoAMwSxXW8N9YjqLm3QeIX3s1m85mIiAhW26TLwlvZ2dn7pK4e8oL25haLpaPJZLI6nU4tNzc3cteuXZ1dLldXTdNY8ogEWaLb7Y41GAzt3W43CTRm87FkJmTHWT2A6uM/L/MXqBLo9CzfbDZnhYeHv1ZZWUmz3uDKBA8dOjT8+PHj4woLC5+ora3tIwGcuP/mPrhzuR03lLm6s2bN8gSfYHYEklJl2BtZ4ELyA1CeQCVqcyh9kAfCA8V7UMuPEsAmqTOupCEV26AAjCs5AH4jBwBUIgbAm+AxJMAGYknSsKVxgJeBIvitioyM3GY0GleEhoauzs3NpetyPTL1CnC9VZ81a5apvLzc2rNnz4hFixZ13Lt3b6LJZALWJphMpi78RzFcLhdK0cHpdNLQgNYUFrPZXA+V1PvlSw58la6oz19qtrzGpcBoNL7rdrtfMRgM+4NOAZj2uHXr1hvy8/Nne5fJ8dnY6lwKeFNj80BggfAAQCGEEfYFS40QqwtUAGeYuDJ//nwPYyNsjzxIlICYYtq0aZ6YQLK2PDRp6yLCLxllFAG6EwgEpSoJOTwLUx9ZBJuq0NZ8mc1md0hISHF4ePja+Pj4ZZ999tnGxMREv4IMb2aYmCBy1qxZ7Z977rl4q9VK0+LeNMrVNK2r0+kkq4xyRDidTpMU/zXEqvnjFbyKzLrGwasATHpfunTp8JMnT851uVyDGurs1poPN5CxgDxMkWSuMIIpfYFkSVQejHR9hpVhDS48hd4yCVOERyGQJsGGxReIJAVnwqcLJKGkGqYHxSMIZzokcQGdnYkBYJvEe/ojJL7uhRf/O1jwwmKxvNuxY8dVx44d+4Ya+0DunVf58RTWnJycqGnTpsVmZ2fHA5XMZnOa3W4f6nQ6LzWZTLFutzvU4XDQHMtn8Cx5F19VqHL9qgfRNK3AbDa/azabX6mtrQ0+D0AmeMmSJYMKCwvnOByOEW6321P/39KHGOiD8hUIcz5QoU899ZSHxsSqy8QYaYYFHsc6U67AAhaUJ0tXaRWS8JmHR6ALlQkrhHdRE18qoySeA2FHAYBMKAB1QhyPecJAI2li1RrXjfWPjIwsi46O3mCxWJaUl5evLykpqWiNsb3XY5o1a5bllVdeCf1eMDtFRkZeGhkZ2a+mpqYfpRZVVVV4BabAwiSdFTjr42i9nKjMEnBN07Ti2NjYFQkJCa/u2bPnsCe91MCrzapBk5OTUyorKx+vqqr6Jf1h9Fi2tW58ION4g0FPxabNZvP0CpLAFUVAyOHoYWcIfIE9lC3L6vNqboDP6owyrDjCTHINgZaqUYQdDwDEkhcsEt3aGAMvhMJIL09YJlG21jAcLEJNb51evXq9Pnz48BXz5s0DR58TVpo44vPPP6cBQtiHH36YlJOTM6KoqOiG6urqAZWVlQk0PlMNonjExp4l90ChQstSUlJeHjNmzGvPP/98o02y2kwBfvKTn8QcOnTozsLCwpngwrZInjR2QxFGBJ8gWNgbtkfIZckkrDDFbUAV6VwhLlk/tlh7xqXsGXoVb0DWGVwP04My0EECJeB+SHsV9mHVSQQBb/P66697cgziWVpDAfAAUVFRu1JTU58ZPXr03202m1/YPxBDwz6ggcLCwojS0tJuVVVVw7dv3z6xpKSE5VPxBrTDwSPUGyBfSEGXW2AeQ9H3Qfm80aNHL507d25pY+fWZgpgs9lCli1bNjo/P3+O0+nsQ/eH1niQgT4IdT+xODS6nT17tmcVGAScGh4EEK6fdyCIKK68qwkZ1RNIppfjINC0YGS+AfAKT0CXaYJa4g68BOcgUymJOTgXFARvs3Tp0vqe/q1lOEwmkzMhIWHNFVdc8fTMmTO/vPbaawNefT3AZ2AcP368KSws7NLi4uJRR48eve7YsWODaY1Dck3uny8ZUe95WFhYbWJi4uY+ffo8f+utt669++67G02UtJkCcJNGjhzZLScn59HCwsJ7vFxxfac1uYltoRQIH/OBqcEnCKYgDpqTBTFIilHHI0yPWoPfUNcKwbASzLEdsIjqUNYLY6ILLBFZZJSDvAHxAjALpYNxkrboNNtSA+CGAsOGhFClExXLyVTC4h49eiwcMmTIq0uXLg142dEAhf+s3RYsWGDNy8ujAG/o4cOHh5SVlRErJJ8+fbqT3W6PwFhK/RHyoU6eioyMrExJSVl89dVXv/jqq6/+f4/HYIsBOJ8//elP4a+//vqE48ePz+ICg4UNEgVg8jrrBpCAwupTfoDwy7REtlNrYBpr2yJxhbhzCXqBQFh3it0QcoJc2rPIfGSBOSgMHoE8A9QoMYNnApHbrxWB6sVAZU2Y6picnLxn4MCBz95www0fTpky5bzAn+Yoy/LlyyMPHDiQsnXr1hHffvvtfxYXFw88c+YMyyp5oJF4VK8ndMXExOzv06fPs/fdd997d9xxR5PtEdvUA3Dy/fv3T8vNzf1DaWnpGBIkYvHbwvLLA8FKYnWBI1hnIAizsgg8hbf310P5gkYCtUiukXVm2iMeAMsPRKJEQvbje4riWOldljTyF/7ok01yDWaz2ZGSkvLPIUOGPL18+XKSYIFpVXMkOsBtHn/88Zjdu3df9c0330zIz8+/wel0xrndbovSWNcVGxtb3Ldv379cccUVL7z00kt1QVITrzZXAKZGbtmy5ZcnT5588vTp090bUoDzqRAimMAgWdgCLl6EXyxvQwLl6543xGqIZ6D2iEwvQTBCDwxSV5KU+QWwQgTH/go/5ySBuH5fi8VyJjU1dem4ceOenzNnTpOwoSmhOle/22y2sA0bNvQuKSm5rrq6enBRUVF6RUVFd6PRGNKhQ4ekBxxtAAAHLUlEQVTi7t27b0tPT1944403rp0wYUKzlkpqcwXgZk2cODHt008/nVtcXHwj01v1AWkgD7slD0EUQBVwVYBVZZTPvtiJps5B0veyL39Lxzi6Q5CBRgn4nuQX2V/KIvzF/frzUOMA2J/o6OgTaWlpc2fOnJl5yy23VDZ13m35O6zRoUOHwkNDQ2PKy8t7Hz16dHB1dXWPzp07H+vdu/eGSy+9dNdDDz3U7PxFUCgAjbHuv/9+W0VFxQNOpzPCV6IjUKwb6MNSlUAEVGYc+TvzyZen4DtpuKXGERIbAMGgYUmaMXme0ud58+Z5mCeJPQKFi6oniIyMrOrbt+/H/fv3f2bJkiVfB3q/LtT9gkIBuHnXXHMN+O6JioqKDKfT+YO1AM4nBJKHKUrA33oPoFr+xii6hgRD5a5FIAWmSG0MsQEULHEIk2Bee+01T/mD3ts0996IIqrnFBsbWzRo0KDFEydOfOnuu+9u9soqF6rA6887aBSAztDr169/oKCg4P6ampr6lQM54UAtXWs8JF9wqDUgmQijao1F0VRIRGxA5zg8AkG4TIL3BcOaul69QnNrY2NjDwwePPjZRx999K1rr7225ZMLmjqJIPs9aBRgxIgRlqqqqmsPHjz4+6qqqiEwQgJ7RCCaa+nOxT3WW8+WnosvBVC9iqoMMgGH2iMpnPMnAJf7IYwSx/HGAe64uLgvMjIyHs/MzNx0Lu5bsI8ZNArAjWL19927d/93QUHBlDNnziRTGNXWHuBcPUARYLVOSIJbFeKI0Mr2xB96SObPOaot3zVNc3Xq1Okf9957729mz579jT/jXCzbBpUCkAF88803r9m/f/+TJSUlw9TVA1VFuBhuvgi0dIED96uJLcVKn5Ud13/vz70QZZJgntlfiYmJWdOnT//DjBkzjvkz1sWybVApADc1NTX10rKysqfKyspu1jQt1Ndkiba4+YFAjsbOU/UAEgcIvFGVXahSvXcIBIKp1t9bnl3SrVu3hRMmTHjOZrPVddj6N3u1uQLcf//9Ufn5+R01TauaOHFi2fz587vn5ub+T15e3kQoUVU4zjcVei5lQRRAfVeDaymkUwVdjUMCUQCuR6hXPsfHx383aNCgeWPHjl3Zv3//Gn9WWD+X9+Z8jt2mCkBd+NChQ68qKSm5x+VylXbv3v3j8vLyjkeOHJlWWlp6tawgLgVP5/PGnI9jqVi/sSBb730CSbpJ3CBJMLxBYmLi0auuuur9yMjIbKvVunXRokV7z8d1B9Mx2lQBsrKyzE8//fTo3Nzc56qqqhLatWtH623T6dOne3kXxW5TCjSYHlRrnIvQoBJHREVFOeLi4kqjoqL2d+zYcc7atWs/bo3jXEhjtKkCkF9KT0/PKCgo+F8mQbjdbs8MJDyD3joG6vIvpIdxrs9VVQA+e0svKnr27Ll6yJAhcxcuXLj7XJ9DsI3f1gpA//3+BQUFs0+dOnWjpmmeOiBZe0tfQRlsN+9CPB8lGaaFhITAAu0YOHDgcxMmTPjHhAkTAp4AfyHeCw8sbOsTnzp1avzq1asfzc/Pn+ZyuegoFnCqv62vJdiPL4wSTtZisdR07tx5b3p6+qKMjIyshx9++EcWqC0e4Lp16yyTJk26s6Sk5Gm73d6lIbrxRwjU8qfjXfBOM5vNCH9Oenr6m8OGDXv3d7/7HTVA52QCfMvP+tyO0OYegMsbPHjw8EOHDs0rKy0drHm9UqAFX+f2dl0YozdGl0ZFRZ2B/uzWrdvbAwYMyIyOjj5is9mCbgLM+brTQaEAU6ZMSf3gvffnFJ0qGkMjpTpTRHfhutvASQZP19Dz9WgCP44s5CEjKPkTLS4uriAtLe1vXbt2XdCrV69sm812vie/B35h52DPoFCAefPmJcx/Yf7swoKC29Vpker1/qgA/j196TGq6z6nJSQkHBo0aNDccePGZd1zzz1BPfnFvysObOugUICVK1fGzHxk5jOnCgvvcWsavWB+cDU/KkDzH7BQnAi/NO81m820C8kbOHDgh5dffvmrNputbnnJf/NXUCjApk2bwkff+POnKyorp9EQ6UcFaJlUSvmIGgtER0eXDR06dM2YMWNeHTFixObU1FTW//23fwWFAnz11VfWUcOvnXW6+vQMzWAI/1EBWi6XkkNhJLxAXFxc4fXXX7/8mWeeeTUhIYHV0//tOH9fdzUoFIAEWEy76D9Un6l+xOV2e1Ye1L9+hEDNVwqBQFLygAL069evYsaMGf/KyMjIfP/993fk5+fnnq/2h80/8/O/ZVAoALmA8beM/X1l9elfO12udj8qQMsEQRSAaZSUk9Noa/Lkye6bbrrp9OrVq3M2bdr0TlxcXNZbb711vGVHuvD3DgoF2Lt3b8hPr77micrKihkutzvqRwVomWBJxpf7SN9ROlHfeeednkU8Fi9eXNy+fftVvXv3fvHtt98+1LIjXfh7/x9qVudxyHgBPwAAAABJRU5ErkJggg==`;

    // --- HELPER CLASSES ---

    /**
     * 🕵️‍♂️ Grok Prompt Inspector (Sniffer)
     * Handles UI injection and Prompt Panel rendering on image cards.
     */
    class GrokPromptInspector {
        constructor() {
            this.activePanel = null;
            this.hoverTimer = null;
        }

        init() {
            console.log('[GPM] Initializing Prompt Inspector...');
            this.waitForBody();
        }

        waitForBody() {
            if (!document.body) {
                return setTimeout(() => this.waitForBody(), 50);
            }
            // ⚡ Performance: Debounce Observer
            const debouncedInject = debounce(() => this.injectUI(), 500);
            const observer = new MutationObserver(() => debouncedInject());
            observer.observe(document.body, { childList: true, subtree: true });
            this.injectUI();
        }

        isImaginePage() {
            return location.pathname === '/imagine' || location.pathname.startsWith('/imagine/');
        }

        isPublicImagineImage(src) {
            if (!src) return false;
            return src.includes('xai-images-public');
        }

        extractPostIdFromCard(card) {
            const media = card.querySelector('img, video');
            if (!media) return null;

            const src = media.src || media.poster;
            if (!src) return null;

            // 🟢 imagine-public (share-images / share-videos)
            if (this.isImaginePage() && src.includes('imagine-public')) {
                let m = src.match(/\/([0-9a-fA-F-]{36})\.(jpg|png|webp|mp4)(\?|$)/);
                if (m) return m[1];
                m = src.match(/\/share-(images|videos)\/([0-9a-fA-F-]{36})_thumbnail\.(jpg|png|webp)(\?|$)/);
                if (m) return m[2];
            }

            // 🔵 grok assets (legacy)
            let m2 = src.match(/\/([0-9a-fA-F-]{36})\/(content|preview_image|generated_video)/);
            if (m2) return m2[1];

            // 🆕 grok assets (generated/{id}/preview_image.jpg)
            m2 = src.match(/\/generated\/([0-9a-fA-F-]{36})\/preview_image\.(jpg|png|webp)(\?|$)/);
            if (m2) return m2[1];

            return null;
        }

        formatTime(iso) {
            if (!iso) return 'unknown time';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return 'unknown time';
            return d.toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        }

        renderPromptBlock(title, text, time, postId) {
            if (!text) return '';
            const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `
              <div style="margin-top:6px; padding:8px; border-radius:10px; background:rgba(255,255,255,0.06);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <div style="font-size:11px; opacity:.8;">
                    <b>${title}</b>
                    ${time ? `<span style="margin-left:6px;">· ${this.formatTime(time)}</span>` : ''}
                  </div>
                </div>
                <pre style="white-space:pre-wrap; margin:0; font-size:12px;">${escapedText}</pre><br/>
                <div style="display:flex;gap:6px;">
                    <button data-copy="${encodeURIComponent(text)}" style="
                        font-size:11px; padding:4px 6px; border-radius:6px; background:#222;
                        color:#fff; border:1px solid rgba(255,255,255,.15); cursor:pointer;
                    ">📋 Copy</button>
                    ${postId ? `<button data-open="${postId}" style="
                        font-size:11px; padding:4px 6px; border-radius:6px; background:#222;
                        color:#fff; border:1px solid rgba(255,255,255,.15); cursor:pointer;
                    ">🔗 Open</button>` : ''}
                </div>
              </div>`;
        }

        scheduleClosePanel() {
            clearTimeout(this.hoverTimer);
            this.hoverTimer = setTimeout(() => this.closeExistingPanel(), 150);
        }

        closeExistingPanel() {
            if (this.activePanel) {
                this.activePanel.remove();
                this.activePanel = null;
            }
        }

        openPanel(card) {
            clearTimeout(this.hoverTimer);
            this.closeExistingPanel();

            const postId = this.extractPostIdFromCard(card);
            if (!postId) {
                console.warn('[GPM] Could not extract Post ID from card');
                return;
            }

            const post = GLOBAL_POST_STORE[postId];
            console.log(`[GPM] Inspecting ${postId}:`, post ? 'Found' : 'MISSING', post);

            if (!post) {
                console.warn('[GPM] Data miss. Store size:', Object.keys(GLOBAL_POST_STORE).length);
                return;
            }

            // Build Content
            let html = '<div style="font-size:13px; font-weight:600; margin-bottom:6px;">📸 Prompt Inspector</div>';

            // Original
            if (post.originalPrompt || post.text) {
                html += this.renderPromptBlock('✨ Original Prompt', post.originalPrompt || post.text, post.createdAt, post.originalPostId || post.id);
            }
            // Remix
            if (post.remixPrompts?.length > 0) {
                post.remixPrompts.forEach((remix, i) => {
                    html += this.renderPromptBlock(`🎨 Remix #${i + 1}`, remix.prompt, remix.createdAt, remix.postId);
                });
            } else if (!post.originalPrompt && !post.text) {
                html = '<div style="opacity:0.6; font-size:12px;">No prompt data available</div>';
            }

            const panel = document.createElement('div');
            panel.className = 'prompt-inspector-panel';
            panel.innerHTML = html;
            Object.assign(panel.style, {
                position: 'absolute', top: '40px', left: '0', zIndex: 10000,
                background: UI_THEME.glassBg, backdropFilter: UI_THEME.blur,
                color: '#fff', padding: '12px', borderRadius: '12px',
                maxWidth: '400px', boxShadow: UI_THEME.shadow,
                border: `1px solid ${UI_THEME.glassBorder}`, pointerEvents: 'auto'
            });

            // Events
            panel.addEventListener('mouseenter', () => {
                clearTimeout(this.hoverTimer);
                card.style.pointerEvents = 'none'; // Prevent card click
            });
            panel.querySelectorAll('[data-copy]').forEach(btn => {
                btn.onclick = e => {
                    const text = decodeURIComponent(btn.dataset.copy);
                    navigator.clipboard.writeText(text).then(() => {
                        const orig = btn.textContent;
                        btn.textContent = '✅';
                        setTimeout(() => { btn.textContent = orig; }, 1000);
                    });
                    e.stopImmediatePropagation();
                };
            });
            panel.querySelectorAll('[data-open]').forEach(btn => {
                btn.onclick = e => {
                    window.open(`https://grok.com/imagine/post/${btn.dataset.open}`, '_blank');
                    e.stopImmediatePropagation();
                };
            });
            panel.addEventListener('mouseleave', () => {
                card.style.pointerEvents = '';
                this.scheduleClosePanel();
            });

            card.style.position = 'relative';
            card.appendChild(panel);
            this.activePanel = panel;
        }

        injectUI() {
            const cards = document.querySelectorAll('[role="listitem"] .group\\/media-post-masonry-card');
            cards.forEach(card => {
                if (card.querySelector('.prompt-inspector-btn')) return;

                const media = card.querySelector('img, video');
                if (!media) return;
                const src = media.src || media.poster;
                if (!src) return;
                if (this.isPublicImagineImage(src)) return; // Skip public/shared

                const btn = document.createElement('button');
                btn.className = 'prompt-inspector-btn';
                // Premium SVG Icon (Sparkles)
                btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5"><path d="M12 3c0 4.5 3.5 8 8 8-4.5 0-8 3.5-8 8 0-4.5-3.5-8-8-8 4.5 0 8-3.5 8-8z"></path></svg>`;
                Object.assign(btn.style, {
                    position: 'absolute', top: '10px', left: '10px', zIndex: 100,
                    background: UI_THEME.glassBg,
                    backdropFilter: UI_THEME.blur,
                    color: '#fff', borderRadius: '50%',
                    width: '32px', height: '32px', cursor: 'pointer', pointerEvents: 'auto',
                    border: `1px solid ${UI_THEME.glassBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: UI_THEME.transition,
                    boxShadow: UI_THEME.shadow
                });

                btn.onmouseenter = (e) => {
                    e.stopPropagation();
                    btn.style.transform = 'scale(1.1)';
                    btn.style.background = UI_THEME.primary;
                    this.openPanel(card);
                };
                btn.onmouseleave = () => {
                    btn.style.transform = 'scale(1)';
                    btn.style.background = UI_THEME.glassBg;
                    this.scheduleClosePanel();
                };

                card.style.position = 'relative';
                card.appendChild(btn);
            });

            // Post Detail Page
            if (location.pathname.startsWith('/imagine/post/')) {
                this.injectPostDetailUI();
            }
        }

        injectPostDetailUI() {
            const container = document.querySelector('.group.relative.mx-auto.rounded-2xl.overflow-hidden');
            if (!container || container.querySelector('.prompt-inspector-btn')) return;

            const btn = document.createElement('button');
            btn.className = 'prompt-inspector-btn';
            btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5"><path d="M12 3c0 4.5 3.5 8 8 8-4.5 0-8 3.5-8 8 0-4.5-3.5-8-8-8 4.5 0 8-3.5 8-8z"></path></svg>`;
            Object.assign(btn.style, {
                position: 'absolute', top: '15px', left: '15px', zIndex: 9999,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                color: '#fff', borderRadius: '50%',
                width: '36px', height: '36px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            });

            btn.onmouseenter = () => {
                btn.style.transform = 'scale(1.1)';
                btn.style.background = 'var(--gpm-primary, #6366F1)';
                this.openPanel(container);
            };
            btn.onmouseleave = () => {
                btn.style.transform = 'scale(1)';
                btn.style.background = 'rgba(0,0,0,0.6)';
                this.scheduleClosePanel();
            };

            container.style.position = 'relative';
            container.appendChild(btn);
        }
    }

    /**
     * StorageService: Handles Data Persistence & Migration
     */
    class StorageService {
        constructor() {
            this.data = this.load();
        }

        load() {
            try {
                // 1. Try loading v2 data (GM storage)
                let v2Data = GM_getValue(DB_KEY, null);
                if (v2Data) {
                    try {
                        const parsed = JSON.parse(v2Data);
                        // 数据完整性校验
                        if (this.validateData(parsed)) {
                            return parsed;
                        } else {
                            console.warn('[GPM] ⚠️ V2 数据结构损坏，尝试恢复...');
                            this.backupCorruptedData('v2_corrupted', v2Data);
                        }
                    } catch (parseError) {
                        console.error('[GPM] ❌ V2 数据解析失败:', parseError);
                        this.backupCorruptedData('v2_parse_error', v2Data);
                    }
                }

                // 1.5 ✨ RECOVERY: Check LocalStorage Mirror (Only if GM data is missing)
                if (!v2Data) {
                    try {
                        const mirror = localStorage.getItem('GPM_V2_MIRROR');
                        if (mirror) {
                            console.log('[GPM] ♻️ GM data missing. Found LocalStorage mirror! Restoring data...');
                            const restored = JSON.parse(mirror);
                            if (this.validateData(restored)) {
                                GM_setValue(DB_KEY, mirror); // Sync to new GM instance
                                return restored;
                            } else {
                                console.warn('[GPM] Mirror 数据损坏，跳过恢复');
                            }
                        }
                    } catch (e) {
                        console.error('[GPM] Failed to restore from mirror:', e);
                    }
                }

                // 2. Fallback: Try loading v0.19 data and migrate
                let oldData = GM_getValue(OLD_DB_KEY, null);
                if (oldData) {
                    try {
                        console.log('[GPM] Migrating data from v0.19...');
                        const parsed = JSON.parse(oldData);
                        return this.migrate(parsed);
                    } catch (migrateError) {
                        console.error('[GPM] ❌ 迁移失败:', migrateError);
                        this.backupCorruptedData('old_migrate_error', oldData);
                    }
                }

                // 3. New User: Return Schema
                console.log('[GPM] 初始化新用户数据');
                return this.defaultSchema();

            } catch (criticalError) {
                console.error('[GPM] 🚨 严重错误，返回默认数据:', criticalError);
                return this.defaultSchema();
            }
        }

        // 新增：数据完整性校验
        validateData(data) {
            if (!data || typeof data !== 'object') return false;
            if (!Array.isArray(data.libraries)) return false;
            if (!data.settings || typeof data.settings !== 'object') return false;
            return true;
        }

        // 新增：备份损坏数据
        backupCorruptedData(suffix, rawData) {
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupKey = `GPM_BACKUP_${suffix}_${timestamp}`;
                localStorage.setItem(backupKey, rawData);
                console.log(`[GPM] 💾 已备份损坏数据到: ${backupKey}`);
            } catch (e) {
                console.error('[GPM] 备份失败:', e);
            }
        }

        defaultSchema() {
            return {
                version: '2.0',
                settings: {
                    theme: 'glass', // 'glass' | 'dark' | 'light'
                    panels: {
                        left: { collapsed: false, visible: false, width: 300, height: 700, top: 80, left: 20 },
                        right: { collapsed: false, visible: false, width: 300, height: 700, top: 80, right: 20 },
                        bottom: { visible: false, x: 0, y: 0, width: 600, height: 200 }
                    }
                },
                libraries: [
                    {
                        id: 'default',
                        name: '📚 默认库 (Default)',
                        prompts: [{ "id": 1701234567890, "name": "赛博朋克未来城市夜景", "content": "A futuristic cyberpunk city at night, neon lights reflecting on wet streets, flying cars in the distance, cinematic composition", "category": "Cyberpunk", "pinned": false, "type": "text" }, { "id": 1701234567891, "name": "柔光人像摄影", "content": "Portrait of a young woman with flowing hair, soft natural lighting, bokeh background, professional photography style", "category": "Portrait", "pinned": true, "type": "text" }, { "id": 1701234567892, "name": "史诗级奇幻巨龙", "content": "A majestic dragon flying over snow-capped mountains, epic fantasy scene, dramatic clouds, golden hour lighting", "category": "Fantasy", "pinned": false, "type": "text" }, { "id": 1701234567893, "name": "北欧简约室内设计", "content": "Minimalist modern interior design, Scandinavian style, natural wood furniture, large windows with city view", "category": "Interior Design", "pinned": false, "type": "text" }, { "id": 1701234567894, "name": "皮克斯风格卡通角色", "content": "Cute cartoon character, 3D render, Pixar style, colorful and cheerful, white background", "category": "Cartoon", "pinned": false, "type": "text" }, { "id": 1701234567895, "name": "复古胶片街拍", "content": "Vintage film photography aesthetic, grainy texture, warm tones, nostalgic mood, street photography", "category": "Vintage", "pinned": false, "type": "text" }, { "id": 1701234567896, "name": "抽象几何艺术", "content": "Abstract geometric patterns, vibrant colors, modern art style, high contrast, symmetrical composition", "category": "Abstract", "pinned": false, "type": "text" }, { "id": 1701234567897, "name": "动漫风格插画", "content": "Anime style illustration, detailed eyes, dynamic pose, colorful hair, studio lighting", "category": "Anime", "pinned": true, "type": "text" }, { "id": 1701234567898, "name": "美食摄影", "content": "Photorealistic food photography, gourmet dish, professional plating, shallow depth of field, appetizing presentation", "category": "Food", "pinned": false, "type": "text" }, { "id": 1701234567899, "name": "超现实梦境", "content": "Surreal dreamscape, floating islands, impossible architecture, Salvador Dali inspired, vibrant colors", "category": "Surreal", "pinned": false, "type": "text" }] // Unified array with type: 'text' | 'video'
                    }
                ],
                activeTextLibraryId: 'default',
                activeVideoLibraryId: 'default',
                modifiers: [
                    "4k", "8k", "HDR", "Cinematic", "Realistic", "Cyberpunk",
                    "Symmetrical", "Studio Lighting", "Vibrant", "Bokeh"
                ]
            };
        }

        migrate(oldData) {
            // Convert v0.19 structure to v2.0
            const newData = this.defaultSchema();

            // Migrate Libraries
            if (oldData.libraries) {
                newData.libraries = oldData.libraries.map(lib => ({
                    id: lib.id,
                    name: lib.name,
                    prompts: [
                        ...(lib.prompts.text_to_image || []).map(p => ({ ...p, type: 'text' })),
                        ...(lib.prompts.image_to_video || []).map(p => ({ ...p, type: 'video' }))
                    ]
                }));
            }

            // Migrate Settings
            if (oldData.settings) {
                // Approximate mapping of old settings
                if (oldData.settings.showBottomPanel) newData.settings.panels.bottom.visible = true;
            }

            // v2.0 -> v2.1 Migration: Split activeLibraryId
            if (oldData.activeLibraryId) {
                newData.activeTextLibraryId = oldData.activeLibraryId;
                newData.activeVideoLibraryId = oldData.activeLibraryId;
            }

            this.save(newData);
            return newData;
        }

        save(data) {
            try {
                this.data = data || this.data;

                // 尝试序列化数据
                let json;
                try {
                    json = JSON.stringify(this.data);
                } catch (stringifyError) {
                    console.error('[GPM] ❌ 数据序列化失败（可能包含循环引用）:', stringifyError);
                    alert('⚠️ 数据保存失败：数据结构异常\n\n请联系开发者或尝试导出备份后重置。');
                    return false;
                }

                // ✨ Size Monitoring (5MB Browser Standard Warning)
                const size = json.length;
                const sizeMB = (size / 1024 / 1024).toFixed(2);

                // Browser LocalStorage limit is typically 5MB (approx 5 million characters)
                if (size > 5 * 1024 * 1024) { // 5MB
                    console.error(`[GPM] ❌ 数据超过 5MB 限制 (${sizeMB} MB)`);
                    alert(`❌ 存储空间不足\n\n当前数据大小：${sizeMB} MB\n浏览器限制：5 MB\n\n建议操作：\n1. 导出备份当前数据\n2. 删除部分不常用的库\n3. 清理浏览器缓存后重试`);
                    return false;
                } else if (size > 4.5 * 1024 * 1024) { // 4.5MB
                    console.warn(`[GPM] ⚠️ 数据接近 5MB 限制 (${sizeMB} MB)，建议清理`);
                } else if (size > 4 * 1024 * 1024) { // 4MB
                    console.log(`[GPM] ℹ️ Storage usage: ${sizeMB} MB (Approaching 5MB limit)`);
                }

                // 保存到 GM 存储
                try {
                    GM_setValue(DB_KEY, json);
                } catch (gmError) {
                    console.error('[GPM] ❌ GM 存储失败:', gmError);
                    alert('⚠️ 数据保存失败\n\n可能原因：\n- Tampermonkey 存储配额已满\n- 浏览器权限受限\n\n请尝试重启浏览器或重装脚本。');
                    return false;
                }

                // Backup to localStorage for safety
                try {
                    localStorage.setItem('GPM_V2_MIRROR', json);
                } catch (e) {
                    if (e.name === 'QuotaExceededError') {
                        console.warn(`[GPM] LocalStorage 镜像跳过（超过 5MB 配额: ${sizeMB} MB）。数据已保存到 GM。`);
                    } else {
                        console.warn('[GPM] LocalStorage mirror skipped. Data saved to GM only.', e);
                    }
                }

                console.log('[GPM] ✅ 数据已保存到 GM_setValue');
                return true;

            } catch (criticalError) {
                console.error('[GPM] 🚨 保存过程严重错误:', criticalError);
                alert('🚨 数据保存失败\n\n发生未知错误，请查看控制台日志。');
                return false;
            }
        }

        get() { return this.data; }
    }

    /**
     * StyleManager: Glassmorphism Theme System
     */
    class StyleManager {
        constructor() {
            this.initStyles();
        }

        initStyles() {
            const css = `
                :host {
                    /* 从 UI_THEME 全局配置同步 */
                    --gpm-glass-bg: ${UI_THEME.glassBg};
                    --gpm-glass-border: ${UI_THEME.glassBorder};
                    --gpm-glass-blur: ${UI_THEME.blur};
                    --gpm-primary: ${UI_THEME.primary};
                    --gpm-primary-glow: ${UI_THEME.primary}66;
                    --gpm-text: #F9FAFB;
                    --gpm-text-dim: #9CA3AF;
                    --gpm-radius: ${UI_THEME.radius};
                    --gpm-spacing: 10px;
                    --gpm-font: 'Inter', -apple-system, system-ui, sans-serif;
                    --gpm-transition: ${UI_THEME.transition};
                }

                .gpm-panel {
                    background: var(--gpm-glass-bg);
                    backdrop-filter: blur(var(--gpm-glass-blur)) saturate(180%);
                    -webkit-backdrop-filter: blur(var(--gpm-glass-blur)) saturate(180%);
                    border: 1px solid var(--gpm-glass-border);
                    border-radius: var(--gpm-radius);
                    color: var(--gpm-text);
                    font-family: var(--gpm-font);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
                    overflow: hidden;
                    transition: var(--gpm-transition);
                }

                /* Highlight */
                .highlight {
                    background: rgba(255, 235, 59, 0.25);
                    color: #fff9c4;
                    border-radius: 2px;
                    padding: 0 2px;
                }

                /* Context Menu (Global) */
                .gpm-context-menu {
                    position: fixed;
                    background: rgba(30, 30, 30, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 6px;
                    z-index: 100000;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    min-width: 140px;
                    display: none;
                    flex-direction: column;
                }
                .gpm-context-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    color: white;
                    font-size: 13px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: background 0.2s;
                    user-select: none;
                }
                .gpm-context-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .gpm-context-item.delete {
                    color: #ff6b6b;
                }
                .gpm-context-item.delete:hover {
                    background: rgba(255, 107, 107, 0.2);
                }

                .gpm-btn {
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    padding: 6px 12px;
                    font-size: 13px;
                    font-weight: 500;
                    transition: var(--gpm-transition);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                .gpm-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                .gpm-btn:active {
                    transform: translateY(0) scale(0.97);
                }
                .gpm-btn.primary {
                    background: var(--gpm-primary);
                    border: none;
                    box-shadow: 0 4px 15px var(--gpm-primary-glow);
                }
                .gpm-btn.primary:hover {
                    filter: brightness(1.1);
                    box-shadow: 0 6px 20px var(--gpm-primary-glow);
                }

                /* Scrollbar */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }

                /* Reset */
                * { box-sizing: border-box; }

                /* Action Row & Mode Buttons */
                .gpm-btn {
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.08);
                    color: #ddd;
                    border-radius: 6px;
                    cursor: pointer;
                    padding: 4px 8px;
                    font-size: 12px;
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    user-select: none;
                }
                .gpm-btn:hover { background: rgba(255,255,255,0.15); color: white; border-color: rgba(255,255,255,0.15); }

                .gpm-btn.primary { background: var(--gpm-primary); color: white; border-color: transparent; }
                .gpm-btn.primary:hover { filter: brightness(1.1); }

                .gpm-btn.danger { color: #ff5555; background: rgba(255, 85, 85, 0.1); border-color: transparent; }
                .gpm-btn.danger:hover { background: rgba(255, 85, 85, 0.2); color: #ff7777; }

                .gpm-btn.min-btn { padding: 0; width: 22px; height: 22px; border-radius: 50%; opacity: 0.7; }
                .gpm-btn.min-btn:hover { opacity: 1; background: rgba(255,255,255,0.2); }

                /* Mode Switcher */
                .mode-group { display: flex; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 2px; border: 1px solid rgba(255,255,255,0.05); }
                .gpm-btn.mode-btn { background: transparent; color: #888; border: none; font-size: 12px; padding: 4px 10px; flex: 1; margin: 0; border-radius: 4px; }
                .gpm-btn.mode-btn.active { background: rgba(255,255,255,0.1); color: white; font-weight: bold; }
                .gpm-btn.mode-btn:hover:not(.active) { color: #ccc; }

                /* Inputs */
                input[type="text"], select, textarea {
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    border-radius: 6px;
                    font-size: 12px;
                    transition: border-color 0.2s;
                }
                input[type="text"]:focus, select:focus, textarea:focus {
                    outline: none;
                    border-color: var(--gpm-primary);
                    background: rgba(0,0,0,0.3);
                }

                /* Resize Handle */
                .gpm-resize-handle {
                    position: absolute;
                    bottom: 0;
                    width: 15px;
                    height: 15px;
                    z-index: 10002;
                    background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%);
                    transition: background 0.2s;
                }
                .gpm-resize-handle:hover {
                    background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.5) 50%);
                }
                /* Breathing Animation for SVG */
                @keyframes gpm-breathe {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }

                .gpm-svg-icon {
                    width: 16px; height: 16px;
                    fill: none;
                    stroke: currentColor;
                    vertical-align: middle;
                }

                .gpm-svg-anim:hover {
                    animation: gpm-breathe 2s infinite ease-in-out;
                    color: var(--gpm-primary);
                }

                /* HD Toggle States */
                .hd-on { color: #00ba7c !important; }
                .hd-off { color: #ff4d4f !important; }
            `;
            // Store for Shadow DOMs
            this.themeCSS = css;

            // Inject Globally for Context Menu (Light DOM)
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }

        getThemeCSS() {
            return this.themeCSS;
        }
    }

    /**
     * TemplateEngine: Handles dynamic prompt generation
     */
    class TemplateEngine {
        static extractVariables(template) {
            const regex = /\{([^}]+)\}/g;
            const vars = [];
            let match;
            while ((match = regex.exec(template)) !== null) {
                vars.push(match[1]);
            }
            return [...new Set(vars)];
        }

        static parse(template, values) {
            return template.replace(/\{([^}]+)\}/g, (match, key) => {
                return values[key] !== undefined ? values[key] : match;
            });
        }
    }

    /**
     * Base Component Class
     */
    class Component {
        constructor(styleManager) {
            this.styleManager = styleManager;
            this.root = document.createElement('div');
            this.shadow = this.root.attachShadow({ mode: 'open' });
        }

        render(htmlContent) {
            const style = document.createElement('style');
            style.textContent = this.styleManager.getThemeCSS();
            this.shadow.innerHTML = '';
            this.shadow.appendChild(style);

            const wrapper = document.createElement('div');
            wrapper.innerHTML = htmlContent;
            this.shadow.appendChild(wrapper);

            this.afterRender();
        }

        afterRender() {
            // To be overridden by subclasses for event binding
        }

        mount(parent) {
            parent.appendChild(this.root);
        }
    }

    /**
     * InputManager: Handles interaction with the website's input field
     */
    /**
     * InputManager: Handles interaction with the website's input field
     */
    /**
     * InputManager: Handles interaction with the website's input field
     */
    class InputManager {
        constructor() {
            this.inputElement = null;
            this.lastActiveInput = null; // ✨ Focus Tracking

            // ✨ GLOBAL FOCUS TRACKING (Capture Phase)
            // Continually tracks the real input even if it blurs momentarily
            window.addEventListener('focus', (e) => {
                const target = e.target;
                if (this._isValid(target)) {
                    this.lastActiveInput = target;
                    // console.log('[GPM] Focus tracked:', target);
                }
            }, true); // Capture phase to catch it before bubbling stops

            // Also track click to update lastActiveInput if user clicks manually
            window.addEventListener('click', (e) => {
                const target = e.target;
                if (this._isValid(target)) {
                    this.lastActiveInput = target;
                }
            }, true);
        }

        _isValid(el) {
            if (!el) return false;
            // ✨ FIX: Check if it's a valid Element (nodeType 1) to avoid "getAttribute is not a function"
            if (el.nodeType !== 1) return false;

            // Basic Checks
            const tag = el.tagName;
            if (tag === 'TEXTAREA' || (tag === 'INPUT' && el.type === 'text')) return true;
            if (el.isContentEditable) return true;

            // Safe attribute checks
            try {
                if (el.getAttribute('contenteditable') === 'true') return true;
                if (el.getAttribute('role') === 'textbox') return true;
            } catch (e) {
                return false;
            }
            return false;
        }

        getInput() {
            // 1. Try currently focused element
            const active = document.activeElement;
            if (this._isValid(active)) {
                this.lastActiveInput = active; // Update cache
                return active;
            }

            // 2. Try last active input (Fallback)
            if (this.lastActiveInput && document.contains(this.lastActiveInput)) {
                console.log('[GPM] Restoring focus to last active input');
                this.lastActiveInput.focus(); // 🔧 Fix: 必须先 focus，否则 React 控制的输入框会忽略插入
                return this.lastActiveInput;
            }

            // 3. Try finding by selectors (Last Resort)
            if (this.inputElement && document.contains(this.inputElement)) {
                return this.inputElement;
            }
            return this.findInput();
        }

        findInput() {
            // Priority list of selectors
            const selectors = [
                // 1. Direct role-based selectors (Language Independent & Robust)
                'textarea[role="textbox"]',
                'div[contenteditable="true"][role="textbox"]',
                // 2. Specific test-ids/aria-labels (Targeted)
                'textarea[data-testid="DmComposerTextInput"]', // X.com DM
                'div[contenteditable="true"][data-testid="tweetTextarea_0"]', // X.com Tweet
                // 3. Fallback placeholder matching (English & common patterns)
                'textarea[placeholder*="Grok"]',
                'textarea[aria-label*="Grok"]',
                'textarea[placeholder*="describe"]',
                'textarea[placeholder*="Video"]',
                'textarea[placeholder*="Custom"]',
                'textarea[placeholder*="输入"]', // Added: Chinese "Enter"
                'textarea[placeholder*="提示词"]', // Added: Chinese "Prompt"
                'textarea[placeholder*="想象"]', // Added: Chinese "Imagine" (Photo/Portrait)
                'textarea[placeholder*="自定义视频"]', // Added: Chinese Video prompt (Matches screenshot)
                'textarea[placeholder*="生成视频"]',
                'div[contenteditable="true"][aria-label*="Grok"]',
                'div[contenteditable="true"][aria-label*="输入"]',
                'div[contenteditable="true"][aria-label*="视频"]',
                // 4. Position-based fallback (Within main chat area)
                'main textarea',
                '#main-content textarea',
                // 5. Broad fallbacks
                'textarea',
                'div[contenteditable="true"]'
            ];

            for (const sel of selectors) {
                const els = document.querySelectorAll(sel);
                for (const el of els) {
                    // CRITICAL: Exclude our own inputs (Grok Prompt Manager)
                    if (el.closest && el.closest('#' + APP_ID)) continue;
                    if (el.closest && el.closest('.gpm-editor')) continue;
                    if (el.id && (el.id.includes('gpm') || el.id.includes('prompt-manager'))) continue;

                    // Is Valid Check
                    if (this._isValid(el)) {
                        this.inputElement = el; // Cache it
                        return el;
                    }
                }
            }
            this.inputElement = null;
            return null;
        }

        insert(text) {  // 🔧 回滚为同步方法（参考v5.0.2）
            const el = this.getInput();
            if (!el) {
                console.warn('[GPM] No valid input found for insert');
                return false;
            }

            el.focus();

            // Handle ContentEditable (Divs, Spans)
            if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
                const success = document.execCommand('insertText', false, text);
                if (!success) {
                    el.innerText += text;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            // Handle Textarea / Input
            else {
                const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;

                if (nativeTextAreaValueSetter) {
                    const currentVal = el.value;
                    const newVal = currentVal ? currentVal + '\n' + text : text; // 🔧 Fix: '\\n' → '\n' 真正的换行符
                    nativeTextAreaValueSetter.call(el, newVal);
                } else {
                    el.value = (el.value || '') + '\n' + text; // 🔧 Fix: 同上
                }

                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));

                // 🔧 Restore cursor to end
                el.selectionStart = el.selectionEnd = el.value.length;
            }


            // Scroll to bottom
            el.scrollTop = el.scrollHeight;
            return true;
        }

        findSubmitButton() {
            const selectors = [
                'button[aria-label="Send"]',
                'button[aria-label="发送"]',
                'button[data-testid="sendMessageButton"]', // Grok/Twitter
                'button[data-testid="DmComposerSendButton"]', // X DMs
                'div[role="button"][aria-label="Send"]', // Sometimes div buttons
                'div[role="button"][aria-label="发送"]',
                'button[type="submit"]', // Generic fallback
                'button[aria-label="Submit"]'
            ];
            for (const sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn && !btn.disabled && btn.offsetWidth > 0) return btn;
            }
            return null;
        }

        submit() {
            const btn = this.findSubmitButton();
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        }

        getValue() {
            const el = this.getInput();
            if (!el) return '';

            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                return el.value || '';
            } else if (el.isContentEditable) {
                return el.innerText || '';
            }
            return '';
        }

        setValue(text) {
            const el = this.getInput();
            if (!el) return false;

            // 🔧 Focus before setting value
            el.focus();
            // Fixed: Removed async wait which caused cursor loss
            // await new Promise(r => setTimeout(r, 30));

            // Handle Textarea / Input (Specifically for React/Vue)
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                const nativeValueSetter = Object.getOwnPropertyDescriptor(
                    (el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement).prototype,
                    "value"
                ).set;

                if (nativeValueSetter) {
                    nativeValueSetter.call(el, text);
                } else {
                    el.value = text;
                }

                // Essential for React/Grok to notice the change
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));

                // 🔧 Set cursor to end
                el.selectionStart = el.selectionEnd = text.length;
            }
            // Handle ContentEditable
            else if (el.isContentEditable) {
                el.innerText = text;
                el.dispatchEvent(new Event('input', { bubbles: true }));

                // 🔧 Move cursor to end
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(el);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }

            // Scroll to bottom
            el.scrollTop = el.scrollHeight;
            return true;
        }
        /**
         * Smart Replace:
         * - If text is selected: Replace selection
         * - If cursor is explicitly placed (collapsed selection): Insert at cursor? No, Replace Mode usually implies overwriting.
         * - Logic: If Selection exists -> Replace Selection. Else -> Replace Whole Value.
         */
        smartReplace(text, isStrict = false) {
            const el = this.getInput();
            if (!el) return;

            el.focus();

            const hasSelection = (el.selectionStart !== el.selectionEnd) ||
                                (el.isContentEditable && !window.getSelection().isCollapsed);

            if (!isStrict && !hasSelection) {
                // Non-strict replacement without selection -> Replace All
                this.setValue(text);
            } else {
                // ⚡ OPTIMIZED: for TEXTAREA/INPUT, avoid execCommand as it often fails or is blocked
                if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                    const start = el.selectionStart;
                    const end = el.selectionEnd;
                    const val = el.value || '';
                    const newVal = val.substring(0, start) + text + val.substring(end);

                    this.setValue(newVal);

                    // Restore cursor position after insertion
                    el.selectionStart = el.selectionEnd = start + text.length;
                }
                // For ContentEditable, execCommand is still the best way
                else {
                    const success = document.execCommand('insertText', false, text);
                    if (!success) {
                         if (el.isContentEditable) {
                            el.innerText = text;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                }
            }
        }
    }
    /**
     * 自动高清模块 (Auto Upscale Module)
     * Merged from v2.0 standalone script
     */
    class GrokAutoUpscale {
        constructor() {
            // ✨ 修复：从存储中读取，不再强制 true
            this.enabled = GM_getValue('auto_upscale_enabled', true);
            this.silent = true; // Default Silent Mode
            this.processedVideos = new Set(); // Stores video srcs
            this.completedPosts = new Set(); // Stores post IDs
            this.isProcessing = false;
            this.observer = null;

            // Auto start if enabled
            if (this.enabled) this.start();
        }

        toggle(forceState) {
            this.enabled = forceState !== undefined ? forceState : !this.enabled;
            GM_setValue('auto_upscale_enabled', this.enabled);

            if (this.enabled) {
                this.start();
                console.log('[AutoUpscale] Expanded & Enabled');
            } else {
                this.stop();
                console.log('[AutoUpscale] Disabled');
            }
            return this.enabled;
        }

        start() {
            if (this.observer) return;
            this.scan();
            // ⚡ Performance: Debounced Scan
            const debouncedScan = debounce(() => {
                if (!this.enabled) return;
                this.scan();
            }, 1000); // 1s debounce for heavy upscale scan

            this.observer = new MutationObserver((mutations) => {
                debouncedScan();
            });
            this.observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
        }

        stop() {
             if (this.observer) {
                 this.observer.disconnect();
                 this.observer = null;
             }
        }

        scan() {
            const videos = document.querySelectorAll('video');
            videos.forEach(v => {
                if (v.src && !this.processedVideos.has(v.src)) {
                    this.processedVideos.add(v.src);
                    // De-bounce slightly
                    setTimeout(() => this.findAndClickUpscale(), 500);
                }
            });
        }

        async findAndClickUpscale() {
            if (this.isProcessing) return;

             // Deduplication Check based on URL (Post ID)
            const match = window.location.href.match(/\/post\/([a-zA-Z0-9-]+)/);
            const postId = match ? match[1] : window.location.href;

            if (this.completedPosts.has(postId)) {
                return;
            }

            this.isProcessing = true;
            await this.waitForGeneration();

            // Small wait for UI to settle
            await new Promise(r => setTimeout(r, 100));

            try {
                // Check if Upscale is ALREADY DONE (Disabled button)
                const disabledBtn = Array.from(document.querySelectorAll('button[disabled]')).find(b => {
                     const t = (b.innerText || b.ariaLabel || '').toLowerCase();
                     return t.includes('升级') || t.includes('upscale') || t.includes('hd');
                });

                if (disabledBtn && this.isVisible(disabledBtn)) {
                    this.completedPosts.add(postId);
                    return;
                }

                // Strategy A: Direct
                let btn = this.findBtnByKeywords(['升级视频', '升级', '放大', 'Upscale', '高清', 'HD', 'Upscale Video']);

                // Strategy B: "More" Menu
                if (!btn) {
                    const moreBtn = this.findMoreButton();
                    if (moreBtn) {
                        await this.simulateClick(moreBtn);
                        // Retry finding inside menu
                        for(let i=0; i<5; i++) {
                            await new Promise(r => setTimeout(r, 200));
                             const menuDisabled = Array.from(document.querySelectorAll('div[role="menuitem"][aria-disabled="true"], button[disabled]')).find(b => {
                                const t = (b.innerText || b.ariaLabel || '').toLowerCase();
                                return t.includes('升级') || t.includes('upscale') || t.includes('hd');
                            });

                            if (menuDisabled) {
                                this.completedPosts.add(postId);
                                return;
                            }
                            btn = this.findBtnByKeywords(['升级视频', '升级', '放大', 'Upscale', '高清', 'HD', 'Upscale Video']);
                            if(btn) break;
                        }
                    }
                }

                // Strategy C: XPath Fallback
                if (!btn) {
                     const xpath = "//*[contains(text(), '升级视频')] | //*[contains(text(), 'Upscale')]";
                     const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                     let candidates = [];
                     for (let i = 0; i < result.snapshotLength; i++) {
                         candidates.push(result.snapshotItem(i));
                     }
                     btn = this.getBestCandidate(candidates);
                }

                if (btn) {
                    // Highlight if not silent (for debug, currently silent=true)
                    if (!this.silent) {
                        btn.style.outline = '3px solid #00ff00';
                    }
                    await this.simulateClick(btn);
                    this.completedPosts.add(postId);
                }

            } catch (e) {
                console.error('[AutoUpscale] Error:', e);
            } finally {
                this.isProcessing = false;
            }
        }

        // ... helpers ...
        isVisible(el) {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.width > 0 && rect.height > 0;
        }

        getBestCandidate(candidates) {
            if (!candidates || candidates.length === 0) return null;
            const visible = candidates.filter(el => this.isVisible(el));
            if (visible.length === 0) return null;
            if (visible.length === 1) return visible[0];
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            return visible.sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();
                const da = Math.hypot(ra.left + ra.width/2 - cx, ra.top + ra.height/2 - cy);
                const db = Math.hypot(rb.left + rb.width/2 - cx, rb.top + rb.height/2 - cy);
                return da - db;
            })[0];
        }

        getTopRightCandidate(candidates) {
            if (!candidates || candidates.length === 0) return null;
            const visible = candidates.filter(el => this.isVisible(el));
            if (visible.length === 0) return null;
            return visible.sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();
                const scoreA = ra.top - (ra.left * 0.5);
                const scoreB = rb.top - (rb.left * 0.5);
                return scoreA - scoreB;
            })[0];
        }

        async simulateClick(element) {
             if (!element) return;
             element.scrollIntoView({ block: 'center', behavior: 'auto' });
             const rect = element.getBoundingClientRect();
             const x = rect.left + (rect.width / 2);
             const y = rect.top + (rect.height / 2);

             // Visual ripple
             if (!this.silent) this.showClickAnimation(x, y);

             const eventOpts = { bubbles: true, cancelable: true, clientX: x, clientY: y, screenX: x, screenY: y, pointerId: 1, width: 1, height: 1, pressure: 0.5, button: 0, buttons: 1 };
             try {
                 // Safe dispatch
                 element.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
                 element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
                 element.focus();
                 await new Promise(r => setTimeout(r, 5));
                 element.dispatchEvent(new PointerEvent('pointerup', eventOpts));
                 element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
                 element.click();
             } catch(e) {
                 console.warn('[AutoUpscale] Click failed:', e);
                 element.click(); // Fallback
             }
        }

        showClickAnimation(x, y) {
             // Implementation omitted for now to save space, silent mode is default
        }

        findBtnByKeywords(keywords) {
             const elements = Array.from(document.querySelectorAll('button, div[role="button"], div[role="menuitem"]'));
             const candidates = elements.filter(el => {
                 const content = (el.innerText || el.ariaLabel || el.textContent || '').toLowerCase();
                 if (content.includes('supergrok')) return false;
                 const match = keywords.some(k => content.includes(k.toLowerCase()));
                 return match && !el.disabled;
             });
             return this.getBestCandidate(candidates);
        }

        findMoreButton() {
            const allBtns = Array.from(document.querySelectorAll('button, div[role="button"]'));
            const visibleBtns = allBtns.filter(b => {
                if (!this.isVisible(b)) return false;
                const rect = b.getBoundingClientRect();
                return rect.top < (window.innerHeight / 2);
            });
            let candidates = visibleBtns.filter(b => {
                const l = (b.ariaLabel || b.title || '').toLowerCase();
                return (l.includes('更多') || l.includes('more') || l.includes('option') || l.includes('选项'));
            });
            let btn = this.getTopRightCandidate(candidates);
            if (!btn) {
                candidates = visibleBtns.filter(b => (b.innerText || '').trim() === '...' || (b.innerText || '').trim() === '…');
                btn = this.getTopRightCandidate(candidates);
            }
            if (!btn) {
                const editBtn = visibleBtns.find(b => {
                     const t = (b.innerText || b.ariaLabel || '').toLowerCase();
                     return t.includes('edit') || t.includes('编辑');
                });
                if (editBtn && editBtn.parentElement) {
                     candidates = Array.from(editBtn.parentElement.querySelectorAll('button'));
                     btn = this.getTopRightCandidate(candidates);
                }
            }
            return btn;
        }

        async waitForGeneration() {
            let checks = 0;
            const MAX_CHECKS = 60;
            while (this.isGenerating() && checks < MAX_CHECKS) {
                await new Promise(r => setTimeout(r, 200));
                checks++;
            }
            if (checks > 0) await new Promise(r => setTimeout(r, 500));
        }

        isGenerating() {
            const indicators = Array.from(document.querySelectorAll('div, span')).filter(el => {
                const t = (el.innerText || '').trim();
                return t === '生成中' || t === 'Generating' || t === 'Processing' || /^\d+%$/.test(t);
            });
            return indicators.some(el => this.isVisible(el));
        }
    }

    /**
     * SidePanel Component
     */
    class SidePanel extends Component {
        constructor(styleManager, config = { side: 'left', width: 380 }) {
            super(styleManager);
            this.config = config; // ✨ Store config for callbacks
            this.side = config.side;
            this.width = config.width || 380;
            this.height = config.height || 700;
            this.top = config.top || 80;
            this.leftPos = config.left || 20;
            this.rightPos = config.right || 20;
            this.isCollapsed = config.collapsed || false;
            // ✨ Feature: Persistent Visibility (Default: Hidden)
            this.visible = config.visible !== undefined ? config.visible : false;
            this.onStateChange = config.onStateChange;

            // ✨ Fix Persistence: If Right Panel has saved 'left' coordinate, use it.
            this.useFixedLeft = (this.side === 'right' && config.left !== undefined);

            // ✨ 内存泄漏修复：事件注册表
            this._eventRegistry = new Map();
        }

        renderInternal() {
            // ✨ FIX ROOT CAUSE: Add protection to the HOST element itself
            const isLeft = this.side === 'left';
            const shouldUseLeft = isLeft || this.useFixedLeft;
            const posStyle = shouldUseLeft ? `left: ${this.leftPos}px; right: auto;` : `right: ${this.rightPos}px;`;
            // Init visibility
            const displayStyle = this.visible ? 'display: flex;' : 'display: none;';

            // 🔧 Use simple render without global blockers
            this.render(`
                <div class="gpm-panel side-panel" style="
                    position: fixed; top: ${this.top}px; ${posStyle}
                    width: ${this.width}px; height: ${this.height}px;
                    ${displayStyle} flex-direction: column; z-index: 10000;
                ">\r
                    <div class="header" style="
                        padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);
                        display: flex; flex-direction: column; gap: 8px; cursor: move;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 800; font-size: 15px; letter-spacing: 2px; color: rgba(255,255,255,0.9);">${isLeft ? '映 画' : '视 阈'}</span>
                            <div style="display: flex; gap: 5px;">
                                <button class="gpm-btn auto-hide-btn" title="自动隐藏 (Auto-Hide)">${ICON_SET.Pin}</button>
                                <button class="gpm-btn min-btn">${ICON_SET.Minimize}</button>
                            </div>
                        </div>

                        <!-- Toolbar Row 1: Library Selection -->
                        <!-- Toolbar Row 1: Library Selection (Fixed Layout) -->
                        <div class="lib-row" style="display: flex; gap: 8px; align-items: center;">

                            <!-- Left: Library Name Trigger (Expands) -->
                            <div class="lib-trigger-area" style="
                                flex: 1; display: flex; align-items: center; gap: 6px;
                                cursor: pointer; padding: 4px 8px; border-radius: 6px;
                                background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                                transition: all 0.2s; overflow: hidden; height: 32px;
                            ">
                                 <span class="current-lib-name" style="
                                    font-weight: 600; font-size: 14px; white-space: nowrap;
                                    overflow: hidden; text-overflow: ellipsis; color: #fff;
                                 ">Loading...</span>
                                 <span style="display: flex; align-items: center; opacity: 0.5; width: 12px; height: 12px;">${ICON_SET.ArrowDown}</span>
                             </div>

                            <!-- Right: Fixed Action Buttons -->
                            <div class="lib-actions-fixed" style="display: flex; gap: 4px; flex-shrink: 0;">
                                <button class="gpm-btn add-lib-btn" title="新建库 (New Library)" style="
                                    width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center;
                                ">${ICON_SET.AddLib}</button>
                                <button class="gpm-btn del-lib-btn" title="删除库 (Delete Library)" style="
                                    width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center;
                                ">${ICON_SET.DelLib}</button>
                            </div>

                        </div>

                        <!-- Toolbar Row 2: Actions -->
                        <div class="action-row" style="display: flex; gap: 6px; align-items: center; justify-content: space-between;">
                            <button class="gpm-btn import-btn" style="flex: 1; padding: 6px;" title="导入 (Import)">${ICON_SET.Import}</button>
                            <button class="gpm-btn paste-import-btn" style="flex: 1; padding: 6px;" title="粘贴导入 (Paste)">${ICON_SET.Paste}</button>
                            <button class="gpm-btn export-btn" style="flex: 1; padding: 6px;" title="导出 (Export)">${ICON_SET.Export}</button>
                            <button class="gpm-btn backup-btn" style="flex: 1; padding: 6px;" title="备份 (Backup)">${ICON_SET.Backup}</button>
                            <button class="gpm-btn draft-btn" style="flex: 1; padding: 6px;" title="草稿 (Draft)">${ICON_SET.Draft}</button>
                        </div>
                    </div>

            <!-- Modifiers Bar -->
            <div class="modifiers-bar" style="
                padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);
                display: flex; gap: 4px; flex-wrap: wrap; max-height: 85px; overflow-y: auto;
            "></div>

            <!-- Category Bar -->
             <div class="category-bar" style="
                padding: 8px 8px 0 8px; display: flex; gap: 4px; flex-wrap: wrap; max-height: 85px; overflow-y: auto;
            "></div>

            <div class="sticky-toolbar" style="padding: 10px 10px 0 10px; flex-shrink: 0;">
                <div class="search-row" style="display: flex; gap: 4px; margin-bottom: 8px;">
                    <input type="text" class="search-input" placeholder="搜索... (Search)" style="
                        flex: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);
                        color: white; border-radius: 4px; padding: 4px 8px; font-size: 12px;
                    ">
                    <button class="gpm-btn sort-btn" title="切换排序 (Sort)">${ICON_SET.Sort}</button>
                    <button class="gpm-btn add-prompt-btn" title="添加提示词 (Add Prompt)">${ICON_SET.AddPrompt}</button>
                    ${!isLeft ? `<button class="gpm-btn hd-toggle-btn" title="自动高清 (Auto Upscale)" style="width: 30px;">${GM_getValue('auto_upscale_enabled', true) ? ICON_SET.HD_ON : ICON_SET.HD_OFF}</button>` : ''}
                </div>

                <!-- Mode & Import/Export Row -->
                <div class="mode-row" style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <div class="mode-toggle" style="
                        display: flex; flex: 1; background: rgba(0,0,0,0.3); border-radius: 4px; padding: 2px;
                    ">
                        <button class="gpm-btn mode-btn active" data-mode="append" style="
                            flex: 1; border-radius: 2px; font-size: 11px; background: var(--gpm-primary); color: white;
                        ">追加 (Append)</button>
                        <button class="gpm-btn mode-btn" data-mode="replace" style="
                            flex: 1; border-radius: 2px; font-size: 11px; background: transparent; opacity: 0.7;
                        ">替换 (Replace)</button>
                    </div>
                    <button class="gpm-btn dice-btn" title="随机组合 (Random Mix)" style="width: 30px; font-size: 14px;">${ICON_SET.Dice}</button>
                    <button class="gpm-btn preview-toggle-btn" title="预览开关 (Toggle Preview)" style="width: 30px; font-size: 14px;">${ICON_SET.PreviewToggle}</button>
                    <button class="gpm-btn ai-assist-btn" title="自动重试 (Auto Retry)" style="width: 30px; padding: 0;">
                        ${ICON_SET.AiAssist}
                    </button>
                </div>
            </div>

            <div class="content" style="flex: 1; padding: 0 10px 10px 10px; overflow-y: auto;">
                <div id="prompt-container" style="display: flex; flex-direction: column; gap: 8px;">
                    <!-- DYNAMIC CONTENT -->
                </div>
            </div>
            <!-- Resize Handle -->
            <div class="gpm-resize-handle resize-handle" style="
                ${isLeft ? 'right' : 'left'}: 0;
                cursor: ${isLeft ? 'nwse-resize' : 'nesw-resize'};
                transform: ${isLeft ? 'none' : 'scaleX(-1)'};
            "></div>
        </div>
    `);
        }

        afterRender() {
            // Drag Logic for Header
            const header = this.shadow.querySelector('.header');
            const panel = this.shadow.querySelector('.side-panel');

            // Expose visibility methods with save capability
            this.show = (save = true) => {
                panel.style.display = 'flex';
                this.visible = true;
                if (save && this.onStateChange) this.onStateChange({ visible: true });
            };
            this.hide = (save = true) => {
                panel.style.display = 'none';
                this.visible = false;
                if (save && this.onStateChange) this.onStateChange({ visible: false });
            };

            this.toggle = (save = true) => {
                // Toggle based on current DOM state to stay in sync
                panel.style.display === 'none' ? this.show(save) : this.hide(save);
            };

            // Toggle Logic (Append/Replace)
            const modeBtns = this.shadow.querySelectorAll('.mode-btn');
            modeBtns.forEach(btn => {
                // ✨ FIX: Prevent focus loss
                btn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };

                btn.onclick = () => {
                    this.clickMode = btn.dataset.mode;
                    modeBtns.forEach(b => {
                        b.style.background = 'transparent';
                        b.style.opacity = '0.7';
                        b.classList.remove('active');
                    });

                    btn.style.background = 'var(--gpm-primary)';
                    btn.style.opacity = '1';
                    btn.classList.add('active');
                };
            });

            // ✨ 核心修复：绑定高清模块切换逻辑
            const hdBtn = this.shadow.querySelector('.hd-toggle-btn');
            if (hdBtn && window.upscaleManager) {
                const updateHdUI = (enabled) => {
                    hdBtn.innerHTML = enabled ? ICON_SET.HD_ON : ICON_SET.HD_OFF;
                    hdBtn.style.animation = enabled ? 'gpm-breathe 3s infinite ease-in-out' : 'none';
                    hdBtn.title = `自动高清: ${enabled ? '开启' : '关闭'}`;
                    // ✨ 强制物理纠色
                    hdBtn.style.color = enabled ? '#00ba7c' : '#ff4d4f';
                };

                // 初始化 UI 状态 (使用管理器的真实状态)
                updateHdUI(window.upscaleManager.enabled);

                hdBtn.onclick = () => {
                    const newState = window.upscaleManager.toggle();
                    updateHdUI(newState);
                };
            }



            this.clickMode = 'append';

            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            header.onmousedown = (e) => {
                // 排除交互元素：按钮、输入框、选择框、链接
                const tagName = e.target.tagName.toUpperCase();
                if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(tagName)) return;
                // 排除有 class 的可点击元素
                if (e.target.classList.contains('lib-trigger-area') ||
                    e.target.closest('.lib-trigger-area') ||
                    e.target.closest('.lib-actions-fixed') ||
                    e.target.closest('.gpm-btn')) return;

                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = panel.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;

                // Switch to fixed positioning if not already
                panel.style.right = 'auto';
                panel.style.left = initialLeft + 'px';
                panel.style.top = initialTop + 'px';

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            };

            const onMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                panel.style.left = (initialLeft + dx) + 'px';
                panel.style.top = (initialTop + dy) + 'px';
            };

            const onUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);

                // ✨ Fix Persistence: Save Position
                if (this.onStateChange) {
                    this.onStateChange({
                        left: parseFloat(panel.style.left) || 0,
                        top: parseFloat(panel.style.top) || 0,
                        // Ensure we don't save "right" if we switched to left
                        right: undefined
                    });
                }

                // ✨ Check edge proximity after drag (for auto-hide)
                if (typeof checkEdgeProximity !== 'undefined') {
                    setTimeout(() => checkEdgeProximity(), 100);
                }
            };

            // ✨ AUTO-HIDE LOGIC
            this.autoHideEnabled = false; // Default: disabled
            this.isAutoHidden = false;
            const EDGE_THRESHOLD = 30; // Distance from edge to trigger auto-hide
            const HIDE_OFFSET = this.width - 10; // How much to hide (leave 10px visible)

            // ✨ FIX: Robust Interaction Tracking (Focus/Blur)
    this.isInteracting = false;

    // 事件管理方法
    this._bindEvent = (element, eventType, handler, key) => {
        // 先移除旧监听器（如果存在）
        this._unbindEvent(key);

        // 绑定新监听器
        element.addEventListener(eventType, handler);

        // 记录到注册表
        this._eventRegistry.set(key, { element, eventType, handler });
    };

    this._unbindEvent = (key) => {
        const record = this._eventRegistry.get(key);
        if (record) {
            record.element.removeEventListener(record.eventType, record.handler);
            this._eventRegistry.delete(key);
        }
    };

    // 清理所有事件（组件销毁时调用）
    this._cleanupAllEvents = () => {
        this._eventRegistry.forEach((record, key) => {
            this._unbindEvent(key);
        });
        console.log(`[GPM] 已清理 ${this._eventRegistry.size} 个事件监听器`);
    };

    this.refreshInteractionListeners = () => {
         // 清理旧的交互监听器
         const oldKeys = Array.from(this._eventRegistry.keys()).filter(k => k.startsWith('interaction-'));
         oldKeys.forEach(k => this._unbindEvent(k));

         this.shadow.querySelectorAll('input, select, textarea').forEach((el, index) => {
             const keyPrefix = `interaction-${index}`;

             // Focus 事件
             this._bindEvent(el, 'focus', () => {
                 this.isInteracting = true;
                 if (hideTimer) clearTimeout(hideTimer);
             }, `${keyPrefix}-focus`);

             // Blur 事件
             this._bindEvent(el, 'blur', () => {
                 this.isInteracting = false;
                 // Delay check to allow focus to move to another element inside panel
                 setTimeout(() => checkEdgeProximity(), 200);
             }, `${keyPrefix}-blur`);

             // Mousedown 事件
             this._bindEvent(el, 'mousedown', (e) => {
                 this.isInteracting = true;
                 if (hideTimer) clearTimeout(hideTimer);
                 e.stopPropagation(); // Stop bubble
             }, `${keyPrefix}-mousedown`);

             // ✨ Special handling for Custom Library Selector (Input Search)
             if (el.classList.contains('lib-search-input-menu')) {
                 this._bindEvent(el, 'input', () => {
                     this.isInteracting = true;
                     if (hideTimer) clearTimeout(hideTimer);
                 }, `${keyPrefix}-input`);
             }
         });
     };

    // Initial Bind
    this.refreshInteractionListeners();

    const checkEdgeProximity = () => {
        if (!this.autoHideEnabled) return;

        // Priority Check: Interaction Flag
        // If user is focused on an input/select, NEVER hide
        if (this.isInteracting) {
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(() => checkEdgeProximity(), 1000); // Re-check later
            return;
        }

        // Secondary Check: Active Element (Backup for dynamic elements)
        const activeEl = this.shadow.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.classList.contains('lib-search-input-menu'))) {
                    if (hideTimer) clearTimeout(hideTimer);
                    hideTimer = setTimeout(() => checkEdgeProximity(), 2000);
                    return;
                }

                const rect = panel.getBoundingClientRect();
                const isNearLeftEdge = rect.left < EDGE_THRESHOLD;
                const isNearRightEdge = window.innerWidth - rect.right < EDGE_THRESHOLD;

                if (isNearLeftEdge || isNearRightEdge) {
                    hidePanel();
                } else {
                    showPanel();
                }
            };

            const hidePanel = () => {
                if (this.isAutoHidden) return;
                this.isAutoHidden = true;
                panel.style.transition = 'transform 0.3s ease';
                const isLeft = this.side === 'left';
                panel.style.transform = isLeft ? `translateX(-${HIDE_OFFSET}px)` : `translateX(${HIDE_OFFSET}px)`;

                // Create edge trigger when hidden
                if (typeof createEdgeTrigger !== 'undefined') {
                    setTimeout(() => createEdgeTrigger(), 300); // Wait for animation
                }
            };

            const showPanel = () => {
                if (!this.isAutoHidden) return;
                this.isAutoHidden = false;
                panel.style.transform = 'translateX(0)';

                // Remove edge trigger when shown
                if (typeof removeEdgeTrigger !== 'undefined') {
                    removeEdgeTrigger();
                }
            };

            // Create edge trigger zone (invisible area at screen edge)
            let edgeTrigger = null;
            const createEdgeTrigger = () => {
                if (edgeTrigger) edgeTrigger.remove();

                edgeTrigger = document.createElement('div');
                const isLeft = this.side === 'left';
                edgeTrigger.style.cssText = `
                    position: fixed;
                    top: 0;
                    ${isLeft ? 'left: 0;' : 'right: 0;'}
                    width: 10px;
                    height: 100vh;
                    z-index: 9999;
                    background: transparent;
                    pointer-events: auto;
                `;

                edgeTrigger.onmouseenter = () => {
                    if (this.autoHideEnabled && this.isAutoHidden) {
                        showPanel();
                    }
                };

                document.body.appendChild(edgeTrigger);
            };

            const removeEdgeTrigger = () => {
                if (edgeTrigger) {
                    edgeTrigger.remove();
                    edgeTrigger = null;
                }
            };

            // Mouse hover to show/hide with timer management
            let hideTimer = null;

            panel.onmouseenter = () => {
                // Clear any pending hide timer
                if (hideTimer) {
                    clearTimeout(hideTimer);
                    hideTimer = null;
                }

                if (this.autoHideEnabled) showPanel();
            };

            panel.onmouseleave = () => {
                if (this.autoHideEnabled) {
                    // Clear previous timer
                    if (hideTimer) clearTimeout(hideTimer);

                    // Start new timer
                    hideTimer = setTimeout(() => {
                        checkEdgeProximity();
                        hideTimer = null;
                    }, 3000); // 3s delay for user interaction
                }
            };

            // Auto-Hide Button
            const autoHideBtn = this.shadow.querySelector('.auto-hide-btn');
            if (autoHideBtn) {
                autoHideBtn.onclick = () => {
                    this.autoHideEnabled = !this.autoHideEnabled;
                    autoHideBtn.textContent = this.autoHideEnabled ? '🔓' : '📌';
                    autoHideBtn.title = this.autoHideEnabled ? '已启用自动隐藏 (Auto-Hide ON)' : '自动隐藏 (Auto-Hide OFF)';

                    if (this.autoHideEnabled) {
                        checkEdgeProximity();
                    } else {
                        showPanel(); // Ensure panel is visible when disabled
                    }
                };
            }

            // Minimize Logic
            const minBtn = this.shadow.querySelector('.min-btn');
            minBtn.onclick = () => {
                this.isCollapsed = !this.isCollapsed;
                const content = this.shadow.querySelector('.content');
                const mods = this.shadow.querySelector('.modifiers-bar');
                const cats = this.shadow.querySelector('.category-bar');
                const stickyToolbar = this.shadow.querySelector('.sticky-toolbar');

                [content, mods, cats, stickyToolbar].forEach(el => {
                    if (!el) return;
                    if (el === mods || el === cats) {
                        el.style.display = this.isCollapsed ? 'none' : 'flex';
                    } else {
                        el.style.display = this.isCollapsed ? 'none' : 'block';
                    }
                });



                const panel = this.shadow.querySelector('.side-panel');
                panel.style.height = this.isCollapsed ? 'auto' : `${this.height}px`;
                minBtn.textContent = this.isCollapsed ? '+' : '−';

                // ✨ Update state on toggle
                if (this.onStateChange) {
                    this.onStateChange({ collapsed: this.isCollapsed });
                }
            };

            // Search Logic
            const searchInput = this.shadow.querySelector('.search-input');
            if (searchInput) {
                searchInput.oninput = (e) => {
                    this.filterText = e.target.value;
                    this.renderList();
                };

                // ✨ FEATURE #1 (continued): Enter to apply first result
                searchInput.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        // Get first filtered prompt
                        let filtered = [...this.allPrompts];
                        if (this.activeCategory !== '全部 (All)') {
                            filtered = filtered.filter(p => (p.category || 'Uncategorized') === this.activeCategory);
                        }
                        if (this.filterText) {
                            const lower = this.filterText.toLowerCase();
                            filtered = filtered.filter(p =>
                                (p.name && p.name.toLowerCase().includes(lower)) ||
                                (p.content && p.content.toLowerCase().includes(lower))
                            );
                        }
                        if (filtered.length > 0 && this.onPromptClick) {
                            this.onPromptClick(filtered[0]); // Apply first result
                            searchInput.value = ''; // Clear search
                            this.filterText = '';
                            this.renderList();
                        }
                    }
                };
            }

            // Sort Logic
            this.sortOrder = 'newest'; // 'newest' | 'oldest'
            const sortBtn = this.shadow.querySelector('.sort-btn');
            if (sortBtn) {
                sortBtn.onclick = () => {
                    this.sortOrder = this.sortOrder === 'newest' ? 'oldest' : 'newest';
                    const icon = sortBtn.querySelector('.gpm-svg-icon');
                    if (icon) {
                        icon.style.transition = 'transform 0.3s';
                        icon.style.transform = this.sortOrder === 'newest' ? 'none' : 'scaleY(-1)';
                    }
                    this.renderList();
                };
            }

            // Add Prompt Logic
            const addPromptBtn = this.shadow.querySelector('.add-prompt-btn');
            if (addPromptBtn) {
                addPromptBtn.onclick = () => {
                    const content = searchInput.value.trim();
                    // If search has text, use it. Otherwise, prompt user.
                    const finalContent = content || prompt('请输入提示词内容 (Enter Prompt Content):');
                    if (finalContent && this.onAddPrompt) {
                        // Support optional custom name for paste import
                        this.onAddPrompt(finalContent, null); // null = auto-generate name
                        if (content) searchInput.value = ''; // Clear search if used
                        this.filterText = '';
                    }
                };
            }



            // Resize Logic
            const resizer = this.shadow.querySelector('.resize-handle');
            let isResizing = false;
            let startW, startH, startResizeX, startResizeY;

            if (resizer) {
                resizer.onmousedown = (e) => {
                    e.stopPropagation();
                    isResizing = true;
                    startResizeX = e.clientX;
                    startResizeY = e.clientY;
                    startW = panel.offsetWidth;
                    startH = panel.offsetHeight;

                    document.addEventListener('mousemove', onResize);
                    document.addEventListener('mouseup', onResizeUp);
                };

                const onResize = (e) => {
                    if (!isResizing) return;
                    const isLeft = this.side === 'left';
                    const dx = e.clientX - startResizeX;
                    const dy = e.clientY - startResizeY;

                    // For left panel, dragging right increases width. For right panel, dragging left increases width.
                    const w = isLeft ? (startW + dx) : (startW - dx);
                    const h = startH + dy;

                    if (w > 200) panel.style.width = w + 'px';
                    if (h > 300) panel.style.height = h + 'px';
                };

                const onResizeUp = () => {
                    isResizing = false;
                    document.removeEventListener('mousemove', onResize);
                    document.removeEventListener('mouseup', onResizeUp);

                    // ✨ Fix Persistence: Save Size
                    if (this.onStateChange) {
                        this.onStateChange({
                            width: parseFloat(panel.style.width) || 300,
                            height: parseFloat(panel.style.height) || 600
                        });
                    }
                };
            }

            // 🎲 Dice / Random Mix - v5.0.2 Complete Implementation
            const diceBtn = this.shadow.querySelector('.dice-btn');
            if (diceBtn) {
                // ✨ FIX: Prevent focus loss on button click itself
                diceBtn.onmousedown = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                };

                diceBtn.onclick = (e) => {
                    e.stopPropagation(); // Stop bubbling

                    // Show Context Menu for Random Options
                    const menu = document.createElement('div');

                    // ✨ FIX: Prevent focus loss on menu container interaction
                    menu.onmousedown = (me) => {
                        me.preventDefault();
                        me.stopPropagation();
                    };

                    Object.assign(menu.style, {
                        position: 'fixed', top: (e.clientY + 10) + 'px', left: (e.clientX - 100) + 'px',
                        background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '6px', zIndex: '100002',
                        backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '160px'
                    });

                    // ✨ UI Unified: SVG Icons
                    const icons = {
                        portrait: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
                        adult: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
                        dice: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 8h.01"></path><path d="M8 8h.01"></path><path d="M8 16h.01"></path><path d="M16 16h.01"></path><path d="M12 12h.01"></path></svg>',
                        mix: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="10.5" r="2.5"></circle><circle cx="8.5" cy="7.5" r="2.5"></circle><circle cx="6.5" cy="12.5" r="2.5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c0.926 0 1.648-0.746 1.648-1.688 0-0.437-0.18-0.835-0.437-1.125-0.29-0.289-0.438-0.652-0.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>',
                        cyclone: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12H8c-5.5 0-10-4.5-10-10"></path><path d="M21 12c0 5.5-4.5 10-10 10"></path><path d="M14 2c5.5 0 10 4.5 10 10"></path><path d="M8 12c0-5.5 4.5-10 10-10"></path></svg>',
                        video: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>'
                    };

                    const opts = [];

                    // 🎯 Different modes for Text vs Video panel
                    if (this.side === 'left') {
                        // Text Panel Modes
                        opts.push(
                            { label: '写真模式', icon: icons.portrait, act: 'portrait' },
                            { label: 'R18写真', icon: icons.adult, act: 'adult_portrait' },
                            { label: '三连抽取', icon: icons.dice, act: 'random3' },
                            { label: '多类混合', icon: icons.mix, act: 'catmix' },
                            { label: '混沌生成', icon: icons.cyclone, act: 'chaos' }
                        );
                    } else {
                        // Video Panel Modes (Simplified)
                        opts.push(
                            { label: '视频随机', icon: icons.video, act: 'video_random' },
                            { label: 'R18视频', icon: icons.adult, act: 'video_r18' }
                        );
                    }

                    opts.forEach(opt => {
                        const item = document.createElement('div');
                        item.className = 'gpm-ctx-item';
                        // ✨ Clean UI: Icon + Text
                        item.innerHTML = `
                            <div style="display:flex; align-items:center; gap:10px; pointer-events:none;">
                                <span style="display:flex; align-items:center; opacity:0.8; color:#aab8c2;">${opt.icon}</span>
                                <span style="font-weight:500;">${opt.label}</span>
                            </div>
                        `;
                        Object.assign(item.style, {
                            padding: '10px 12px', cursor: 'pointer', color: '#e7e9ea', fontSize: '13px', borderRadius: '4px',
                            transition: 'all 0.2s ease'
                        });
                        item.onmouseenter = () => {
                            item.style.background = 'rgba(255,255,255,0.1)';
                            const icon = item.querySelector('span'); // Icon span
                            if(icon) icon.style.color = '#fff';
                        };
                        item.onmouseleave = () => {
                            item.style.background = 'transparent';
                            const icon = item.querySelector('span'); // Icon span
                            if(icon) icon.style.color = '#aab8c2';
                        };

                        // ✨ FIX: Prevent focus loss on click (Random Menu)
                        item.onmousedown = (e) => {
                            e.preventDefault();
                        };

                        item.onclick = () => {
                            console.log('[DEBUG] Menu item clicked:', opt.act);

                            // 🎯 DIRECT IMPLEMENTATION: Execute mode directly
                            this.executeRandomMode(opt.act);

                            menu.remove();
                            document.removeEventListener('click', closeMenu);
                        };
                        menu.appendChild(item);
                    });

                    document.body.appendChild(menu);

                    // Stop propagation so the outside click doesn't fire immediately
                    e.stopPropagation();

                    const closeMenu = (ev) => {
                        if (!menu.contains(ev.target)) {
                            menu.remove();
                            document.removeEventListener('click', closeMenu);
                        }
                    };
                    requestAnimationFrame(() => document.addEventListener('click', closeMenu));
                };
            }
        }

        // 🎯 Execute Random Mode - Implements all 7 random generation modes
        executeRandomMode(mode) {
            console.log('[GPM] executeRandomMode:', mode);

            const panelType = this.side === 'left' ? 'text' : 'video';
            const storageService = new StorageService();
            const data = storageService.get();
            const inputManager = new InputManager();

            // 📸 PORTRAIT MODE
            if (mode === 'portrait') {
                const hasSeenGuide = localStorage.getItem('gpm_portrait_guide_seen');
                if (!hasSeenGuide) {
                    this.showGuide('portrait', () => this.executePortraitMode(panelType, data, inputManager));
                    return;
                }
                this.executePortraitMode(panelType, data, inputManager);
            }
            // 🔞 R18 PORTRAIT MODE
            else if (mode === 'adult_portrait') {
                const hasSeenGuide = localStorage.getItem('gpm_r18_guide_seen');
                if (!hasSeenGuide) {
                    this.showGuide('adult_portrait', () => this.executeR18PortraitMode(panelType, data, inputManager));
                    return;
                }
                this.executeR18PortraitMode(panelType, data, inputManager);
            }
            // 🎬 VIDEO RANDOM MODE
            else if (mode === 'video_random') {
                const hasSeenGuide = localStorage.getItem('gpm_video_random_guide_seen');
                if (!hasSeenGuide) {
                    this.showGuide('video_random', () => this.executeVideoRandomMode(data, inputManager));
                    return;
                }
                this.executeVideoRandomMode(data, inputManager);
            }
            // 🔞 VIDEO R18 MODE
            else if (mode === 'video_r18') {
                const hasSeenGuide = localStorage.getItem('gpm_video_r18_guide_seen');
                if (!hasSeenGuide) {
                    this.showGuide('video_r18', () => this.executeVideoR18Mode(data, inputManager));
                    return;
                }
                this.executeVideoR18Mode(data, inputManager);
            }
            // 🎲 RANDOM3 MODE - 从全局随机抽取3条
            else if (mode === 'random3') {
                const hasSeenGuide = localStorage.getItem('gpm_random3_guide_seen');
                if (!hasSeenGuide) {
                    this.showGuide('random3', () => this.executeRandom3Mode(panelType, data, inputManager));
                    return;
                }
                this.executeRandom3Mode(panelType, data, inputManager);
            }
            // 🎨 CATMIX MODE - 从全局每个分类随机抽取1条
            else if (mode === 'catmix') {
                const hasSeenGuide = localStorage.getItem('gpm_catmix_guide_seen');
                if (!hasSeenGuide) {
                    this.showGuide('catmix', () => this.executeCatmixMode(panelType, data, inputManager));
                    return;
                }
                this.executeCatmixMode(panelType, data, inputManager);
            }
            // 🌀 CHAOS MODE - 从全局随机抽取5-12条
            else if (mode === 'chaos') {
                const hasSeenGuide = localStorage.getItem('gpm_chaos_guide_seen');
                if (!hasSeenGuide) {
                    this.showGuide('chaos', () => this.executeChaosMode(panelType, data, inputManager));
                    return;
                }
                this.executeChaosMode(panelType, data, inputManager);
            }
            else {
                console.warn('[GPM] Unknown random mode:', mode);
            }
        }

        // 📸 Execute Portrait Mode
        executePortraitMode(panelType, data, inputManager) {
            // Step 1: Find portrait library
            const portraitLib = data.libraries.find(lib =>
                lib.name === '写真模式标准描述' || lib.name.includes('写真模式')
            );

            if (!portraitLib || !portraitLib.prompts || portraitLib.prompts.length === 0) {
                alert('❌ 未找到"写真模式标准描述"库，或该库为空\n\n请按照说明创建：\n1. 点击"创建库"\n2. 库名输入：写真模式标准描述\n3. 添加标准写真开头');
                return;
            }

            // Step 2: Random pick 1 from portrait library as prefix
            const randomIndex = Math.floor(Math.random() * portraitLib.prompts.length);
            const portraitPrefix = portraitLib.prompts[randomIndex].content;

            // Step 3: Collect ALL prompts from all libraries of same type
            let allPromptsPool = [];
            data.libraries.forEach(lib => {
                const isTextLib = !lib.libraryType || lib.libraryType === 'text';
                const isVideoLib = lib.libraryType === 'video';

                if ((panelType === 'text' && isTextLib) || (panelType === 'video' && isVideoLib)) {
                    const validPrompts = lib.prompts.filter(p => !p.type || p.type === panelType);
                    allPromptsPool = allPromptsPool.concat(validPrompts);
                }
            });

            if (allPromptsPool.length === 0) {
                alert('❌ 所有库中没有找到提示词');
                return;
            }

            // Step 4: Random pick 10 from global pool
            const count = 10;
            const shuffled = [...allPromptsPool].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, Math.min(count, shuffled.length));
            const randomPart = selected.map(p => p.content).join(', ');

            // Step 5: Combine
            const finalPrompt = `${portraitPrefix}, ${randomPart}`;

            // Insert
            inputManager.setValue(finalPrompt);

            // Toast
            this.showToast('📸 写真模式：已生成', `标准开头 + ${selected.length} 条随机提示词`, '#1d9bf0');
        }

        // 🔞 Execute R18 Portrait Mode
        executeR18PortraitMode(panelType, data, inputManager) {
            // Step 1: Find portrait library
            let portraitLib = data.libraries.find(lib => lib.name === '写真模式标准描述');
            if (!portraitLib) {
                portraitLib = data.libraries.find(lib => lib.name.includes('写真模式'));
            }

            if (!portraitLib || !portraitLib.prompts || portraitLib.prompts.length === 0) {
                alert('❌ 未找到"写真模式标准描述"库\n\n请先创建该库并添加标准写真开头');
                return;
            }

            // Step 2: Find adult library
            let adultLib = data.libraries.find(lib => lib.name === '成人模式标准添加词');
            if (!adultLib) {
                adultLib = data.libraries.find(lib => lib.name.includes('成人模式'));
            }

            if (!adultLib || !adultLib.prompts || adultLib.prompts.length === 0) {
                alert('❌ 未找到"成人模式标准添加词"库\n\n请创建该库并添加成人写真修饰词');
                return;
            }

            // Step 3: Random pick 1 from each library
            const portraitIndex = Math.floor(Math.random() * portraitLib.prompts.length);
            const portraitPrefix = portraitLib.prompts[portraitIndex].content;

            const adultIndex = Math.floor(Math.random() * adultLib.prompts.length);
            const adultModifier = adultLib.prompts[adultIndex].content;

            // Step 4: Collect ALL prompts from all libraries of same type
            let allPromptsPool = [];
            data.libraries.forEach(lib => {
                const isTextLib = !lib.libraryType || lib.libraryType === 'text';
                const isVideoLib = lib.libraryType === 'video';

                if ((panelType === 'text' && isTextLib) || (panelType === 'video' && isVideoLib)) {
                    const validPrompts = lib.prompts.filter(p => !p.type || p.type === panelType);
                    allPromptsPool = allPromptsPool.concat(validPrompts);
                }
            });

            if (allPromptsPool.length === 0) {
                alert('❌ 所有库中没有找到提示词');
                return;
            }

            // Step 5: Random pick 10 from global pool
            const count = 10;
            const shuffled = [...allPromptsPool].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, Math.min(count, shuffled.length));
            const randomPart = selected.map(p => p.content).join(', ');

            // Step 6: Combine
            const finalPrompt = `${portraitPrefix}, ${adultModifier}, ${randomPart}`;

            // Insert
            inputManager.setValue(finalPrompt);

            // Toast
            this.showToast('🔞 R18写真：已生成', `源: ${portraitLib.name} + ${adultLib.name}`, '#e91e63');
        }

        // 🎬 Execute Video Random Mode
        executeVideoRandomMode(data, inputManager) {
            // Find video library
            let videoLib = data.libraries.find(lib => lib.name === '随机视频专用');
            if (!videoLib) {
                videoLib = data.libraries.find(lib => lib.name.includes('随机视频专用'));
            }

            if (!videoLib || !videoLib.prompts || videoLib.prompts.length === 0) {
                alert('❌ 未找到"随机视频专用"库，或该库为空\n\n请创建该库并添加视频提示词');
                return;
            }

            // Random pick 1
            const randomIndex = Math.floor(Math.random() * videoLib.prompts.length);
            const videoPrompt = videoLib.prompts[randomIndex].content;

            // Insert
            inputManager.setValue(videoPrompt);

            // Toast
            this.showToast('🎬 视频随机：已生成', `源: ${videoLib.name}`, '#673ab7');
        }

        // 🔞 Execute Video R18 Mode
        executeVideoR18Mode(data, inputManager) {
            // Step 1: Find video library
            let videoLib = data.libraries.find(lib => lib.name === '随机视频专用');
            if (!videoLib) {
                videoLib = data.libraries.find(lib => lib.name.includes('随机视频专用'));
            }

            if (!videoLib || !videoLib.prompts || videoLib.prompts.length === 0) {
                alert('❌ 未找到"随机视频专用"库\n\n请先创建该库并添加视频提示词');
                return;
            }

            // Step 2: Find R18 video library
            let r18VideoLib = data.libraries.find(lib => lib.name === 'R18视频添加提示词');
            if (!r18VideoLib) {
                r18VideoLib = data.libraries.find(lib => lib.name.includes('R18视频'));
            }

            if (!r18VideoLib || !r18VideoLib.prompts || r18VideoLib.prompts.length === 0) {
                alert('❌ 未找到"R18视频添加提示词"库\n\n请创建该库并添加R18视频修饰词');
                return;
            }

            // Step 3: Random pick 1 from each library
            const videoIndex = Math.floor(Math.random() * videoLib.prompts.length);
            const videoPrompt = videoLib.prompts[videoIndex].content;

            const r18Index = Math.floor(Math.random() * r18VideoLib.prompts.length);
            const r18Modifier = r18VideoLib.prompts[r18Index].content;

            // Step 4: Combine
            const finalPrompt = `${videoPrompt}, ${r18Modifier}`;

            // Insert
            inputManager.setValue(finalPrompt);

            // Toast
            this.showToast('🔞 R18视频：已生成', `源: ${videoLib.name} + ${r18VideoLib.name}`, '#e91e63');
        }

        // 🎲 Execute Random3 Mode - 从全局随机抽取3条
        executeRandom3Mode(panelType, data, inputManager) {
            // Collect ALL prompts from all libraries of same type
            let allPromptsPool = [];
            data.libraries.forEach(lib => {
                const isTextLib = !lib.libraryType || lib.libraryType === 'text';
                const isVideoLib = lib.libraryType === 'video';

                if ((panelType === 'text' && isTextLib) || (panelType === 'video' && isVideoLib)) {
                    const validPrompts = lib.prompts.filter(p => !p.type || p.type === panelType);
                    allPromptsPool = allPromptsPool.concat(validPrompts);
                }
            });

            if (allPromptsPool.length === 0) {
                alert('❌ 所有库中没有找到提示词');
                return;
            }

            // Random pick 3 from global pool
            const count = 3;
            const shuffled = [...allPromptsPool].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, Math.min(count, shuffled.length));
            const result = selected.map(p => p.content).join(', ');

            // Insert
            inputManager.setValue(result);

            // Toast
            this.showToast('🎲 三连抽取：已生成', `从全局 ${allPromptsPool.length} 条中随机抽取 ${selected.length} 条`, '#9c27b0');
        }

        // 🎨 Execute Catmix Mode - 从全局每个分类随机抽取1条
        executeCatmixMode(panelType, data, inputManager) {
            // Collect ALL prompts from all libraries of same type
            let allPromptsPool = [];
            data.libraries.forEach(lib => {
                const isTextLib = !lib.libraryType || lib.libraryType === 'text';
                const isVideoLib = lib.libraryType === 'video';

                if ((panelType === 'text' && isTextLib) || (panelType === 'video' && isVideoLib)) {
                    const validPrompts = lib.prompts.filter(p => !p.type || p.type === panelType);
                    allPromptsPool = allPromptsPool.concat(validPrompts);
                }
            });

            if (allPromptsPool.length === 0) {
                alert('❌ 所有库中没有找到提示词');
                return;
            }

            // Get all unique categories from global pool
            const categories = [...new Set(allPromptsPool.map(p => p.category || 'Uncategorized'))];

            if (categories.length === 0) {
                alert('❌ 未找到分类');
                return;
            }

            // Pick 1 from each category
            const selected = categories.map(cat => {
                const inCat = allPromptsPool.filter(p => (p.category || 'Uncategorized') === cat);
                return inCat[Math.floor(Math.random() * inCat.length)];
            }).filter(Boolean);

            const result = selected.map(p => p.content).join(', ');

            // Insert
            inputManager.setValue(result);

            // Toast
            this.showToast('🎨 多类混合：已生成', `从全局 ${categories.length} 个分类中各抽取 1 条`, '#ff9800');
        }

        // 🌀 Execute Chaos Mode - 从全局随机抽取5-12条
        executeChaosMode(panelType, data, inputManager) {
            // Collect ALL prompts from all libraries of same type
            let allPromptsPool = [];
            data.libraries.forEach(lib => {
                const isTextLib = !lib.libraryType || lib.libraryType === 'text';
                const isVideoLib = lib.libraryType === 'video';

                if ((panelType === 'text' && isTextLib) || (panelType === 'video' && isVideoLib)) {
                    const validPrompts = lib.prompts.filter(p => !p.type || p.type === panelType);
                    allPromptsPool = allPromptsPool.concat(validPrompts);
                }
            });

            if (allPromptsPool.length === 0) {
                alert('❌ 所有库中没有找到提示词');
                return;
            }

            // Random pick 5-12 from global pool
            const count = Math.floor(Math.random() * 8) + 5; // 5 to 12
            const shuffled = [...allPromptsPool].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, Math.min(count, shuffled.length));
            const result = selected.map(p => p.content).join(', ');

            // Insert
            inputManager.setValue(result);

            // Toast
            this.showToast('🌀 混沌生成：已生成', `从全局 ${allPromptsPool.length} 条中随机抽取 ${selected.length} 条`, '#673ab7');
        }

        // 🎨 Show Guide (Universal)
        showGuide(mode, onProceed) {
            const guides = {
                'portrait': {
                    title: '📸 写真模式使用说明',
                    color: '#1d9bf0',
                    what: '一键生成专业写真提示词，自动组合标准开头 + 10条随机风格元素',
                    how: [
                        '创建一个名为 <code>写真模式标准描述</code> 的提示词库',
                        '在此库中添加您的标准写真开头（可添加多条，系统会随机选择）',
                        '点击写真模式，即可自动生成完整提示词'
                    ],
                    example: '真实胶片直闪摄影，亚洲女性，小红书网红脸，表情冷漠而自信，姿态略带挑逗，身材真实吸引人',
                    storageKey: 'gpm_portrait_guide_seen'
                },
                'adult_portrait': {
                    title: '🔞 R18写真模式使用说明',
                    color: '#e91e63',
                    what: '升级版写真提示词生成，双重精准定位：标准写真开头 + 成人修饰语 + 10条随机元素',
                    how: [
                        '创建库 <code>写真模式标准描述</code>（标准写真开头）',
                        '创建库 <code>成人模式标准添加词</code>（成人修饰语）',
                        '点击R18写真，系统自动从两库各抽1条 + 全局随机10条'
                    ],
                    example: '姿态略带挑逗，身材真实吸引人，性感撩人，暴露度适中',
                    storageKey: 'gpm_r18_guide_seen'
                },
                'video_random': {
                    title: '🎬 视频随机模式使用说明',
                    color: '#673ab7',
                    what: '专为视频生成设计的精简模式，避免提示词过多混淆AI判断，每次只从专用库中抽取1条提示词',
                    how: [
                        '在右侧视频面板创建库 <code>随机视频专用</code>',
                        '在该库中添加视频动作/氛围描述（每条独立完整）',
                        '点击视频随机，系统自动随机抽取1条填入'
                    ],
                    example: 'Fabric: 细致黑色蕾丝边缘动作微微晃动，露出圆润头',
                    storageKey: 'gpm_video_random_guide_seen'
                },
                'video_r18': {
                    title: '🔞 R18视频模式使用说明',
                    color: '#e91e63',
                    what: '升级版视频生成，双重精准定位：基础视频提示词 + R18修饰语，只抽取2条避免混淆',
                    how: [
                        '创建库 <code>随机视频专用</code>（基础视频描述）',
                        '创建库 <code>R18视频添加提示词</code>（R18修饰）',
                        '点击R18视频，系统从两库各抽1条自动组合'
                    ],
                    example: 'Pose: 身体侧躺并前倾下，腰线收紧呈弧线展开，布料微掀',
                    storageKey: 'gpm_video_r18_guide_seen'
                },
                'random3': {
                    title: '🎲 三连抽取使用说明',
                    color: '#9c27b0',
                    what: '从所有同类型库的全局提示词池中随机抽取3条，快速组合生成',
                    how: ['无需选择特定库', '点击"三连抽取"', '系统自动从所有库中随机选择3条提示词并组合'],
                    example: '提示词1（来自库A）, 提示词2（来自库B）, 提示词3（来自库C）',
                    storageKey: `gpm_random3_guide_seen`
                },
                'catmix': {
                    title: '🎨 多类混合使用说明',
                    color: '#ff9800',
                    what: '从所有库的全局分类中各抽取1条提示词，创造跨库的丰富风格组合',
                    how: ['无需选择特定库', '点击"多类混合"', '系统自动识别全局所有分类，从每个分类中随机抽取1条'],
                    example: '人物特征（库A） + 光照（库B） + 姿态（库C） + 背景（库D）',
                    storageKey: `gpm_catmix_guide_seen`
                },
                'chaos': {
                    title: '🌀 混沌生成使用说明',
                    color: '#673ab7',
                    what: '终极随机模式，从所有库的全局提示词池中随机抽取5-12条，创造意外惊喜',
                    how: ['无需任何设置', '点击"混沌生成"', '系统从全局池中随机抽取5-12条（数量也是随机）'],
                    example: '可能是5条，也可能是12条，每次数量和内容都完全不同',
                    storageKey: `gpm_chaos_guide_seen`
                }
            };

            const guide = guides[mode];
            if (!guide) return;

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
                z-index: 999999; display: flex; align-items: center; justify-content: center;
            `;

            const guideBox = document.createElement('div');
            guideBox.style.cssText = `
                background: rgba(20, 20, 30, 0.98); border: 1px solid ${guide.color}40;
                border-radius: 16px; padding: 30px; max-width: 600px;
                box-shadow: 0 20px 60px ${guide.color}50;
            `;

            guideBox.innerHTML = `
                <div style="color: white; font-size: 24px; font-weight: 700; margin-bottom: 20px; text-align: center;">
                    ${guide.title}
                </div>
                <div style="color: #ccc; font-size: 14px; line-height: 1.8; margin-bottom: 25px;">
                    <p style="margin-bottom: 15px;"><strong style="color: ${guide.color};">✨ 这是什么？</strong><br>
                    ${guide.what}</p>

                    <p style="margin-bottom: 15px;"><strong style="color: ${guide.color};">🎯 如何使用？</strong></p>
                    <ol style="padding-left: 20px; margin-bottom: 15px;">
                        ${guide.how.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}
                    </ol>

                    <p style="margin-bottom: 10px;"><strong style="color: ${guide.color};">💡 示例：</strong><br>
                    <code style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px; display: block; margin-top: 8px; font-size: 12px;">
                    ${guide.example}
                    </code></p>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="gpm-guide-cancel" style="
                        padding: 10px 24px; background: transparent;
                        border: 1px solid rgba(255,255,255,0.3); border-radius: 8px;
                        color: white; cursor: pointer; font-size: 14px;
                    ">取消</button>
                    <button id="gpm-guide-confirm" style="
                        padding: 10px 24px; background: ${guide.color};
                        border: none; border-radius: 8px;
                        color: white; cursor: pointer; font-size: 14px; font-weight: 600;
                    ">知道了，开始使用</button>
                </div>
            `;

            overlay.appendChild(guideBox);
            document.body.appendChild(overlay);

            const closeGuide = (shouldProceed) => {
                overlay.remove();
                localStorage.setItem(guide.storageKey, 'true');
                if (shouldProceed && onProceed) onProceed();
            };

            guideBox.querySelector('#gpm-guide-cancel').onclick = () => closeGuide(false);
            guideBox.querySelector('#gpm-guide-confirm').onclick = () => closeGuide(true);
            overlay.onclick = (e) => { if (e.target === overlay) closeGuide(false); };
        }

        // 🎉 Show Toast
        showToast(title, subtitle, color) {
            const toast = document.createElement('div');
            toast.innerHTML = `${title}<br><span style="font-size:12px;opacity:0.8;display:block;margin-top:2px;">${subtitle}</span>`;
            Object.assign(toast.style, {
                position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                background: `${color}E6`, color: 'white',
                padding: '10px 20px', borderRadius: '8px', zIndex: '100000',
                fontSize: '14px', fontWeight: '500', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                textAlign: 'center'
            });
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

    setup(libraryData, libraries, onPromptClick, onLibChange, onImport, onExport, onAddLib, onDeleteLib, onAddPrompt, onExportAll, onDraftToggle, onPromptAction, onReorder, onAiAssist, onRenameLib, onAddCategory, onImportCategory, onExportCategory, onMoveLib) {
            this.library = libraryData;
            this.allPrompts = libraryData.prompts || [];
            this.onPromptClick = onPromptClick;
            this.onAddPrompt = onAddPrompt;
            this.onPromptAction = onPromptAction;
            this.onReorder = onReorder;
            this.onRenameLib = onRenameLib; // New
            this.onAddCategory = onAddCategory; // New
            this.onImportCategory = onImportCategory; // New
            this.onExportCategory = onExportCategory; // New
            this.onMoveLib = onMoveLib; // New

            // 🔴 FIX #3: Prevent duplicate event listener binding
            if (this._globalClickBound) {
                document.removeEventListener('click', this._globalClickHandler);
            }

            this._globalClickHandler = (e) => {
                const menu = this.shadow.querySelector('.gpm-context-menu');
                if (menu) menu.style.display = 'none';
            };

            document.addEventListener('click', this._globalClickHandler);
            this._globalClickBound = true;

            // ✨ FEATURE: Independent Floating Library Selector Panel
            const isLeft = this.side === 'left';
            const libTriggerArea = this.shadow.querySelector('.lib-trigger-area');
            const currentLibName = this.shadow.querySelector('.current-lib-name');

            // Set initial label
            if (currentLibName) currentLibName.textContent = libraryData.name;

            // Create Independent Floating Panel (Similar to Auto-Retry Panel)
            let libSelectorPanel = this.shadow.querySelector('.gpm-lib-selector-panel');

            // 🎯 CRITICAL FIX: Separate storage keys for left (text) and right (video) panels
            const posKey = isLeft ? 'gpm_libPanelPos_left' : 'gpm_libPanelPos_right';

            if (!libSelectorPanel) {
                // Create Panel
                libSelectorPanel = document.createElement('div');
                libSelectorPanel.className = 'gpm-lib-selector-panel';

                // 尝试恢复保存的位置和大小
                let savedPos = localStorage.getItem(posKey);

                // 🗑️ REMOVE MIGRATION: Old data is dirty (mixed left/right), so we drop it.
                // This forces a fresh start with correct defaults for everyone.

                let positionStyle = '';
                let sizeStyle = 'width: 320px; height: 500px;'; // Default size

                // 🌟 Smart Default Position
                const defaultLeft = isLeft ? 'left: 360px;' : 'right: 360px;';
                const defaultTop = 'top: 100px;';

                if (savedPos) {
                    try {
                        const pos = JSON.parse(savedPos);

                        // 🛡️ SANITY CHECK: Prevent dirty data from messing up positions
                        // If left panel is too far right (> 50% screen width), reset it.
                        // If right panel is too far left (< 50% screen width), reset it.
                        const screenW = window.innerWidth;
                        if (isLeft && pos.left > screenW * 0.5) {
                            throw new Error('Left panel drifted to right side');
                        }
                        if (!isLeft && pos.left < screenW * 0.4) { // Allow some overlap but not too much
                             throw new Error('Right panel drifted to left side');
                        }

                        // Apply saved valid position
                        positionStyle = `left: ${pos.left}px; top: ${pos.top}px;`;
                        if (pos.width && pos.height) {
                            sizeStyle = `width: ${pos.width}px; height: ${pos.height}px;`;
                        }
                    } catch (e) {
                        // Fallback to default if corrupted or weird position
                        console.warn('[GPM] Resetting panel position:', e.message);
                        positionStyle = `${defaultTop} ${defaultLeft}`;
                    }
                } else {
                    positionStyle = `${defaultTop} ${defaultLeft}`;
                }

                libSelectorPanel.style.cssText = `
                    position: fixed;
                    ${positionStyle}
                    ${sizeStyle}
                    background: rgba(20, 20, 30, 0.95);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 12px;
                    box-shadow: 0 12px 48px rgba(0,0,0,0.7);
                    z-index: 999999;
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    color: white;
                    font-size: 13px;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    opacity: 0;
                    transform: translateY(-10px);
                `;

                // Panel Header
                const header = document.createElement('div');
                header.style.cssText = `
                    padding: 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    user-select: none;
                `;
                header.innerHTML = `
                    <span style="font-weight: bold; font-size: 14px;">切换库 (Switch Library)</span>
                    <button class="gpm-btn close-lib-panel-btn" style="
                        width: 24px; height: 24px; padding: 0; background: transparent;
                        border: none; color: rgba(255,255,255,0.6); cursor: pointer;
                        font-size: 18px; line-height: 1;
                    ">✕</button>
                `;

                // 添加拖动功能（参考 BottomPanel 的实现）
                let isDraggingPanel = false;
                let startX, startY, initialLeft, initialTop;

                const onMove = (e) => {
                    if (!isDraggingPanel) return;
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    const newLeft = initialLeft + dx;
                    const newTop = initialTop + dy;
                    libSelectorPanel.style.left = newLeft + 'px';
                    libSelectorPanel.style.top = newTop + 'px';
                    libSelectorPanel.style.right = 'auto'; // ensure right doesn't conflict
                };

                const onUp = () => {
                    if (!isDraggingPanel) return;
                    isDraggingPanel = false;
                    header.style.cursor = 'move';

                    // 保存位置
                    const rect = libSelectorPanel.getBoundingClientRect();
                    localStorage.setItem(posKey, JSON.stringify({
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height
                    }));

                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                };

                header.onmousedown = (e) => {
                    // 只允许在标题文字区域拖动，排除按钮和其他交互元素
                    if (e.target.closest('.close-lib-panel-btn')) return;
                    if (e.target.tagName === 'INPUT') return;
                    if (e.target.tagName === 'BUTTON') return;

                    console.log('[GPM] 库面板拖动开始');
                    isDraggingPanel = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    const rect = libSelectorPanel.getBoundingClientRect();
                    initialLeft = rect.left;
                    initialTop = rect.top;
                    header.style.cursor = 'grabbing';

                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                };

                // Search Box
                const searchBox = document.createElement('div');
                searchBox.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);';
                searchBox.innerHTML = `
                    <input type="text" class="lib-panel-search" placeholder="搜索库 (Search)..." style="
                        width: 100%;
                        background: rgba(0,0,0,0.3);
                        border: 1px solid rgba(255,255,255,0.1);
                        padding: 8px 12px;
                        border-radius: 6px;
                        color: #fff;
                        font-size: 13px;
                        outline: none;
                    ">
                `;

                // List Container
                const listContainer = document.createElement('div');
                listContainer.className = 'lib-panel-list';
                listContainer.style.cssText = `
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                `;
                listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading...</div>';

                // Assemble Panel
                libSelectorPanel.appendChild(header);
                libSelectorPanel.appendChild(searchBox);
                libSelectorPanel.appendChild(listContainer);

                // Resize Handle
                const resizer = document.createElement('div');
                resizer.className = 'resize-handle-lib';
                resizer.style.cssText = `
                    position: absolute; bottom: 0; right: 0;
                    width: 15px; height: 15px; cursor: nwse-resize;
                    background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%);
                    z-index: 10;
                    border-bottom-right-radius: 12px;
                `;
                libSelectorPanel.appendChild(resizer);

                // Resize Logic
                let isResizingLib = false;
                let startLW, startLH, startLX, startLY;

                resizer.onmousedown = (e) => {
                    e.stopPropagation();
                    isResizingLib = true;
                    startLX = e.clientX;
                    startLY = e.clientY;
                    startLW = libSelectorPanel.offsetWidth;
                    startLH = libSelectorPanel.offsetHeight;

                    document.addEventListener('mousemove', onResizeLib);
                    document.addEventListener('mouseup', onResizeLibUp);
                };

                const onResizeLib = (e) => {
                    if (!isResizingLib) return;
                    e.preventDefault(); // Prevent text selection
                    const dx = e.clientX - startLX;
                    const dy = e.clientY - startLY;

                    const w = startLW + dx;
                    const h = startLH + dy;

                    if (w > 250) libSelectorPanel.style.width = w + 'px';
                    if (h > 300) libSelectorPanel.style.height = h + 'px';
                };

                const onResizeLibUp = () => {
                    if (!isResizingLib) return;
                    isResizingLib = false;
                    document.removeEventListener('mousemove', onResizeLib);
                    document.removeEventListener('mouseup', onResizeLibUp);

                    // Save Size & Position
                    const rect = libSelectorPanel.getBoundingClientRect();
                    localStorage.setItem(posKey, JSON.stringify({
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height
                    }));
                };

                // Mount to Shadow Root
                this.shadow.appendChild(libSelectorPanel);

                // Close Button Event
                const closeBtn = header.querySelector('.close-lib-panel-btn');
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    hideLibPanel();
                };

                // Search Event
                const searchInput = searchBox.querySelector('.lib-panel-search');
                searchInput.oninput = (e) => {
                    renderLibPanelList(e.target.value);
                };
            }

            // Show/Hide Panel Functions
            const showLibPanel = () => {
                libSelectorPanel.style.display = 'flex';
                requestAnimationFrame(() => {
                    libSelectorPanel.style.opacity = '1';
                    libSelectorPanel.style.transform = 'translateY(0)';
                });
                renderLibPanelList();
                const searchInput = libSelectorPanel.querySelector('.lib-panel-search');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
            };

            const hideLibPanel = () => {
                libSelectorPanel.style.opacity = '0';
                libSelectorPanel.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    libSelectorPanel.style.display = 'none';
                }, 200);
            };

            // Toggle Panel on Trigger Click
            if (libTriggerArea) {
                libTriggerArea.onclick = (e) => {
                    e.stopPropagation();
                    const isVisible = libSelectorPanel.style.display === 'flex';
                    if (isVisible) {
                        hideLibPanel();
                    } else {
                        showLibPanel();
                    }
                };
            }

            // 保存 this 引用，供内部函数使用
            const self = this;

            // Render Panel List Function
            const renderLibPanelList = (filter = '') => {
                const listContainer = libSelectorPanel.querySelector('.lib-panel-list');
                if (!listContainer) return;

                listContainer.innerHTML = '';

                let sortedLibs = [...libraries];
                if (filter) {
                    const lower = filter.toLowerCase();
                    sortedLibs = sortedLibs.filter(l => l.name.toLowerCase().includes(lower));
                }

                // 排序逻辑：置顶优先，然后按 sortOrder（如果有），最后按名称
                sortedLibs.sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;

                    // 自定义排序
                    const orderA = a.sortOrder !== undefined ? a.sortOrder : 999999;
                    const orderB = b.sortOrder !== undefined ? b.sortOrder : 999999;
                    if (orderA !== orderB) return orderA - orderB;

                    return a.name.localeCompare(b.name);
                });

                if (sortedLibs.length === 0) {
                    listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">无匹配结果</div>';
                    return;
                }

                // 拖拽状态
                let draggedItem = null;
                let draggedLib = null;
                let longPressTimer = null;
                let isDragging = false;

                sortedLibs.forEach((lib, index) => {
                    const item = document.createElement('div');
                    const isActive = (lib.id === libraryData.id);

                    item.style.cssText = `
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 10px 8px 10px 12px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 13px;
                        color: ${isActive ? '#1d9bf0' : '#ccc'};
                        background: ${isActive ? 'rgba(29, 155, 240, 0.12)' : 'transparent'};
                        margin-bottom: 4px;
                        transition: all 0.15s;
                        border: 1px solid ${isActive ? 'rgba(29, 155, 240, 0.3)' : 'transparent'};
                        position: relative;
                    `;

                    item.dataset.libId = lib.id;

                    // Hover Effect - 已禁用，只保留点击高亮
                    // item.onmouseenter = () => {
                    //     if (!isActive && !isDragging) {
                    //         item.style.background = 'rgba(255,255,255,0.06)';
                    //         item.style.borderColor = 'rgba(255,255,255,0.1)';
                    //     }
                    // };
                    // item.onmouseleave = () => {
                    //     if (!isActive) {
                    //         item.style.background = 'transparent';
                    //         item.style.borderColor = 'transparent';
                    //     }
                    // };

                    // Content
                    item.innerHTML = `
                        <div class="drag-handle" style="
                            cursor: grab;
                            padding: 4px;
                            margin-right: 8px;
                            color: rgba(255,255,255,0.3);
                            font-size: 16px;
                            line-height: 1;
                            user-select: none;
                            flex-shrink: 0;
                        " title="长按拖动排序">⋮⋮</div>
                        <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:12px;">
                            ${lib.name}
                        </div>
                        <div class="actions" style="display: flex; gap: 6px; align-items: center;">
                             <button class="pin-btn" title="${lib.pinned ? '取消置顶' : '置顶'}" style="
                                background: transparent;
                                border: none;
                                cursor: pointer;
                                padding: 4px; border-radius: 4px;
                                color: ${lib.pinned ? '#1d9bf0' : 'rgba(255,255,255,0.25)'};
                                opacity: ${lib.pinned ? '1' : '0.5'};
                                transition: all 0.2s;
                             ">${ICON_SET.Pin}</button>
                            <button class="rename-btn" title="重命名" style="
                                background: transparent;
                                border: none;
                                cursor: pointer;
                                padding: 4px; border-radius: 4px;
                                color: rgba(255,255,255,0.3);
                                opacity: 0.5;
                                transition: all 0.2s;
                            ">${ICON_SET.Edit}</button>
                        </div>
                    `;

                    // 拖拽手柄事件
                    const dragHandle = item.querySelector('.drag-handle');
                    let dragClone = null; // 跟随鼠标的克隆元素

                    // 长按开始拖拽
                    dragHandle.onmousedown = (e) => {
                        e.preventDefault();
                        const startX = e.clientX;
                        const startY = e.clientY;

                        longPressTimer = setTimeout(() => {
                            isDragging = true;
                            draggedItem = item;
                            draggedLib = lib;

                            // 创建跟随鼠标的克隆元素
                            dragClone = item.cloneNode(true);
                            dragClone.style.cssText = `
                                position: fixed;
                                left: ${e.clientX - 20}px;
                                top: ${e.clientY - 20}px;
                                width: ${item.offsetWidth}px;
                                background: rgba(29, 155, 240, 0.2);
                                border: 2px solid #1d9bf0;
                                border-radius: 8px;
                                padding: 10px 8px 10px 12px;
                                z-index: 999999;
                                pointer-events: none;
                                opacity: 0.9;
                                box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                                transform: rotate(2deg);
                            `;
                            document.body.appendChild(dragClone);

                            // 原始项变为占位符
                            item.style.opacity = '0.3';
                            item.style.border = '2px dashed rgba(255,255,255,0.2)';
                            item.style.background = 'transparent';

                            dragHandle.style.cursor = 'grabbing';
                        }, 300); // 300ms 长按
                    };

                    dragHandle.onmouseup = () => {
                        clearTimeout(longPressTimer);
                    };

                    dragHandle.onmouseleave = () => {
                        clearTimeout(longPressTimer);
                    };

                    // 鼠标移动时显示插入位置
                    item.onmousemove = (e) => {
                        if (!isDragging || !draggedItem || draggedItem === item) return;

                        const rect = item.getBoundingClientRect();
                        const midpoint = rect.top + rect.height / 2;

                        // 清除所有其他项的边框
                        listContainer.querySelectorAll('[data-lib-id]').forEach(el => {
                            if (el !== draggedItem) {
                                el.style.borderTop = '';
                                el.style.borderBottom = '';
                            }
                        });

                        // 只在当前项显示插入线
                        if (e.clientY < midpoint) {
                            item.style.borderTop = '3px solid #1d9bf0';
                            item.style.borderBottom = '';
                        } else {
                            item.style.borderBottom = '3px solid #1d9bf0';
                            item.style.borderTop = '';
                        }
                    };

                    item.onmouseleave = () => {
                        if (isDragging && item !== draggedItem) {
                            item.style.borderTop = '';
                            item.style.borderBottom = '';
                        }
                    };

                    // 鼠标释放时完成拖拽
                    item.onmouseup = (e) => {
                        if (!isDragging || !draggedItem || draggedItem === item) return;

                        // 清除所有边框
                        listContainer.querySelectorAll('[data-lib-id]').forEach(el => {
                            el.style.borderTop = '';
                            el.style.borderBottom = '';
                        });

                        // 计算新位置
                        const rect = item.getBoundingClientRect();
                        const midpoint = rect.top + rect.height / 2;
                        const insertBefore = e.clientY < midpoint;

                        // 更新 sortOrder
                        const newOrder = [];
                        sortedLibs.forEach((l, i) => {
                            if (l.id === draggedLib.id) return; // 跳过被拖拽的
                            if (l.id === lib.id) {
                                if (insertBefore) {
                                    newOrder.push(draggedLib);
                                    newOrder.push(l);
                                } else {
                                    newOrder.push(l);
                                    newOrder.push(draggedLib);
                                }
                            } else {
                                newOrder.push(l);
                            }
                        });

                        // 保存新顺序
                        newOrder.forEach((l, i) => {
                            l.sortOrder = i;
                        });

                        // 保存到存储
                        if (self.onPromptAction) {
                            self.onPromptAction('reorderLibs', newOrder);
                        }

                        // 清理拖拽状态
                        if (dragClone) {
                            dragClone.remove();
                            dragClone = null;
                        }
                        isDragging = false;
                        if (draggedItem) {
                            draggedItem.style.opacity = '1';
                            draggedItem.style.border = '';
                            draggedItem.style.background = '';
                            const handle = draggedItem.querySelector('.drag-handle');
                            if (handle) handle.style.cursor = 'grab';
                        }
                        draggedItem = null;
                        draggedLib = null;

                        // 重新渲染
                        renderLibPanelList(filter);
                    };

                    // Click to Switch Library
                    item.onclick = (e) => {
                        if (e.target.closest('button') || e.target.closest('.drag-handle')) return;
                        if (isDragging) return;
                        hideLibPanel();
                        if (lib.id !== libraryData.id) onLibChange(lib.id);
                    };

                    // Pin Button Logic
                    const pinBtn = item.querySelector('.pin-btn');
                    pinBtn.onmouseenter = () => {
                        pinBtn.style.opacity = '1';
                        if (!lib.pinned) pinBtn.style.color = 'rgba(255,255,255,0.5)';
                    };
                    pinBtn.onmouseleave = () => {
                        pinBtn.style.opacity = lib.pinned ? '1' : '0.5';
                        if (!lib.pinned) pinBtn.style.color = 'rgba(255,255,255,0.25)';
                    };
                    pinBtn.onclick = (e) => {
                        e.stopPropagation();
                        console.log('[GPM] 置顶按钮被点击:', lib.name);
                        lib.pinned = !lib.pinned;
                        console.log('[GPM] 新的置顶状态:', lib.pinned);
                        console.log('[GPM] onPromptAction 是否存在:', !!self.onPromptAction);

                        // 保存置顶状态
                        if (self.onPromptAction) {
                            console.log('[GPM] 调用 onPromptAction...');
                            self.onPromptAction('toggleLibPin', lib);
                        } else {
                            console.error('[GPM] ❌ onPromptAction 未定义！');
                        }
                        renderLibPanelList(filter);
                    };

                    // Rename Button Logic
                    const renameBtn = item.querySelector('.rename-btn');
                    renameBtn.onmouseenter = () => {
                        renameBtn.style.opacity = '1';
                        renameBtn.style.color = 'rgba(255,255,255,0.7)';
                    };
                    renameBtn.onmouseleave = () => {
                        renameBtn.style.opacity = '0.5';
                        renameBtn.style.color = 'rgba(255,255,255,0.3)';
                    };
                    renameBtn.onclick = (e) => {
                        e.stopPropagation();
                        const newName = prompt('重命名库 (Rename Library):', lib.name);
                        if (newName && newName.trim() && newName !== lib.name) {
                            if (self.onRenameLib) {
                                self.onRenameLib(lib.id, newName.trim());
                            }
                        }
                    };

                    listContainer.appendChild(item);
                });

                // 全局鼠标移动事件（让克隆元素跟随鼠标）
                document.onmousemove = (e) => {
                    if (isDragging && draggedItem) {
                        // 查找克隆元素
                        const clone = document.body.querySelector('[style*="position: fixed"]');
                        if (clone && clone.style.position === 'fixed') {
                            clone.style.left = (e.clientX - 20) + 'px';
                            clone.style.top = (e.clientY - 20) + 'px';
                        }
                    }
                };

                // 全局鼠标释放事件
                document.onmouseup = () => {
                    clearTimeout(longPressTimer);

                    // 清理克隆元素
                    const clones = document.body.querySelectorAll('[style*="position: fixed"][style*="pointer-events: none"]');
                    clones.forEach(clone => {
                        if (clone.textContent && clone.querySelector('.drag-handle')) {
                            clone.remove();
                        }
                    });

                    // 重置拖拽状态
                    if (isDragging && draggedItem) {
                        draggedItem.style.opacity = '1';
                        draggedItem.style.border = '';
                        draggedItem.style.background = '';
                        const handle = draggedItem.querySelector('.drag-handle');
                        if (handle) handle.style.cursor = 'grab';

                        // 清除所有插入线
                        const container = libSelectorPanel.querySelector('.lib-panel-list');
                        if (container) {
                            container.querySelectorAll('[data-lib-id]').forEach(el => {
                                el.style.borderTop = '';
                                el.style.borderBottom = '';
                            });
                        }
                    }
                    isDragging = false;
                    draggedItem = null;
                    draggedLib = null;
                };
            };

            // Click Outside to Close Panel
            this.shadow.addEventListener('click', (e) => {
                if (libSelectorPanel.style.display === 'flex') {
                    const path = e.composedPath();
                    if (!path.includes(libSelectorPanel) && !path.includes(libTriggerArea)) {
                        hideLibPanel();
                    }
                }
            });

            // Fix Action Buttons Bindings
            const addLibBtn = this.shadow.querySelector('.add-lib-btn');
            if (addLibBtn) addLibBtn.onclick = onAddLib;

            const delLibBtn = this.shadow.querySelector('.del-lib-btn');
            if (delLibBtn) delLibBtn.onclick = onDeleteLib;

            this.shadow.querySelector('.import-btn').onclick = onImport;

        // ✨ NEW FEATURE: Paste import button (Fixed v2.7.1)
        const pasteBtn = this.shadow.querySelector('.paste-import-btn');
        if (pasteBtn) {
            pasteBtn.onclick = () => {
                if (typeof showGPMPasteImport === 'function') {
                    showGPMPasteImport((imported) => {
                        if (this.onAddPrompt && Array.isArray(imported)) {
                            // 🎯 CRITICAL FIX: 使用对象模式传递参数
                            imported.forEach(item => {
                                this.onAddPrompt({
                                    content: item.content,
                                    name: item.name,
                                    type: this.side === 'left' ? 'text' : 'video',
                                    category: null
                                });
                            });
                        }
                    });
                } else {
                    alert('Paste Import module not ready');
                }
            };
        }

        const expBtn = this.shadow.querySelector('.export-btn');
        if (expBtn) expBtn.onclick = onExport;

            // Bind New Mode Toolbar Buttons (Quick Import/Export)
            const previewToggle = this.shadow.querySelector('.preview-toggle-btn');
            if (previewToggle) {
                this.previewEnabled = true; // Default ON
                previewToggle.onclick = () => {
                    this.previewEnabled = !this.previewEnabled;
                    previewToggle.textContent = this.previewEnabled ? '👁️' : '🕶️';
                    previewToggle.title = this.previewEnabled ? '预览开启 (Preview ON)' : '预览关闭 (Preview OFF)';
                    document.querySelectorAll('.gpm-preview-tooltip').forEach(el => el.remove());
                };
            }
            const aiAssist = this.shadow.querySelector('.ai-assist-btn');
            if (aiAssist) {
                if (onAiAssist) {
                    aiAssist.onclick = onAiAssist;
                } else {
                    aiAssist.style.display = 'none';
                }
            }

            const backupBtn = this.shadow.querySelector('.backup-btn');
            if (backupBtn && onExportAll) backupBtn.onclick = onExportAll;

            const draftBtn = this.shadow.querySelector('.draft-btn');
            if (draftBtn && onDraftToggle) draftBtn.onclick = onDraftToggle;

            const addBtn = this.shadow.querySelector('.add-lib-btn');
            if (addBtn) addBtn.onclick = onAddLib;

            const delBtn = this.shadow.querySelector('.del-lib-btn');
            if (delBtn) delBtn.onclick = onDeleteLib;

            // Setup Categories
            this.categories = ['全部 (All)', ...new Set(this.allPrompts.map(p => p.category || 'Uncategorized'))];
            this.activeCategory = '全部 (All)';

            // ✨ FEATURE #6: Store category callbacks for later use
            this.onCategoryRename = (oldName, newName) => {
                // Rename category in all prompts
                this.allPrompts.forEach(p => {
                    if (p.category === oldName) p.category = newName;
                });
                this.categories = ['全部 (All)', ...new Set(this.allPrompts.map(p => p.category || 'Uncategorized'))];
                if (this.activeCategory === oldName) this.activeCategory = newName;
                this.renderCategories();
                this.renderList();
                // Notify parent if needed
                if (onPromptAction) onPromptAction('category-rename', { oldName, newName });
            };

            this.onCategoryDelete = (catName) => {
                // Move prompts to Uncategorized
                this.allPrompts.forEach(p => {
                    if (p.category === catName) p.category = 'Uncategorized';
                });
                this.categories = ['全部 (All)', ...new Set(this.allPrompts.map(p => p.category || 'Uncategorized'))];
                this.activeCategory = '全部 (All)';
                this.renderCategories();
                this.renderList();
                // Notify parent if needed
                if (onPromptAction) onPromptAction('category-delete', { catName });
            };

            // ✨ FEATURE #4: Store batch delete callback
            this.onBatchDelete = (promptIds) => {
                if (onPromptAction) onPromptAction('batch-delete', { promptIds });
            };

            // Setup Library Context Menu (Right-Click Rename)
            const libSelect = this.shadow.querySelector('.lib-select');
            if (libSelect) {
                libSelect.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (onRenameLib) {
                        const menu = document.createElement('div');
                        menu.style.cssText = `
                            position: fixed; z-index: 100000;
                            background: rgba(20,20,20,0.95); backdrop-filter: blur(10px);
                            border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;
                            padding: 4px; min-width: 150px;
                        `;
                        menu.innerHTML = `
                            <div class="gpm-ctx-item" data-act="pin">📌 置顶到最前 (Pin to Top)</div>
                            <div class="gpm-ctx-item-separator" style="height:1px; background:rgba(255,255,255,0.1); margin:4px 0;"></div>
                            <div class="gpm-ctx-item" data-act="rename">✏️ 重命名 (Rename)</div>
                            <div class="gpm-ctx-item" data-act="up">⬆️ 上移 (Move Up)</div>
                            <div class="gpm-ctx-item" data-act="down">⬇️ 下移 (Move Down)</div>
                            <div class="gpm-ctx-item-separator" style="height:1px; background:rgba(255,255,255,0.1); margin:4px 0;"></div>
                            <div class="gpm-ctx-item" data-act="del" style="color:#ff5555;">🗑️ 删除 (Delete)</div>
                        `;
                        menu.style.left = e.clientX + 'px';
                        menu.style.top = e.clientY + 'px';
                        document.body.appendChild(menu);

                        const items = menu.querySelectorAll('.gpm-ctx-item');
                        items.forEach(item => {
                            item.style.cssText = 'padding:6px 10px;cursor:pointer;border-radius:4px;font-size:12px;color:white;';
                            if (item.dataset.act === 'del') item.style.color = '#ff5555';

                            item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.1)';
                            item.onmouseleave = () => item.style.background = '';

                            item.onclick = () => {
                                const act = item.dataset.act;
                                if (act === 'pin' && this.onMoveLib) this.onMoveLib('top');
                                if (act === 'rename') onRenameLib();
                                if (act === 'del' && onDeleteLib) onDeleteLib();
                                if (act === 'up' && this.onMoveLib) this.onMoveLib(-1);
                                if (act === 'down' && this.onMoveLib) this.onMoveLib(1);
                                menu.remove();
                            };
                        });

                        setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 100);
                    }
                };
            }

            this.renderCategories();
            this.renderList();
        }

        renderCategories() {
            const container = this.shadow.querySelector('.category-bar');
            if (!container) return;

            // Initialize expansion state if not present
            if (typeof this.isCategoryExpanded === 'undefined') {
                this.isCategoryExpanded = false;
            }

            const isExpanded = this.isCategoryExpanded;
            const expandBtnIcon = isExpanded ? '▲' : '▼';

            container.innerHTML = `
                <div class="gpm-cat-expand" title="展开/收起 (Toggle)" style="
                    padding: 4px 6px; cursor: pointer; color: #888; font-size: 10px;
                    display: flex; align-items: center; justify-content: center;
                    margin-right: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;
                    height: 20px; width: 20px; flex-shrink: 0;
                ">${expandBtnIcon}</div>
                <div class="gpm-cat-scroll" style="
                    display: flex; gap: 4px; flex: 1;
                    overflow-x: ${isExpanded ? 'visible' : 'auto'};
                    flex-wrap: ${isExpanded ? 'wrap' : 'nowrap'};
                    scrollbar-width: none; align-content: flex-start;
                "></div>
            `;

            // Apply container styles based on state
            if (isExpanded) {
                container.style.flexWrap = 'nowrap'; // Outer container doesn't wrap
                container.style.height = 'auto';
                container.style.alignItems = 'flex-start';
                container.style.overflowX = 'visible';
            } else {
                container.style.flexWrap = 'nowrap';
                container.style.height = '40px';
                container.style.alignItems = 'center';
                container.style.overflowX = 'hidden';
            }

            const scrollContainer = container.querySelector('.gpm-cat-scroll');
            const expandBtn = container.querySelector('.gpm-cat-expand');

            // Helper to create small action buttons (Shared style)
            const createTinyBtn = (html, title, onClickHandler) => {
                const btn = document.createElement('button');
                btn.className = 'gpm-btn';
                btn.innerHTML = html;
                btn.title = title;
                btn.style.cssText = 'min-width: 24px; padding: 0 4px; font-size: 10px; height: 20px; display: flex; align-items: center; justify-content: center;';
                btn.onclick = onClickHandler;
                return btn;
            };

            // Import Button
            if (this.onImportCategory) {
                scrollContainer.appendChild(createTinyBtn(ICON_SET.Import, '导入分类 (Import to Category)', this.onImportCategory));
            }
            // Export Button
            if (this.onExportCategory) {
                scrollContainer.appendChild(createTinyBtn(ICON_SET.Export, '导出分类 (Export Category)', this.onExportCategory));
            }
            // Add Button
            if (this.onAddCategory) {
                const addBtn = createTinyBtn('+', '新建分类 (New Category)', () => {
                    this.onAddCategory();
                });
                scrollContainer.appendChild(addBtn);
            }

            // Render Chips
            this.categories.forEach(cat => {
                const chip = document.createElement('div');
                chip.textContent = cat;
                chip.style.cssText = `
                    padding: 2px 8px; background: ${cat === this.activeCategory ? 'var(--gpm-primary)' : 'rgba(255,255,255,0.1)'};
                    border-radius: 12px; font-size: 10px; white-space: nowrap;
                    cursor: pointer; user-select: none; transition: background 0.2s;
                    height: 20px; display: flex; align-items: center;
                `;
                chip.onclick = () => {
                    this.activeCategory = cat;
                    this.renderCategories();
                    this.renderList();
                };

                // ✨ FEATURE #6: Category management via right-click
                chip.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (cat === '全部 (All)') return; // Cannot rename/delete "All"

                    const menu = document.createElement('div');
                    menu.style.cssText = `
                        position: fixed; z-index: 100000;
                        background: rgba(20,20,20,0.95); backdrop-filter: blur(10px);
                        border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;
                        padding: 4px; min-width: 120px;
                    `;
                    menu.innerHTML = `
                        <div class="gpm-cat-menu-item" style="padding:6px 10px;cursor:pointer;border-radius:4px;font-size:12px;color:white;" data-action="rename">✏️ 重命名</div>
                        <div class="gpm-cat-menu-item" style="padding:6px 10px;cursor:pointer;border-radius:4px;font-size:12px;color:#ff5555;" data-action="delete">🗑️ 删除</div>
                    `;
                    menu.style.left = e.clientX + 'px';
                    menu.style.top = e.clientY + 'px';
                    document.body.appendChild(menu);

                    menu.querySelectorAll('.gpm-cat-menu-item').forEach(item => {
                        item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.1)';
                        item.onmouseleave = () => item.style.background = '';
                        item.onclick = () => {
                            const action = item.dataset.action;
                            if (action === 'rename') {
                                const newName = prompt(`重命名分类 "${cat}":`, cat);
                                if (newName && newName !== cat && this.onCategoryRename) {
                                    this.onCategoryRename(cat, newName);
                                }
                            } else if (action === 'delete') {
                                if (confirm(`确定删除分类 "${cat}"？\n该分类下的提示词将变为"Uncategorized"`)) {
                                    if (this.onCategoryDelete) this.onCategoryDelete(cat);
                                }
                            }
                            menu.remove();
                        };
                    });

                    setTimeout(() => {
                        document.addEventListener('click', () => menu.remove(), { once: true });
                    }, 100);
                };

                scrollContainer.appendChild(chip);
            });

            // Bind Expand Event
            expandBtn.onclick = () => {
                this.isCategoryExpanded = !this.isCategoryExpanded;
                this.renderCategories();
            };
        }

        renderList() {
            const container = this.shadow.querySelector('#prompt-container');
            container.innerHTML = '';

            // 🐞 FIX: Clear all existing preview tooltips to prevent overlap
            document.querySelectorAll('.gpm-preview-tooltip').forEach(tooltip => tooltip.remove());

            let filtered = [...this.allPrompts]; // Copy to avoid mutating original

            // Filter by Category
            if (this.activeCategory !== '全部 (All)') {
                filtered = filtered.filter(p => (p.category || 'Uncategorized') === this.activeCategory);
            }

            // Filter by Search
            if (this.filterText) {
                const lower = this.filterText.toLowerCase();

                // ✨ FEATURE #5: Smart search with pinyin support
                filtered = filtered.filter(p => {
                    const nameMatch = p.name && p.name.toLowerCase().includes(lower);
                    const contentMatch = p.content && p.content.toLowerCase().includes(lower);

                    // Pinyin initial matching (拼音首字母)
                    let pinyinMatch = false;
                    if (p.name) {
                        const pinyinInitials = this._getPinyinInitials(p.name);
                        pinyinMatch = pinyinInitials.includes(lower);
                    }

                    return nameMatch || contentMatch || pinyinMatch;
                });
            }

            // Sort: Pinned first, then by SortOrder
            // Sort: Pinned first, then by SortOrder (Array Order effectively)
            // If specific sort logic is needed (e.g. alphabetical), add here.
            // For 'manual' (drag & drop), we trust the array order.
            // Default "Newest" = Array Order (assuming unshift).
            // "Oldest" = Reversed Array Order.

            if (this.sortOrder === 'oldest') {
                filtered.reverse();
            }

            filtered.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return 0; // Maintain relative order (Newest/Manual)
            });

            if (filtered.length === 0) {
                container.innerHTML = '<div style="text-align:center; color: var(--gpm-text-dim);">No prompts found</div>';
                return;
            }

            // ✨ FEATURE #4: Initialize batch selection state
            if (!this.selectedPrompts) this.selectedPrompts = new Set();

            // ✨ 性能优化：智能分页渲染
            const PAGINATION_THRESHOLD = 50; // 超过 50 条启用分页
            const PAGE_SIZE = 50; // 每页 50 条
            const enablePagination = filtered.length > PAGINATION_THRESHOLD;

            if (!this._currentPage) this._currentPage = 1;
            if (!this._lastFilteredData || JSON.stringify(this._lastFilteredData) !== JSON.stringify(filtered)) {
                // 数据变化时重置分页
                this._currentPage = 1;
                this._lastFilteredData = filtered;
            }

            const totalPages = enablePagination ? Math.ceil(filtered.length / PAGE_SIZE) : 1;
            const startIndex = enablePagination ? (this._currentPage - 1) * PAGE_SIZE : 0;
            const endIndex = enablePagination ? Math.min(startIndex + PAGE_SIZE, filtered.length) : filtered.length;
            const itemsToRender = filtered.slice(startIndex, endIndex);

            // 显示分页信息
            if (enablePagination && filtered.length > 0) {
                const paginationInfo = document.createElement('div');
                paginationInfo.style.cssText = `
                    padding: 8px;
                    text-align: center;
                    color: var(--gpm-text-dim);
                    font-size: 12px;
                    background: rgba(255,255,255,0.03);
                    border-radius: 4px;
                    margin-bottom: 8px;
                    display: flex; justify-content: space-between; align-items: center;
                `;

                const isEnd = this._currentPage >= totalPages;
                const actionBtnHtml = isEnd
                    ? '<span style="color: #aaa; cursor: pointer;" class="collapse-btn">▲ 收起 (Collapse)</span>'
                    : '<span style="color: #1d9bf0; cursor: pointer;" class="load-more-btn">▼ 加载更多 (Load More)</span>';

                paginationInfo.innerHTML = `
                    <span>已展示 ${endIndex} / ${filtered.length}</span>
                    ${actionBtnHtml}
                `;
                container.appendChild(paginationInfo);

                // Bind Events
                const loadMoreBtn = paginationInfo.querySelector('.load-more-btn');
                if (loadMoreBtn) {
                    loadMoreBtn.onclick = () => {
                        this._currentPage++;
                        this.renderList();
                    };
                }

                const collapseBtn = paginationInfo.querySelector('.collapse-btn');
                if (collapseBtn) {
                    collapseBtn.onclick = () => {
                        this._currentPage = 1;
                        this.renderList();
                    };
                }
            }

            itemsToRender.forEach(p => {
                const el = document.createElement('div');
                el.style.cssText = `
                    padding: 8px; background: ${p.pinned ? 'rgba(29, 155, 240, 0.15)' : 'rgba(255,255,255,0.05)'};
                    border: 1px solid ${p.pinned ? 'rgba(29, 155, 240, 0.3)' : 'rgba(255,255,255,0.05)'};
                    border-radius: 6px; cursor: pointer; transition: background 0.2s;
                `;
                el.onmouseover = () => el.style.background = p.pinned ? 'rgba(29, 155, 240, 0.25)' : 'rgba(255,255,255,0.1)';
                el.onmouseout = () => el.style.background = p.pinned ? 'rgba(29, 155, 240, 0.15)' : 'rgba(255,255,255,0.05)';

                // Check if it has variables
                const vars = TemplateEngine.extractVariables(p.content || '');
                const isTemplate = vars.length > 0;

                // Highlight Logic
                const escapeHtml = (text) => {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                };

                let htmlName = escapeHtml(p.name || (p.content ? p.content.slice(0, 30) + '...' : 'Untitled'));

                // If filtering, highlight match in Name OR Content (if name doesn't match but content does)
                if (this.filterText) {
                    const regex = new RegExp(this.filterText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    htmlName = htmlName.replace(regex, match => `<span class="highlight">${match}</span>`);
                    // If content match is important, maybe show snippet?
                    // For now, just highlight Name.
                }

                // Simplified view: Just Name + Icons
                // Simplified view: Just Name + Icons
                // const pinIcon = p.pinned ? '📌 ' : ''; // Removed legacy prefix icon in favor of button
                const tplIcon = isTemplate ? '🧩 ' : '';

                el.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="font-weight: 500; font-size: 13px; margin-bottom: 2px; flex: 1; word-break: break-all;">
                            ${tplIcon}${htmlName}
                        </div>
                        <button class="gpm-pin-btn" title="${p.pinned ? '取消置顶 (Unpin)' : '置顶 (Pin)'}" style="
                            background: transparent; border: none; cursor: pointer; padding: 0 4px;
                            font-size: 14px; opacity: ${p.pinned ? '1' : '0.1'}; transition: opacity 0.2s;
                            line-height: 1; flex-shrink: 0;
                        ">📌</button>
                    </div>
                    <div style="font-size: 11px; color: var(--gpm-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 20px;">
                         ${escapeHtml(p.content || '').slice(0, 50)}
                    </div>
                `;

                // Bind Pin Button
                const pinBtn = el.querySelector('.gpm-pin-btn');
                pinBtn.onclick = (e) => {
                    e.stopPropagation(); // Prevent item click
                    if (this.onPromptAction) this.onPromptAction('pin', p);
                };
                // Auto-hover effect through CSS or JS? JS for simplicity with inline styles
                pinBtn.onmouseenter = () => pinBtn.style.opacity = '1';
                pinBtn.onmouseleave = () => pinBtn.style.opacity = p.pinned ? '1' : '0.1';

                // ✨ FEATURE #2: Quick preview on hover (Enhanced v2.7.3)
                let hoverTimer = null;
                let previewTooltip = null;
                let cleanupTimer = null;

                const cleanup = () => {
                    if (previewTooltip) {
                        previewTooltip.remove();
                        previewTooltip = null;
                    }
                };

                const startCleanup = () => {
                    if (cleanupTimer) clearTimeout(cleanupTimer);
                    cleanupTimer = setTimeout(cleanup, 300); // 300ms grace period
                };

                const cancelCleanup = () => {
                    if (cleanupTimer) {
                        clearTimeout(cleanupTimer);
                        cleanupTimer = null;
                    }
                };

                el.onmouseenter = (enterEvent) => {
                    if (this.previewEnabled === false) return;
                    cancelCleanup();
                    clearTimeout(hoverTimer);

                    hoverTimer = setTimeout(() => {
                        if (previewTooltip) return;

                        previewTooltip = document.createElement('div');
                        previewTooltip.className = 'gpm-preview-tooltip';
                        previewTooltip.style.cssText = `
                            position: fixed; z-index: 100001;
                            max-width: 400px; padding: 12px;
                            background: rgba(20, 20, 20, 0.95);
                            backdrop-filter: blur(10px);
                            border: 1px solid rgba(255,255,255,0.2);
                            border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                            color: white; font-size: 12px; line-height: 1.5;
                            pointer-events: auto;
                        `;

                        const fullContent = escapeHtml(p.content || 'No content');
                        previewTooltip.innerHTML = `
                            <div style="font-weight: bold; margin-bottom: 8px; color: #1d9bf0;">
                                ${p.name || 'Untitled'}
                            </div>
                            <div style="white-space: pre-wrap; word-break: break-word; max-height: 300px; overflow-y: auto;">
                                ${fullContent}
                            </div>
                            <button class="gpm-btn" style="margin-top: 8px; width: 100%; font-size: 11px;">📋 复制 (Copy)</button>
                        `;

                        // Position tooltip
                        const rect = el.getBoundingClientRect();

                        if (this.side === 'right') {
                            // Pop to left
                            previewTooltip.style.right = (window.innerWidth - rect.left + 10) + 'px';
                            previewTooltip.style.left = 'auto';
                        } else {
                            // Pop to right (default)
                            previewTooltip.style.left = (rect.right + 10) + 'px';
                            previewTooltip.style.right = 'auto';
                        }

                        if (rect.top + 300 > window.innerHeight) {
                            previewTooltip.style.bottom = '20px';
                            previewTooltip.style.top = 'auto';
                        } else {
                            previewTooltip.style.top = rect.top + 'px';
                        }

                        document.body.appendChild(previewTooltip);

                        previewTooltip.querySelector('button').onclick = () => {
                            navigator.clipboard.writeText(p.content).then(() => {
                                const btn = previewTooltip.querySelector('button');
                                btn.textContent = '✅ 已复制!';
                                btn.style.background = '#00ba7c';
                            });
                        };

                        // Keep alive logic
                        previewTooltip.onmouseenter = () => cancelCleanup();
                        previewTooltip.onmouseleave = () => startCleanup();

                    }, 800);
                };

                el.onmouseleave = () => {
                    clearTimeout(hoverTimer);
                    startCleanup();
                };


                el.oncontextmenu = (e) => {
                    e.preventDefault();
                    this.showContextMenu(e, p);
                };

                // ✨ FIX: Prevent focus loss on click
                el.onmousedown = (e) => {
                    // Critical: Prevents the input from confusingly losing focus
                    // whenever a prompt is clicked.
                    e.preventDefault();
                    e.stopPropagation(); // ✨ Prevent bubbling to document
                };

                // ✨ FEATURE #4: Multi-select with Ctrl+Click
                el.onclick = (e) => {
                    e.stopPropagation(); // ✨ Prevent bubbling
                    const isMultiSelect = e.ctrlKey || e.metaKey;

                    if (isMultiSelect) {
                        // Toggle selection
                        if (this.selectedPrompts.has(p.id)) {
                            this.selectedPrompts.delete(p.id);
                            el.style.background = p.pinned ? 'rgba(29, 155, 240, 0.15)' : 'rgba(255,255,255,0.05)';
                            el.style.border = p.pinned ? '1px solid rgba(29, 155, 240, 0.3)' : '1px solid rgba(255,255,255,0.05)';
                        } else {
                            this.selectedPrompts.add(p.id);
                            el.style.background = 'rgba(29, 155, 240, 0.3)';
                            el.style.border = '2px solid var(--gpm-primary)';
                        }

                        // Show/hide batch toolbar
                        this._updateBatchToolbar();
                    } else {
                        // Normal click - clear selection and execute action
                        this.selectedPrompts.clear();
                        this._updateBatchToolbar();
                        const isReplace = (this.clickMode === 'replace') || e.shiftKey;
                        this.onPromptClick(p, isReplace);
                    }
                };

                // 🟡 FIX #5: Ensure ID is string for dataTransfer
                el.draggable = true;
                el.ondragstart = (e) => {
                    e.dataTransfer.setData('application/grok-prompt-id', String(p.id));
                    e.dataTransfer.effectAllowed = 'move';
                    el.style.opacity = '0.5';
                };
                el.ondragend = () => {
                    el.style.opacity = '1';
                    // clear highlights
                    this.shadow.querySelectorAll('.drop-target').forEach(e => e.classList.remove('drop-target'));
                };

                el.ondragover = (e) => {
                    e.preventDefault(); // Allow drop
                    e.dataTransfer.dropEffect = 'move';
                    el.style.borderTop = '2px solid var(--gpm-primary)'; // Visual cue
                };
                el.ondragleave = () => {
                    el.style.borderTop = ''; // Revert style
                    // Reverting to original border defined in cssText (1px solid ...)
                    // This direct style manipulation is a bit risky if cssText is static.
                    // Ideally use classes.
                    // But let's restore:
                    el.style.borderTop = ''; // Let cssText priority take over or fallback
                    // Actually el.style.border is set in cssText.
                    // resetting borderTop to '' removes the override, showing original border.
                };

                el.ondrop = (e) => {
                    e.preventDefault();
                    el.style.borderTop = '';
                    const sourceId = e.dataTransfer.getData('application/grok-prompt-id');
                    // 🟡 FIX #5 (continued): Compare as strings
                    if (sourceId && sourceId !== String(p.id)) {
                        if (this.onReorder) this.onReorder(sourceId, String(p.id));
                    }
                };
                // Drop handlers will be on container

                container.appendChild(el);
            });
        }

        // Deprecated: setPrompts is now handled by renderList() via setup()
        setPrompts(prompts, onPromptClick) { /* .. cleaned up .. */ }

        renderModifiers(modifiers, onAdd, onDelete, onClick, onImport, onExport) {
            const container = this.shadow.querySelector('.modifiers-bar');
            if (!container) return;

            // Initialize expansion state if not present
            if (typeof this.isModifiersExpanded === 'undefined') {
                this.isModifiersExpanded = false;
            }

            const isExpanded = this.isModifiersExpanded;
            const expandBtnIcon = isExpanded ? '▲' : '▼';

            container.innerHTML = `
                <div class="gpm-mod-expand" title="展开/收起 (Toggle)" style="
                    padding: 4px 6px; cursor: pointer; color: #888; font-size: 10px;
                    display: flex; align-items: center; justify-content: center;
                    margin-right: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;
                    height: 20px; width: 20px; flex-shrink: 0;
                ">${expandBtnIcon}</div>
                <div class="gpm-mod-scroll" style="
                    display: flex; gap: 4px; flex: 1;
                    overflow-x: ${isExpanded ? 'visible' : 'auto'};
                    flex-wrap: ${isExpanded ? 'wrap' : 'nowrap'};
                    scrollbar-width: none; align-items: center; align-content: flex-start;
                "></div>
            `;

            // Apply container styles based on state
            if (isExpanded) {
                container.style.flexWrap = 'nowrap';
                container.style.height = 'auto';
                container.style.alignItems = 'flex-start';
                container.style.overflowX = 'visible';
            } else {
                container.style.flexWrap = 'nowrap';
                container.style.height = '40px';
                container.style.alignItems = 'center';
                container.style.overflowX = 'hidden';
            }

            const scrollContainer = container.querySelector('.gpm-mod-scroll');
            const expandBtn = container.querySelector('.gpm-mod-expand');

            // Helper to create small action buttons
            const createTinyBtn = (html, title, onClickHandler) => {
                const btn = document.createElement('button');
                btn.className = 'gpm-btn';
                btn.innerHTML = html;
                btn.title = title;
                btn.style.cssText = 'min-width: 24px; padding: 0 4px; font-size: 10px; height: 20px; display: flex; align-items: center; justify-content: center;';
                btn.onclick = onClickHandler;
                return btn;
            };

            // Import Button
            if (onImport) {
                scrollContainer.appendChild(createTinyBtn(ICON_SET.Import, '导入标签 (Import Tags)', onImport));
            }
            // Export Button
            if (onExport) {
                scrollContainer.appendChild(createTinyBtn(ICON_SET.Export, '导出标签 (Export Tags)', onExport));
            }

            // Add Button
            const addBtn = document.createElement('button');
            addBtn.className = 'gpm-btn';
            addBtn.textContent = '+';
            addBtn.style.minWidth = '24px';
            addBtn.onclick = () => {
                const params = prompt('Enter modifier:');
                if (params) onAdd(params);
            };
            scrollContainer.appendChild(addBtn);

            modifiers.forEach(mod => {
                const chip = document.createElement('div');
                chip.textContent = mod;
                chip.className = 'gpm-modifier-chip';

                // Dynamic style based on state
                // If Expanded: allow wrap, height auto, max-width 100%
                // If Collapsed: nowrap, fixed height
                const chipStyle = isExpanded
                    ? `
                        padding: 4px 8px; background: rgba(255,255,255,0.1);
                        border-radius: 12px; font-size: 11px; cursor: pointer;
                        user-select: none; transition: background 0.2s;
                        white-space: normal; word-break: break-word; line-height: 1.3;
                        height: auto; width: auto; max-width: 100%;
                        display: inline-block; margin-bottom: 2px;
                      `
                    : `
                        padding: 2px 8px; background: rgba(255,255,255,0.1);
                        border-radius: 12px; font-size: 11px; cursor: pointer;
                        user-select: none; transition: background 0.2s; white-space: nowrap;
                        height: 20px; display: flex; align-items: center;
                      `;

                chip.style.cssText = chipStyle;

                chip.onclick = (e) => onClick(mod, e.shiftKey);
                chip.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (confirm(`Delete modifier "${mod}"?`)) onDelete(mod);
                };
                scrollContainer.appendChild(chip);
            });

            // Bind Expand Event
            expandBtn.onclick = () => {
                this.isModifiersExpanded = !this.isModifiersExpanded;
                this.renderModifiers(modifiers, onAdd, onDelete, onClick, onImport, onExport);
            };
        }

        showContextMenu(e, prompt) {
            // Use a global ID for the context menu to avoid duplicates across panels
            let menu = document.getElementById('gpm-global-context-menu');
            if (!menu) {
                menu = document.createElement('div');
                menu.id = 'gpm-global-context-menu';
                menu.className = 'gpm-context-menu';
                document.body.appendChild(menu);

                // Global listener to close it
                document.addEventListener('mousedown', (evt) => {
                    if (!menu.contains(evt.target)) {
                        menu.style.display = 'none';
                    }
                });

                // Prevent context menu on the menu itself
                menu.oncontextmenu = (evt) => evt.preventDefault();
            }

            menu.innerHTML = `
                <div class="gpm-context-item" data-action="replace">🔄 替换输入 (Replace Input)</div>
                <div class="gpm-context-item" data-action="append">➕ 追加到输入 (Append Input)</div>
                <div class="gpm-context-item-separator" style="height:1px; background:rgba(255,255,255,0.1); margin:4px 0;"></div>
                <div class="gpm-context-item" data-action="rename">✏️ 重命名 (Rename)</div>
                <div class="gpm-context-item" data-action="edit">📝 编辑内容 (Edit)</div>
                <div class="gpm-context-item" data-action="copy">📋 复制内容 (Copy)</div>
                <div class="gpm-context-item" data-action="pin">${prompt.pinned ? '📍 取消置顶 (Unpin)' : '📌 置顶 (Pin)'}</div>
                <div class="gpm-context-item delete" data-action="delete">🗑️ 删除 (Delete)</div>
            `;

            menu.style.display = 'flex';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';

            // Re-bind actions for this specific prompt
            menu.querySelectorAll('.gpm-context-item').forEach(item => {
                item.onclick = (evt) => {
                    evt.stopPropagation(); // Prevent closing immediately
                    const action = item.dataset.action;
                    if (this.onPromptAction) this.onPromptAction(action, prompt);
                    menu.style.display = 'none';
                };
            });
        }

        // ✨ FEATURE #4: Update batch operation toolbar
        _updateBatchToolbar() {
            let toolbar = this.shadow.querySelector('.gpm-batch-toolbar');

            if (this.selectedPrompts.size === 0) {
                if (toolbar) toolbar.remove();
                return;
            }

            if (!toolbar) {
                toolbar = document.createElement('div');
                toolbar.className = 'gpm-batch-toolbar';
                toolbar.style.cssText = `
                    position: fixed; bottom: 100px; left: 50%;
                    transform: translateX(-50%); z-index: 10002;
                    background: rgba(20, 20, 20, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 12px; padding: 12px 20px;
                    display: flex; gap: 12px; align-items: center;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                `;
                this.shadow.appendChild(toolbar);
            }

            toolbar.innerHTML = `
                <span style="color: white; font-size: 13px; font-weight: bold;">
                    已选择 ${this.selectedPrompts.size} 项
                </span>
                <button class="gpm-btn" data-action="cancel">取消</button>
                <button class="gpm-btn" data-action="delete" style="background: #ff5555;">批量删除</button>
            `;

            // Bind events
            toolbar.querySelector('[data-action="cancel"]').onclick = () => {
                this.selectedPrompts.clear();
                this.renderList();
            };

            toolbar.querySelector('[data-action="delete"]').onclick = () => {
                if (confirm(`确定删除选中的 ${this.selectedPrompts.size} 个提示词？`)) {
                    if (this.onBatchDelete) {
                        this.onBatchDelete(Array.from(this.selectedPrompts));
                        this.selectedPrompts.clear();
                        this._updateBatchToolbar();
                    }
                }
            };
        }

        // ✨ NEW FEATURE: Paste import modal with smart parsing
        _showPasteImportModal() {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100000;
                display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                width: 600px; max-height: 80vh; padding: 20px; display: flex; flex-direction: column; gap: 15px;
                background: rgba(20,20,20,0.95); border: 1px solid rgba(255,255,255,0.2);
                border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); color: white;
            `;

            modal.innerHTML = `
                <h3 style="margin: 0; font-size: 18px;">📋 粘贴导入提示词</h3>
                <div style="font-size: 12px; color: #888; line-height: 1.5;">
                    支持多种格式：<br>
                    • <b>Tab分隔</b>: 标题[Tab]内容 (推荐)<br>
                    • <b>每行一个</b>: 每行作为一个提示词<br>
                    • <b>自动去重</b>: 重复内容会被跳过
                </div>
                <textarea style="
                    flex: 1; min-height: 300px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 6px; color: white; padding: 12px; resize: none; font-family: inherit; font-size: 13px;
                " placeholder="粘贴您的提示词...

示例格式 (Tab分隔):
闪现/掀衣露胸	Flashing boobs, lift shirt
挤胸/胸部挤压	Breast squeeze, pressing breasts

或每行一个:
Flashing boobs, lift shirt, flash tits
Breast squeeze, pressing breasts together"></textarea>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #666;">将导入到当前库</span>
                    <div style="display: flex; gap: 10px;">
                        <button class="cancel-btn" style="padding: 8px 16px; background: rgba(255,255,255,0.1); border: none; border-radius: 6px; color: white; cursor: pointer;">取消</button>
                        <button class="import-btn" style="padding: 8px 16px; background: var(--gpm-primary); border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold;">导入</button>
                    </div>
                </div>
            `;

            const textarea = modal.querySelector('textarea');
            const cancelBtn = modal.querySelector('.cancel-btn');
            const importBtn = modal.querySelector('.import-btn');

            cancelBtn.onclick = () => overlay.remove();
            importBtn.onclick = () => {
                const text = textarea.value.trim();
                if (!text) {
                    alert('请粘贴内容！');
                    return;
                }

                const parsed = this._parseImportText(text);
                if (parsed.length === 0) {
                    alert('未检测到有效内容！');
                    return;
                }

                // Import prompts
                parsed.forEach(item => {
                    if (this.onAddPrompt) {
                        this.onAddPrompt(item.content, item.name);
                    }
                });

                overlay.remove();
                alert(`成功导入 ${parsed.length} 个提示词！`);
            };

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            setTimeout(() => textarea.focus(), 100);
        }

        _parseImportText(text) {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            const results = [];
            const seen = new Set();

            lines.forEach(line => {
                let name = '';
                let content = '';

                // Format 1: Tab-separated (标题\t内容)
                if (line.includes('\t')) {
                    const parts = line.split('\t');
                    const chinesePart = parts[0].trim();
                    const englishPart = parts.slice(1).join(' ').trim();

                    // 🐞 FIX #3: Use Chinese as title, combine both as content
                    name = chinesePart;
                    content = chinesePart + ' ' + englishPart;
                }
                // Format 2: Plain text (每行一个)
                else {
                    content = line;
                    // Extract Chinese as name if exists, otherwise use first 30 chars
                    const chineseMatch = content.match(/[\u4e00-\u9fa5]+/);
                    if (chineseMatch) {
                        name = chineseMatch[0];
                    } else {
                        name = content.slice(0, 30) + (content.length > 30 ? '...' : '');
                    }
                }

                // Dedup check
                if (content && !seen.has(content)) {
                    seen.add(content);
                    results.push({ name, content });
                }
            });

            return results;
        }

        // ✨ FEATURE #5: Pinyin initial extraction helper
        _getPinyinInitials(text) {
            // Simple pinyin initial mapping for common Chinese characters
            const pinyinMap = {
                '赛': 's', '博': 'b', '朋': 'p', '克': 'k',
                '动': 'd', '漫': 'm', '风': 'f', '格': 'g',
                '插': 'c', '画': 'h', '未': 'w', '来': 'l',
                '城': 'c', '市': 's', '夜': 'y', '景': 'j',
                '史': 's', '诗': 's', '级': 'j', '幻': 'h',
                '巨': 'j', '龙': 'l', '北': 'b', '欧': 'o',
                '简': 'j', '约': 'y', '室': 's', '内': 'n',
                '设': 's', '计': 'j', '皮': 'p', '卡': 'k',
                '丘': 'q', '通': 't', '角': 'j', '色': 's',
                '复': 'f', '古': 'g', '胶': 'j', '片': 'p',
                '拍': 'p', '摄': 's', '抽': 'c', '象': 'x',
                '几': 'j', '何': 'h', '艺': 'y', '术': 's',
                '美': 'm', '食': 's', '摄': 's', '影': 'y',
                '超': 'c', '现': 'x', '实': 's', '梦': 'm',
                '境': 'j', '年': 'n', '轻': 'q', '女': 'n',
                '性': 'x', '长': 'c', '发': 'f', '柔': 'r',
                '和': 'h',
            };

            let initials = '';
            for (let char of text) {
                if (pinyinMap[char]) {
                    initials += pinyinMap[char];
                } else if (/[a-zA-Z]/.test(char)) {
                    initials += char.toLowerCase();
                }
            }
            return initials;
        }
    }


    /**
     * BottomPanel Component (Draft)
     */
    class BottomPanel extends Component {
        constructor(styleManager) {
            super(styleManager);
        }

        renderInternal() {
            this.render(`
                <div class="gpm-panel bottom-panel" style="
                    position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
                    width: 600px; height: 300px; z-index: 10001; display: none;
                    flex-direction: column;
                ">
                    <div class="bp-header" style="
                        padding: 8px 12px; background: rgba(255,255,255,0.05);
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                        display: flex; justify-content: space-between; align-items: center;
                        cursor: move;
                    ">
                        <div class="bp-tabs" style="display: flex; gap: 10px;">
                            <span class="bp-tab active" data-tab="draft" style="cursor:pointer; font-weight:bold; border-bottom: 2px solid white;">📝 草稿 (Draft)</span>
                            <span class="bp-tab" data-tab="history" style="cursor:pointer; color: #888;">📜 历史 (History)</span>
                        </div>
                        <button class="gpm-btn close-btn">×</button>
                    </div>

                    <!-- Draft Content -->
                    <div class="bp-content" id="tab-draft" style="flex: 1; padding: 10px; display: flex; flex-direction: column;">
                        <textarea style="
                            flex: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 6px; color: white; padding: 8px; resize: none; font-family: inherit;
                        " placeholder="Enter prompt here..."></textarea>
                        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
                            <button class="gpm-btn copy-btn">复制 (Copy)</button>
                            <button class="gpm-btn clear-btn">清空 (Clear)</button>
                            <button class="gpm-btn primary send-btn">发送 (Send)</button>
                        </div>
                    </div>

                    <!-- History Content -->
                    <div class="bp-content" id="tab-history" style="flex: 1; padding: 0; display: none; flex-direction: column; overflow-y: auto;">
                        <div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                             <span style="font-size: 11px; color: #666;">最近 100 条记录</span>
                             <label style="font-size: 11px; color: #aaa; display: flex; align-items: center; gap: 4px; cursor: pointer; user-select: none;">
                                 <input type="checkbox" id="history-filter-random" checked style="cursor: pointer;"> 包含随机 (Random)
                             </label>
                        </div>
                        <div id="history-list" style="padding: 10px; display: flex; flex-direction: column; gap: 8px;"></div>
                    </div>

                    <!-- Resize Handle -->
                    <div class="gpm-resize-handle bp-resize" style="
                        right: 0;
                        cursor: nwse-resize;
                    "></div>
                </div>
            `);
        }

        afterRender() {
            const panel = this.shadow.querySelector('.bottom-panel');
            const closeBtn = this.shadow.querySelector('.close-btn');

            this.show = () => {
                panel.style.display = 'flex';

                // 🟡 FIX #4: Only sync from input when draft is empty
                const draftContent = this.getText();
                if (this.inputManager && !draftContent.trim()) {
                    const currentVal = this.inputManager.getValue();
                    if (currentVal) this.setText(currentVal);
                }
            };
            this.hide = () => {
                panel.style.display = 'none';
                // User Request: Disable auto-sync to input on close. Manual only.
            };
            this.toggle = () => { panel.style.display === 'none' ? this.show() : this.hide(); };

            closeBtn.onclick = () => this.hide();

            // Tab Logic
            const tabs = this.shadow.querySelectorAll('.bp-tab');
            tabs.forEach(tab => {
                tab.onclick = () => {
                    // Update UI
                    tabs.forEach(t => {
                        t.classList.remove('active');
                        t.style.fontWeight = 'normal';
                        t.style.borderBottom = 'none';
                        t.style.color = '#888';
                    });
                    tab.classList.add('active');
                    tab.style.fontWeight = 'bold';
                    tab.style.borderBottom = '2px solid white';
                    tab.style.color = 'white';

                    const targetId = tab.dataset.tab;
                    this.shadow.querySelectorAll('.bp-content').forEach(c => c.style.display = 'none');
                    const targetContent = this.shadow.getElementById(`tab-${targetId}`);
                    if (targetContent) {
                        targetContent.style.display = 'flex';
                    }

                        if (targetId === 'history' && this.onHistoryReq) {
                            this.onHistoryReq();
                        }
                    };
                });

                // Bind Filter
                const filterCheck = this.shadow.querySelector('#history-filter-random');
                if (filterCheck) {
                    filterCheck.onchange = () => {
                         if (this.onHistoryReq) this.onHistoryReq();
                    };
                }

                const textarea = this.shadow.querySelector('textarea');
            const placeholder = textarea.placeholder;

            // ✨ FEATURE #3: Auto-save draft to localStorage
            this._autoSaveTimer = null;
            const DRAFT_KEY = 'gpm_draft_autosave';

            const autoSave = () => {
                clearTimeout(this._autoSaveTimer);
                this._autoSaveTimer = setTimeout(() => {
                    const content = textarea.value;
                    if (content.trim()) {
                        localStorage.setItem(DRAFT_KEY, JSON.stringify({
                            content: content,
                            timestamp: Date.now()
                        }));
                    }
                }, 3000); // 3 second debounce
            };

            // Restore last draft on open
            const restoreLastDraft = () => {
                try {
                    const saved = localStorage.getItem(DRAFT_KEY);
                    if (saved && !textarea.value.trim()) {
                        const data = JSON.parse(saved);
                        const age = Date.now() - data.timestamp;
                        // Only restore if less than 24 hours old
                        if (age < 24 * 60 * 60 * 1000) {
                            textarea.value = data.content;
                            // Show subtle notification
                            const notice = document.createElement('div');
                            notice.textContent = '已恢复上次草稿 (Draft restored)';
                            notice.style.cssText = `
                                position: absolute; top: 10px; right: 10px;
                                padding: 6px 12px; background: rgba(29, 155, 240, 0.9);
                                color: white; border-radius: 4px; font-size: 11px;
                                z-index: 10; pointer-events: none;
                            `;

                            panel.appendChild(notice);
                            setTimeout(() => notice.remove(), 3000);
                        }
                    }
                } catch (e) {
                    console.warn('[GPM] Failed to restore draft:', e);
                }
            };

            // Call restore when panel opens
            const originalShow = this.show;
            this.show = () => {
                originalShow();
                setTimeout(restoreLastDraft, 100);
            };

            // Bind auto-save to input
            textarea.oninput = autoSave;

            // Enter to Send
            textarea.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (this.onSend) {
                        this.onSend(textarea.value);
                    }
                }
            };

            // Buttons
            const clearBtn = this.shadow.querySelector('.clear-btn');
            const sendBtn = this.shadow.querySelector('.send-btn');
            const copyBtn = this.shadow.querySelector('.copy-btn');

            if (copyBtn) {
                copyBtn.onclick = () => {
                    const text = textarea.value;
                    if (!text) return;
                    navigator.clipboard.writeText(text).then(() => {
                        const originalText = copyBtn.textContent;
                        copyBtn.textContent = '已复制! (Copied)';
                        copyBtn.style.background = 'var(--gpm-success, #00ba7c)';
                        copyBtn.style.color = 'white';
                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                            copyBtn.style.background = ''; // Revert
                            copyBtn.style.color = '';
                        }, 1500);
                    });
                };
            }

            if (clearBtn) {
                clearBtn.onclick = () => {
                    if (confirm('Clear draft?')) {
                        textarea.value = '';
                    }
                };
            }

            if (sendBtn) {
                sendBtn.onclick = () => {
                    if (this.onSend) {
                        this.onSend(this.getText());
                    }
                };
            }

            // Drag Logic
            const header = this.shadow.querySelector('.bp-header');
            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            header.onmousedown = (e) => {
                if (e.target === closeBtn) return;
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = panel.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;

                // Remove transform centering once moved
                panel.style.transform = 'none';
                panel.style.left = initialLeft + 'px';
                panel.style.top = initialTop + 'px';

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            };

            const onMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                panel.style.left = (initialLeft + dx) + 'px';
                panel.style.top = (initialTop + dy) + 'px';
            };

            const onUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);

                // ✨ Persistence: Save position
                if (this.onStateChange) {
                    const rect = panel.getBoundingClientRect();
                    const state = { top: rect.top };
                    if (this.side === 'left') state.left = rect.left;
                    if (this.side === 'right') state.right = document.documentElement.clientWidth - rect.right;
                    this.onStateChange(state);
                }
            };

            // Resize Logic
            const resizer = this.shadow.querySelector('.bp-resize');
            let isResizing = false;
            let startW, startH;

            resizer.onmousedown = (e) => {
                e.stopPropagation();
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startW = panel.offsetWidth;
                startH = panel.offsetHeight;

                document.addEventListener('mousemove', onResize);
                document.addEventListener('mouseup', onResizeUp);
            };

            const onResize = (e) => {
                if (!isResizing) return;
                const w = startW + (e.clientX - startX);
                const h = startH + (e.clientY - startY);
                panel.style.width = w + 'px';
                panel.style.height = h + 'px';
            };


            const onResizeUp = () => {
                isResizing = false;
                document.removeEventListener('mousemove', onResize);
                document.removeEventListener('mouseup', onResizeUp);

                // ✨ Persistence: Save size
                if (this.onStateChange) {
                    this.onStateChange({
                        width: panel.offsetWidth,
                        height: panel.offsetHeight
                    });
                }
            };
        }

        setInputManager(manager) {
            this.inputManager = manager;
        }

        setText(text) {
            const textarea = this.shadow.querySelector('textarea');
            if (textarea) textarea.value = text;

            // Auto-switch to Draft tab
            this.focusDraft();
        }

        smartReplace(text) {
            const textarea = this.shadow.querySelector('textarea');
            if (textarea) {
                if (textarea.selectionStart !== textarea.selectionEnd) {
                    // Has selection -> Replace only selection
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const val = textarea.value;
                    textarea.value = val.substring(0, start) + text + val.substring(end);
                    textarea.selectionStart = textarea.selectionEnd = start + text.length;
                    textarea.focus();
                } else {
                    // No selection -> Replace All
                    textarea.value = text;
                }
            }
            this.focusDraft();
        }

        focusDraft() {
             const draftTab = this.shadow.querySelector('.bp-tab[data-tab="draft"]');
             if (draftTab) draftTab.click();
        }

        insertText(text) {
            const textarea = this.shadow.querySelector('textarea');
            if (textarea) {
                const start = textarea.selectionStart || 0;
                const end = textarea.selectionEnd || 0;
                const value = textarea.value;
                const newValue = value.substring(0, start) + ' ' + text + value.substring(end); // Add space? User said "Append". Usually implies space. But if cursor is manual, maybe raw insert?
                // User said "Insert at cursor", implies exact insertion.
                // However, previous logic was `getText() + ' ' + content`.
                // If I insert at cursor, I should probably respect spacing if needed, but strict insertion is safer.
                // Let's add a space if the previous char is not whitespace?
                // For simplicity, just insert `text`. Users can manage spaces.
                // actually, for prompts, a leading space is usually desired if not at start.

                // Let's do a simple space check
                const pre = value.substring(0, start);
                const toInsert = (pre.length > 0 && !/\s$/.test(pre)) ? ' ' + text : text;

                textarea.value = value.substring(0, start) + toInsert + value.substring(end);

                const newPos = start + toInsert.length;
                textarea.selectionStart = newPos;
                textarea.selectionEnd = newPos;
                textarea.focus();
            }
            // Auto-switch to Draft tab
            const draftTab = this.shadow.querySelector('.bp-tab[data-tab="draft"]');
            if (draftTab) draftTab.click();
        }

        getText() {
            const textarea = this.shadow.querySelector('textarea');
            return textarea ? textarea.value : '';
        }

        setOnSend(callback) {
            this.onSend = callback;
        }

        setOnHistoryReq(callback) {
            this.onHistoryReq = callback;
        }

        setOnRandomHistoryReq(callback) {
            this.onRandomHistoryReq = callback;
        }

        setHistory(items) {
            const list = this.shadow.getElementById('history-list');
            if (!list) return;
            list.innerHTML = '';

            if (items.length === 0) {
                list.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">暂无历史 (No History)</div>';
                return;
            }

            items.forEach(item => {
                const el = document.createElement('div');
                el.style.cssText = `
                    padding: 10px; background: rgba(255,255,255,0.05);
                    border-radius: 6px; font-size: 13px; cursor: pointer;
                    border: 1px solid rgba(255,255,255,0.05);
                    transition: background 0.2s;
                `;
                el.innerHTML = `
                    <div style="font-weight:bold; margin-bottom:4px; opacity:0.6; font-size:11px;">
                        ${new Date(item.time).toLocaleString()}
                    </div>
                    <div style="color: #eee; line-height: 1.4; word-break: break-all;">${item.text}</div>
                `;
                el.onmouseenter = () => el.style.background = 'rgba(255,255,255,0.1)';
                el.onmouseleave = () => el.style.background = 'rgba(255,255,255,0.05)';
                el.onclick = () => {
                    this.setText(item.text);
                    // Switch back to draft
                    this.shadow.querySelector('.bp-tab[data-tab="draft"]').click();
                };
                list.appendChild(el);
            });
        }

        setRandomHistory(items) {
            const list = this.shadow.getElementById('random-history-list');
            if (!list) return;
            list.innerHTML = '';

            if (items.length === 0) {
                list.innerHTML = '<div style="text-align:center; color:#666; padding:20px;">暂无随机记录 (No Random History)</div>';
                return;
            }

            items.forEach(item => {
                const el = document.createElement('div');
                el.style.cssText = `
                    padding: 10px; background: rgba(255,255,255,0.05);
                    border-radius: 6px; font-size: 13px; cursor: pointer;
                    border: 1px solid rgba(255,255,255,0.05);
                    transition: background 0.2s; position: relative;
                `;

                // Source Badge
                const sourceBadge = item.source ?
                    `<span style="background:rgba(29, 155, 240, 0.2); color:#1d9bf0; padding:2px 6px; border-radius:3px; margin-left:6px;">${item.source}</span>` : '';

                el.innerHTML = `
                    <div style="font-weight:bold; margin-bottom:4px; opacity:0.6; font-size:11px; display:flex; justify-content:space-between;">
                        <span>${new Date(item.time).toLocaleString()}</span>
                        ${sourceBadge}
                    </div>
                    <div style="color: #eee; line-height: 1.4; word-break: break-all;">${item.text}</div>
                `;
                el.onmouseenter = () => el.style.background = 'rgba(255,255,255,0.1)';
                el.onmouseleave = () => el.style.background = 'rgba(255,255,255,0.05)';
                el.onclick = () => {
                    this.setText(item.text);
                    this.shadow.querySelector('.bp-tab[data-tab="draft"]').click();
                };
                list.appendChild(el);
            });
        }
    }




    /**
     * AutoRetryManager (Ported from v1.2.0)
     */
    class AutoRetryManager {
        constructor() {
            // 默认开启自动重试功能（只有明确设置为 "0" 时才关闭）
            this.autoRedo = localStorage.getItem("grok-auto-redo") !== "0";
            // 默认开启自动修复提示词
            this.fixPrompt = localStorage.getItem("grok-fix-prompt") !== "0";
            this.maxRetryLimit = Number(localStorage.getItem("grok-max-retry-limit") || 5);
            this.lastTypedPrompt = localStorage.getItem("grok-last-typed-prompt") || "";

            // 批量生成视频相关（默认开启）
            this.batchVideoEnabled = localStorage.getItem("grok-batch-video") !== "0";
            this.isBatchGenerating = false;

            this.currentImageId = null;
            this.retryCount = 0;
            this.isRetrying = false;
            this.panel = null;

            // Styles
            this.addStyles();
        }

        addStyles() {
            if (document.getElementById('gpm-retry-styles')) return;
            const style = document.createElement('style');
            style.id = 'gpm-retry-styles';
            style.textContent = `
                @keyframes grokRetryBreathe {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(0.95); }
                }
                .grok-retry-breathing {
                    animation: grokRetryBreathe 2s ease-in-out infinite;
                }
                .gpm-retry-panel {
                    position: fixed; top: 100px; right: 20px;
                    background: rgba(20, 20, 20, 0.6); /* Glassmorphism base */
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    color: white; padding: 16px; border-radius: 16px;
                    font-size: 13px; z-index: 999999;
                    width: 280px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.1);
                    display: none; flex-direction: column; gap: 12px;
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }
                .gpm-retry-row { display: flex; align-items: center; justify-content: space-between; }
                .gpm-retry-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
                .gpm-retry-input {
                    width: 50px; padding: 4px 8px; border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: rgba(0,0,0,0.3); color: white; text-align: center;
                }
            `;
            document.head.appendChild(style);
        }

        init() {
            this.createPanel();
            this.attachPromptListeners();
            this.checkImageIdChange();

            // Observe Moderation
            let isChecking = false;
            let lastAttachTime = 0;

            const observer = new MutationObserver(() => {
                if (isChecking) return;
                isChecking = true;
                setTimeout(() => {
                    this.checkModerationPopup();

                    const now = Date.now();
                    if (now - lastAttachTime > 3000) {
                        this.attachPromptListeners();
                        lastAttachTime = now;
                    }
                    isChecking = false;
                }, 500);
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // URL Monitor
            let lastUrl = location.href;
            setInterval(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    this.checkImageIdChange();
                    this.attachPromptListeners();
                    this.checkVisibility(); // Favorites hiding
                }
            }, 1000);

            this.checkVisibility();
        }

        checkVisibility() {
            // Hide on favorites page
            if (location.pathname.includes('/imagine/favorites')) {
                if (this.panel) this.panel.style.display = 'none';
            }
        }

        saveSettings() {
            localStorage.setItem("grok-auto-redo", this.autoRedo ? "1" : "0");
            localStorage.setItem("grok-fix-prompt", this.fixPrompt ? "1" : "0");
            localStorage.setItem("grok-max-retry-limit", this.maxRetryLimit);
        }

        checkImageIdChange() {
            const match = location.pathname.match(/^\/imagine\/([^\/]+)/);
            const imageId = match ? match[1] : null;
            if (imageId !== this.currentImageId) {
                this.currentImageId = imageId;
                this.retryCount = 0;
                this.updatePanel();
            }
        }

        createPanel() {
            if (this.panel) return;
            this.panel = document.createElement('div');
            this.panel.className = 'gpm-retry-panel';
            document.body.appendChild(this.panel);
            this.panel.style.display = 'none'; // 🔴 FIX: Explicitly set initial state to match toggle logic
            this.updatePanel();
        }

        hide() {
            if (this.panel) this.panel.style.display = 'none';
        }

        togglePanel(anchorElement) {
            if (!this.panel) this.createPanel();

            // Toggle logic
            const isHidden = this.panel.style.display === 'none';

            if (!isHidden) {
                // Closing
                this.panel.style.display = 'none';
                return;
            }

            // Opening
            this.panel.style.display = 'flex';

            if (anchorElement) {
                // Determine width first (render invisible)
                this.panel.style.visibility = 'hidden';
                const panelRect = this.panel.getBoundingClientRect();
                const rect = anchorElement.getBoundingClientRect();

                // Position to the left of anchor
                const left = rect.left - panelRect.width - 10;
                const top = rect.top;

                this.panel.style.top = top + 'px';
                this.panel.style.left = left + 'px';
                this.panel.style.right = 'auto'; // Reset right
                this.panel.style.visibility = ''; // Show
            }
        }

        updatePanel() {
            if (!this.panel) return;

            // Status Icon State
            const statusIcon = this.retryCount > 0 && this.autoRedo ? 'grok-retry-breathing' : '';

            this.panel.innerHTML = `
                <div class="gpm-retry-row" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                    <div style="font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        <span class="${statusIcon}" style="font-size: 16px;">🔄</span>
                        <span>自动重试 (Auto Retry)</span>
                    </div>
                    <span style="font-family: monospace; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">
                        ${this.retryCount} / ${this.maxRetryLimit}
                    </span>
                </div>

                <label class="gpm-retry-checkbox">
                    <input type="checkbox" id="gpm-chk-redo" ${this.autoRedo ? 'checked' : ''}>
                    <span>启用自动重试 (Enable)</span>
                </label>

                <label class="gpm-retry-checkbox">
                    <input type="checkbox" id="gpm-chk-fix" ${this.fixPrompt ? 'checked' : ''}>
                    <span>自动修复提示词 (Auto Fix)</span>
                </label>

                <div class="gpm-retry-row">
                    <span>最大尝试 (Max Tries):</span>
                    <input type="number" id="gpm-input-limit" class="gpm-retry-input" value="${this.maxRetryLimit}" min="1" max="20">
                </div>

                <button id="gpm-btn-reset" class="gpm-btn" style="width: 100%; margin-top: 4px; justify-content: center;">
                    重置计数 (Reset Count)
                </button>

                <div style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 8px; padding-top: 8px;">
                    <label class="gpm-retry-checkbox">
                        <input type="checkbox" id="gpm-chk-batch" ${this.batchVideoEnabled ? 'checked' : ''}>
                        <span>🎬 批量生成视频</span>
                    </label>

                    <button id="gpm-btn-batch-all" class="gpm-btn" style="width: 100%; margin-top: 4px; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;" ${!this.batchVideoEnabled || this.isBatchGenerating ? 'disabled' : ''}>
                        ${this.isBatchGenerating ? '⏳ 生成中...' : '🎬 一键生成全部'}
                    </button>
                </div>
            `;

            // Bind Events
            this.panel.querySelector('#gpm-chk-redo').onchange = (e) => {
                this.autoRedo = e.target.checked;
                if (this.autoRedo) this.retryCount = 0;
                this.saveSettings();
                this.updatePanel();
            };
            this.panel.querySelector('#gpm-chk-fix').onchange = (e) => {
                this.fixPrompt = e.target.checked;
                this.saveSettings();
            };
            this.panel.querySelector('#gpm-input-limit').onchange = (e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= 50) {
                    this.maxRetryLimit = val;
                    this.saveSettings();
                    this.updatePanel();
                }
            };
            this.panel.querySelector('#gpm-btn-reset').onclick = () => {
                this.retryCount = 0;
                this.updatePanel();
            };

            // 批量生成视频事件
            const batchCheckbox = this.panel.querySelector('#gpm-chk-batch');
            const batchButton = this.panel.querySelector('#gpm-btn-batch-all');

            if (batchCheckbox) {
                batchCheckbox.onchange = (e) => {
                    this.batchVideoEnabled = e.target.checked;
                    localStorage.setItem("grok-batch-video", e.target.checked ? "1" : "0");
                    this.updatePanel();
                };
            }

            if (batchButton) {
                batchButton.onclick = () => {
                    this.startBatchGeneration();
                };
            }
        }

        // --- Logic ---

        deepQuery(selector, root = document) {
            let results = [];
            const traverse = (node) => {
                if (!node) return;
                if (node.querySelectorAll) results.push(...node.querySelectorAll(selector));
                if (node.shadowRoot) {
                    results.push(...node.shadowRoot.querySelectorAll(selector));
                    node.shadowRoot.childNodes.forEach(traverse);
                }
                node.childNodes?.forEach(traverse);
            };
            traverse(root);
            return results;
        }

        attachPromptListeners() {
            const textarea = this.deepQuery("textarea")[0];
            if (!textarea || textarea.dataset.gpmListener) return;

            textarea.dataset.gpmListener = "1";
            const save = () => {
                if (textarea.value && textarea.value.trim()) {
                    this.lastTypedPrompt = textarea.value;
                    localStorage.setItem("grok-last-typed-prompt", this.lastTypedPrompt);
                }
            };

            textarea.addEventListener("input", save);
            textarea.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) save();
            });
        }

        checkModerationPopup() {
            if (!this.autoRedo || this.isRetrying) return;

            if (this.retryCount + 1 >= this.maxRetryLimit) {
                // Limit reached
                this.retryCount++;
                this.autoRedo = false;
                this.saveSettings();
                this.updatePanel();
                console.log("🛑 Max retry reached");
                return;
            }

            const toasts = this.deepQuery('li[data-sonner-toast][data-type="error"][data-visible="true"]');
            if (toasts.length === 0) return;

            console.log("⚠️ Moderation error detected");

            if (this.fixPrompt) this.fixPromptContent();
            this.clickRedo();
        }

        fixPromptContent() {
            const textarea = this.deepQuery("textarea")[0];
            if (!textarea) return;

            let txt = textarea.value || this.lastTypedPrompt;
            if (!txt) return;

            const map = {
                "nude": "wearing swimsuit", "naked": "partially clothed",
                "sex": "romantic", "sexual": "romantic",
                "kill": "defeat", "blood": "red liquid",
                "violent": "intense", "gun": "device",
                "drug": "substance", "illegal": "prohibited"
            };

            Object.keys(map).forEach(k => {
                const re = new RegExp("\\b" + k + "\\b", "gi");
                txt = txt.replace(re, map[k]);
            });

            this.lastTypedPrompt = txt;
            localStorage.setItem("grok-last-typed-prompt", txt);

            textarea.value = txt;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }

        clickRedo() {
            if (this.isRetrying) return;
            this.isRetrying = true;

            // Restore prompt
            const textarea = this.deepQuery("textarea")[0];
            if (textarea && this.lastTypedPrompt) {
                textarea.value = this.lastTypedPrompt;
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
            }

            // Find Redo/Submit
            // We need a robust finder.
            let redoBtn = null;
            const container = textarea ? textarea.closest("div") : null;
            if (container) {
                const buttons = container.querySelectorAll("button");
                // Look for the filled primitive button usually used for submit
                // or just the last button
                for (const btn of buttons) {
                    if (btn.className.includes("bg-button-filled")) { redoBtn = btn; break; }
                    if (btn.getAttribute("data-slot") === "button") { redoBtn = btn; break; }
                }
                if (!redoBtn && buttons.length > 0) redoBtn = buttons[buttons.length - 1];
            }

            if (!redoBtn) {
                console.log("❌ Redo button not found");
                // this.autoRedo = false; // 🔴 Removed: Do not auto-disable
                // this.saveSettings();
                this.updatePanel();
                this.isRetrying = false;
                return;
            }

            console.log("🔄 Retrying in 1s...");
            setTimeout(() => {
                redoBtn.click();
                this.retryCount++;
                this.updatePanel();
                setTimeout(() => { this.isRetrying = false; }, 1500);
            }, 1000);
        }

        // 批量生成视频
        async startBatchGeneration() {
            if (this.isBatchGenerating) {
                alert('批量生成正在进行中，请稍候...');
                return;
            }

            // 查找所有可见范围内的"生成视频"按钮
            const buttons = Array.from(document.querySelectorAll('button[aria-label="生成视频"]'));
            const visibleButtons = buttons.filter(btn => {
                const rect = btn.getBoundingClientRect();
                // 检查是否在可见范围内
                return rect.top >= 0 &&
                       rect.left >= 0 &&
                       rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                       rect.right <= (window.innerWidth || document.documentElement.clientWidth) &&
                       rect.width > 0 &&
                       rect.height > 0 &&
                       !btn.disabled;
            });

            if (visibleButtons.length === 0) {
                alert('当前可见范围内未找到可生成视频的按钮！\n\n提示：\n- 请滚动页面查看更多图片\n- 确保在收藏页面');
                return;
            }

            const confirmed = confirm(`找到 ${visibleButtons.length} 个可见的"生成视频"按钮。\n\n是否立即全部生成？\n\n注意：\n- 每个视频间隔 2 秒\n- 可能消耗大量配额`);

            if (!confirmed) return;

            this.isBatchGenerating = true;
            this.updatePanel();

            console.log(`[批量生成] 开始处理 ${visibleButtons.length} 个视频`);

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < visibleButtons.length; i++) {
                if (!this.isBatchGenerating) { // 🛑 SAFETY: Stop if user cancelled (closed panel)
                    console.log('[批量生成] 用户中止操作');
                    break;
                }
                try {
                    const btn = visibleButtons[i];

                    // 滚动到按钮位置
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(r => setTimeout(r, 500));

                    // 点击按钮
                    btn.click();
                    successCount++;

                    console.log(`[批量生成] 已点击 ${i + 1}/${visibleButtons.length}`);

                    // 延迟 2 秒避免限流
                    await new Promise(r => setTimeout(r, 2000));

                } catch (error) {
                    console.error(`[批量生成] 处理第 ${i + 1} 个按钮时出错:`, error);
                    failCount++;
                }
            }

            this.isBatchGenerating = false;
            this.updatePanel();

            alert(`✅ 批量生成完成！\n\n成功: ${successCount}\n失败: ${failCount}\n总计: ${visibleButtons.length}`);
            console.log(`[批量生成] 完成！成功: ${successCount}, 失败: ${failCount}`);
        }
    }


    /**
     * Main App Entry Point
     */
    class App {
        constructor() {
            this.storage = new StorageService();
            this.styles = new StyleManager();
            this.inputManager = new InputManager();
            this.autoRetryManager = new AutoRetryManager();
            this.autoUpscale = new GrokAutoUpscale(); // 📺 Auto Upscale

            // ✨ CRITICAL: Expose to global for SidePanel UI binding
            window.upscaleManager = this.autoUpscale;

            this.init();
        }

        showToast(message, duration = 3000, type = 'info') {
            const toast = document.createElement('div');
            toast.textContent = message;

            // 🔧 防止Toast抢占焦点
            toast.tabIndex = -1;  // 禁止通过Tab键访问
            toast.setAttribute('aria-hidden', 'true');  // 对屏幕阅读器隐藏
            toast.setAttribute('role', 'status');  // 语义化标记（不会打断用户）

            // 根据类型选择颜色
            const colors = {
                success: 'rgba(0, 186, 124, 0.95)',  // 绿色 - 成功
                error: 'rgba(255, 77, 79, 0.95)',    // 红色 - 错误
                warning: 'rgba(255, 159, 67, 0.95)', // 橙色 - 警告
                info: 'rgba(99, 102, 241, 0.95)'     // 靛蓝 - 信息（保持文艺感）
            };

            Object.assign(toast.style, {
               position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: colors[type] || colors.info,
                color: 'white',
                padding: '12px 24px',
                borderRadius: '12px',  // 更圆润，更现代
                zIndex: '100000',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
                pointerEvents: 'none',
                opacity: '0',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(8px)',  // 毛玻璃效果
                border: '1px solid rgba(255,255,255,0.2)'
            });

            document.body.appendChild(toast);

            // Animate In
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0)';
            });

            // Auto Remove
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(-10px)';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        init() {
            console.log('[GPM v5.0.3] Initializing...');
            this.container = document.createElement('div');
            this.container.id = APP_ID;
            document.body.appendChild(this.container);

            this.autoRetryManager.init();

            // Special Mode for x.com/home (Lite Mode) - Exclude Grok interface
            // 🟡 FIX #6: More precise Grok detection
            // const isGrok = window.location.pathname.includes('/i/grok') ||
            //    window.location.hostname === 'grok.com';
            //
            // Lite Mode Removed: Unifying startup logic for full integration


            // ✨ FEATURE #1: Global keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Ignore if user is typing in input/textarea (except our own)
                const target = e.target;
                const isOurElement = target.closest && target.closest('#' + APP_ID); // 🛡️ Fix hardcoded ID
                if (!isOurElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                    return;
                }

                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const modifier = isMac ? e.metaKey : e.ctrlKey;

                // Ctrl/Cmd + K: Toggle draft panel
                if (modifier && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    if (this.bottomPanel) {
                        this.bottomPanel.toggle();
                    }
                }

                // Ctrl/Cmd + F: Focus search (left panel)
                if (modifier && e.key.toLowerCase() === 'f') {
                    e.preventDefault();
                    const searchInput = this.leftPanel?.shadow.querySelector('.search-input');
                    if (searchInput) {
                        this.leftPanel.show();
                        searchInput.focus();
                    }
                }

                // Esc: Close all panels
                if (e.key === 'Escape') {
                    this.leftPanel?.hide();
                    this.rightPanel?.hide();
                    this.bottomPanel?.hide();
                }
            });

            // Normal Mode (Grok / Full AGI)
            // Mount Panels
            const data = this.storage.get(); // Get latest config
            const pSettings = data.settings?.panels || {};

            // Left
            const leftCfg = pSettings.left || { width: 300, top: 80, left: 20 };
            this.leftPanel = new SidePanel(this.styles, {
                side: 'left',
                ...leftCfg,
                onStateChange: (newState) => this.savePanelState('left', newState),
                onRecordHistory: (text, source) => this.addToHistory(text, source) // ✨ Smart Route inside addToHistory
            });
            this.leftPanel.renderInternal();
            this.leftPanel.mount(this.container);

            // Right
            const rightCfg = pSettings.right || { width: 300, top: 80, right: 20 };
            this.rightPanel = new SidePanel(this.styles, {
                side: 'right',
                ...rightCfg,
                onStateChange: (newState) => this.savePanelState('right', newState),
                onHDToggle: () => this.autoUpscale.toggle(), // 📺 HD Switch
                onRecordHistory: (text, source) => this.addToHistory(text, source) // ✨ Smart Route inside addToHistory
            });
            this.rightPanel.renderInternal();
            this.rightPanel.mount(this.container);

            this.bottomPanel = new BottomPanel(this.styles);
            this.bottomPanel.renderInternal();
            this.bottomPanel.mount(this.container);

            // Bottom Panel Persistence
            const bottomCfg = pSettings.bottom || {};
            const bpEl = this.bottomPanel.shadow.querySelector('.bottom-panel');
            if (bpEl && bottomCfg) {
                if (bottomCfg.top) bpEl.style.top = bottomCfg.top + 'px';
                if (bottomCfg.left) bpEl.style.left = bottomCfg.left + 'px';
                if (bottomCfg.width) bpEl.style.width = bottomCfg.width + 'px';
                if (bottomCfg.height) bpEl.style.height = bottomCfg.height + 'px';
                if (bottomCfg.left || bottomCfg.top) bpEl.style.transform = 'none';
            }
            this.bottomPanel.onStateChange = (newState) => this.savePanelState('bottom', newState);

            this.bottomPanel.setInputManager(this.inputManager);

            // Bind Send Action (Blue Button in Draft Panel)
            this.bottomPanel.setOnSend((text) => {
                if (!text) {
                    this.showToast('内容为空');
                    return;
                }

                this.inputManager.insert(text);

                // Auto Submit logic (User Request: "automatically send operation")
                setTimeout(() => {
                    const submitted = this.inputManager.submit();
                    if (submitted) {
                        this.showToast('已写入并发送 (Sent)');
                        this.bottomPanel.setText(''); // Clear draft on success
                        this.bottomPanel.hide(); // Auto Close
                    } else {
                        this.showToast('已写入输入框 (Inserted)');
                    }
                }, 100); // Small delay to ensure React state updates

                this.addToHistory(text);
            });

            this.bottomPanel.setOnHistoryReq(() => {
                const data = this.storage.get();
                this.bottomPanel.setHistory(data.history || []);
            });





            this.loadLibraryData();
            this.renderToggle();

            // ✨ Monitor Panel Visibility (Hide on Favorites)
            this.checkGlobalVisibility();
            setInterval(() => this.checkGlobalVisibility(), 1000);
        }

        checkGlobalVisibility() {
            const path = location.pathname;
            const isImagineArea = path.startsWith('/imagine');
            const isFavorites = path.includes('/imagine/favorites');
            const isPostDetail = path.startsWith('/imagine/post/');
            const isHome = path === '/';

            // Reset triggers on navigation
            if (this._lastPath !== path) {
                this._lastPath = path;
                this._hasAutoHidden = false;
                this._hasRestored = false;
            }

            // ✨ 场景 1: 收藏页 - 完全隐藏所有面板（沉浸式浏览）
            if (isFavorites) {
                if (!this._hasAutoHidden) {
                    this._hasAutoHidden = true;
                    console.log('[GPM] Favorites: Auto-hiding all panels');
                    if (this.leftPanel) this.leftPanel.hide(false);
                    if (this.rightPanel) this.rightPanel.hide(false);
                    if (this.bottomPanel) this.bottomPanel.hide();
                }
                return;
            }

            // ✨ 场景 2: 首页 - 默认隐藏，用户可手动展开
            if (isHome) {
                if (!this._hasAutoHidden) {
                    this._hasAutoHidden = true;
                    console.log('[GPM] Home: Auto-hiding panels (clean start)');
                    if (this.leftPanel) this.leftPanel.hide(false);
                    if (this.rightPanel) this.rightPanel.hide(false);
                    if (this.bottomPanel) this.bottomPanel.hide();
                }
                return;
            }

            // ✨ 场景 3: 视频详情页 - 自动展开右侧面板（视频提示词）
            if (isPostDetail) {
                if (!this._hasRestored) {
                    this._hasRestored = true;
                    console.log('[GPM] Post Detail: Auto-showing right panel');
                    if (this.rightPanel) this.rightPanel.show(false);
                    // 左侧面板保持用户上次的状态
                    const data = this.storage.get();
                    const leftVisible = data.settings?.panels?.left?.visible;
                    if (leftVisible && this.leftPanel) this.leftPanel.show(false);
                }
                return;
            }

            // ✨ 场景 4: 生成页面 (/imagine) - 恢复用户偏好
            if (isImagineArea && !this._hasRestored) {
                this._hasRestored = true;
                const data = this.storage.get();
                const s = data.settings?.panels || {};

                console.log('[GPM] Imagine: Restoring user preferences');
                if (this.leftPanel) {
                    s.left?.visible ? this.leftPanel.show(false) : this.leftPanel.hide(false);
                }
                if (this.rightPanel) {
                    s.right?.visible ? this.rightPanel.show(false) : this.rightPanel.hide(false);
                }
            }
        }

        addNewPrompt(contentOrObj, type = 'text', category = null, nameOverride = null) {
            let content, finalType, finalCat, finalName;

            // 🛠️ Overload: Support Object Passing to prevent arg mismatch
            if (typeof contentOrObj === 'object' && contentOrObj !== null) {
                content = contentOrObj.content;
                finalType = contentOrObj.type || 'text';
                finalCat = contentOrObj.category;
                finalName = contentOrObj.name;
            } else {
                content = contentOrObj;
                finalType = type;
                finalCat = category;
                finalName = nameOverride;
            }

            const data = this.storage.get();
            const activeLibId = finalType === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const activeLib = data.libraries.find(l => l.id === activeLibId) || data.libraries.find(l => l.id === data.activeLibraryId);

            if (activeLib) {
                // 🎯 CRITICAL FIX: 强制使用 finalName，只在完全没有时才用内容
                let title;
                if (finalName && finalName.trim()) {
                    title = finalName.trim();
                } else {
                    // 只有在没有 name 时才用内容（例如用户手动添加）
                    title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
                }

                const newPrompt = {
                    id: Date.now(),
                    name: title,
                    content: content,
                    category: finalCat || 'Uncategorized',
                    pinned: false,
                    type: finalType
                };

                activeLib.prompts.unshift(newPrompt);
                this.storage.save(data);
                this.loadLibraryData();
                this.showToast('✨ 已添加提示词', 3000, 'success');
            }
        }


        handlePromptAction(action, prompt, type) {
            const data = this.storage.get();

            // 处理库级别的操作（不需要 activeLib 和 pIndex）
            if (action === 'toggleLibPin') {
                // 切换库的置顶状态
                const lib = prompt; // 这里 prompt 参数实际上是 library 对象
                const libIndex = data.libraries.findIndex(l => l.id === lib.id);
                if (libIndex !== -1) {
                    data.libraries[libIndex].pinned = lib.pinned;
                    console.log(`[GPM] 置顶状态已更新: ${lib.name} -> ${lib.pinned ? '已置顶' : '未置顶'}`);
                    this.storage.save(data);
                    this.loadLibraryData();
                }
                return;
            }

            if (action === 'reorderLibs') {
                // 保存库的自定义排序
                const newOrder = prompt; // 这里 prompt 参数实际上是新的库数组
                newOrder.forEach(reorderedLib => {
                    const idx = data.libraries.findIndex(l => l.id === reorderedLib.id);
                    if (idx !== -1) {
                        data.libraries[idx].sortOrder = reorderedLib.sortOrder;
                    }
                });
                this.storage.save(data);
                this.loadLibraryData();
                return;
            }

            // 处理提示词级别的操作（需要 activeLib 和 pIndex）
            const activeLibId = type === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const activeLib = data.libraries.find(l => l.id === activeLibId);
            if (!activeLib) return;

            const pIndex = activeLib.prompts.findIndex(p => p.id === prompt.id);
            if (pIndex === -1) return;

            switch (action) {
                case 'replace':
                    this.handlePromptClick(prompt, true);
                    break;
                case 'append':
                    this.handlePromptClick(prompt, false);
                    break;
                case 'rename':
                    const newName = window.prompt('重命名标题 (Rename Title):', prompt.name);
                    if (newName) {
                        activeLib.prompts[pIndex].name = newName;
                        this.storage.save(data);
                        this.loadLibraryData();
                    }
                    break;
                case 'edit':
                    if (typeof showGPMEditModal === 'function') {
                        showGPMEditModal(prompt.content, (newContent) => {
                            activeLib.prompts[pIndex].content = newContent;
                            this.storage.save(data);
                            this.loadLibraryData();
                        });
                    } else {
                        // Fallback just in case
                        const newContent = window.prompt('编辑内容 (Edit Content):', prompt.content);
                        if (newContent) {
                            activeLib.prompts[pIndex].content = newContent;
                            this.storage.save(data);
                            this.loadLibraryData();
                        }
                    }
                    break;
                case 'copy':
                    navigator.clipboard.writeText(prompt.content).then(() => {
                        this.showToast('✅ 已复制', 2000, 'success');
                    });
                    break;
                case 'pin':
                    activeLib.prompts[pIndex].pinned = !activeLib.prompts[pIndex].pinned;
                    // Sort happen in renderList based on logic, but usually pinned items should come first?
                    // Currently sorting is just via ID (time). We might need to update sort logic in SidePanel.
                    // For now just save state.
                    this.storage.save(data);
                    this.loadLibraryData();
                    break;
                case 'delete':
                    if (confirm(`确定删除 "${prompt.name}"?`)) {
                        activeLib.prompts.splice(pIndex, 1);
                        this.storage.save(data);
                        this.loadLibraryData();
                        this.showToast('🗑️ 已删除', 2000, 'success');
                    }
                    break;
            }
        }

        renameCurrentLibrary(type) {
            const data = this.storage.get();
            const activeLibId = type === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const lib = data.libraries.find(l => l.id === activeLibId);
            if (!lib) return;

            const newName = prompt('重命名库 (Rename Library):', lib.name);
            if (newName && newName.trim() !== '') {
                lib.name = newName.trim();
                this.storage.save(data);
                this.loadLibraryData();
                this.showToast(`库已重命名为 "${lib.name}"`);
            }
        }

        moveLibrary(type, direction) {
            const data = this.storage.get();
            const activeLibId = type === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const idx = data.libraries.findIndex(l => l.id === activeLibId);
            if (idx === -1) return;

            if (direction === 'top') {
                // Pin to top: Move to index 0
                if (idx === 0) return; // Already at top
                const [item] = data.libraries.splice(idx, 1);
                data.libraries.unshift(item);
                this.storage.save(data);
                this.loadLibraryData();
                this.showToast('已置顶 (Pinned to Top)');
            } else {
                // Move up/down
                const newIdx = idx + direction;
                if (newIdx >= 0 && newIdx < data.libraries.length) {
                    // Swap
                    const temp = data.libraries[idx];
                    data.libraries[idx] = data.libraries[newIdx];
                    data.libraries[newIdx] = temp;

                    this.storage.save(data);
                    this.loadLibraryData();
                    this.showToast('已调整顺序 (Reordered)');
                }
            }
        }

        addNewCategory(type) {
            const name = prompt('新建分类名称 (New Category Name):');
            if (!name) return;
            this.addNewPrompt('New Prompt', type, name.trim());
        }

        exportCategory(type) {
            const panel = type === 'text' ? this.leftPanel : this.rightPanel;
            if (!panel) return;
            const cat = panel.activeCategory;
            if (!cat || cat === '全部 (All)') {
                alert('请先选择一个具体分类 (Please select a specific category to export)');
                return;
            }

            const data = this.storage.get();
            const activeLibId = type === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const lib = data.libraries.find(l => l.id === activeLibId);
            if (!lib) return;

            const prompts = lib.prompts.filter(p => p.category === cat && (!p.type || p.type === type));
            if (prompts.length === 0) {
                alert('该分类为空 (Category is empty)');
                return;
            }

            const blob = new Blob([JSON.stringify(prompts, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `GrokPrompts_${cat}_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        }

        importToCategory(type) {
            const panel = type === 'text' ? this.leftPanel : this.rightPanel;
            if (!panel) return;
            const cat = panel.activeCategory;
            if (!cat || cat === '全部 (All)') {
                alert('请先选择一个具体分类 (Please select a specific category to import into)');
                return;
            }

            // Reuse Paste Import Logic but override category
            if (typeof showGPMPasteImport === 'function') {
                showGPMPasteImport((imported) => {
                    console.log('[DEBUG] imported 数组:', imported);
                    console.log('[DEBUG] 第一个元素:', imported[0]);
                    if (Array.isArray(imported)) {
                        imported.forEach(item => {
                            console.log('[DEBUG] 正在处理:', item);
                            // 🚀 Object Passing Mode: 100% Safe
                            this.addNewPrompt({
                                content: item.content,
                                type: type,
                                category: cat,
                                name: item.name
                            });
                        });
                        this.showToast(`已导入 ${imported.length} 个提示词到 "${cat}"`);
                    }
                });
            } else {
                alert('Import module not ready');
            }
        }

        loadLibraryData() {
            const data = this.storage.get();

            // 🔴 FIX #1: Ensure at least one default library exists
            if (!data.libraries || data.libraries.length === 0) {
                data.libraries = [this.storage.defaultSchema().libraries[0]];
                this.storage.save(data);
            }

            // Initialize independent states if missing
            if (!data.activeTextLibraryId) data.activeTextLibraryId = data.activeLibraryId || data.libraries[0].id;
            if (!data.activeVideoLibraryId) data.activeVideoLibraryId = data.activeLibraryId || data.libraries[0].id;

            const activeTextLibId = data.activeTextLibraryId;
            const activeVideoLibId = data.activeVideoLibraryId;

            const textLibrary = data.libraries.find(l => l.id === activeTextLibId) || data.libraries[0];
            const videoLibrary = data.libraries.find(l => l.id === activeVideoLibId) || data.libraries[0];

            // 🎯 CRITICAL FIX: 按类型过滤库列表,实现真正的库分离
            const textLibraries = data.libraries
                .filter(l => !l.libraryType || l.libraryType === 'text')
                .map(l => ({ id: l.id, name: l.name, pinned: l.pinned }));

            const videoLibraries = data.libraries
                .filter(l => l.libraryType === 'video')
                .map(l => ({ id: l.id, name: l.name, pinned: l.pinned }));

            // Setup Left Panel (Text)
            if (textLibrary) {
                const textPrompts = textLibrary.prompts.filter(p => !p.type || p.type === 'text');

                this.leftPanel.setup(
                    { ...textLibrary, prompts: textPrompts, id: textLibrary.id, name: textLibrary.name },
                    textLibraries,  // 🎯 只显示文字库
                    (prompt, isReplace) => this.handlePromptClick(prompt, isReplace),
                    (newLibId) => this.switchLibrary(newLibId, 'text'),
                    () => this.importLibrary('text'),
                    () => this.exportLibrary('text'),
                    () => this.addNewLibrary('text'),
                    () => this.deleteCurrentLibrary('text'),
                    (content) => this.addNewPrompt(content, 'text'),
                    () => this.exportAllLibraries(), // Add missing bulk export binding
                    () => this.bottomPanel.toggle(), // onDraftToggle
                    (action, prompt) => this.handlePromptAction(action, prompt, 'text'),
                    (src, tgt) => this.handleReorder(src, tgt, 'text'),
                    null, // onAiAssist
                    (libId, newName) => { // 🔧 FIX: 接收参数并保存
                        const data = this.storage.get();
                        const lib = data.libraries.find(l => l.id === libId);
                        if (lib) {
                            lib.name = newName;
                            this.storage.save(data);
                            this.loadLibraryData(); // 重新加载以更新 UI
                            this.showToast(`库已重命名为 "${newName}"`);
                        }
                    },
                    () => this.addNewCategory('text'),
                    () => this.importToCategory('text'),
                    () => this.exportCategory('text'),
                    (dir) => this.moveLibrary('text', dir)
                );
            }

            // Setup Right Panel (Video)
            if (videoLibrary) {
                const videoPrompts = videoLibrary.prompts.filter(p => p.type === 'video');

                this.rightPanel.setup(
                    { ...videoLibrary, prompts: videoPrompts, id: videoLibrary.id, name: videoLibrary.name },
                    videoLibraries,  // 🎯 只显示视频库
                    (prompt, isReplace) => this.handlePromptClick(prompt, isReplace),
                    (newLibId) => this.switchLibrary(newLibId, 'video'),
                    () => this.importLibrary('video'),
                    () => this.exportLibrary('video'),
                    () => this.addNewLibrary('video'),
                    () => this.deleteCurrentLibrary('video'),
                    (content) => this.addNewPrompt(content, 'video'),
                    () => this.exportAllLibraries(), // Add missing bulk export binding
                    () => this.bottomPanel.toggle(), // onDraftToggle, matches left signature for consistency or null
                    (action, prompt) => this.handlePromptAction(action, prompt, 'video'),
                    (src, tgt) => this.handleReorder(src, tgt, 'video'),
                    () => this.autoRetryManager.togglePanel(this.rightPanel.shadow.querySelector('.gpm-panel')),
                    (libId, newName) => { // 🔧 FIX: 接收参数并保存
                        const data = this.storage.get();
                        const lib = data.libraries.find(l => l.id === libId);
                        if (lib) {
                            lib.name = newName;
                            this.storage.save(data);
                            this.loadLibraryData(); // 重新加载以更新 UI
                            this.showToast(`库已重命名为 "${newName}"`);
                        }
                    },
                    () => this.addNewCategory('video'),
                    () => this.importToCategory('video'),
                    () => this.exportCategory('video'),
                    (dir) => this.moveLibrary('video', dir)
                );

                // Render Modifiers (Video Panel) - Separate list as requested
                this.rightPanel.renderModifiers(
                    data.videoModifiers || [],
                    (newMod) => this.addModifier(newMod, 'video'),
                    (modToDelete) => this.deleteModifier(modToDelete, 'video'),
                    (mod) => this.handleModifierClick(mod),
                    () => this.importModifiers('video'),
                    () => this.exportModifiers('video')
                );
            }

            // Render Modifiers (Left Panel Only for now)
            this.leftPanel.renderModifiers(
                data.modifiers || [],
                (newMod) => this.addModifier(newMod, 'text'),
                (modToDelete) => this.deleteModifier(modToDelete, 'text'),
                (mod) => this.handleModifierClick(mod),
                () => this.importModifiers('text'),
                () => this.exportModifiers('text')
            );
        }


        handleReorder(srcId, tgtId, type) {
            const data = this.storage.get();
            const activeLibId = type === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const activeLib = data.libraries.find(l => l.id === activeLibId);
            if (!activeLib || !activeLib.prompts) return;

            // Note: Data IDs might be numbers, but dragged IDs are strings usually.
            const srcIndex = activeLib.prompts.findIndex(p => String(p.id) === String(srcId));
            const tgtIndex = activeLib.prompts.findIndex(p => String(p.id) === String(tgtId));

            if (srcIndex === -1 || tgtIndex === -1 || srcIndex === tgtIndex) return;

            // Move
            const [moved] = activeLib.prompts.splice(srcIndex, 1);
            activeLib.prompts.splice(tgtIndex, 0, moved);

            this.storage.save(data);
            this.loadLibraryData();
            // Optional: Toast "Sorted" to confirm action? Maybe too noisy.
        }

        switchLibrary(libId, type) {
            const data = this.storage.get();
            if (data.libraries.some(l => l.id === libId)) {
                if (type === 'text') data.activeTextLibraryId = libId;
                else data.activeVideoLibraryId = libId;

                this.storage.save(data);
                this.loadLibraryData();
                this.showToast(`已切换库`);
            }
        }

        addNewLibrary(type) {
            const name = prompt('请输入新库名称:', 'New Library');
            if (!name) return;
            const data = this.storage.get();
            const newLib = {
                id: Date.now().toString(),
                name: name,
                prompts: [],
                libraryType: type, // Set library type on creation
                pinned: false
            };
            data.libraries.push(newLib);

            if (type === 'text') data.activeTextLibraryId = newLib.id;
            else data.activeVideoLibraryId = newLib.id;

            this.storage.save(data);
            this.loadLibraryData();
            this.showToast('已创建新库');
        }

        deleteCurrentLibrary(type) {
            const data = this.storage.get();
            if (data.libraries.length <= 1) {
                alert('无法删除最后一个库');
                return;
            }
            if (!confirm('确定要删除当前库吗？此操作无法撤销。')) return;

            const activeKey = type === 'text' ? 'activeTextLibraryId' : 'activeVideoLibraryId';
            const currentId = data[activeKey] || data.libraries[0].id;

            data.libraries = data.libraries.filter(l => l.id !== currentId);

            const fallbackId = data.libraries[0].id;
            data.activeTextLibraryId = (data.activeTextLibraryId === currentId) ? fallbackId : data.activeTextLibraryId;
            data.activeVideoLibraryId = (data.activeVideoLibraryId === currentId) ? fallbackId : data.activeVideoLibraryId;

            this.storage.save(data);
            this.loadLibraryData();
            this.showToast('🗑️ 库已删除', 3000, 'success');
        }

        exportLibrary(type) {
            const data = this.storage.get();
            const activeKey = type === 'text' ? 'activeTextLibraryId' : 'activeVideoLibraryId';
            const currentId = data[activeKey] || data.libraries[0].id;
            const lib = data.libraries.find(l => l.id === currentId);

            if (lib) {
                this.downloadJSON(lib, lib.name);
            }
        }

        exportAllLibraries() {
            const data = this.storage.get();
            // Export as array of libraries
            const exportData = {
                version: '2.1',
                activeTextId: data.activeTextLibraryId,
                activeVideoId: data.activeVideoLibraryId,
                libraries: data.libraries
            };
            this.downloadJSON(exportData, `Grok_Backup_${new Date().toISOString().slice(0, 10)}`);
        }

        downloadJSON(obj, filename) {
            const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        importLibrary(type = 'text') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const json = JSON.parse(evt.target.result);
                        const data = this.storage.get();

                        // Case 1: Full Backup Import
                        if (json.libraries && Array.isArray(json.libraries)) {
                            let count = 0;
                            json.libraries.forEach(impLib => {
                                if (!data.libraries.some(l => l.id === impLib.id)) {
                                    data.libraries.push(impLib);
                                    count++;
                                } else {
                                    // Conflict -> Add as copy
                                    impLib.id = Date.now() + Math.random().toString().slice(2, 8);
                                    impLib.name = impLib.name + ' (Import)';
                                    data.libraries.push(impLib);
                                    count++;
                                }
                            });
                            this.storage.save(data);
                            this.loadLibraryData();
                            this.showToast(`已导入 ${count} 个库`);
                            return;
                        }


                        // Case 2: Single Library Import
                        let newLib = Array.isArray(json) ? { prompts: json } : json;

                        // Fallback ID
                        if (!newLib.id) newLib.id = Date.now().toString();

                        // Use Filename as Library Name (User Request)
                        // Remove extension
                        const filename = file.name.replace(/\.json$/i, '');
                        newLib.name = filename;

                        // Ensure not duplicate
                        if (data.libraries.some(l => l.id === newLib.id)) {
                            newLib.id = Date.now().toString();
                        }

                        // Ensure prompts array
                        if (!newLib.prompts) newLib.prompts = [];

                        // 🔄 NORMALIZE PROMPTS: Convert old format to new format
                        newLib.prompts = newLib.prompts.map((prompt, index) => {
                            return {
                                id: prompt.id || Date.now() + index,
                                name: prompt.name || prompt.title || `Prompt ${index + 1}`,
                                content: prompt.content || prompt.text || '',
                                category: prompt.category || 'Uncategorized',
                                pinned: prompt.pinned !== undefined ? prompt.pinned : false,
                                type: prompt.type || type  // 🎯 Use panel type as default
                            };
                        });

                        // 🎯 CRITICAL FIX: 设置库类型,确保库只显示在对应面板
                        newLib.libraryType = type;  // 'text' or 'video'
                        newLib.pinned = false;  // 默认不置顶

                        console.log('[DEBUG] 导入库:', newLib.name);
                        console.log('[DEBUG] Prompts 数量:', newLib.prompts.length);
                        console.log('[DEBUG] 前 3 条:', newLib.prompts.slice(0, 3));

                        data.libraries.push(newLib);
                        this.storage.save(data);
                        this.loadLibraryData();
                        this.showToast(`库 "${filename}" 已导入 (${newLib.prompts.length} 条)`);

                    } catch (err) {
                        console.error(err);
                        alert(`导入失败 (Import Failed):\n${err.message}`);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        importModifiers(type = 'text') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.style.display = 'none';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const json = JSON.parse(evt.target.result);
                        if (!Array.isArray(json)) {
                            throw new Error('格式无效：必须是字符串数组 (Invalid format: must be an array of strings)');
                        }

                        const data = this.storage.get();
                        const key = type === 'text' ? 'modifiers' : 'videoModifiers';
                        if (!data[key]) data[key] = [];

                        let count = 0;
                        json.forEach(mod => {
                            if (typeof mod === 'string' && !data[key].includes(mod)) {
                                data[key].push(mod);
                                count++;
                            }
                        });

                        this.storage.save(data);
                        this.loadLibraryData();
                        this.showToast(`已导入 ${count} 个标签 (${type})`);

                    } catch (err) {
                        console.error(err);
                        alert(`导入失败 (Import Failed):\n${err.message}`);
                    }
                };
                reader.readAsText(file);
            };
            document.body.appendChild(input);
            input.click();
            setTimeout(() => input.remove(), 100);
        }

        exportModifiers(type = 'text') {
            const data = this.storage.get();
            const key = type === 'text' ? 'modifiers' : 'videoModifiers';
            const modifiers = data[key] || [];
            if (modifiers.length === 0) {
                alert('没有可导出的标签 (No modifiers to export)');
                return;
            }

            const blob = new Blob([JSON.stringify(modifiers, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `modifiers_${type}_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        addModifier(mod, type = 'text') {
            const data = this.storage.get();
            const key = type === 'text' ? 'modifiers' : 'videoModifiers';
            if (!data[key]) data[key] = [];
            if (!data[key].includes(mod)) {
                data[key].push(mod);
                this.storage.save(data);
                this.loadLibraryData();
            }
        }

        deleteModifier(mod, type = 'text') {
            const data = this.storage.get();
            const key = type === 'text' ? 'modifiers' : 'videoModifiers';
            if (data[key]) {
                data[key] = data[key].filter(m => m !== mod);
                this.storage.save(data);
                this.loadLibraryData();
            }
        }

        // ✨ Persistence Helper
        savePanelState(side, newState) {
            const data = this.storage.get();
            if (!data.settings) data.settings = {};
            if (!data.settings.panels) data.settings.panels = {};
            if (!data.settings.panels[side]) data.settings.panels[side] = {}; // init if missing

            Object.assign(data.settings.panels[side], newState);
            this.storage.save(data);
            // console.log(`[GPM] Saved ${side} panel state:`, newState);
        }

        handleModifierClick(mod, isReplace = false) {
            // ✨ FIX (v3.0.2): Use smart routing logic similar to prompts
            this._sendContent(mod, isReplace);
            // Old Logic: Forced draft panel open
            // if (isReplace) { this.bottomPanel.setText(mod); } else { this.bottomPanel.insertText(mod); }
            // this.bottomPanel.show();
        }

        addToHistory(text, source = null) {
            if (!text || !text.trim()) return;
            const data = this.storage.get();

            // 🎯 Smart History Routing
            if (source && source.includes('random')) {
                // Handle Random History
                if (!data.randomHistory) data.randomHistory = [];
                // Avoid duplicates at the top
                if (data.randomHistory.length > 0 && data.randomHistory[0].text === text) return;
                data.randomHistory.unshift({ time: Date.now(), text: text, source: source });
                if (data.randomHistory.length > 30) data.randomHistory.pop();
            } else {
                // Handle Normal History
                if (!data.history) data.history = [];
                // Avoid duplicates at the top
                if (data.history.length > 0 && data.history[0].text === text) return;
                data.history.unshift({ time: Date.now(), text: text });
                if (data.history.length > 50) data.history.pop();
            }

            this.storage.save(data);
        }

        showVariableModal(vars, onConfirm) {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000;
                display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);
            `;

            const modal = document.createElement('div');
            modal.className = 'gpm-panel';
            modal.style.cssText = `
                width: 400px; padding: 20px; display: flex; flex-direction: column; gap: 15px;
                background: var(--gpm-glass-bg); border: 1px solid var(--gpm-glass-border);
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            `;

            modal.innerHTML = `
                <h3 style="margin: 0 0 10px; font-size: 16px;">填写变量 (Fill Variables)</h3>
                <div class="vars-container" style="display: flex; flex-direction: column; gap: 10px;"></div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                    <button class="gpm-btn close-btn">取消 (Cancel)</button>
                    <button class="gpm-btn primary confirm-btn">确认 (Confirm)</button>
                </div>
            `;

            const container = modal.querySelector('.vars-container');
            const inputs = {};

            const submit = () => {
                const values = {};
                for (const v of vars) {
                    values[v] = inputs[v].value;
                }
                overlay.remove();
                onConfirm(values);
            };

            vars.forEach((v, index) => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.flexDirection = 'column';
                row.style.gap = '4px';

                const label = document.createElement('label');
                label.textContent = v;
                label.style.fontSize = '12px';
                label.style.color = 'var(--gpm-text-dim)';

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'var-input';
                input.placeholder = `Enter value for ${v}`;
                input.style.padding = '8px';

                input.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < vars.length - 1) {
                            // Focus next
                            const nextV = vars[index + 1];
                            if (inputs[nextV]) inputs[nextV].focus();
                        } else {
                            submit();
                        }
                    }
                };

                inputs[v] = input;
                row.appendChild(label);
                row.appendChild(input);
                container.appendChild(row);
            });

            modal.querySelector('.close-btn').onclick = () => overlay.remove();
            modal.querySelector('.confirm-btn').onclick = submit;

            overlay.appendChild(modal);
            this.container.appendChild(overlay);

            // Focus first
            setTimeout(() => {
                if (vars.length > 0) inputs[vars[0]].focus();
            }, 50);
        }

        handlePromptClick(prompt, isReplace = false) {
            const content = prompt.content;

            // Template Variable Logic
            const vars = TemplateEngine.extractVariables(content);
            if (vars.length > 0) {
                this.showVariableModal(vars, (values) => {
                    let filledContent = content;
                    vars.forEach(v => {
                        const val = values[v] || '';
                        filledContent = filledContent.replace(new RegExp(`\\{${v}\\}`, 'g'), val);
                    });

                    // ✨ NEW FEATURE: Smart routing based on draft panel state
                    this._sendContent(filledContent, isReplace);
                });
                return;
            }

            // ✨ NEW FEATURE: Smart routing based on draft panel state
            this._sendContent(content, isReplace);
        }

        // ✨ NEW FEATURE: Helper method for smart content routing
        _sendContent(content, isReplace) {
            const draftPanel = this.bottomPanel.shadow.querySelector('.bottom-panel');
            const isDraftOpen = draftPanel && draftPanel.style.display !== 'none';

            if (isDraftOpen) {
                // Draft panel is open → send to draft (Always strict by design inside BottomPanel)
                if (isReplace) {
                    this.bottomPanel.smartReplace(content);
                    this.showToast('✨ 已替换草稿选中部分', 2500, 'success');
                } else {
                    this.bottomPanel.insertText(content);
                    this.showToast('✨ 已插入草稿', 2500, 'success');
                }
            } else {
                // Draft panel is closed → send directly to main input
                if (isReplace) {
                    // Main Input: Use non-strict mode (Force replace all if no selection)
                    this.inputManager.smartReplace(content, false);
                    this.showToast('✨ 已替换输入框内容', 2500, 'success');
                } else {
                    // Main Input: Append to end
                    this.inputManager.insert(content);
                    this.showToast('✨ 已插入输入框', 2500, 'success');
                }
            }
        }

        // 📸 Portrait Mode Config Modal
        showPortraitConfigModal(currentValue, onConfirm) {
            console.log('[DEBUG] showPortraitConfigModal called with:', currentValue);
            alert('[DEBUG] showPortraitConfigModal is being executed!');

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
                z-index: 200000; display: flex; align-items: center; justify-content: center;
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: rgba(20, 20, 30, 0.95); border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px; padding: 20px; width: 400px; max-width: 90%;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 15px;
            `;

            modal.innerHTML = `
                <h3 style="margin: 0; color: white; display: flex; align-items: center; gap: 8px;">
                    📸 写真模式设置 (Portrait Settings)
                </h3>
                <div style="font-size: 13px; color: #aaa;">
                    请输入固定的开头部分 (Fixed Opening). 之后的提示词将在库中随机抽取。
                </div>
                <textarea class="prefix-input" style="
                    width: 100%; height: 100px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 6px; color: white; padding: 10px; font-size: 14px; resize: vertical;
                " placeholder="例如: 真实胶片直闪摄影，亚洲女性...">${currentValue || ''}</textarea>
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="gpm-btn cancel-btn" style="padding: 6px 15px; background: transparent; border: 1px solid rgba(255,255,255,0.2);">取消</button>
                    <button class="gpm-btn confirm-btn" style="padding: 6px 15px; background: var(--gpm-primary); color: white; border: none;">确认生成</button>
                </div>
            `;

            const textarea = modal.querySelector('.prefix-input');
            const close = () => overlay.remove();

            const cancelBtn = modal.querySelector('.cancel-btn');
            const confirmBtn = modal.querySelector('.confirm-btn');

            if (cancelBtn) cancelBtn.onclick = close;
            if (confirmBtn) confirmBtn.onclick = () => {
                const val = textarea.value.trim();
                // 允许为空，如果用户只想用纯随机
                onConfirm(val);
                close();
            };

            overlay.onclick = (e) => { if (e.target === overlay) close(); };
            overlay.appendChild(modal);
            document.body.appendChild(overlay); // 🎯 CRITICAL FIX: Append to body directly

            // Focus
            requestAnimationFrame(() => {
                if(textarea) textarea.focus();
            });
        }

        handleRandomRequest(action, type) {
            const data = this.storage.get();
            const activeLibId = type === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const activeLib = data.libraries.find(l => l.id === activeLibId);
            const panel = type === 'text' ? this.leftPanel : this.rightPanel;
            const isReplaceMode = panel.clickMode === 'replace';

            // 1. Portrait Modes (Complex Logic)
            if (action === 'portrait' || action === 'adult_portrait') {
                const isR18 = action === 'adult_portrait';

                // Find standard prefix library
                const portraitLib = data.libraries.find(lib => lib.name === '写真模式标准描述' || lib.name.includes('写真模式'));
                if (!portraitLib || !portraitLib.prompts?.length) {
                    alert('❌ 未找到"写真模式标准描述"库，或该库为空\n\n请按照说明创建。');
                    return;
                }

                let prefix = portraitLib.prompts[Math.floor(Math.random() * portraitLib.prompts.length)].content;

                // If R18, add adult modifier
                if (isR18) {
                    const adultLib = data.libraries.find(lib => lib.name === '成人模式标准添加词' || lib.name.includes('成人模式'));
                    if (adultLib && adultLib.prompts?.length) {
                        prefix += ', ' + adultLib.prompts[Math.floor(Math.random() * adultLib.prompts.length)].content;
                    }
                }

                // Global pool for variety (exclude the prefix libs themselves to avoid duplicates)
                let pool = [];
                data.libraries.forEach(lib => {
                    const isPrefixLib = lib.name.includes('写真模式') || lib.name.includes('成人模式');
                    if (!isPrefixLib && ((type === 'text' && (!lib.libraryType || lib.libraryType === 'text')) || (type === 'video' && lib.libraryType === 'video'))) {
                        pool = pool.concat(lib.prompts.filter(p => !p.type || p.type === type));
                    }
                });

                if (pool.length > 0) {
                    const count = 10;
                    const selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, Math.min(count, pool.length));
                    const finalPrompt = `${prefix}, ${selected.map(p => p.content).join(', ')}`;

                    this._sendContent(finalPrompt, isReplaceMode);
                    this.addToHistory(finalPrompt, action);
                    this.showToast(`${isR18 ? '🔞 R18' : '📸 '}写真模式：已生成`);
                } else {
                    // Fallback to prefix only if pool is somehow empty
                    this._sendContent(prefix, isReplaceMode);
                    this.addToHistory(prefix, action);
                }
                return;
            }

            // 2. Video Random Modes
            if (action === 'video_random' || action === 'video_r18') {
                const isR18 = action === 'video_r18';
                const videoLib = data.libraries.find(lib => lib.name === '随机视频专用' || lib.name.includes('随机视频'));
                if (!videoLib || !videoLib.prompts?.length) {
                    alert('❌ 未找到"随机视频专用"库');
                    return;
                }

                let result = videoLib.prompts[Math.floor(Math.random() * videoLib.prompts.length)].content;

                if (isR18) {
                    const r18Lib = data.libraries.find(lib => lib.name === 'R18视频添加提示词' || lib.name.includes('R18视频'));
                    if (r18Lib && r18Lib.prompts?.length) {
                        result += ', ' + r18Lib.prompts[Math.floor(Math.random() * r18Lib.prompts.length)].content;
                    }
                }

                this._sendContent(result, isReplaceMode);
                this.addToHistory(result, action);
                this.showToast(`🎬 视频随机：已生成`);
                return;
            }

            // 3. Normal Random Modes (random3, catmix, chaos)
            if (!activeLib || !activeLib.prompts?.length) {
                this.showToast('库为空');
                return;
            }

            let finalResult = '';
            if (action === 'random3') {
                finalResult = [...activeLib.prompts].sort(() => 0.5 - Math.random()).slice(0, 3).map(p => p.content).join(', ');
            } else if (action === 'catmix') {
                const byCat = {};
                activeLib.prompts.forEach(p => {
                    const c = p.category || 'Uncategorized';
                    if (!byCat[c]) byCat[c] = [];
                    byCat[c].push(p);
                });
                finalResult = Object.values(byCat).map(list => list[Math.floor(Math.random() * list.length)].content).join(', ');
            } else if (action === 'chaos') {
                const count = Math.floor(Math.random() * 8) + 4; // 4-12 for pure chaos
                finalResult = [...activeLib.prompts].sort(() => 0.5 - Math.random()).slice(0, Math.min(count, activeLib.prompts.length)).map(p => p.content).join(', ');
            }

            if (finalResult) {
                this._sendContent(finalResult, isReplaceMode);
                this.addToHistory(finalResult, action);
                this.showToast(`🎲 随机组合已生成`);
            }
        }





        addToHistory(text, sourceMode = null) {
            if (!text || typeof text !== 'string') return;
            const data = this.storage.get();
            if (!data.history) data.history = [];

            // De-duplicate: Don't add if same as last
            const last = data.history[0];
            if (last && last.text === text) return;

            const entry = {
                time: Date.now(),
                text: text
            };

            if (sourceMode) entry.source = sourceMode;

            data.history.unshift(entry);

            // Limit 100 (Increased for merged view)
            if (data.history.length > 100) data.history = data.history.slice(0, 100);

            this.storage.save(data);
            console.log(`[GPM] History added (${sourceMode || 'manual'})`);
        }



        renderToggle() {
            // 🔒 Domain Check: Don't render GPM toggle on x.com
            const hostname = window.location.hostname;
            const isX = hostname.includes('x.com') || hostname.includes('twitter.com');
            if (isX) {
                console.log('[GPM] On X.com - Toggle button skipped (X-Lens will handle UI)');
                return; // X-Lens will provide its own toggle
            }

            const toggle = new Component(this.styles);
            toggle.afterRender = () => {
                const btn = toggle.shadow.querySelector('.gpm-toggle');
                // Sync Logic: Toggle all based on Left Panel state
                btn.onclick = () => {
                    // Default Grok Logic (grok.com only)
                    const isLeftVisible = this.leftPanel.shadow.querySelector('.side-panel').style.display !== 'none';
                    if (isLeftVisible) {
                        this.leftPanel.hide();
                        this.rightPanel.hide();
                        this.bottomPanel.hide();
                        this.autoRetryManager.hide(); // ✨ 联动隐藏自动重试面板
                    } else {
                        // User Request: Only expand side panels, keep bottom panel closed (manual trigger only)
                        this.leftPanel.show();
                        this.rightPanel.show();
                    }
                };
            };
            toggle.render(`
                <div class="gpm-toggle gpm-panel" style="
                    position: fixed; bottom: 20px; right: 20px;
                    width: 50px; height: 50px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; z-index: 999999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    background: #111;
                ">
                    <img src="${APP_ICON_BASE64}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                </div>
            `);
            toggle.mount(this.container);
        }
    }

    // ===== HELPER FUNCTIONS =====
    const showGPMPasteImport = function (cb) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);';
        overlay.innerHTML = `
            <div style="width:600px;background:#202020;border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:20px;color:white;display:flex;flex-direction:column;gap:15px;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                <h3 style="margin:0;font-size:18px;">📋 粘贴导入 (Paste Import)</h3>
                <div style="color:#888;font-size:12px;display:flex;justify-content:space-between;">
                    <span>标准格式：<b>【标题】</b> (换行) <b>正文</b></span>
                    <span id="copy-proto" style="cursor:pointer;color:#1d9bf0;font-weight:bold;">[复制 AI 指令]</span>
                </div>
                <textarea id="p-area" placeholder="在这里粘贴内容..." style="min-height:300px;background:rgba(0,0,0,0.3);color:white;border:1px solid rgba(255,255,255,0.1);padding:12px;border-radius:6px;resize:vertical;"></textarea>
                <div style="text-align:right;gap:10px;display:flex;justify-content:flex-end;">
                    <button id="p-cancel" class="gpm-btn" style="padding:8px 16px;background:rgba(255,255,255,0.1);border:none;border-radius:6px;color:white;cursor:pointer;">Cancel</button>
                    <button id="p-import" class="gpm-btn primary" style="background:#1d9bf0;border:none;padding:8px 16px;cursor:pointer;color:white;border-radius:6px;font-weight:bold;">Import</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        overlay.querySelector('#copy-proto').onclick = () => {
             const protocol = `请严格按照以下格式输出：

【标题】
主体: 描述内容

【标题】
主体: 描述内容

要求：
1. 标题：使用【 】包裹，3-8个汉字
2. 主体：根据内容类型使用英文前缀（Legs/Face/Hands/Pose等）
3. 描述：20-40字，只描述该主体的特征
4. 每条之间空一行

示例：
【赛博朋克】
Environment: 霓虹闪烁的未来都市，高耸入云的摩天大楼，飞行汽车穿梭其中

【柔和侧光】
Lighting: 光源从左侧45度角照射，在面部形成柔和的明暗过渡

(注意：必须使用【 】作为标题分隔符，正文必须以"主体:"开头)`;
             navigator.clipboard.writeText(protocol).then(() => {
                 overlay.querySelector('#copy-proto').textContent = '[已复制!]';
                 setTimeout(() => overlay.querySelector('#copy-proto').textContent = '[复制 AI 指令]', 2000);
             });
        };

        overlay.querySelector('#p-cancel').onclick = () => overlay.remove();
        overlay.querySelector('#p-import').onclick = () => {
            const text = overlay.querySelector('#p-area').value;
            if (text) {
                const results = [];
                const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                let parsedAsJSON = false;

                try {
                    const jsonData = JSON.parse(normalized);
                    if (Array.isArray(jsonData)) {
                        jsonData.forEach(item => {
                            const name = item.name || item.title || `Prompt ${results.length + 1}`;
                            const content = item.content || item.text || '';
                            if (content) results.push({ name, content });
                        });
                        parsedAsJSON = true;
                    }
                } catch (e) {}

                if (!parsedAsJSON && normalized.includes('\t')) {
                    const lines = normalized.split('\n');
                    lines.forEach(line => {
                        const parts = line.split('\t');
                        if (parts.length >= 2) {
                            const name = parts[0].trim();
                            const content = parts[1].trim();
                            if (name && content) results.push({ name, content });
                        }
                    });
                    if (results.length > 0) parsedAsJSON = true;
                }

                if (!parsedAsJSON) {
                    const regex = /【([^】]+)】([\s\S]*?)(?=【|$)/g;
                    let match;
                    while ((match = regex.exec(normalized)) !== null) {
                        const title = match[1].trim();
                        let content = match[2].trim();
                        if (title) results.push({ name: title, content: content || title });
                    }
                }

                if (results.length === 0) {
                    alert('❌ 解析失败 (Parse Failed)\n未找到任何有效格式。');
                } else {
                    const names = results.map(r => r.name).slice(0, 3).join(', ');
                    const more = results.length > 3 ? `... (+${results.length - 3})` : '';
                    alert(`✅ 解析成功 (Parsed ${results.length}):\n首个: ${names}\n${more}`);
                    cb(results);
                }
            }
            overlay.remove();
        };
    };

    const showGPMEditModal = function (initialContent, onSave) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);';
        overlay.innerHTML = `
            <div style="width:600px;max-width:90vw;background:#202020;border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:15px;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                <h3 style="margin:0;color:white;font-size:18px;">📝 编辑内容 (Edit Content)</h3>
                <textarea id="edit-area" style="flex:1;min-height:300px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:white;padding:12px;border-radius:6px;resize:vertical;font-family:inherit;line-height:1.5;"></textarea>
                <div style="display:flex;justify-content:flex-end;gap:10px;">
                    <button id="edit-cancel" class="gpm-btn" style="padding:8px 16px;background:rgba(255,255,255,0.1);color:white;border:none;border-radius:6px;cursor:pointer;">取消</button>
                    <button id="edit-save" class="gpm-btn primary" style="padding:8px 16px;background:#1d9bf0;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">保存</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const textarea = overlay.querySelector('#edit-area');
        textarea.value = initialContent;
        setTimeout(() => textarea.focus(), 50);
        const close = () => overlay.remove();

        overlay.querySelector('#edit-cancel').onclick = close;
        overlay.querySelector('#edit-save').onclick = () => {
            const val = textarea.value.trim();
            if (val) onSave(val);
            close();
        };
        overlay.onclick = (e) => { if (e.target === overlay) close(); };
    };

    // --- BOOTSTRAP ---
    // 🔒 Domain Check: Only run GPM on grok.com
    const hostname = window.location.hostname;
    const isGrok = hostname.includes('grok.com');

    if (isGrok) {
        // 1. Start Inspector Immediately (like standalone script)
        new GrokPromptInspector().init();

        // 2. Start Manager App on Load
        window.addEventListener('load', () => {
            window.grokPromptManagerApp = new App();
        });
    } else {
        console.log('[GPM] Not on Grok.com. Manager App skipped.');
    }
})();

// ======================================================================================
// ========== MODULE: X-LENS (Integrated) ===============================================
// ======================================================================================

dayjs.extend(dayjs_plugin_utc);

(function () {
    'use strict';

    const APP_ICON_BASE64 = `data:image/png;base64,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`;

    // ========== 媒体下载模块 ==========
    const enableDownloadHistorykSync = false;
    const generateFilename = (filenameElements, mediaTypeLabel, index, ext) => {
        const { userId, userName, postId, postTime } = filenameElements;
        const formattedPostTime = dayjs(postTime).format('YYYYMMDD_HHmmss');
        return `${userId}-${postId}-${mediaTypeLabel}${index}.${ext}`;
    };

    const gmFetch = (infoOrUrl, options = {}) =>
        new Promise((resolve, reject) => {
            const info = typeof infoOrUrl === 'string' ? { url: infoOrUrl } : { ...infoOrUrl };
            info.method = options.method || info.method || 'GET';
            info.headers = options.headers || info.headers || {};
            if (options.body) info.data = options.body;
            info.responseType = options.responseType;
            if (options.withCredentials !== undefined) info.withCredentials = options.withCredentials;
            if (options.anonymous !== undefined) info.anonymous = options.anonymous; // Tampermonkey: false=带Cookie
            info.onload = res => {
                resolve({
                    ok: res.status >= 200 && res.status < 300,
                    status: res.status,
                    response: res.response,
                    json: () => Promise.resolve(res.response),
                    text: () => Promise.resolve(
                        typeof res.response === 'string' ? res.response : JSON.stringify(res.response)
                    ),
                    blob: () => Promise.resolve(new Blob([res.response]))
                });
            };
            info.onerror = (error) => {
                console.error("GM_xmlhttpRequest error:", error);
                reject(new Error(`GM_xmlhttpRequest failed: status=${error.status}, statusText=${error.statusText || 'N/A'}`));
            };
            info.onabort = () => reject(new Error('GM_xmlhttpRequest aborted'));
            info.ontimeout = () => reject(new Error('GM_xmlhttpRequest timed out'));
            GM_xmlhttpRequest(info);
        });

    const API_INFO_STORAGE_KEY = 'twitterInternalApiInfo';
    const LAST_UPDATE_DATE_STORAGE_KEY = 'twitterApiInfoLastUpdateDate';
    const API_DOC_URL = 'https://raw.githubusercontent.com/fa0311/TwitterInternalAPIDocument/refs/heads/master/docs/json/API.json';
    let currentApiInfo = null;

    const loadApiInfoFromLocalStorage = () => {
        const savedApiInfoJson = localStorage.getItem(API_INFO_STORAGE_KEY);
        if (savedApiInfoJson) {
            try {
                const savedInfo = JSON.parse(savedApiInfoJson);
                return savedInfo;
            } catch (e) {
                localStorage.removeItem(API_INFO_STORAGE_KEY);
            }
        }
        return null;
    };

    const fetchAndSaveApiInfo = async (currentDateString) => {
        try {
            const response = await gmFetch(API_DOC_URL, {
                method: "GET",
                responseType: "json"
            });
            if (response.ok) {
                const apiDoc = response.response;
                const tweetResultByRestIdInfo = apiDoc.graphql?.TweetResultByRestId;
                const bookmarkSearchTimelineInfo = apiDoc.graphql?.BookmarkSearchTimeline;
                const bearerTokenFromDoc = apiDoc.header?.authorization;
                if (tweetResultByRestIdInfo?.url && tweetResultByRestIdInfo?.features &&
                    bookmarkSearchTimelineInfo?.url && bookmarkSearchTimelineInfo?.features &&
                    bearerTokenFromDoc) {
                    const extractedApiInfo = {
                        TweetResultByRestId: tweetResultByRestIdInfo,
                        BookmarkSearchTimeline: bookmarkSearchTimelineInfo,
                        bearerToken: bearerTokenFromDoc
                    };
                    currentApiInfo = extractedApiInfo;
                    localStorage.setItem(API_INFO_STORAGE_KEY, JSON.stringify(currentApiInfo));
                    localStorage.setItem(LAST_UPDATE_DATE_STORAGE_KEY, currentDateString);
                } else {
                    const savedInfoBeforeFetch = loadApiInfoFromLocalStorage();
                    if (savedInfoBeforeFetch) currentApiInfo = savedInfoBeforeFetch;
                }
            } else {
                const savedInfoBeforeFetch = loadApiInfoFromLocalStorage();
                if (savedInfoBeforeFetch) currentApiInfo = savedInfoBeforeFetch;
            }
        } catch (error) {
            const savedInfoBeforeFetch = loadApiInfoFromLocalStorage();
            if (savedInfoBeforeFetch) currentApiInfo = savedInfoBeforeFetch;
        }
    };

    const initializeApiInfo = () => {
        const lastUpdateDate = localStorage.getItem(LAST_UPDATE_DATE_STORAGE_KEY);
        const today = dayjs().format('YYYY-MM-DD');
        const savedApiInfo = loadApiInfoFromLocalStorage();
        if (lastUpdateDate !== today || !savedApiInfo) {
            if (savedApiInfo) {
                currentApiInfo = savedApiInfo;
            }
            fetchAndSaveApiInfo(today);
        } else {
            currentApiInfo = savedApiInfo;
        }
    };

    initializeApiInfo();

    const DB_NAME = 'DownloadHistoryDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'downloadedPosts';
    let dbPromise = null;
    let downloadedPostsCache = new Set();

    const openDB = () => {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = function(event) {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'postId' });
                }
            };
            request.onsuccess = function() {
                resolve(request.result);
            };
            request.onerror = function() {
                reject(request.error);
            };
        });
        return dbPromise;
    };

    const loadDownloadedPostsCache = () => {
        getDownloadedPostIdsIndexedDB()
            .then(ids => {
                downloadedPostsCache = new Set(ids);
            })
            .catch(err => console.error("IndexedDB 読み込みエラー:", err));
    };

    const getDownloadedPostIdsIndexedDB = () => {
        return openDB().then(db => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAllKeys();
                request.onsuccess = function() {
                    resolve(request.result);
                };
                request.onerror = function() {
                    reject(request.error);
                };
            });
        });
    };

    const markPostAsDownloadedIndexedDB = (postId) => {
        return openDB().then(db => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put({ postId: postId });
                request.onsuccess = function() {
                    downloadedPostsCache.add(postId);
                    resolve();
                };
                request.onerror = function() {
                    reject(request.error);
                };
            });
        });
    };

    loadDownloadedPostsCache();

    const isMobile = /android|iphone|ipad|mobile/.test(navigator.userAgent.toLowerCase());
    const isAppleMobile = /iphone|ipad/.test(navigator.userAgent.toLowerCase());
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

    // 关注校验配置
    const REQUIRED_ACCOUNT = 'OnlyPeachFWD';
    const FOLLOW_CACHE_KEY = `twx_follow_${REQUIRED_ACCOUNT}`;
    const FOLLOW_TTL_MS = 24 * 60 * 60 * 1000; // 24h 缓存

    const getFollowStateFromHtml = (html) => {
        try {
            // 调试：记录HTML片段用于分析
            console.log('[关注校验] 开始解析HTML，长度:', html.length);

            // 方法1：检测 unfollow 按钮（最可靠）
            if (/data-testid=["\']unfollow["\']/i.test(html)) {
                console.log('[关注校验] 检测到 unfollow 按钮 -> 已关注');
                return true;
            }

            // 方法2：检测 Following 相关文本
            const followingPatterns = [
                /Following\s+@OnlyPeachFWD/i,
                /正在关注\s*@?OnlyPeachFWD/i,
                /已关注\s*@?OnlyPeachFWD/i,
                /"Following"/i,
                /"正在关注"/i,
                /"已关注"/i
            ];

            for (const pattern of followingPatterns) {
                if (pattern.test(html)) {
                    console.log('[关注校验] 匹配到 Following 文本 -> 已关注');
                    return true;
                }
            }

            // 方法3：检测按钮文本内容
            const buttonTextMatch = html.match(/<button[^>]*>([^<]*(?:Following|正在关注|已关注)[^<]*)<\/button>/i);
            if (buttonTextMatch) {
                console.log('[关注校验] 检测到按钮文本:', buttonTextMatch[1], '-> 已关注');
                return true;
            }

            // 方法4：检测 follow 按钮（未关注）
            if (/data-testid=["\']follow["\']/i.test(html)) {
                console.log('[关注校验] 检测到 follow 按钮 -> 未关注');
                return false;
            }

            // 输出部分HTML用于调试
            const relevantHtml = html.match(/.{0,200}(follow|Following|关注).{0,200}/gi);
            if (relevantHtml) {
                console.log('[关注校验] 相关HTML片段:', relevantHtml.slice(0, 3));
            }

            console.log('[关注校验] 无法确定关注状态');
            return null; // 未能判定
        } catch (e) {
            console.error('[关注校验] 解析出错:', e);
            return null;
        }
    };

    const verifyFollowing = async (force = false) => {
        try {
            const cached = localStorage.getItem(FOLLOW_CACHE_KEY);
            if (!force && cached) {
                const obj = JSON.parse(cached);
                // 仅当缓存为“已关注”且未过期时直接通过；未关注则强制重新检查
                if (obj && obj.following === true && (Date.now() - obj.ts) < FOLLOW_TTL_MS) return true;
            }
            const url = `https://x.com/${REQUIRED_ACCOUNT}?_=${Date.now()}`; // 防缓存
            const res = await gmFetch(url, { method: 'GET', responseType: 'text', withCredentials: true, anonymous: false, headers: { 'User-Agent': userAgent, 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } });
            if (!res.ok) return false;
            const html = await res.text();
            const st = getFollowStateFromHtml(html);
            const following = st === true;
            localStorage.setItem(FOLLOW_CACHE_KEY, JSON.stringify({ following, ts: Date.now() }));
            return following;
        } catch (e) {
            return false;
        }
    };

    // 关注引导弹窗（网页中间居中显示）
    const showFollowDialog = async () => {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.75);
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
            `;
            const box = document.createElement('div');
            box.style.cssText = `
                width: 420px;
                max-width: 90vw;
                background: #15202B;
                color: #E6E9EA;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                transform: scale(0.9);
                animation: popIn 0.2s ease-out forwards;
            `;
            // 添加弹出动画
            const style = document.createElement('style');
            style.textContent = `
                @keyframes popIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);

            box.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">🍑</div>
                    <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">需要关注后才能启动</div>
                    <div style="font-size: 14px; color: #8B98A5; line-height: 1.5;">
                        使用自动化功能前，请先关注博主 <span style="color: #1DA1F2; font-weight: 600;">@${REQUIRED_ACCOUNT}</span><br>
                        关注完成后，可点击"我已关注"重新验证
                    </div>
                </div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="tmd-cancel" style="
                        padding: 12px 20px;
                        background: transparent;
                        border: 1px solid rgba(139, 152, 165, 0.4);
                        border-radius: 10px;
                        color: #8B98A5;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s;
                    ">取消</button>
                    <button id="tmd-verified" style="
                        padding: 12px 20px;
                        background: #1E2732;
                        border: none;
                        border-radius: 10px;
                        color: #E6E9EA;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s;
                    ">我已关注</button>
                    <button id="tmd-follow" style="
                        padding: 12px 24px;
                        background: #1DA1F2;
                        border: none;
                        border-radius: 10px;
                        color: #fff;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.2s;
                    ">立即关注</button>
                </div>
            `;

            // 按钮悬停效果
            const addHoverEffect = (btn, hoverStyle) => {
                const originalStyle = btn.style.cssText;
                btn.onmouseenter = () => { btn.style.cssText = originalStyle + hoverStyle; };
                btn.onmouseleave = () => { btn.style.cssText = originalStyle; };
            };

            overlay.appendChild(box);
            document.body.appendChild(overlay);

            const cleanup = () => {
                try {
                    document.body.removeChild(overlay);
                    document.head.removeChild(style);
                } catch(_){}
            };

            const cancelBtn = box.querySelector('#tmd-cancel');
            const verifiedBtn = box.querySelector('#tmd-verified');
            const followBtn = box.querySelector('#tmd-follow');

            addHoverEffect(cancelBtn, 'background: rgba(139, 152, 165, 0.1);');
            addHoverEffect(verifiedBtn, 'background: #2A3441;');
            addHoverEffect(followBtn, 'background: #1991DB; transform: translateY(-1px);');

            cancelBtn.onclick = () => { cleanup(); resolve(false); };
            followBtn.onclick = () => {
                try { window.open(`https://x.com/${REQUIRED_ACCOUNT}`, '_blank'); } catch(_){}
            };
            verifiedBtn.onclick = async () => {
                verifiedBtn.textContent = '验证中...';
                verifiedBtn.disabled = true;

                // 清除缓存，强制重新检查
                localStorage.removeItem(FOLLOW_CACHE_KEY);

                const pass = await verifyFollowing(true);
                if (!pass) {
                    verifiedBtn.textContent = '我已关注';
                    verifiedBtn.disabled = false;

                    // 提供更详细的调试信息
                    const debugInfo = `
检测失败，请检查：
1. 确认已在 https://x.com/${REQUIRED_ACCOUNT} 点击关注
2. 刷新页面后再试
3. 检查浏览器控制台的调试信息

如仍有问题，请截图控制台日志反馈。
                    `.trim();
                    alert(debugInfo);
                    return;
                }
                cleanup();
                resolve(true);
            };

            // ESC键关闭
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    };

    const gateAutomation = async () => {
        // 暂时关闭验证，直接放行
        return true;
    };

    const createApiHeaders = () => {
        const GUEST_AUTHORIZATION = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
        const headers = {
            'authorization': GUEST_AUTHORIZATION,
            'x-csrf-token': getCookie('ct0'),
            'x-twitter-client-language': 'en',
            'x-twitter-active-user': 'yes',
            'content-type': 'application/json'
        };
        const guestToken = getCookie('gt');
        if (guestToken) {
            headers['x-guest-token'] = guestToken;
        } else {
            headers['x-twitter-auth-type'] = 'OAuth2Session';
        }
        return headers;
    };

    const getCurrentLanguage = () => document.documentElement.lang || 'en';
    const getMainTweetUrl = (cell) => {
        let timeEl = cell.querySelector('article[data-testid="tweet"] a[href*="/status/"][role="link"] time');
        if (timeEl && timeEl.parentElement) return timeEl.parentElement.href;
        return cell.querySelector('article[data-testid="tweet"] a[href*="/status/"]')?.href || "";
    };
    const getCookie = (name) => {
        const cookies = Object.fromEntries(document.cookie.split(';').filter(n => n.includes('=')).map(n => n.split('=').map(decodeURIComponent).map(s => s.trim())));
        return name ? cookies[name] : cookies;
    };
    const getMediaInfoFromUrl = (url) => {
        if (url.includes('pbs.twimg.com/media/')) {
            const extMatch = url.match(/format=([a-zA-Z0-9]+)/);
            const ext = extMatch ? extMatch[1] : 'jpg';
            return { ext: ext, typeLabel: 'img' };
        } else if (url.includes('video.twimg.com/ext_tw_video/') || url.includes('video.twimg.com/tweet_video/') || url.includes('video.twimg.com/amplify_video/')) {
            let ext = 'mp4';
            if (!url.includes('pbs.twimg.com/tweet_video/')) {
                const pathMatch = url.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
                if (pathMatch) ext = pathMatch[1];
            }
            const typeLabel = url.includes('tweet_video') ? 'gif' : 'video';
            return { ext: ext, typeLabel: typeLabel };
        }
        return { ext: 'jpg', typeLabel: 'img' };
    };

    // 媒体下载核心功能
    const fetchTweetDetailWithGraphQL = async (postId) => {
        const TWEET_RESULT_BY_REST_ID_QUERY_ID = "zAz9764BcLZOJ0JU2wrd1A";
        const TWEET_DETAIL_FEATURES = {
            "creator_subscriptions_tweet_preview_api_enabled": true,
            "premium_content_api_read_enabled": false,
            "communities_web_enable_tweet_community_results_fetch": true,
            "c9s_tweet_anatomy_moderator_badge_enabled": true,
            "responsive_web_grok_analyze_button_fetch_trends_enabled": false,
            "responsive_web_grok_analyze_post_followups_enabled": false,
            "responsive_web_jetfuel_frame": false,
            "responsive_web_grok_share_attachment_enabled": true,
            "articles_preview_enabled": true,
            "responsive_web_edit_tweet_api_enabled": true,
            "graphql_is_translatable_rweb_tweet_is_translatable_enabled": true,
            "view_counts_everywhere_api_enabled": true,
            "longform_notetweets_consumption_enabled": true,
            "responsive_web_twitter_article_tweet_consumption_enabled": true,
            "tweet_awards_web_tipping_enabled": false,
            "responsive_web_grok_show_grok_translated_post": false,
            "responsive_web_grok_analysis_button_from_backend": false,
            "creator_subscriptions_quote_tweet_preview_enabled": false,
            "freedom_of_speech_not_reach_fetch_enabled": true,
            "standardized_nudges_misinfo": true,
            "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": true,
            "longform_notetweets_rich_text_read_enabled": true,
            "longform_notetweets_inline_media_enabled": true,
            "profile_label_improvements_pcf_label_in_post_enabled": true,
            "rweb_tipjar_consumption_enabled": true,
            "verified_phone_label_enabled": false,
            "responsive_web_grok_image_annotation_enabled": true,
            "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
            "responsive_web_graphql_timeline_navigation_enabled": true,
            "responsive_web_enhance_cards_enabled": false
        };
        const TWEET_DETAIL_FIELD_TOGGLES = {
            "withArticleRichContentState": true, "withArticlePlainText": false,
            "withGrokAnalyze": false, "withDisallowedReplyControls": false
        };
        const variables = {
            "tweetId": postId, "withCommunity": false,
            "includePromotedContent": false, "withVoice": false
        };
        const apiUrl = `https://x.com/i/api/graphql/${TWEET_RESULT_BY_REST_ID_QUERY_ID}/TweetResultByRestId`;
        const url = encodeURI(`${apiUrl}?variables=${JSON.stringify(variables)}&features=${JSON.stringify(TWEET_DETAIL_FEATURES)}&fieldToggles=${JSON.stringify(TWEET_DETAIL_FIELD_TOGGLES)}`);
        const headers = createApiHeaders();
        if (!headers) {
            throw new Error('tweetResultByRestId headers not available.');
        }
        const res = await gmFetch(url, { headers, responseType: 'json' });
        if (!res.ok) throw new Error(`TweetResultByRestId failed: ${res.status}`);
        return res.json();
    };

    const getValidMediaElements = (cell) => {
        let validImages = [], validVideos = [], validGifs = [];
        validImages = Array.from(cell.querySelectorAll("img[src^='https://pbs.twimg.com/media/']"))
            .filter(img => (
                !img.closest("div[tabindex='0'][role='link']") &&
                !img.closest("div[data-testid='previewInterstitial']")
            ));
        const videoCandidates_videoTag = Array.from(cell.querySelectorAll("video"));
        videoCandidates_videoTag.forEach(video => {
            if (video.closest("div[tabindex='0'][role='link']")) return;
            if (!video.closest("div[data-testid='videoPlayer']")) return;
            if (video.src?.startsWith("https://video.twimg.com/tweet_video")) {
                validGifs.push(video);
            } else if (video.poster?.includes("/ext_tw_video_thumb/") || video.poster?.includes("/amplify_tw_video_thumb/") || video.poster?.includes("/amplify_video_thumb/") || video.poster?.includes("/media/")) {
                validVideos.push(video);
            }
        });
        const videoCandidates_imgTag = Array.from(cell.querySelectorAll("img[src]"));
        videoCandidates_imgTag.forEach(img => {
            if (img.closest("div[tabindex='0'][role='link']")) return;
            if (!img.closest("div[data-testid='previewInterstitial']")) return;
            if (img.src.startsWith("https://pbs.twimg.com/tweet_video_thumb/")) {
                validGifs.push(img);
            } else if (img.src.includes("/ext_tw_video_thumb/") || img.src.includes("/amplify_tw_video_thumb/") || img.src.includes("/amplify_video_thumb/") || img.src.includes("/media/")) {
                validVideos.push(img);
            }
        });
        return { images: validImages, videos: validVideos, gifs: validGifs };
    };

    const getTweetFilenameElements = (url, cell) => {
        const match = url.match(/^https?:\/\/(?:twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/);
        if (!match) return null;
        const userNameContainer = cell.querySelector("div[data-testid='User-Name'] div[dir='ltr'] span");
        const postTimeElement = cell.querySelector("article[data-testid='tweet'] a[href*='/status/'][role='link'] time");
        let userName = 'unknown';
        if (userNameContainer) {
            userName = '';
            userNameContainer.querySelectorAll('*').forEach(el => {
                userName += el.nodeName === 'IMG' ? el.alt : (el.nodeName === 'SPAN' ? el.textContent : '');
            });
            userName = userName.trim();
        }
        return {
            userId: match[1],
            userName: userName || 'unknown',
            postId: match[2],
            postTime: postTimeElement?.getAttribute('datetime') || 'unknown'
        };
    };

    const getMediaURLs = async (cell, filenameElements) => {
        const mediaElems = getValidMediaElements(cell);
        const imageURLs = mediaElems.images.map(img => img.src.includes("name=") ? img.src.replace(/name=.*/ig, 'name=4096x4096') : img.src);
        let gifURLs = mediaElems.gifs.map(gif => gif.src);
        let videoURLs = [];
        gifURLs = gifURLs.map(gifURL => {
            if (gifURL.startsWith("https://pbs.twimg.com/tweet_video_thumb/")) {
                const gifIdBaseUrl = gifURL.split('?')[0];
                const gifId = gifIdBaseUrl.split('/').pop();
                return `https://video.twimg.com/tweet_video/${gifId}.mp4`;
            }
            return gifURL;
        });
        if (mediaElems.videos.length > 0) {
            const tweet_res = await fetchTweetDetailWithGraphQL(filenameElements.postId);
            if (!tweet_res.data) return { imageURLs: [], gifURLs: [], videoURLs: [] };
            const tweet_result = tweet_res.data.tweetResult.result;
            const tweet_obj = tweet_result.tweet || tweet_result;
            tweet_obj.extended_entities = tweet_obj.extended_entities || tweet_obj.legacy?.extended_entities;
            const extEntities = tweet_obj.extended_entities;
            if (extEntities?.media) {
                videoURLs = extEntities.media
                    .filter(media => media.type === 'video' && media.video_info?.variants)
                    .map(media => media.video_info.variants.filter(variant => variant.content_type === 'video/mp4').reduce((prev, current) => (prev.bitrate > current.bitrate) ? prev : current, media.video_info.variants[0])?.url)
                    .filter(url => url);
            } else if (tweet_obj.card?.legacy?.binding_values) {
                const unifiedCardBinding = tweet_obj.card.legacy.binding_values.find(bv => bv.key === 'unified_card');
                if (unifiedCardBinding?.value?.string_value) {
                    try {
                        const unifiedCard = JSON.parse(unifiedCardBinding.value.string_value);
                        if (unifiedCard.media_entities) {
                            videoURLs = Object.values(unifiedCard.media_entities)
                                .filter(media => media.type === 'video' && media.video_info?.variants)
                                .map(media => media.video_info.variants.filter(variant => variant.content_type === 'video/mp4').reduce((prev, current) => (prev.bitrate > current.bitrate) ? prev : current, media.video_info.variants[0])?.url)
                                .filter(url => url);
                        }
                    } catch (e) {
                        console.error("Error parsing unified_card JSON:", e);
                    }
                }
            }
        }
        return { imageURLs: imageURLs, gifURLs: gifURLs, videoURLs: videoURLs };
    };

    // ========== 全局状态 ==========
    const STATE = {
        running: false,  // 默认关闭自动化
        autoLike: false,
        autoFollow: false,
        autoRetweet: false,
        safeMode: true,
        originalsOnly: false,
        hideSpaces: false,
        hdMedia: true,
        videoMode: false,
        mediaDownload: true,
        logCollapsed: false,
        processed: new Set(),
        count: { like: 0, follow: 0, retweet: 0 },
        rate: { like: 50, follow: 20, retweet: 15, resetAt: Date.now() + 60*60*1000 },
        actionInterval: 2500,
        maxActionsPerCycle: 2,
        isProcessing: false,
        panelCollapsed: false,
        tickMs: 15000
    };


    // LOG 函数已移动到后文定义（支持去重和计数）

    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const textOf = (el) => (el?.textContent || el?.innerText || '').trim();
    const getHash = (el) => {
        if (!el) return '';
        try {
            const r = el.getBoundingClientRect();
            return `${(r.left|0)}-${(r.top|0)}-${(el.getAttribute('data-testid')||'')}-${textOf(el).slice(0,20)}`;
        } catch (e) {
            return String(Math.random());
        }
    };

    const qs = (sel, root=document) => root.querySelector(sel);
    const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
    const $ = qs;
    const num = (sel, def) => parseInt($(sel)?.value, 10) || def;
    const updProcessed = () => { const el = $('#twx-processed'); if (el) el.textContent = String(STATE.processed.size); };

    const resetRateIfNeeded = () => {
        if (Date.now() > STATE.rate.resetAt) {
            STATE.count = { like: 0, follow: 0, retweet: 0 };
            STATE.rate.resetAt = Date.now() + 60*60*1000;
            STATE.processed.clear();
            LOG('速率限制计数已重置');
        }
    };


    // ========== 基础点击与行为 ==========
    async function safeClick(btn) {
        if (!btn || typeof btn.click !== 'function') return false;
        try {
            btn.scrollIntoView({behavior:'smooth', block:'center'});
            await sleep(rand(200, 450));
            btn.click();
            return true;
        } catch (e) {
            return false;
        }
    }
    // ========== 视频模式功能 (已合并至面板控制) ==========
    // 旧代码已移除，使用后文定义的统一逻辑


    // ========== 文本识别 ==========
    const TXT = {
        follow: ['关注', '關注', 'Follow'],
        following: ['正在关注', '已关注', '取消关注', '正在關注', '已關注', '取消關注', 'Following'],
        unfollowConfirmTestId: 'confirmationSheetConfirm',
        likeTestId: 'like',
        unlikeTestId: 'unlike',
        retweetTestId: 'retweet',
        unretweetTestId: 'unretweet'
    };

    function findLikeButtons() {
        // 使用更精确的 data-testid 选择器
        const list = qsa('[data-testid="like"]');
        return list.filter(btn => {
            const hash = 'like-' + getHash(btn);
            if (STATE.processed.has(hash)) return false;

            const aria = btn.getAttribute('aria-label') || '';
            const liked = /已喜欢|取消喜欢|Liked|Unlike/.test(aria) || btn.getAttribute('data-testid') === 'unlike';

            if (!liked) {
                STATE.processed.add(hash);
                return true;
            }
            return false;
        });
    }


    function isFollowText(text) { return TXT.follow.includes(text); }
    function isFollowingText(text) { return TXT.following.some(t => text.includes(t)); }

    function findFollowButtons() {
        // 优先查找明确的关注按钮，同时也扫描通用按钮作为后备
        const specificButtons = qsa('[data-testid$="-follow"]');
        const genericButtons = qsa('div[role="button"], button');
        // 合并并去重
        const all = [...new Set([...specificButtons, ...genericButtons])];

        const res = [];
        for (const btn of all) {
            const t = textOf(btn);
            if (!t) continue;

            const hash = 'follow-' + getHash(btn);
            if (STATE.processed.has(hash)) continue;

            if (isFollowText(t) && !isFollowingText(t)) {
                const aria = btn.getAttribute('aria-label') || '';
                const already = /正在关注|已关注|正在關注|已關注|Following/.test(aria) ||
                              btn.querySelector('[data-testid="userFollowing"]') ||
                              btn.getAttribute('data-testid') === 'userFollowing';

                if (!already) {
                    STATE.processed.add(hash);
                    res.push(btn);
                }
            }
        }
        return res;
    }

    function findRetweetButtons() {
        const list = qsa('[data-testid="retweet"]');
        return list.filter(btn => {
            const hash = 'rt-' + getHash(btn);
            if (STATE.processed.has(hash)) return false;
            STATE.processed.add(hash);
            return true;
        });
    }

    async function doLike(btn) {
        if (!btn) return false;
        if (!(await safeClick(btn))) return false;
        STATE.count.like++;
        LOG('点赞成功', 'success');
        await sleep(rand(800, 1300));
        return true;
    }

    async function doFollow(btn) {
        if (!btn) return false;
        const t = textOf(btn);
        if (!isFollowText(t)) { LOG(`跳过可疑关注按钮: "${t}"`, 'warning'); return false; }
        if (!(await safeClick(btn))) return false;
        STATE.count.follow++; LOG('关注成功', 'success');
        await sleep(rand(700, 1200));
        return true;
    }

    async function doRetweet(btn) {
        if (!btn) return false;
        if (!(await safeClick(btn))) return false;
        LOG('已点开转帖菜单');
        await sleep(700);
        const menuItem = qsa('div[role="menuitem"], div[role="button"], span').find(e => {
            const s = textOf(e);
            return ['转帖', '轉推', 'Retweet'].includes(s);
        }) || qs('[data-testid="retweetConfirm"]');
        if (menuItem && await safeClick(menuItem)) {
            STATE.count.retweet++;
            LOG('转帖成功', 'success');
            await sleep(rand(900, 1500));
            return true;
        }
        LOG('未找到转帖确认', 'error');
        return false;
    }

    function jitter(base) {
        const delta = Math.floor(base * (STATE.safeMode ? 0.25 : 0.12));
        return base + rand(-delta, delta);
    }

    async function autoCycle() {
        if (STATE.isProcessing || !STATE.running) return;
        STATE.isProcessing = true;
        resetRateIfNeeded();

        try {
            let did = 0;

            // 点赞
            if (STATE.autoLike && STATE.count.like < STATE.rate.like) {
                const list = findLikeButtons().slice(0, STATE.maxActionsPerCycle);
                if (list.length) LOG(`准备点赞 ${list.length} 条`);
                for (const b of list) {
                    if (await doLike(b)) { did++; await sleep(STATE.actionInterval + rand(200,600)); }
                }
            }

            // 关注
            if (STATE.autoFollow && STATE.count.follow < STATE.rate.follow) {
                const list = findFollowButtons().slice(0, STATE.maxActionsPerCycle);
                if (list.length) LOG(`准备关注 ${list.length} 个`);
                for (const b of list) {
                    if (await doFollow(b)) { did++; await sleep(STATE.actionInterval + rand(200,600)); }
                }
            }

            // 转帖
            if (STATE.autoRetweet && STATE.count.retweet < STATE.rate.retweet) {
                const list = findRetweetButtons().slice(0, 1);
                if (list.length) LOG(`准备转帖 ${list.length} 条`);
                for (const b of list) {
                    if (await doRetweet(b)) { did++; await sleep(STATE.actionInterval + rand(600,900)); }
                }
            }

            if (!did) {
                LOG('当前无可操作内容，尝试滚动加载更多…', 'info');
                window.scrollBy({ top: rand(800, 1400), behavior: 'smooth' });
            } else {
                LOG(`本轮完成。累计 => 赞:${STATE.count.like} 关:${STATE.count.follow} 转:${STATE.count.retweet}`, 'success');
            }
        } catch (e) {
            LOG('执行出错：' + (e?.message || e), 'error');
        } finally {
            STATE.isProcessing = false;
        }
    }

    function startLoop() {
        if (STATE.timer) clearInterval(STATE.timer);
        STATE.timer = setInterval(autoCycle, STATE.tickMs);
        LOG('🔄 自动化循环已启动，间隔: ' + STATE.tickMs + 'ms', 'info');
    }

    // ========== UI 面板 ==========
    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'twx-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            background: rgba(21, 32, 43, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: white;
            transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        // 面板头部
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 16px 20px;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        `;
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:24px;height:24px;color:#1DA1F2;">
                    <!-- Lens Icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="3" />
                        <path d="M5 12h2" />
                        <path d="M17 12h2" />
                        <path d="M12 5v2" />
                        <path d="M12 17v2" />
                    </svg>
                </div>
                <div>
                    <div style="font-weight:700;font-size:14px;letter-spacing:0.5px;">X-Lens v2.0</div>
                    <div style="font-size:10px;opacity:0.6;margin-top:2px;">Pro Vision</div>
                </div>
            </div>
            <button id="twx-toggle-panel" style="
                width: 28px; height: 28px; border-radius: 50%;
                background: rgba(255,255,255,0.1); border: none;
                color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
                transition: background 0.2s;
            ">▼</button>
        `;
        panel.appendChild(header);

        // 面板主体内容
        const body = document.createElement('div');
        body.id = 'twx-panel-body';
        body.style.cssText = `padding: 20px;`;

        // 生成开关样式
        const checkboxStyle = `
            appearance: none; width: 40px; height: 22px; background: rgba(255,255,255,0.1);
            border-radius: 12px; position: relative; cursor: pointer; transition: background 0.3s;
            outline: none;
        `;
        const sliderStyle = `
            content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
            background: white; border-radius: 50%; transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        const styleTag = document.createElement('style');
        styleTag.textContent = `
            .twx-toggle input:checked { background: #1D9BF0 !important; }
            .twx-toggle input:checked::after { transform: translateX(18px); }
            .twx-toggle input::after { ${sliderStyle} }
            .twx-btn-hover:hover { filter: brightness(1.2); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
            .twx-btn-active:active { transform: translateY(0); filter: brightness(0.9); }
        `;
        panel.appendChild(styleTag);

        const createSwitch = (id, label) => `
            <label class="twx-toggle" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;cursor:pointer;">
                <span style="font-size:13px;font-weight:500;color:#E7E9EA;">${label}</span>
                <input type="checkbox" id="${id}" style="${checkboxStyle}">
            </label>
        `;

        body.innerHTML = `
            <!-- 自动化开关组 -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:x 16px; margin-bottom: 20px;">
                ${createSwitch('twx-like', '自动点赞')}
                ${createSwitch('twx-follow', '智能关注')}
                ${createSwitch('twx-retweet', '自动转发')}
                ${createSwitch('twx-originals-only', '只看原创')}
                ${createSwitch('twx-hide-spaces', '清爽模式')}
                ${createSwitch('twx-video-mode', '视频模式')}
                ${createSwitch('twx-hd-media', '高清媒体')}
                ${createSwitch('twx-media-download', '媒体下载')}
            </div>

            <!-- 频率设置卡片 -->
            <div style="background:rgba(0,0,0,0.2); border-radius:16px; padding:16px; margin-bottom: 20px; border:1px solid rgba(255,255,255,0.05);">
                <div style="font-weight:600;margin-bottom:12px;color:#8B98A5;font-size:11px;text-transform:uppercase;letter-spacing:1px;">频率控制 (次/小时)</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                    ${['like','follow','retweet'].map(k => `
                        <div style="position:relative;">
                            <input type="number" id="limit-${k}" value="${STATE.rate[k]}"
                                style="width:100%;padding:8px 0;background:transparent;border:none;border-bottom:2px solid #333;
                                color:white;text-align:center;font-weight:bold;font-size:16px;font-family:monospace;">
                            <div style="text-align:center;font-size:10px;color:#666;margin-top:4px;">${k === 'like' ? '点赞' : k === 'follow' ? '关注' : '转发'}</div>
                        </div>
                    `).join('')}
                </div>
                <button id="twx-save" class="twx-btn-hover twx-btn-active"
                    style="width:100%;margin-top:16px;padding:10px;background:rgba(29,155,240,0.15);color:#1D9BF0;
                    border:none;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;">
                    保存速率参数
                </button>
            </div>

            <!-- 主控按钮 -->
            <div style="display:grid;grid-template-columns:1fr 1.5fr; gap:12px; margin-bottom: 20px;">
                <button id="twx-run" class="twx-btn-hover twx-btn-active"
                    style="padding:12px;background:#333;color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;">
                    单次运行
                </button>
                <button id="twx-toggle" class="twx-btn-hover twx-btn-active"
                    style="padding:12px;background:linear-gradient(135deg, #1D9BF0, #1A8CD8);color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(29,155,240,0.3);">
                    启动自动化
                </button>
            </div>

            <!-- 底部行 -->
            <div style="display:flex;gap:10px;margin-bottom:16px;">
                <button id="twx-adv-search" class="twx-btn-hover" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);color:#EFF3F4;border:none;border-radius:8px;font-size:12px;cursor:pointer;">高级搜索</button>
                <button id="twx-clear" style="padding:8px 12px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#8B98A5;border-radius:8px;cursor:pointer;font-size:12px;">清空</button>
            </div>

            <!-- 状态栏 -->
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);">
                <div style="font-size:11px;color:#8899A6;">
                    <span id="twx-status" style="color:#F91880;font-weight:bold;margin-right:8px;">● 休眠中</span>
                    处理: <span id="twx-processed" style="color:white;font-family:monospace;">0</span>
                </div>
                <button id="twx-toggle-log" style="background:none;border:none;color:#1D9BF0;font-size:11px;cursor:pointer;font-weight:600;">展开日志</button>
            </div>

            <div id="twx-log" style="max-height:150px;overflow-y:auto;background:#000;margin-top:12px;padding:10px;border-radius:8px;font-family:monospace;font-size:10px;color:#ccc;border:1px solid #333;display:none;"></div>
        `;
        panel.appendChild(body);
        document.body.appendChild(panel);

        // 默认最小化面板（只显示标题栏）
        body.style.display = 'none';
        const togglePanelBtn = panel.querySelector('#twx-toggle-panel');
        if (togglePanelBtn) {
            togglePanelBtn.textContent = '▲';
            togglePanelBtn.style.background = 'rgba(29,161,242,0.3)';
        }
        STATE.panelCollapsed = true;

        // 载入持久化位置
        try {
            const saved = JSON.parse(localStorage.getItem('twx_panel_pos') || 'null');
            if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
                panel.style.left = saved.left + 'px';
                panel.style.top = saved.top + 'px';
                panel.style.right = 'auto';
            }
        } catch(_) {}

        // 拖拽移动 + 边缘吸附 + 位置持久化
        (function enableDrag(){
            let dragging = false; let sx=0, sy=0, sl=0, st=0;
            const onMouseDown = (e) => {
                dragging = true;
                const rect = panel.getBoundingClientRect();
                sx = e.clientX; sy = e.clientY; sl = rect.left; st = rect.top;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            const onMouseMove = (e) => {
                if (!dragging) return;
                let nl = sl + (e.clientX - sx);
                let nt = st + (e.clientY - sy);
                nl = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, nl));
                nt = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, nt));
                panel.style.left = nl + 'px';
                panel.style.top = nt + 'px';
                panel.style.right = 'auto';
            };
            const onMouseUp = () => {
                if (!dragging) return;
                dragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                const rect = panel.getBoundingClientRect();
                // 边缘吸附 12px
                if (rect.left < 12) panel.style.left = '12px';
                if (window.innerWidth - rect.right < 12) panel.style.left = (window.innerWidth - panel.offsetWidth - 12) + 'px';
                if (rect.top < 12) panel.style.top = '12px';
                // 持久化
                try { localStorage.setItem('twx_panel_pos', JSON.stringify({ left: parseInt(panel.style.left)||12, top: parseInt(panel.style.top)||12 })); } catch(_){}
            };
            header.addEventListener('mousedown', onMouseDown);
        })();

        // 绑定事件
        $('#twx-like').onchange = e => STATE.autoLike = e.target.checked;
        $('#twx-follow').onchange = e => STATE.autoFollow = e.target.checked;
        $('#twx-retweet').onchange = e => STATE.autoRetweet = e.target.checked;
        $('#twx-originals-only').onchange = e => { STATE.originalsOnly = e.target.checked; toggleOriginalsOnly(STATE.originalsOnly); };
        $('#twx-hide-spaces').onchange = e => { STATE.hideSpaces = e.target.checked; toggleHideSpaces(STATE.hideSpaces); };
        $('#twx-hd-media').onchange = e => { STATE.hdMedia = e.target.checked; toggleHDMedia(STATE.hdMedia); };
        $('#twx-video-mode').onchange = e => { STATE.videoMode = e.target.checked; toggleVideoMode(STATE.videoMode); };

        // 修复媒体下载绑定
        const mediaDl = $('#twx-media-download');
        if (mediaDl) {
            mediaDl.checked = STATE.mediaDownload;
            mediaDl.onchange = e => { STATE.mediaDownload = e.target.checked; toggleMediaDownload(STATE.mediaDownload); };
        }

        $('#twx-save').onclick = () => {
            STATE.rate.like = num('#limit-like', STATE.rate.like);
            STATE.rate.follow = num('#limit-follow', STATE.rate.follow);
            STATE.rate.retweet = num('#limit-retweet', STATE.rate.retweet);
            LOG('速率限制已更新');
        };

        $('#twx-run').onclick = () => { LOG('手动触发全套任务'); autoCycle(); };

        // 修复按钮事件绑定 (Toggle)
        const toggleBtn = $('#twx-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = async () => {
                if (!STATE.running) {
                    const pass = await gateAutomation();
                    if (!pass) return;
                }
                STATE.running = !STATE.running;
                const st = $('#twx-status');
                if (STATE.running) {
                    toggleBtn.textContent = '暂停';
                    toggleBtn.style.background = '#F7931E'; // Warning Color for pause
                    st.textContent = '运行中';
                    st.style.color = '#1DA1F2';
                    startLoop();
                    LOG('🚀 自动化已启动', 'success');
                } else {
                    toggleBtn.textContent = '启动';
                    toggleBtn.style.background = 'linear-gradient(135deg, #1D9BF0, #1A8CD8)';
                    st.textContent = '已暂停';
                    st.style.color = '#f91880';
                    if (STATE.timer) {
                        clearInterval(STATE.timer);
                        STATE.timer = null;
                    }
                    LOG('⏸️ 自动化已暂停', 'warning');
                }
            };
        }
        $('#twx-adv-search').onclick = () => { openAdvancedSearchModal(); };
        $('#twx-clear').onclick = () => { $('#twx-log').innerHTML = ''; STATE.processed.clear(); updProcessed(); LOG('已清空'); };

        // 日志折叠功能
        $('#twx-toggle-log').onclick = () => {
            STATE.logCollapsed = !STATE.logCollapsed;
            const logBox = $('#twx-log');
            const toggleText = $('#log-toggle-text');

            if (STATE.logCollapsed) {
                logBox.style.display = 'none';
                toggleText.textContent = '▶';
            } else {
                logBox.style.display = 'block';
                toggleText.textContent = '▼';
            }
        };

        $('#twx-toggle-panel').onclick = () => {
            STATE.panelCollapsed = !STATE.panelCollapsed;
            const btn = $('#twx-toggle-panel');
            const body = $('#twx-panel-body');
            if (STATE.panelCollapsed) {
                body.style.display = 'none';
                btn.textContent = '▲';
                panel.style.height = 'auto'; // 自适应高度
                btn.style.background = 'rgba(29,161,242,0.3)';
            } else {
                body.style.display = 'block';
                btn.textContent = '▼';
                panel.style.height = 'auto';
                btn.style.background = 'rgba(29,161,242,0.2)';
            }
        };

        setInterval(updProcessed, 4000);
    }




    // ========== 视频模式功能 ==========
    function hasVideo(tweet) {
        try {
            // 检测视频元素
            const videoElements = tweet.querySelectorAll('video');
            if (videoElements.length > 0) return true;

            // 检测视频相关选择器
            const videoSelectors = [
                '[data-testid="videoPlayer"]',
                '[data-testid="playButton"]',
                '[data-testid="videoComponent"]',
                '[aria-label*="播放"]',
                '[aria-label*="Play"]',
                'div[role="button"][aria-label*="Play"]'
            ];

            for (const selector of videoSelectors) {
                if (tweet.querySelector(selector)) return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    function toggleVideoMode(enabled) {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        tweets.forEach(tweet => {
            if (enabled) {
                // 视频模式：只显示有视频的推文
                if (!hasVideo(tweet)) {
                    tweet.style.display = 'none';
                    tweet.classList.add('video-mode-hidden');
                } else {
                    tweet.style.display = '';
                    tweet.classList.remove('video-mode-hidden');
                }
            } else {
                // 关闭视频模式：显示所有推文
                tweet.style.display = '';
                tweet.classList.remove('video-mode-hidden');
            }
        });

        LOG(`视频模式已${enabled ? '开启' : '关闭'}，处理了 ${tweets.length} 条推文`, 'info');

        // 监听新推文
        if (enabled && !STATE.videoModeObserver) {
            let lastRun = 0;
            STATE.videoModeObserver = new MutationObserver(() => {
                if (STATE.videoMode && Date.now() - lastRun > 1000) {
                    lastRun = Date.now();
                    setTimeout(() => {
                        const newTweets = document.querySelectorAll('article[data-testid="tweet"]:not(.video-mode-processed)');
                        newTweets.forEach(tweet => {
                            tweet.classList.add('video-mode-processed');
                            if (!hasVideo(tweet)) {
                                tweet.style.display = 'none';
                                tweet.classList.add('video-mode-hidden');
                            }
                        });
                    }, 300);
                }
            });
            STATE.videoModeObserver.observe(document.body, { childList: true, subtree: true });
        } else if (!enabled && STATE.videoModeObserver) {
            STATE.videoModeObserver.disconnect();
            STATE.videoModeObserver = null;
            // 清理处理标记和原创标签
            document.querySelectorAll('.video-mode-processed').forEach(tweet => {
                tweet.classList.remove('video-mode-processed');
            });
            document.querySelectorAll('.original-label').forEach(label => label.remove());
        }
    }

    // ========== 媒体下载功能 ==========
    let mediaDownloadObserver = null;

    const downloadMediaWithFetchStream = async (mediaSrcURL) => {
        const headers = { 'User-Agent': userAgent };
        try {
            const res = await gmFetch(mediaSrcURL, { headers, responseType: 'blob' });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const originalBlob = await res.blob();
            const mediaInfo = getMediaInfoFromUrl(mediaSrcURL);
            let inferredMimeType = '';
            switch (mediaInfo.ext.toLowerCase()) {
                case 'jpg': case 'jpeg': inferredMimeType = 'image/jpeg'; break;
                case 'png': inferredMimeType = 'image/png'; break;
                case 'gif': inferredMimeType = 'video/mp4'; break;
                case 'mp4': inferredMimeType = 'video/mp4'; break;
                case 'webm': inferredMimeType = 'video/webm'; break;
                default: inferredMimeType = originalBlob.type || 'application/octet-stream'; break;
            }
            if (!originalBlob.type || originalBlob.type !== inferredMimeType) {
                return new Blob([originalBlob], { type: inferredMimeType });
            }
            return originalBlob;
        } catch (error) {
            console.error("Error downloading media with fetch stream:", error);
            return null;
        }
    };

    const blobToDataURL = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    };

    const blobToUint8Array = async (blob) => {
        const arrayBuffer = await blob.arrayBuffer();
        try {
            return new Uint8Array(structuredClone(arrayBuffer));
        } catch (e) {
            return new Uint8Array(arrayBuffer);
        }
    };

    const downloadBlobAsFile = async (blob, filename) => {
        const a = document.createElement("a");
        a.download = filename;
        if (isAppleMobile) {
            const dataUrl = await blobToDataURL(blob);
            a.href = dataUrl;
        } else {
            const blobUrl = URL.createObjectURL(blob);
            a.href = blobUrl;
        }
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (!isAppleMobile && a.href.startsWith('blob:')) {
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }
    };

    const downloadZipArchive = async (blobs, filenameElements, mediaURLs) => {
        const files = {};
        const filenames = blobs.map((_, index) => {
            const mediaInfo = getMediaInfoFromUrl(mediaURLs[index]);
            return generateFilename(filenameElements, mediaInfo.typeLabel, index + 1, mediaInfo.ext);
        });
        const uint8Arrays = await Promise.all(blobs.map(blob => blobToUint8Array(blob)));
        uint8Arrays.forEach((uint8Array, index) => {
            files[filenames[index]] = uint8Array;
        });
        const zipData = await new Promise((resolve, reject) => {
            fflate.zip(files, { level: 0 }, (err, zipData) => {
                if (err) {
                    console.error("ZIP archive creation failed:", err);
                    alert("ZIP文件创建失败。");
                    reject(err);
                } else {
                    resolve(zipData);
                }
            });
        });
        const zipBlob = new Blob([zipData], { type: 'application/zip' });
        const filename = generateFilename(filenameElements, 'medias', '', 'zip');
        await downloadBlobAsFile(zipBlob, filename);
    };

    const downloadMedia = async (imageURLs, gifURLs, videoURLs, filenameElements, btn_down, allMediaURLs) => {
        const mediaCount = imageURLs.length + gifURLs.length + videoURLs.length;
        if (mediaCount === 1) {
            let mediaURL = imageURLs[0] || gifURLs[0] || videoURLs[0];
            const blob = await downloadMediaWithFetchStream(mediaURL);
            if (blob) {
                const mediaInfo = getMediaInfoFromUrl(mediaURL);
                const filename = generateFilename(filenameElements, mediaInfo.typeLabel, 1, mediaInfo.ext);
                await downloadBlobAsFile(blob, filename);
                markPostAsDownloadedIndexedDB(filenameElements.postId);
                setTimeout(() => {
                    status(btn_down, 'completed');
                }, 300);
            } else {
                status(btn_down, 'failed');
                setTimeout(() => status(btn_down, 'download'), 3000);
            }
        } else if (mediaCount > 1) {
            const blobs = (await Promise.all([...imageURLs, ...gifURLs, ...videoURLs].map(url => downloadMediaWithFetchStream(url)))).filter(blob => blob);
            if (blobs.length === mediaCount) {
                if (isMobile) {
                    await downloadZipArchive(blobs, filenameElements, allMediaURLs);
                } else {
                    for (const [index, blob] of blobs.entries()) {
                        const mediaURL = allMediaURLs[index];
                        const mediaInfo = getMediaInfoFromUrl(mediaURL);
                        const filename = generateFilename(filenameElements, mediaInfo.typeLabel, index + 1, mediaInfo.ext);
                        await downloadBlobAsFile(blob, filename);
                    }
                }
                markPostAsDownloadedIndexedDB(filenameElements.postId);
                setTimeout(() => {
                    status(btn_down, 'completed');
                }, 300);
            } else {
                status(btn_down, 'failed');
                setTimeout(() => status(btn_down, 'download'), 3000);
            }
        }
    };

    const status = (btn, css) => {
        btn.classList.remove('download', 'loading', 'failed', 'completed');
        if (css) btn.classList.add(css);
    };

    const getNoImageMessage = () => {
        const lang = getCurrentLanguage();
        return lang === 'ja' ? "このツイートには画像または動画がありません！" : "There is no image or video in this tweet!";
    };

    const createDownloadButton = async (cell) => {
        let btn_group = cell.querySelector('div[role="group"]:last-of-type, ul.tweet-actions, ul.tweet-detail-actions');
        if (!btn_group) return;
        let btn_share = Array.from(btn_group.querySelectorAll(':scope>div>div, li.tweet-action-item>a, li.tweet-detail-action-item>a')).pop().parentNode;
        if (!btn_share) return;

        let btn_down = btn_share.cloneNode(true);
        btn_down.classList.add('tmd-down', 'download');
        const btnElem = btn_down.querySelector('button');
        if (btnElem) btnElem.removeAttribute('disabled');
        const lang = getCurrentLanguage();
        if (btn_down.querySelector('button')) btn_down.querySelector('button').title = lang === 'ja' ? '画像と動画をダウンロード' : 'Download images and videos';

        btn_down.querySelector('svg').innerHTML = `
            <g class="download"><path d="M12 16 17.7 10.3 16.29 8.88 13 12.18 V2.59 h-2 v9.59 L7.7 8.88 6.29 10.3 Z M21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" fill="currentColor" stroke="currentColor" stroke-width="0.20" stroke-linecap="round" /></g>
            <g class="loading"><circle cx="12" cy="12" r="10" fill="none" stroke="#1DA1F2" stroke-width="4" opacity="0.4" /><path d="M12,2 a10,10 0 0 1 10,10" fill="none" stroke="#1DA1F2" stroke-width="4" stroke-linecap="round" /></g>
            <g class="failed"><circle cx="12" cy="12" r="11" fill="#f33" stroke="currentColor" stroke-width="2" opacity="0.8" /><path d="M14,5 a1,1 0 0 0 -4,0 l0.5,9.5 a1.5,1.5 0 0 0 3,0 z M12,17 a2,2 0 0 0 0,4 a2,2 0 0 0 0,-4" fill="#fff" stroke="none" /></g>
            <g class="completed"><path d="M21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z M 7 10 l 3 4 q 1 1 2 0 l 8 -11 l -1.65 -1.2 l -7.35 10.1063 l -2.355 -3.14" fill="rgba(29, 161, 242, 1)" stroke="#1DA1F2" stroke-width="0.20" stroke-linecap="round" /></g>
        `;

        const filenameElements = getTweetFilenameElements(getMainTweetUrl(cell), cell);
        if (filenameElements) {
            if (downloadedPostsCache.has(filenameElements.postId)) {
                status(btn_down, 'completed');
            }
        }

        btn_down.onclick = async () => {
            if (btn_down.classList.contains('loading')) return;
            status(btn_down, 'loading');

            const mainTweetUrl = getMainTweetUrl(cell);
            const filenameElements = getTweetFilenameElements(mainTweetUrl, cell);
            if (!filenameElements) {
                alert("无法获取推文信息。");
                status(btn_down, 'download');
                return;
            }

            const mediaData = await getMediaURLs(cell, filenameElements);
            const mediaUrls = [...mediaData.imageURLs, ...mediaData.gifURLs, ...mediaData.videoURLs];
            if (mediaUrls.length === 0) {
                alert(getNoImageMessage());
                status(btn_down, 'download');
                return;
            }
            downloadMedia(mediaData.imageURLs, mediaData.gifURLs, mediaData.videoURLs, filenameElements, btn_down, mediaUrls);
        };
        if (btn_group) btn_group.insertBefore(btn_down, btn_share.nextSibling);
    };

    const processArticles = () => {
        const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
        cells.forEach(cell => {
            const mainTweet = cell.querySelector('article[data-testid="tweet"]');
            if (!mainTweet) return;
            const tweetUrl = getMainTweetUrl(cell);
            if (!getTweetFilenameElements(tweetUrl, cell)) return;
            const mediaElems = getValidMediaElements(cell);
            const mediaCount = mediaElems.images.length + mediaElems.videos.length + mediaElems.gifs.length;
            if (!cell.querySelector('.tmd-down') && mediaCount > 0) createDownloadButton(cell);
            // 翻译“Original”标签
            translateOriginalLabel(cell);
        });
    };

    // 将页面已有的“Original”文案替换为“原创”，不改变原有样式
    const translateOriginalLabel = (rootEl) => {
        const scope = rootEl || document;
        const candidates = scope.querySelectorAll('span, div, button');
        candidates.forEach(el => {
            if (el.childElementCount === 0 && el.textContent && el.textContent.trim() === 'Original') {
                el.textContent = '原创';
            }
        });
    };

    // 注入下载按钮的状态样式，避免多个<g>叠在一起
    const ensureTmdStyles = () => {
        if (document.getElementById('tmd-style')) return;
        const style = document.createElement('style');
        style.id = 'tmd-style';
        style.textContent = `
            .tmd-down svg { width: 20px; height: 20px; }
            .tmd-down g { display: none; }
            .tmd-down.download g.download,
            .tmd-down.loading g.loading,
            .tmd-down.failed g.failed,
            .tmd-down.completed g.completed { display: inline; }
            .tmd-down.loading svg g.loading { animation: tmd-spin 1s linear infinite; transform-box: fill-box; transform-origin: center; }
            @keyframes tmd-spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }
        `;
        document.head.appendChild(style);
    };

    const startMediaDownloadObserver = () => {
        ensureTmdStyles();
        if (mediaDownloadObserver) return;
        mediaDownloadObserver = new MutationObserver(processArticles);
        mediaDownloadObserver.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('load', processArticles);
        window.addEventListener('popstate', processArticles);
        window.addEventListener('hashchange', processArticles);
        processArticles(); // 立即处理现有内容
    };

    const stopMediaDownloadObserver = () => {
        if (mediaDownloadObserver) {
            mediaDownloadObserver.disconnect();
            mediaDownloadObserver = null;
        }
        window.removeEventListener('load', processArticles);
        window.removeEventListener('popstate', processArticles);
        window.removeEventListener('hashchange', processArticles);
        // 移除所有下载按钮和原创标签
        document.querySelectorAll('.tmd-down').forEach(btn => btn.remove());
        document.querySelectorAll('.original-label').forEach(label => label.remove());
        // 强制刷新页面上的下载按钮
        setTimeout(() => {
            if (STATE.mediaDownload) {
                processArticles();
            }
        }, 100);
    };

    function toggleMediaDownload(enabled) {
        if (enabled) {
            startMediaDownloadObserver();
            LOG('✅ 媒体下载功能已启用', 'success');
            // 强制刷新所有下载按钮
            setTimeout(() => {
                document.querySelectorAll('.tmd-down').forEach(btn => btn.remove());
                processArticles();
            }, 100);
        } else {
            stopMediaDownloadObserver();
            LOG('❌ 媒体下载功能已禁用', 'info');
        }
    }

    // ========== 只看原创内容 ==========
    function toggleOriginalsOnly(enabled) {
        if (enabled) {
            LOG('✅ 已开启只看原创内容', 'success');
            hideNonOriginalTweets();
        } else {
            LOG('❌ 已关闭只看原创内容', 'warning');
            showAllTweets();
        }
    }

    function hideNonOriginalTweets() {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        let hiddenCount = 0;

        tweets.forEach(tweet => {
            const socialContext = tweet.querySelector('span[data-testid="socialContext"]');
            if (socialContext) {
                tweet.style.display = 'none';
                tweet.classList.add('originals-hidden');
                hiddenCount++;
            }
        });

        LOG(`隐藏了 ${hiddenCount} 条非原创推文`, 'info');

        // 监听新内容
        if (!STATE.originalsObserver) {
            STATE.originalsObserver = new MutationObserver(() => {
                if (STATE.originalsOnly) {
                    setTimeout(hideNonOriginalTweets, 500);
                }
            });
            STATE.originalsObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    function showAllTweets() {
        const hiddenTweets = document.querySelectorAll('.originals-hidden');
        hiddenTweets.forEach(tweet => {
            tweet.style.display = '';
            tweet.classList.remove('originals-hidden');
        });

        if (STATE.originalsObserver) {
            STATE.originalsObserver.disconnect();
            STATE.originalsObserver = null;
        }
    }

    // ========== 隐藏直播间 ==========
    // ========== 清爽模式 (Hidden Spaces & Clean UI) ==========
    function toggleHideSpaces(enabled) {
        if (enabled) {
            LOG('✅ 已开启清爽模式', 'success');
            enableCleanMode();
        } else {
            LOG('❌ 已关闭清爽模式', 'warning');
            disableCleanMode();
        }
    }

    function enableCleanMode() {
        if (document.getElementById('clean-mode-style')) return;

        const style = document.createElement('style');
        style.id = 'clean-mode-style';
        style.textContent = `
            /* 1. 隐藏右侧边栏 (趋势、推荐) */
            [data-testid="sidebarColumn"] { display: none !important; }

            /* 2. 隐藏左侧导航栏 (仅保留极简图标或完全隐藏，用户要求只保留中间) */
            header[role="banner"] { display: none !important; }

            /* 3. 隐藏底部栏 (移动端) */
            [data-testid="BottomBar"] { display: none !important; }

            /* 4. 主内容居中并大幅加宽 - 影院级体验 */
            main[role="main"] {
                align-items: center !important;
                overflow-x: hidden;
            }
            [data-testid="primaryColumn"] {
                max-width: 950px !important;
                width: 100% !important;
                margin: 0 auto !important;
                border: none !important;
            }

            /* 让推文内容自动撑满新的宽度 */
            [data-testid="primaryColumn"] > div > div > div {
                max-width: 100% !important;
            }

            /* 优化媒体显示，防止变宽后过高 */
            div[data-testid="tweetPhoto"] {
                margin-top: 10px;
            }

            /* 5. 隐藏其他杂项 (如直播条) */
            [data-testid="SpaceBar"], [aria-label*="Space"] { display: none !important; }

            /* 6. 背景色统一 (可选) */
            body { background-color: #000 !important; }
        `;
        document.head.appendChild(style);

        // 触发一次 resize 以重新计算布局
        window.dispatchEvent(new Event('resize'));
    }

    function disableCleanMode() {
        const style = document.getElementById('clean-mode-style');
        if (style) style.remove();

        // 恢复布局
        window.dispatchEvent(new Event('resize'));
    }

    // (旧的 LOG 函数已移除，使用后文定义的优化版本)

    // ========== 高清媒体优化 ==========
    function toggleHDMedia(enabled) {
        if (enabled) {
            LOG('✅ 已开启高清媒体显示', 'success');
            enhanceMediaQuality();
        } else {
            LOG('❌ 已关闭高清媒体显示', 'warning');
            restoreMediaQuality();
        }
    }

    function enhanceMediaQuality() {
        // 1. 添加高清图片样式 (仅针对图片容器，不影响视频)
        if (!document.querySelector('#hd-media-style')) {
            const style = document.createElement('style');
            style.id = 'hd-media-style';
            style.textContent = `
                /* 仅针对推文图片容器内的图片 */
                div[data-testid="tweetPhoto"] img[src*="pbs.twimg.com"] {
                    max-width: none !important;
                    width: auto !important;
                    height: auto !important;
                    max-height: 80vh !important; /* 防止图片过高 */
                }
                /* 确保图片容器允许溢出 */
                div[data-testid="tweetPhoto"] {
                    overflow: visible !important;
                }
            `;
            document.head.appendChild(style);
        }

        // 2. 核心逻辑：安全地替换图片URL
        // 使用节流处理，避免频繁遍历 DOM
        if (!STATE.hdThrottler) {
            STATE.hdThrottler = throttle(() => {
                // 只选择推文图片，严格排除视频封面
                // 排除类名包含 video, player 的容器
                const images = document.querySelectorAll('div[data-testid="tweetPhoto"] img[src*="pbs.twimg.com"]');

                images.forEach(img => {
                    if (img.dataset.hdProcessed) return;

                    // 双重检查：确保不是视频海报
                    if (img.closest('[data-testid="videoPlayer"]')) return;
                    if (img.src.includes('video_thumb')) return;

                    const originalSrc = img.src;
                    // 尝试替换为 4096x4096 (原图)
                    const hdSrc = originalSrc.replace(/&name=\w+/, '&name=4096x4096').replace(/\?format=\w+&name=\w+/, '?format=jpg&name=4096x4096');

                    if (hdSrc !== originalSrc) {
                        img.src = hdSrc;
                        img.dataset.hdProcessed = 'true';
                        // 可选：加载失败回退逻辑
                        img.onerror = () => { img.src = originalSrc; };
                    }
                });
            }, 1000); // 1秒最多执行一次
        }

        STATE.hdThrottler();

        // 3. 监听新图片 (优化：降低频率)
        if (!STATE.mediaObserver) {
            STATE.mediaObserver = new MutationObserver(() => {
                if (STATE.hdMedia && STATE.hdThrottler) {
                    STATE.hdThrottler();
                }
            });
            STATE.mediaObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    function restoreMediaQuality() {
        const hdStyle = document.querySelector('#hd-media-style');
        if (hdStyle) hdStyle.remove();
        if (STATE.mediaObserver) {
            STATE.mediaObserver.disconnect();
            STATE.mediaObserver = null;
        }
        // 清理 throttler
        STATE.hdThrottler = null;
    }

    // ========== 性能优化工具 ==========

    // 优化的日志函数：支持去重和计数
    let lastLogMsg = '';
    let lastLogCount = 1;
    let lastLogTime = 0;

    const LOG = (msg, type='info') => {
        const now = Date.now();
        const box = document.querySelector('#twx-log');

        // 1. 控制台输出 (保持原样，方便调试)
        // 1. 控制台输出 (保持原样，方便调试)
        const prefix = `[📷 X-Lens] `;
        const colorMap = { info: '#1DA1F2', success: '#17BF63', error: '#FF3B30', warning: '#F7931E' };
        // console.log(`%c${prefix}${msg}`, `color: ${colorMap[type] || colorMap.info}; font-weight: bold;`);

        // 2. UI 日志去重逻辑
        if (box && !STATE.logCollapsed) {
            // 如果消息相同且在2秒内，只更新计数
            if (msg === lastLogMsg && (now - lastLogTime < 2000)) {
                lastLogCount++;
                const lastChild = box.lastElementChild;
                if (lastChild) {
                    const time = new Date().toLocaleTimeString();
                    lastChild.innerHTML = `<span style="opacity:0.7">[${time}]</span> ${msg} <span style="background:#333; padding:1px 4px; border-radius:4px; font-size:10px;">x${lastLogCount}</span>`;
                }
                lastLogTime = now;
                return;
            }

            // 新消息
            lastLogMsg = msg;
            lastLogCount = 1;
            lastLogTime = now;

            const time = new Date().toLocaleTimeString();
            const color = colorMap[type] || colorMap.info;
            const entry = document.createElement('div');
            entry.style.cssText = `color: ${color}; font-size: 11px; margin: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 2px;`;
            entry.innerHTML = `<span style="opacity:0.7">[${time}]</span> ${msg}`;
            box.appendChild(entry);

            box.scrollTop = box.scrollHeight;

            // 限制日志数量
            while (box.children.length > 50) {
                box.removeChild(box.firstElementChild);
            }
        }
    };

    // ========== 性能优化工具函数 ==========
    // 移除重复的$函数定义，使用前面已定义的版本
    const $$ = (selector) => document.querySelectorAll(selector);

    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // ========== 高级搜索 ==========
    function openAdvancedSearchModal() {
        // 检查是否已存在模态框
        if ($('#advanced-search-modal')) {
            $('#advanced-search-modal').style.display = 'block';
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'advanced-search-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(91, 112, 131, 0.4); z-index: 10000; display: block;
            backdrop-filter: blur(8px);
            animation: fadeIn 0.2s ease-out;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #000000;
            border: 1px solid #2F3336;
            border-radius: 20px;
            padding: 32px;
            width: 580px;
            max-width: 90vw;
            box-shadow: 0 24px 64px rgba(0,0,0,0.7);
            color: #E7E9EA;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;

        // 通用输入框样式函数
        const inputStyle = `
            width: 100%;
            padding: 12px 16px;
            background: #202327;
            border: 1px solid #333639;
            border-radius: 4px;
            color: #E7E9EA;
            font-size: 15px;
            box-sizing: border-box;
            outline: none;
            transition: all 0.2s;
        `;

        const labelStyle = `
            display: block;
            margin-bottom: 8px;
            font-weight: 700;
            color: #E7E9EA;
            font-size: 14px;
        `;

        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0; color: #E7E9EA; font-size: 20px; font-weight: 800;">🔍 高级搜索</h2>
                <button id="close-search-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #EFF3F4; padding: 4px; border-radius: 50%; transition: background 0.2s;">×</button>
            </div>

            <div style="display: grid; gap: 16px;">
                <div>
                    <label style="${labelStyle}">包含所有这些词语</label>
                    <input type="text" id="search-all-words" placeholder="例如：AI 新闻" style="${inputStyle}">
                </div>

                <div>
                    <label style="${labelStyle}">完整短语</label>
                    <input type="text" id="search-exact-phrase" placeholder='例如："ChatGPT 4o"' style="${inputStyle}">
                </div>

                <div>
                    <label style="${labelStyle}">任意一个词语</label>
                    <input type="text" id="search-any-words" placeholder="例如：iPhone Android" style="${inputStyle}">
                </div>

                <div>
                    <label style="${labelStyle}">不包含这些词语</label>
                    <input type="text" id="search-exclude-words" placeholder="例如：-促销 -广告" style="${inputStyle}">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label style="${labelStyle}">话题标签</label>
                        <input type="text" id="search-hashtag" placeholder="例如：#摄影" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">来自账户</label>
                        <input type="text" id="search-from-user" placeholder="例如：@elonmusk" style="${inputStyle}">
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 16px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #2F3336;">
                <button id="clear-search-form" style="flex: 1; padding: 12px; background: transparent; color: #EFF3F4; border: 1px solid #536471; border-radius: 20px; cursor: pointer; font-size: 15px; font-weight: bold; transition: all 0.2s;">清除</button>
                <button id="execute-search" style="flex: 2; padding: 12px; background: #1D9BF0; color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 15px; font-weight: bold; transition: background 0.2s; box-shadow: 0 4px 12px rgba(29, 155, 240, 0.3);">搜索</button>
            </div>

            <style>
                #advanced-search-modal input:focus { border-color: #1D9BF0 !important; background: #000 !important; }
                #close-search-modal:hover { background: rgba(239, 243, 244, 0.1); }
                #clear-search-form:hover { background: rgba(239, 243, 244, 0.1); }
                #execute-search:hover { background: #1A8CD8 !important; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            </style>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // 绑定事件
        $('#close-search-modal').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        $('#clear-search-form').onclick = () => {
            $('#search-all-words').value = '';
            $('#search-exact-phrase').value = '';
            $('#search-any-words').value = '';
            $('#search-exclude-words').value = '';
            $('#search-hashtag').value = '';
            $('#search-from-user').value = '';
        };

        $('#execute-search').onclick = () => {
            const query = buildSearchQuery();
            if (query.trim()) {
                window.open(`https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query`, '_blank');
                modal.style.display = 'none';
                LOG(`执行高级搜索: ${query}`, 'success');
            } else {
                LOG('请输入搜索条件', 'warning');
            }
        };
    }

    function buildSearchQuery() {
        const parts = [];

        const allWords = $('#search-all-words').value.trim();
        if (allWords) parts.push(allWords);

        const exactPhrase = $('#search-exact-phrase').value.trim();
        if (exactPhrase) {
            parts.push(exactPhrase.startsWith('"') && exactPhrase.endsWith('"') ? exactPhrase : `"${exactPhrase}"`);
        }

        const anyWords = $('#search-any-words').value.trim();
        if (anyWords) {
            const words = anyWords.split(' ').filter(w => w.trim());
            if (words.length > 1) {
                parts.push(`(${words.join(' OR ')})`);
            } else {
                parts.push(anyWords);
            }
        }

        const excludeWords = $('#search-exclude-words').value.trim();
        if (excludeWords) {
            const words = excludeWords.split(' ').filter(w => w.trim());
            words.forEach(word => {
                const cleanWord = word.startsWith('-') ? word : `-${word}`;
                parts.push(cleanWord);
            });
        }

        const hashtag = $('#search-hashtag').value.trim();
        if (hashtag) {
            const cleanHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
            parts.push(cleanHashtag);
        }

        const fromUser = $('#search-from-user').value.trim();
        if (fromUser) {
            const cleanUser = fromUser.startsWith('@') ? fromUser.substring(1) : fromUser;
            parts.push(`from:${cleanUser}`);
        }

        return parts.join(' ');
    }


    // ========== 快捷键支持 ==========
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + T: 切换面板显示
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                const panel = $('#twx-panel');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            }

            // Ctrl/Cmd + Shift + S: 打开高级搜索
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                openAdvancedSearchModal();
            }

            // Ctrl/Cmd + Shift + P: 切换自动化状态
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                const toggleBtn = $('#twx-toggle');
                if (toggleBtn) toggleBtn.click();
            }
        });

        LOG('快捷键已启用: Ctrl+Shift+T(面板) | Ctrl+Shift+S(搜索) | Ctrl+Shift+P(暂停)', 'info');
    }

    // ========== 右键菜单增强 ==========
    function initContextMenu() {
        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('🍑 打开控制面板', () => {
                const panel = $('#twx-panel');
                if (panel) panel.style.display = 'block';
            });

            GM_registerMenuCommand('🔍 高级搜索', openAdvancedSearchModal);

            GM_registerMenuCommand('📊 查看统计', () => {
                const total = STATE.count.like + STATE.count.follow + STATE.count.retweet;
                alert(`📊 使用统计\n\n点赞: ${STATE.count.like}\n关注: ${STATE.count.follow}\n转发: ${STATE.count.retweet}\n总计: ${total}`);
            });

            GM_registerMenuCommand('🔄 重置统计', () => {
                if (confirm('确定要重置所有统计数据吗？')) {
                    STATE.count = { like: 0, follow: 0, retweet: 0 };
                    LOG('统计数据已重置', 'success');
                }
            });
        }
    }

    // ========== 初始化 ==========
    function init() {
        if (window.__twx_inited_v200__) return;

        // 🔒 严格域名检查：绝对禁止在 Grok.com 运行
        const host = window.location.hostname;
        const isX = host.includes('x.com') || host.includes('twitter.com');
        if (!isX) {
            console.log('[X-Lens] Not on X/Twitter. Module disabled.');
            return;
        }

        window.__twx_inited_v200__ = true;

        createPanel();

        // 🎯 创建 X-Lens 专属浮动按钮 (确保在 DOM 完全加载后)
        setTimeout(() => {
            createXLensToggleButton();
        }, 100);

        initKeyboardShortcuts();
        initContextMenu();

        // 默认不启动自动化循环，等待用户手动开启
        // 初始化状态显示
        setTimeout(() => {
            const statusEl = $('#twx-status');
            if (statusEl) {
                statusEl.textContent = '未启动';
                statusEl.style.color = '#8B98A5';
            }
        }, 1000);

        LOG('📷 X-Lens (原女秘书) v2.0 已启动 | 摄影师专属版', 'success');
        LOG('🚀 核心模块：自动化操作 + 极致高清 + 影院模式 + 快捷键支持', 'info');
        LOG('⌨️  快捷键：Ctrl+Shift+T(面板) | Ctrl+Shift+S(搜索) | Ctrl+Shift+P(暂停)', 'info');

        // ========== 暴露 API 供主脚本集成 ==========
        window.XLens = {
            openPanel: () => {
                const p = $('#twx-panel');
                if (p) p.style.display = 'block';
            },
            closePanel: () => {
                 const p = $('#twx-panel');
                 if (p) p.style.display = 'none';
            },
            togglePanel: () => {
                const p = $('#twx-panel');
                if (p) p.style.display = (p.style.display === 'none' ? 'block' : 'none');
            },
            toggleAutomation: () => $('#twx-toggle')?.click(),
            getStats: () => STATE.count
        };

        // 初始化新功能
        setTimeout(() => {
            if (STATE.mediaDownload) {
                toggleMediaDownload(true);
            }
            if (STATE.videoMode) {
                toggleVideoMode(true);
            }
            if (STATE.hdMedia) {
                toggleHDMedia(true);
            }
        }, 2000);
    }

    // 🎯 创建 X-Lens 专属浮动按钮
    function createXLensToggleButton() {
        const pos = GM_getValue('xlens_btn_pos', { bottom: '20px', right: '20px' });
        const btn = document.createElement('div');
        btn.id = 'xlens-toggle-btn';
        btn.style.cssText = `
            position: fixed;
            ${pos.top ? `top: ${pos.top};` : `bottom: ${pos.bottom};`}
            ${pos.left ? `left: ${pos.left};` : `right: ${pos.right};`}
            width: 56px;
            height: 56px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: move;
            z-index: 999999;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s, border-color 0.3s;
            user-select: none;
            background: #000;
            border: 2px solid rgba(255,255,255,0.1);
            touch-action: none;
        `;

        // ✨ 使用纯 SVG 绘制 "镜头/光圈" 图标 (X-Lens Identity)
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px; pointer-events: none;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="14.31" y1="8" x2="20.05" y2="17.94"></line>
                <line x1="9.69" y1="8" x2="21.17" y2="8"></line>
                <line x1="7.38" y1="12" x2="13.12" y2="2.06"></line>
                <line x1="9.69" y1="16" x2="3.95" y2="6.06"></line>
                <line x1="14.31" y1="16" x2="2.83" y2="16"></line>
                <line x1="16.62" y1="12" x2="10.88" y2="21.94"></line>
            </svg>
        `;

        // 拖拽逻辑变量
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        // 鼠标按下：准备拖拽
        btn.onmousedown = (e) => {
            isDragging = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = btn.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            btn.style.transition = 'none'; // 移动时关闭平滑过渡以提高响应速度

            const onMouseMove = (moveEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                // 移动距离超过 5px 才判定为拖拽
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    isDragging = true;
                }

                if (isDragging) {
                    btn.style.left = `${initialLeft + dx}px`;
                    btn.style.top = `${initialTop + dy}px`;
                    btn.style.bottom = 'auto'; // 拖拽后清除 bottom 约束
                    btn.style.right = 'auto';   // 拖拽后清除 right 约束
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                btn.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s, border-color 0.3s';

                if (isDragging) {
                    // 保存新位置
                    const rect = btn.getBoundingClientRect();
                    GM_setValue('xlens_btn_pos', {
                        top: `${rect.top}px`,
                        left: `${rect.left}px`
                    });
                    console.log(`[X-Lens] New position saved: ${rect.left}, ${rect.top}`);
                }
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        // 悬停效果
        btn.onmouseenter = () => {
            if (!isDragging) {
                btn.style.transform = 'scale(1.1)';
                btn.style.boxShadow = '0 6px 20px rgba(29, 161, 242, 0.6)';
                btn.style.borderColor = '#1D9BF0';
            }
        };
        btn.onmouseleave = () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.5)';
            btn.style.borderColor = 'rgba(255,255,255,0.1)';
        };

        // 点击切换面板
        btn.onclick = (e) => {
            // 如果刚刚发生了拖拽，则不触发点击
            if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            const panel = $('#twx-panel');
            if (panel) {
                panel.style.display = (panel.style.display === 'none' ? 'block' : 'none');
            }
        };

        // 确保 body 已加载后再添加按钮
        const appendButton = () => {
            if (document.body) {
                document.body.appendChild(btn);
                console.log('[X-Lens] Toggle button created with drag support (Beta)');
            } else {
                setTimeout(appendButton, 100);
            }
        };
        appendButton();
    }

    // ========== 启动脚本 ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }

    // ========== 全局错误处理 ==========
    // 错误日志存储（最多保留 10 条）
    const errorLog = [];
    const MAX_ERROR_LOG = 10;

    function logError(message, stack) {
        const error = {
            time: new Date().toISOString(),
            message,
            stack,
            url: window.location.href
        };

        errorLog.push(error);
        if (errorLog.length > MAX_ERROR_LOG) {
            errorLog.shift(); // 移除最旧的错误
        }

        // 保存到本地存储，方便用户反馈
        try {
            GM_setValue('gpm_error_log', JSON.stringify(errorLog));
        } catch(e) {
            console.warn('[GPM] 无法保存错误日志');
        }
    }

    window.addEventListener('error', (e) => {
        const message = e.message || '';
        const stack = e.error?.stack || '';

        // ⚠️ 已知问题：'t is not defined' - 可能是 Grok 自身的问题
        // 但我们仍然记录，只是不弹窗打扰用户
        if (message.includes('t is not defined')) {
            console.warn('[GPM] 检测到已知错误（可能来自 Grok 本身）:', message);
            logError(`[Known Issue] ${message}`, stack);
            return;
        }

        // 记录错误
        logError(message, stack);
        LOG(`全局错误: ${message}`, 'error');

        // 如果是严重错误，友好提示用户
        if (!message.includes('Extension') && !message.includes('chrome')) {
            // 创建友好的错误提示
            const errorToast = document.createElement('div');
            errorToast.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px;">⚠️ GPM 遇到问题</div>
                <div style="font-size: 12px; opacity: 0.9;">部分功能可能受影响，脚本仍在运行</div>
            `;
            Object.assign(errorToast.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 77, 79, 0.95)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '12px',
                zIndex: '100000',
                fontSize: '13px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                maxWidth: '300px',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)'
            });

            document.body?.appendChild(errorToast);
            setTimeout(() => errorToast.remove(), 5000);
        }
    });

    window.addEventListener('unhandledrejection', (e) => {
        const reason = e.reason || '';
        const reasonStr = typeof reason === 'string' ? reason : reason?.message || String(reason);

        if (reasonStr.includes('t is not defined')) {
            console.warn('[GPM] 检测到未处理的 Promise 错误（已知问题）:', reasonStr);
            logError(`[Promise-Known] ${reasonStr}`, '');
            return;
        }

        logError(`[Promise] ${reasonStr}`, reason?.stack || '');
        LOG(`未处理的Promise错误: ${reasonStr}`, 'error');
    });

    // 添加调试命令：查看错误日志
    GM_registerMenuCommand('📋 查看错误日志', () => {
        const log = GM_getValue('gpm_error_log', '[]');
        try {
            const errors = JSON.parse(log);
            if (errors.length === 0) {
                alert('✅ 没有错误记录');
            } else {
                const report = errors.map((e, i) =>
                    `${i + 1}. [${new Date(e.time).toLocaleString('zh-CN')}]\n   ${e.message}`
                ).join('\n\n');
                console.log('[GPM] 错误报告:', errors);
                alert(`📋 最近 ${errors.length} 条错误:\n\n${report}`);
            }
        } catch(e) {
            alert('❌ 错误日志已损坏');
        }
    });

    GM_registerMenuCommand('🗑️ 清除错误日志', () => {
        GM_setValue('gpm_error_log', '[]');
        alert('✅ 错误日志已清除');
    });

    // ========== 脚本信息 ==========
    // ========== 脚本信息 ==========
    console.log('%c📷 Twitter/X Lens v2.0 (Pro)', 'color: #1DA1F2; font-size: 20px; font-weight: bold;');
    console.log('%c由 Claude AI 精心打造 | 植人大树 出品', 'color: #17BF63; font-size: 14px;');
    console.log('%c功能特性: 自动化操作 + 高清媒体下载 + 界面优化 + 快捷键支持', 'color: #F7931E; font-size: 12px;');

})();
