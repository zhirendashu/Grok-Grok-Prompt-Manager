// ==UserScript==
// @name         Grok Batch Downloader (测试版)
// @name:zh-CN   Grok批量下载器 v1.0.0 | 植人大树出品
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Batch download high-quality images and videos from Grok Imagine
// @description:zh-CN 批量下载Grok生成的高清图片和视频
// @author       植人大树
// @homepage     https://link3.cc/zhirendashu
// @match        https://grok.com/*
// @match        https://x.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=grok.com
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      pbs.twimg.com
// @connect      video.twimg.com
// @compatible   chrome
// @compatible   firefox
// @compatible   edge
// @run-at       document-start
// ==/UserScript==

/**
 * 📜 Changelog
 *
 * v1.0.0 (2026-02-05):
 * - ✅ 批量下载高清图片和视频
 * - ✅ 自动检测所有变体（child posts）
 * - ✅ 使用元数据重命名文件
 * - ✅ 实时下载进度显示
 * - ✅ 支持收藏页和历史页
 * - ✅ API拦截获取原始URL
 */

(function() {
    'use strict';

    console.log('[Grok Batch Downloader] 🚀 Initializing...');

    // 📦 全局存储
    const MEDIA_STORE = new Map(); // postId -> { url, type, prompt, timestamp }
    const DOWNLOAD_QUEUE = [];
    let isDownloading = false;

    // 🎨 样式注入
    const injectStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            /* 下载按钮样式 */
            .gbd-download-btn {
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 50;
                background: rgba(29, 155, 240, 0.9);
                backdrop-filter: blur(12px);
                color: white;
                border: none;
                border-radius: 999px;
                width: 36px;
                height: 36px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            .gbd-download-btn:hover {
                background: rgba(29, 155, 240, 1);
                transform: scale(1.1);
            }

            .gbd-download-btn:active {
                transform: scale(0.95);
            }

            .gbd-download-btn.downloading {
                background: rgba(255, 193, 7, 0.9);
                pointer-events: none;
            }

            .gbd-download-btn.downloaded {
                background: rgba(76, 175, 80, 0.9);
            }

            /* 批量下载面板 */
            .gbd-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                background: rgba(0, 0, 0, 0.92);
                backdrop-filter: blur(20px);
                border-radius: 16px;
                padding: 20px;
                min-width: 320px;
                max-width: 400px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.1);
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            .gbd-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .gbd-panel-title {
                font-size: 18px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .gbd-close-btn {
                background: rgba(255,255,255,0.1);
                border: none;
                border-radius: 6px;
                color: white;
                width: 28px;
                height: 28px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .gbd-close-btn:hover {
                background: rgba(255,255,255,0.2);
            }

            .gbd-stats {
                display: flex;
                gap: 16px;
                margin-bottom: 16px;
                font-size: 14px;
            }

            .gbd-stat {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .gbd-stat-label {
                color: rgba(255,255,255,0.6);
                font-size: 12px;
            }

            .gbd-stat-value {
                font-size: 20px;
                font-weight: 600;
                color: #1d9bf0;
            }

            .gbd-progress {
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 16px;
            }

            .gbd-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #1d9bf0, #4caf50);
                transition: width 0.3s;
                border-radius: 4px;
            }

            .gbd-actions {
                display: flex;
                gap: 8px;
            }

            .gbd-btn {
                flex: 1;
                padding: 10px 16px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .gbd-btn-primary {
                background: #1d9bf0;
                color: white;
            }

            .gbd-btn-primary:hover {
                background: #1a8cd8;
            }

            .gbd-btn-primary:disabled {
                background: rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.3);
                cursor: not-allowed;
            }

            .gbd-btn-secondary {
                background: rgba(255,255,255,0.1);
                color: white;
            }

            .gbd-btn-secondary:hover {
                background: rgba(255,255,255,0.2);
            }

            .gbd-log {
                margin-top: 12px;
                max-height: 150px;
                overflow-y: auto;
                font-size: 12px;
                color: rgba(255,255,255,0.7);
                line-height: 1.6;
            }

            .gbd-log-item {
                padding: 4px 0;
            }

            .gbd-log-item.success {
                color: #4caf50;
            }

            .gbd-log-item.error {
                color: #f44336;
            }

            /* 滚动条样式 */
            .gbd-log::-webkit-scrollbar {
                width: 6px;
            }

            .gbd-log::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.05);
                border-radius: 3px;
            }

            .gbd-log::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 3px;
            }

            .gbd-log::-webkit-scrollbar-thumb:hover {
                background: rgba(255,255,255,0.3);
            }
        `;
        document.head.appendChild(style);
    };

    // 🎯 API拦截器
    const setupAPIInterceptor = () => {
        const originalFetch = unsafeWindow.fetch;

        unsafeWindow.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            const url = args[0];

            // 拦截图片/视频生成响应
            if (typeof url === 'string' && (
                url.includes('/imagine/post/') ||
                url.includes('/timeline') ||
                url.includes('/favorites')
            )) {
                const clonedResponse = response.clone();
                try {
                    const data = await clonedResponse.json();
                    extractMediaFromResponse(data);
                } catch (e) {
                    // 忽略非JSON响应
                }
            }

            return response;
        };

        console.log('[Grok Batch Downloader] ✅ API Interceptor activated');
    };

    // 📸 从API响应中提取媒体信息
    const extractMediaFromResponse = (data) => {
        if (!data) return;

        // 处理单个post
        const processPost = (post) => {
            if (!post || !post.id) return;

            const media = extractMediaFromPost(post);
            if (media) {
                MEDIA_STORE.set(post.id, media);
                console.log(`[Grok Batch Downloader] 📸 Captured: ${post.id}`, media);
            }
        };

        // 处理各种响应格式
        if (data.data) {
            if (Array.isArray(data.data)) {
                data.data.forEach(processPost);
            } else if (data.data.posts) {
                data.data.posts.forEach(processPost);
            } else {
                processPost(data.data);
            }
        } else if (data.posts) {
            data.posts.forEach(processPost);
        } else if (data.id) {
            processPost(data);
        }
    };

    // 🔍 从post对象中提取媒体URL
    const extractMediaFromPost = (post) => {
        if (!post) return null;

        let url = null;
        let type = null;

        // 检查media字段
        if (post.media && post.media.length > 0) {
            const media = post.media[0];

            // 视频
            if (media.video_info && media.video_info.variants) {
                const variants = media.video_info.variants
                    .filter(v => v.content_type === 'video/mp4')
                    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                if (variants.length > 0) {
                    url = variants[0].url;
                    type = 'video';
                }
            }
            // 图片
            else if (media.media_url_https || media.url) {
                url = media.media_url_https || media.url;
                // 获取原始质量（去掉?format=jpg等参数，添加:orig）
                if (url.includes('pbs.twimg.com')) {
                    url = url.split('?')[0];
                    if (!url.includes(':orig')) {
                        url += ':orig';
                    }
                }
                type = 'image';
            }
        }

        if (!url) return null;

        return {
            url,
            type,
            prompt: post.text || post.full_text || '',
            timestamp: post.created_at || new Date().toISOString(),
            postId: post.id
        };
    };

    // 💾 下载单个文件
    const downloadFile = async (media) => {
        return new Promise((resolve, reject) => {
            const timestamp = new Date(media.timestamp).getTime();
            const promptSnippet = media.prompt.slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
            const ext = media.type === 'video' ? 'mp4' : 'jpg';
            const filename = `Grok_${timestamp}_${promptSnippet}_${media.postId}.${ext}`;

            GM_download({
                url: media.url,
                name: filename,
                onload: () => {
                    console.log(`[Grok Batch Downloader] ✅ Downloaded: ${filename}`);
                    addLog(`✅ ${filename}`, 'success');
                    resolve(filename);
                },
                onerror: (error) => {
                    console.error(`[Grok Batch Downloader] ❌ Failed: ${filename}`, error);
                    addLog(`❌ ${filename}`, 'error');
                    reject(error);
                }
            });
        });
    };

    // 📊 批量下载管理器
    const batchDownload = async () => {
        if (isDownloading) return;
        if (MEDIA_STORE.size === 0) {
            alert('❌ 没有找到可下载的媒体\n\n请先浏览一些图片或视频，让脚本捕获URL');
            return;
        }

        isDownloading = true;
        updatePanel();

        const mediaList = Array.from(MEDIA_STORE.values());
        let downloaded = 0;

        for (const media of mediaList) {
            try {
                await downloadFile(media);
                downloaded++;
            } catch (e) {
                console.error('[Grok Batch Downloader] Download failed:', e);
            }

            updatePanel(downloaded, mediaList.length);

            // 延迟防止速率限制
            await new Promise(r => setTimeout(r, 1000));
        }

        isDownloading = false;
        updatePanel(downloaded, mediaList.length);
        addLog(`🎉 批量下载完成！共 ${downloaded}/${mediaList.length} 个文件`, 'success');
    };

    // 🎨 UI - 面板
    let panel = null;
    const logs = [];

    const createPanel = () => {
        panel = document.createElement('div');
        panel.className = 'gbd-panel';
        panel.innerHTML = `
            <div class="gbd-panel-header">
                <div class="gbd-panel-title">
                    <span>📥</span>
                    <span>批量下载器</span>
                </div>
                <button class="gbd-close-btn">✕</button>
            </div>
            <div class="gbd-stats">
                <div class="gbd-stat">
                    <div class="gbd-stat-label">已捕获</div>
                    <div class="gbd-stat-value" id="gbd-captured">0</div>
                </div>
                <div class="gbd-stat">
                    <div class="gbd-stat-label">已下载</div>
                    <div class="gbd-stat-value" id="gbd-downloaded">0</div>
                </div>
            </div>
            <div class="gbd-progress">
                <div class="gbd-progress-bar" id="gbd-progress-bar" style="width: 0%"></div>
            </div>
            <div class="gbd-actions">
                <button class="gbd-btn gbd-btn-primary" id="gbd-download-all">
                    开始下载
                </button>
                <button class="gbd-btn gbd-btn-secondary" id="gbd-clear">
                    清空
                </button>
            </div>
            <div class="gbd-log" id="gbd-log"></div>
        `;

        document.body.appendChild(panel);

        // 事件绑定
        panel.querySelector('.gbd-close-btn').onclick = () => {
            panel.style.display = 'none';
        };

        panel.querySelector('#gbd-download-all').onclick = batchDownload;

        panel.querySelector('#gbd-clear').onclick = () => {
            MEDIA_STORE.clear();
            logs.length = 0;
            updatePanel();
            addLog('🗑️ 已清空所有数据');
        };

        updatePanel();
    };

    const updatePanel = (downloaded = 0, total = 0) => {
        if (!panel) return;

        const captured = MEDIA_STORE.size;
        const progress = total > 0 ? (downloaded / total * 100) : 0;

        panel.querySelector('#gbd-captured').textContent = captured;
        panel.querySelector('#gbd-downloaded').textContent = downloaded;
        panel.querySelector('#gbd-progress-bar').style.width = `${progress}%`;

        const downloadBtn = panel.querySelector('#gbd-download-all');
        downloadBtn.disabled = isDownloading || captured === 0;
        downloadBtn.textContent = isDownloading ? '下载中...' : '开始下载';
    };

    const addLog = (message, type = 'info') => {
        logs.push({ message, type, time: new Date().toLocaleTimeString() });
        if (logs.length > 50) logs.shift();

        const logEl = panel?.querySelector('#gbd-log');
        if (logEl) {
            logEl.innerHTML = logs
                .slice(-20)
                .reverse()
                .map(log => `<div class="gbd-log-item ${log.type}">[${log.time}] ${log.message}</div>`)
                .join('');
        }
    };

    // 🚀 快捷键
    const setupShortcuts = () => {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+D 打开/关闭面板
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            }
        });
    };

    // 🎬 初始化
    const init = () => {
        console.log('[Grok Batch Downloader] 🎬 Starting initialization...');

        // 注入样式
        injectStyles();

        // 设置API拦截
        setupAPIInterceptor();

        // 等待DOM加载
        const initUI = () => {
            createPanel();
            setupShortcuts();
            addLog('🚀 批量下载器已启动');
            addLog('💡 快捷键: Ctrl+Shift+D 显示/隐藏面板');
            console.log('[Grok Batch Downloader] ✅ Initialization complete');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUI);
        } else {
            initUI();
        }
    };

    // 启动脚本
    init();
})();
