// ==UserScript==
// @name         Grok 点击记录器 (Click Recorder)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  精准记录您的每次点击，生成详细的选择器报告，帮助开发者定位元素
// @author       AntiGravity
// @match        https://grok.com/*
// @match        https://x.com/*
// @match        https://twitter.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=grok.com
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // --- 配置 ---
    const CONFIG = {
        maxHistory: 20, // 最多记录 20 次点击
        highlightColor: '#00ff00', // 高亮颜色
        debug: true
    };

    // --- 日志 ---
    const log = (...args) => CONFIG.debug && console.log('%c[ClickRecorder]', 'color: #0ff; font-weight: bold;', ...args);

    // --- 数据存储 ---
    const clickHistory = [];

    // --- UI 管理器 ---
    class UIManager {
        constructor() {
            this.root = document.createElement('div');
            this.root.id = 'click-recorder-ui';
            this.shadow = this.root.attachShadow({ mode: 'open' });
            this.render();
            document.body.appendChild(this.root);
        }

        render() {
            this.shadow.innerHTML = `
            <style>
                .panel {
                    position: fixed; bottom: 20px; right: 20px; z-index: 999999;
                    background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(10px);
                    border: 2px solid #00ff00; border-radius: 12px;
                    padding: 16px; width: 320px;
                    font-family: 'Consolas', 'Monaco', monospace;
                    color: #00ff00; font-size: 12px;
                    box-shadow: 0 8px 32px rgba(0, 255, 0, 0.3);
                }
                .title {
                    font-size: 14px; font-weight: bold; margin-bottom: 12px;
                    text-align: center; border-bottom: 1px solid #00ff00;
                    padding-bottom: 8px;
                }
                .status {
                    margin-bottom: 12px; padding: 8px;
                    background: rgba(0, 255, 0, 0.1); border-radius: 4px;
                    text-align: center;
                }
                .count {
                    font-size: 24px; font-weight: bold; color: #0ff;
                }
                .btn-group {
                    display: flex; gap: 8px; margin-top: 12px;
                }
                .btn {
                    flex: 1; padding: 8px; border: 1px solid #00ff00;
                    background: rgba(0, 255, 0, 0.1); color: #00ff00;
                    border-radius: 4px; cursor: pointer;
                    font-weight: bold; transition: all 0.2s;
                }
                .btn:hover {
                    background: rgba(0, 255, 0, 0.3);
                    box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
                }
                .btn:active {
                    transform: scale(0.95);
                }
                .history {
                    max-height: 200px; overflow-y: auto;
                    margin-top: 12px; padding: 8px;
                    background: rgba(0, 255, 0, 0.05);
                    border-radius: 4px; font-size: 10px;
                }
                .history-item {
                    padding: 4px; border-bottom: 1px solid rgba(0, 255, 0, 0.2);
                    cursor: pointer;
                }
                .history-item:hover {
                    background: rgba(0, 255, 0, 0.1);
                }
                .history::-webkit-scrollbar {
                    width: 6px;
                }
                .history::-webkit-scrollbar-thumb {
                    background: #00ff00; border-radius: 3px;
                }
            </style>
            
            <div class="panel">
                <div class="title">🎯 点击记录器</div>
                <div class="status">
                    已记录: <span class="count" id="count">0</span> 次点击
                </div>
                <div class="btn-group">
                    <button class="btn" id="export-btn">📋 导出报告</button>
                    <button class="btn" id="clear-btn">🗑️ 清空</button>
                </div>
                <div class="history" id="history"></div>
            </div>
            `;

            // 绑定事件
            this.shadow.querySelector('#export-btn').onclick = () => this.exportReport();
            this.shadow.querySelector('#clear-btn').onclick = () => this.clearHistory();
            this.updateUI();
        }

        updateUI() {
            const countEl = this.shadow.querySelector('#count');
            const historyEl = this.shadow.querySelector('#history');
            
            countEl.textContent = clickHistory.length;
            
            historyEl.innerHTML = clickHistory.map((record, idx) => `
                <div class="history-item">
                    ${idx + 1}. ${record.time} - ${record.tag} "${record.text.slice(0, 20)}..."
                </div>
            `).join('');
        }

        exportReport() {
            if (clickHistory.length === 0) {
                alert('❌ 还没有记录任何点击！');
                return;
            }

            const report = {
                exportTime: new Date().toLocaleString('zh-CN'),
                totalClicks: clickHistory.length,
                records: clickHistory
            };

            const jsonStr = JSON.stringify(report, null, 2);
            
            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(jsonStr);
                alert(`✅ 已复制 ${clickHistory.length} 条点击记录到剪贴板！\n\n请粘贴给开发者分析。`);
            } else {
                navigator.clipboard.writeText(jsonStr).then(() => {
                    alert(`✅ 已复制 ${clickHistory.length} 条点击记录到剪贴板！\n\n请粘贴给开发者分析。`);
                });
            }
            
            console.log('📊 完整报告:', report);
        }

        clearHistory() {
            if (confirm('确定要清空所有记录吗？')) {
                clickHistory.length = 0;
                this.updateUI();
                log('🗑️ 历史记录已清空');
            }
        }
    }

    // --- 点击记录器 ---
    class ClickRecorder {
        constructor() {
            this.init();
        }

        init() {
            document.addEventListener('click', (e) => this.recordClick(e), true);
            log('✅ 点击记录器已启动');
        }

        recordClick(e) {
            const target = e.target;
            
            // 忽略自己的 UI
            if (target.closest('#click-recorder-ui')) return;

            // 高亮显示
            this.highlightElement(target);

            // 生成记录
            const record = {
                time: new Date().toLocaleTimeString('zh-CN'),
                tag: target.tagName.toLowerCase(),
                text: (target.innerText || target.textContent || '').trim().slice(0, 100),
                selectors: this.generateSelectors(target),
                attributes: this.getAttributes(target),
                position: this.getPosition(target),
                visibility: this.getVisibility(target)
            };

            clickHistory.push(record);
            if (clickHistory.length > CONFIG.maxHistory) {
                clickHistory.shift();
            }

            ui.updateUI();
            log('🖱️ 记录点击:', record);
        }

        highlightElement(el) {
            try {
                const original = el.style.outline;
                el.style.outline = `3px solid ${CONFIG.highlightColor}`;
                el.style.boxShadow = `0 0 15px ${CONFIG.highlightColor}`;
                
                setTimeout(() => {
                    el.style.outline = original;
                    el.style.boxShadow = '';
                }, 1000);
            } catch (e) {}
        }

        generateSelectors(el) {
            const selectors = {};
            
            // ID
            if (el.id) selectors.id = `#${el.id}`;
            
            // Class
            if (el.className && typeof el.className === 'string') {
                const classes = el.className.trim().split(/\s+/).filter(c => c);
                if (classes.length > 0) {
                    selectors.class = `.${classes.join('.')}`;
                    selectors.firstClass = `.${classes[0]}`;
                }
            }
            
            // Tag
            selectors.tag = el.tagName.toLowerCase();
            
            // XPath
            selectors.xpath = this.getXPath(el);
            
            // CSS Path (简化版)
            selectors.cssPath = this.getCSSPath(el);
            
            return selectors;
        }

        getXPath(el) {
            if (el.id) return `//*[@id="${el.id}"]`;
            if (el === document.body) return '/html/body';
            
            let ix = 0;
            const siblings = el.parentNode ? el.parentNode.childNodes : [];
            
            for (let i = 0; i < siblings.length; i++) {
                const sibling = siblings[i];
                if (sibling === el) {
                    return this.getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                }
                if (sibling.nodeType === 1 && sibling.tagName === el.tagName) ix++;
            }
            return '';
        }

        getCSSPath(el) {
            if (el.id) return `#${el.id}`;
            
            const path = [];
            while (el && el.nodeType === Node.ELEMENT_NODE) {
                let selector = el.nodeName.toLowerCase();
                if (el.id) {
                    selector += `#${el.id}`;
                    path.unshift(selector);
                    break;
                } else {
                    let sibling = el;
                    let nth = 1;
                    while (sibling.previousElementSibling) {
                        sibling = sibling.previousElementSibling;
                        if (sibling.nodeName.toLowerCase() === selector) nth++;
                    }
                    if (nth > 1) selector += `:nth-of-type(${nth})`;
                }
                path.unshift(selector);
                el = el.parentNode;
            }
            return path.join(' > ');
        }

        getAttributes(el) {
            const attrs = {};
            for (const attr of el.attributes) {
                attrs[attr.name] = attr.value;
            }
            return attrs;
        }

        getPosition(el) {
            const rect = el.getBoundingClientRect();
            return {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                centerX: Math.round(rect.left + rect.width / 2),
                centerY: Math.round(rect.top + rect.height / 2),
                distanceToCenter: Math.round(
                    Math.hypot(
                        rect.left + rect.width / 2 - window.innerWidth / 2,
                        rect.top + rect.height / 2 - window.innerHeight / 2
                    )
                )
            };
        }

        getVisibility(el) {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            
            return {
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity,
                isVisible: style.display !== 'none' && 
                          style.visibility !== 'hidden' && 
                          style.opacity !== '0' &&
                          rect.width > 0 && 
                          rect.height > 0
            };
        }
    }

    // --- 初始化 ---
    const ui = new UIManager();
    const recorder = new ClickRecorder();

    log('🎯 点击记录器已就绪！请开始点击任何元素...');

})();
