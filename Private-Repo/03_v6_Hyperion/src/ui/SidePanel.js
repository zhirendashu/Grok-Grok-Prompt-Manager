import { Component } from './Component.js';
import { ICON_SET, UI_THEME } from '../style/Theme.js';

/**
 * 🖼️ SidePanel: Hyper-Performance UI (Hyperion v6.0)
 * 承载：提示词管理、分类、标签、库切换、随机模式、自动高清、自动重试联动。
 */
export class SidePanel extends Component {
    constructor(storage, input, config = { side: 'left', width: 380 }) {
        super();
        this.storage = storage;
        this.input = input;
        this.config = config;
        this.side = config.side;
        this.width = config.width || 380;
        this.height = config.height || 700;
        this.top = config.top || 80;
        this.leftPos = config.left || 20;
        this.rightPos = config.right || 20;
        this.visible = config.visible || false;

        this.activeCategory = '全部 (All)';
        this.sortOrder = 'newest';
        this.filterText = '';
        this.selectedPrompts = new Set();

        this._eventRegistry = new Map();

        // 订阅数据更新
        this.storage.subscribe(() => {
            this.handleDataUpdate();
        });
    }

    handleDataUpdate() {
        const libData = this.storage.getCurrentLibrary();
        if (libData) {
            this.allPrompts = libData.prompts || [];
            this.categories = ['全部 (All)', ...new Set(this.allPrompts.map(p => p.category || 'Uncategorized'))];
            this.renderCategories();
            this.renderList();

            // 更新库名称
            const nameEl = this.shadow.querySelector('.current-lib-name');
            if (nameEl) nameEl.textContent = libData.name;
        }
    }

    renderFramework() {
        const isLeft = this.side === 'left';
        const posStyle = isLeft ? `left: ${this.leftPos}px;` : `right: ${this.rightPos}px;`;
        const displayStyle = this.visible ? 'display: flex;' : 'display: none;';

        this.render(`
            <style>
                :host {
                    --gpm-primary: ${UI_THEME.primary};
                    --gpm-bg: ${UI_THEME.glassBg};
                    --gpm-border: ${UI_THEME.glassBorder};
                    --gpm-shadow: ${UI_THEME.shadow};
                }
                .side-panel {
                    position: fixed; top: ${this.top}px; ${posStyle}
                    width: ${this.width}px; height: ${this.height}px;
                    background: var(--gpm-bg);
                    border: 1px solid var(--gpm-border);
                    border-radius: ${UI_THEME.radius};
                    box-shadow: var(--gpm-shadow);
                    color: #fff; display: flex; flex-direction: column; overflow: hidden;
                    z-index: 10000; transition: ${UI_THEME.transition};
                    ${displayStyle}
                }
                .header { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: move; }
                .gpm-btn {
                    background: rgba(255,255,255,0.1); border: none; color: white;
                    padding: 5px 10px; border-radius: 4px; cursor: pointer;
                    transition: all 0.2s; display: flex; align-items: center; justify-content: center;
                }
                .gpm-btn:hover { background: rgba(255,255,255,0.2); }
                .gpm-btn.primary { background: var(--gpm-primary); }

                .content { flex: 1; overflow-y: auto; padding: 10px; }
                .modifiers-bar, .category-bar { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; gap: 4px; overflow-x: auto; }

                .highlight { color: #1d9bf0; font-weight: bold; }
                .resize-handle {
                    position: absolute; bottom: 0; width: 20px; height: 20px;
                    background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%);
                    z-index: 10;
                }

                /* 滚动条美化 */
                ::-webkit-scrollbar { width: 4px; height: 4px; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
            </style>

            <div class="side-panel">
                <div class="header">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold;">${isLeft ? '图片 (Image)' : '视频 (Video)'}</span>
                        <div style="display: flex; gap: 5px;">
                            <button class="gpm-btn auto-hide-btn" title="自动隐藏">📌</button>
                            <button class="gpm-btn min-btn">${ICON_SET.Minimize}</button>
                        </div>
                    </div>
                    <!-- 库切换行 -->
                    <div class="lib-row" style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
                        <div class="lib-trigger-area" style="flex: 1; display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 4px 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; height: 32px;">
                            <span class="current-lib-name" style="font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Loading...</span>
                            <span style="font-size: 10px; opacity: 0.6;">▼</span>
                        </div>
                        <button class="gpm-btn add-lib-btn" title="新建库">${ICON_SET.AddLib}</button>
                    </div>
                </div>

                <div class="modifiers-bar"></div>
                <div class="category-bar"></div>

                <div class="sticky-toolbar" style="padding: 10px; flex-shrink: 0;">
                    <div class="search-row" style="display: flex; gap: 4px; margin-bottom: 8px;">
                        <input type="text" class="search-input" placeholder="搜索... (Search)" style="flex: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; padding: 4px 8px; font-size: 12px; outline: none;">
                        <button class="gpm-btn sort-btn">${ICON_SET.Sort}</button>
                        <button class="gpm-btn add-prompt-btn">${ICON_SET.AddPrompt}</button>
                    </div>
                    <div class="mode-row" style="display: flex; gap: 6px;">
                        <div style="display: flex; flex: 1; background: rgba(0,0,0,0.3); border-radius: 4px; padding: 2px;">
                            <button class="gpm-btn mode-btn active" data-mode="append" style="flex: 1; font-size: 11px;">追加</button>
                            <button class="gpm-btn mode-btn" data-mode="replace" style="flex: 1; font-size: 11px; background: transparent;">替换</button>
                        </div>
                        <button class="gpm-btn dice-btn">${ICON_SET.Dice}</button>
                        <button class="gpm-btn ai-assist-btn">${ICON_SET.AiAssist}</button>
                    </div>
                </div>

                <div class="content">
                    <div id="prompt-container"></div>
                </div>

                <div class="resize-handle" style="${isLeft ? 'right: 0;' : 'left: 0; transform: scaleX(-1);'}"></div>
            </div>
        `);
        this.handleDataUpdate();
    }

    afterRender() {
        const panel = this.shadow.querySelector('.side-panel');
        const header = this.shadow.querySelector('.header');

        // 拖拽逻辑
        let isDragging = false;
        let startX, startY, initialL, initialT;

        header.onmousedown = (e) => {
            if (e.target.closest('button') || e.target.closest('.lib-trigger-area')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            initialL = rect.left;
            initialT = rect.top;

            panel.style.transition = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        };

        const onMove = (e) => {
            if (!isDragging) return;
            panel.style.left = (initialL + e.clientX - startX) + 'px';
            panel.style.top = (initialT + e.clientY - startY) + 'px';
            panel.style.right = 'auto';
        };

        const onUp = () => {
            isDragging = false;
            panel.style.transition = UI_THEME.transition;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            this.saveState();
        };

        // 绑定搜索
        const searchInput = this.shadow.querySelector('.search-input');
        searchInput.oninput = (e) => {
            this.filterText = e.target.value;
            this.renderList();
        };

        // 绑定模式切换
        this.shadow.querySelectorAll('.mode-btn').forEach(btn => {
            btn.onclick = () => {
                this.clickMode = btn.dataset.mode;
                this.shadow.querySelectorAll('.mode-btn').forEach(b => {
                    b.style.background = 'transparent';
                    b.classList.remove('active');
                });
                btn.style.background = 'var(--gpm-primary)';
                btn.classList.add('active');
            };
        });

        // 联动自动重试按钮
        const aiAssistBtn = this.shadow.querySelector('.ai-assist-btn');
        aiAssistBtn.onclick = () => {
            if (this.onAiAssistTrigger) this.onAiAssistTrigger();
        };
    }

    renderCategories() {
        const container = this.shadow.querySelector('.category-bar');
        if (!container) return;
        container.innerHTML = '';

        this.categories.forEach(cat => {
            const chip = document.createElement('div');
            chip.textContent = cat;
            const isActive = cat === this.activeCategory;
            chip.style.cssText = `
                padding: 2px 10px; background: ${isActive ? 'var(--gpm-primary)' : 'rgba(255,255,255,0.1)'};
                border-radius: 12px; font-size: 11px; cursor: pointer; white-space: nowrap;
            `;
            chip.onclick = () => {
                this.activeCategory = cat;
                this.renderCategories();
                this.renderList();
            };
            container.appendChild(chip);
        });
    }

    renderList() {
        const container = this.shadow.querySelector('#prompt-container');
        if (!container) return;
        container.innerHTML = '';

        let filtered = this.allPrompts || [];
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

        filtered.forEach(p => {
            const el = document.createElement('div');
            el.style.cssText = `
                padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;
                margin-bottom: 6px; cursor: pointer; border: 1px solid transparent;
            `;
            el.innerHTML = `
                <div style="font-weight: bold; font-size: 13px;">${p.name || 'Untitled'}</div>
                <div style="font-size: 11px; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${(p.content || '').slice(0, 50)}
                </div>
            `;
            el.onclick = (e) => {
                const isReplace = this.clickMode === 'replace' || e.shiftKey;
                this.input.insert(p.content, isReplace);
            };
            container.appendChild(el);
        });
    }

    saveState() {
        const panel = this.shadow.querySelector('.side-panel');
        const state = {
            visible: panel.style.display !== 'none',
            left: parseFloat(panel.style.left),
            top: parseFloat(panel.style.top),
            width: parseFloat(panel.style.width),
            height: parseFloat(panel.style.height)
        };
        // 保存到 storage
    }

    show() { this.shadow.querySelector('.side-panel').style.display = 'flex'; }
    hide() { this.shadow.querySelector('.side-panel').style.display = 'none'; }
    toggle() {
        const panel = this.shadow.querySelector('.side-panel');
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    }
}
