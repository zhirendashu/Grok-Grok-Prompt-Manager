import { ICON_SET } from '../style/Theme.js';

/**
 * 🤖 Automation: 自动化与拦截核心
 * 承载：API 嗅探、自动高清 (AutoUpscale)、自动重试 (AutoRetry) 及指令智能补全。
 */
export class Automation {
    constructor() {
        this.retryPanel = null;
        this.isHDEnabled = localStorage.getItem('gpm_hd_enabled') === 'true';
        this.processedPosts = new Set();
        this.initStyles();
    }

    initStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .gpm-retry-panel {
                position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
                background: rgba(20, 20, 25, 0.95); backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px;
                padding: 12px 20px; z-index: 10001; display: none;
                flex-direction: column; gap: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                color: white; width: 450px; border-bottom: 3px solid #1d9bf0;
            }
            .gpm-retry-header { font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; }
            .gpm-retry-content { font-size: 12px; opacity: 0.8; white-space: pre-wrap; max-height: 150px; overflow-y: auto; }
            .gpm-badge {
                padding: 2px 6px; border-radius: 4px; font-size: 10px;
                background: #1d9bf0; color: white; margin-right: 6px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 接管拦截到的响应数据
     */
    handleApiResponse(url, response) {
        // 1. 监测生成请求 (嗅探提示词)
        if (url.includes('/upscale-video') || url.includes('/generate-video')) {
            this.sniffPrompt(url, response);
        }

        // 2. 监测生成失败 (触发自动重试面板)
        if (response && response.error) {
            this.showRetryPanel(response.prompt, response.error);
        }
    }

    sniffPrompt(url, response) {
        // 这里的逻辑可以整合到 App 的 addNewPrompt 流程中
        console.log('[GPM Automation] Sniffed:', url);
    }

    createRetryPanel() {
        if (this.retryPanel) return;

        this.retryPanel = document.createElement('div');
        this.retryPanel.className = 'gpm-retry-panel';
        this.retryPanel.innerHTML = `
            <div class="gpm-retry-header">
                <span>🤖 智能指令助手 (AI Assistant)</span>
                <span class="close-retry" style="cursor:pointer; opacity:0.6;">✕</span>
            </div>
            <div class="gpm-retry-content"></div>
            <div style="display: flex; gap: 8px;">
                <button class="gpm-btn retry-btn primary" style="flex:1;">🔄 重新生成 (Retry)</button>
                <button class="gpm-btn save-draft-btn" style="flex:1;">📝 存为草稿</button>
            </div>
        `;
        document.body.appendChild(this.retryPanel);

        this.retryPanel.querySelector('.close-retry').onclick = () => this.hideRetryPanel();
    }

    showRetryPanel(prompt, error) {
        this.createRetryPanel();
        const content = this.retryPanel.querySelector('.gpm-retry-content');
        content.innerHTML = `
            <div style="color: #ff4d4f; margin-bottom: 4px;">⚠️ 视频生成失败: ${error || '未知错误'}</div>
            <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; border-left: 2px solid #1d9bf0;">
                ${prompt || '无提示词数据'}
            </div>
        `;
        this.retryPanel.style.display = 'flex';

        this.retryPanel.querySelector('.retry-btn').onclick = () => {
            // 这里联动 InputManager 进行重试操作
            this.hideRetryPanel();
        };
    }

    hideRetryPanel() {
        if (this.retryPanel) this.retryPanel.style.display = 'none';
    }

    toggleRetryPanel() {
        if (!this.retryPanel || this.retryPanel.style.display === 'none') {
            this.showRetryPanel('测试提示词 (Test Prompt)', '手动开启预览模式');
        } else {
            this.hideRetryPanel();
        }
    }

    // --- 自动高清 (AutoUpscale) 逻辑 ---

    toggleHD() {
        this.isHDEnabled = !this.isHDEnabled;
        localStorage.setItem('gpm_hd_enabled', this.isHDEnabled);
        return this.isHDEnabled;
    }
}
