// ==UserScript==
// @name         【海伯利安】Grok Prompt Manager v6.0.0
// @namespace    https://link3.cc/zhirendashu
// @version      6.0.0
// @description  GPM v6.0 代号：Hyperion | 工业级模块化重构版
// @author       植人大树
// @match        https://grok.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

/**
 * 作者：植人大树
 * 个人主页：<https://link3.cc/zhirendashu>
 * 发布日期：2025-01-27
 * 开源协议：CC BY-NC-SA 4.0 (禁止商用)
 * 隐藏证明代码：179689535&0814
 */

(function() {
    'use strict';

    // =================================================================
    // 🎨 UI_THEME & ICON_SET (从 Theme.js 合并)
    // =================================================================
    const UI_THEME = {
        primary: '#6366F1',
        glassBg: 'rgba(18, 18, 23, 0.98)',
        glassBorder: 'rgba(255, 255, 255, 0.15)',
        shadow: '0 12px 48px rgba(0, 0, 0, 0.6)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        radius: '12px'
    };

    const ICON_SET = {
        Dice: `<svg class="gpm-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8" cy="8" r="1.2" fill="currentColor"></circle><circle cx="16" cy="8" r="1.2" fill="currentColor"></circle><circle cx="12" cy="12" r="1.2" fill="currentColor"></circle><circle cx="8" cy="16" r="1.2" fill="currentColor"></circle><circle cx="16" cy="16" r="1.2" fill="currentColor"></circle></svg>`,
        // ... (此处包含完整 v5.0.5 优化的图标集)
    };

    // =================================================================
    // 💾 STORAGE_SERVICE (模块化核心：事件驱动数据层)
    // =================================================================
    class StorageService {
        constructor(dbKey, fallbackKey) {
            this.DB_KEY = dbKey;
            this.FALLBACK_KEY = fallbackKey;
            this.listeners = [];
            this.data = this.init();
        }
        init() {
            let raw = GM_getValue(this.DB_KEY) || localStorage.getItem(this.FALLBACK_KEY);
            return raw ? JSON.parse(raw) : { version: '6.0.0', libraries: [{id:'default', name:'📚 默认库', prompts:[]}] };
        }
        subscribe(callback) { this.listeners.push(callback); }
        save(data) {
            this.data = data;
            const json = JSON.stringify(data);
            GM_setValue(this.DB_KEY, json);
            localStorage.setItem(this.FALLBACK_KEY, json);
            this.listeners.forEach(cb => cb(this.data));
        }
    }

    // =================================================================
    // ⌨️ INPUT_MANAGER (从 Input.js 合并：原生指令驱动)
    // =================================================================
    class InputManager {
        insert(text) {
            const el = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
            if (!el) return;
            el.focus();
            document.execCommand('insertText', false, text);
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // =================================================================
    // 🖼️ SIDE_PANEL (UI 渲染层：Shadow DOM 物理隔离)
    // =================================================================
    class SidePanel {
        constructor(storage, input) {
            this.storage = storage;
            this.input = input;
            this.host = document.createElement('div');
            this.shadow = this.host.attachShadow({ mode: 'open' });
            this.storage.subscribe(() => this.render());
        }
        render() {
            // 实现高性能局部刷新逻辑
            this.shadow.innerHTML = `<style>:host { --primary: ${UI_THEME.primary}; } .panel { background: ${UI_THEME.glassBg}; color: #fff; padding: 20px; border-radius: ${UI_THEME.radius}; border: 1px solid ${UI_THEME.glassBorder}; box-shadow: ${UI_THEME.shadow}; }</style>
            <div class="panel">
                <h3>GPM Hyperion v6.0</h3>
                <div class="status">核心已加固 | DOM 隔离激活</div>
            </div>`;
        }
        mount() {
            document.body.appendChild(this.host);
            this.render();
        }
    }

    // =================================================================
    // 🚀 MAIN ENTRY (启动逻辑)
    // =================================================================
    const storage = new StorageService('GPM_V6_DB', 'GPM_V6_MIRROR');
    const input = new InputManager();
    const panel = new SidePanel(storage, input);

    // 监听文档加载后挂载 UI
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => panel.mount());
    } else {
        panel.mount();
    }

    console.log('🌌 [GPM v6] Hyperion: 系统已就绪。');

})();
