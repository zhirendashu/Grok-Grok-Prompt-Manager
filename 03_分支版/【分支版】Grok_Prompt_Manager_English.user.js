// ==UserScript==
// @name         Grok Prompt Manager
// @namespace    http://tampermonkey.net/
// @version      0.18-EN
// @description  Prompt Management Tool for Grok Imagine
// @author       You
// @match        https://grok.com/*
// @match        file:///*mock_grok.html*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const COLORS = {
        primary: '#4dabf7',
        bg: 'rgba(20, 20, 20, 0.95)',
        border: 'rgba(255, 255, 255, 0.1)',
        text: '#e0e0e0',
        textMuted: '#888',
        inputBg: 'rgba(0,0,0,0.3)',
        pin: '#ffd43b'
    };

    const Storage = {
        get: (key, def) => {
            if (typeof GM_getValue !== 'undefined') return GM_getValue(key, def);
            const val = localStorage.getItem(key);
            return val ? val : def;
        },
        set: (key, val) => {
            let valueToSave = val;
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(key, valueToSave);
            } else {
                localStorage.setItem(key, JSON.stringify(valueToSave));
            }
        }
    };

    class GrokPromptManager {
        constructor() {
            this.prompts = { text_to_image: [], image_to_video: [] };
            this.history = []; // History Log
            this.defaultSettings = {
                mode: 'append',
                sort: 'newest',
                showBottomPanel: false,
                modifiers: ['--ar 16:9', '--niji 6', '--s 750', 'Cyberpunk', 'Realistic', 'Studio Ghibli'],
                theme: 'light',
                leftPanelCollapsed: false,
                rightPanelCollapsed: false,
                bottomPanelTab: 'draft',
                currentLibId: 'default'
            };
            this.settings = { ...this.defaultSettings };

            // New Data Model:
            // libraries: [ { id: 'default', name: '📚 Default Library', prompts: { text_to_image: [], image_to_video: [] } } ]
            this.libraries = [];
            this.currentLibrary = null;

            this.draftContent = '';
            this.history = [];
            this.settings = {};
            this.isOpen = false; // Keep this for panel visibility
            this.dragState = { active: false, target: null, startX: 0, startY: 0, initialLeft: 0, initialTop: 0 };
            this.resizeState = { active: false, target: null, startX: 0, startY: 0, initialW: 0, initialH: 0, direction: '' };

            // Call init asynchronously
            if (document.readyState !== 'loading') this.init();
            else document.addEventListener('DOMContentLoaded', () => this.init());
        }

        async init() {
            try {
                await this.loadData();
                this.currInput = null;
                this.createUI();
                this.injectStyles();
                this.applySavedLayout();
                this.initSPAListener();
                console.log('Grok Prompt Manager initialized');
            } catch (err) {
                console.error('Grok Prompt Manager Init Error:', err);
                alert('Grok Manager initialization failed: ' + err.message);
            }
        }

        initSPAListener() {
            const checkVisibility = () => {
                const path = window.location.pathname;
                const isMock = window.location.protocol === 'file:';
                const isImagineArea = path.startsWith('/imagine');
                const isFavorites = path.includes('/favorites');
                const shouldShow = isMock || (isImagineArea && !isFavorites);

                if (this.toggleBtn) {
                    this.toggleBtn.style.display = shouldShow ? 'flex' : 'none';
                    if (!shouldShow) {
                        if (this.leftPanel) this.leftPanel.style.display = 'none';
                        if (this.rightPanel) this.rightPanel.style.display = 'none';
                        if (this.bottomPanel) this.bottomPanel.style.display = 'none';
                    } else {
                        if (this.leftPanel) this.leftPanel.style.display = '';
                        if (this.rightPanel) this.rightPanel.style.display = '';
                        if (this.bottomPanel) this.bottomPanel.style.display = '';
                        if (this.isOpen) {
                            if (this.leftPanel) this.leftPanel.classList.add('open');
                            if (this.rightPanel) this.rightPanel.classList.add('open');
                            if (this.settings.showBottomPanel && this.bottomPanel) this.bottomPanel.classList.add('open');
                        } else {
                            if (this.leftPanel) this.leftPanel.classList.remove('open');
                            if (this.rightPanel) this.rightPanel.classList.remove('open');
                            if (this.bottomPanel) this.bottomPanel.classList.remove('open');
                        }
                    }
                }
            };
            let lastUrl = location.href;
            new MutationObserver(() => {
                const url = location.href;
                if (url !== lastUrl) { lastUrl = url; checkVisibility(); }
            }).observe(document, { subtree: true, childList: true });
            setInterval(checkVisibility, 500);
            checkVisibility();
        }

        async loadData() {
            // Polyfill
            if (typeof GM_getValue === 'undefined') {
                window.GM_getValue = (k, d) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; };
                window.GM_setValue = (k, v) => localStorage.setItem(k, JSON.stringify(v));
            }

            const data = await GM_getValue('grok_prompt_manager_data', {}); // Use new key
            // Try legacy keys if new key empty
            let oldPrompts = null;
            if (!data.libraries) {
                const legacyPrompts = GM_getValue('grok_prompts', null);
                if (legacyPrompts) {
                    try { oldPrompts = typeof legacyPrompts === 'string' ? JSON.parse(legacyPrompts) : legacyPrompts; } catch (e) { }
                }
            }

            this.libraries = data.libraries || [];
            if (this.libraries.length === 0) {
                // Migrate or Defaults
                const initialPrompts = oldPrompts || {
                    text_to_image: [
                        { id: 1, text: "A futuristic city with neon lights...", pinned: false },
                        { id: 2, text: "Portrait of a cyberpunk warrior...", pinned: true }
                    ],
                    image_to_video: [
                        { id: 3, text: "Camera pans slowly around the subject...", pinned: false }
                    ]
                };
                if (initialPrompts.spicy && !initialPrompts.text_to_image) {
                    initialPrompts.text_to_image = initialPrompts.spicy;
                    delete initialPrompts.spicy;
                }
                this.libraries.push({
                    id: 'default',
                    name: '📚 Default Library',
                    prompts: initialPrompts
                });
            }

            this.settings = { ...this.defaultSettings, ...(data.settings || {}) };
            const legacySettings = GM_getValue('grok_settings', null);
            if (legacySettings && !data.settings) {
                try { this.settings = { ...this.settings, ...JSON.parse(legacySettings) }; } catch (e) { }
            }

            this.currentLibrary = this.libraries.find(l => l.id === this.settings.currentLibId) || this.libraries[0];
            if (!this.currentLibrary) { // Safety check
                this.currentLibrary = this.libraries[0];
                this.settings.currentLibId = this.currentLibrary.id;
            }
            this.prompts = this.currentLibrary.prompts; // Shortcut

            this.draftContent = data.draftContent || GM_getValue('grok_draft', '');
            this.history = data.history || GM_getValue('grok_history', []);
            this.activeCategories = data.activeCategories || {};
        }

        saveData() {
            // Update current lib
            const idx = this.libraries.findIndex(l => l.id === this.currentLibrary.id);
            if (idx !== -1) this.libraries[idx] = this.currentLibrary;

            const data = {
                libraries: this.libraries,
                settings: this.settings,
                draftContent: this.draftContent,
                history: this.history,
                activeCategories: this.activeCategories || {}
            };
            GM_setValue('grok_prompt_manager_data', data);
        }

        applySavedLayout() {
            // Ensure panels exist before applying
            const s = this.settings;
            // Use defaults if valid coordinates are missing
            const valid = (obj) => obj && typeof obj.x === 'number';
            const left = valid(s.leftPanel) ? s.leftPanel : { x: 20, y: 100, width: 300, height: 600 };
            const right = valid(s.rightPanel) ? s.rightPanel : { x: window.innerWidth - 340, y: 100, width: 300, height: 600 };

            const apply = (panel, cfg, isRight) => {
                if (!panel) return;
                panel.style.left = cfg.x + 'px';
                panel.style.top = cfg.y + 'px';
                panel.style.width = cfg.width + 'px';
                panel.style.height = cfg.height + 'px';
                panel.style.transform = 'none'; // reset centered styles if any

                // Boundaries
                if (parseInt(panel.style.left) < 0) panel.style.left = '0px';
                if (parseInt(panel.style.top) < 0) panel.style.top = '0px';

                if (isRight) {
                    panel.style.right = 'auto'; // Disable CSS right
                    // If user drags extremely right, clamp it? No, users might have dual monitors. 
                    // Just ensure it's somewhat visible on load
                    if (cfg.x > window.innerWidth - 50) panel.style.left = (window.innerWidth - 320) + 'px';
                }
            };

            if (this.leftPanel) apply(this.leftPanel, left, false);
            if (this.rightPanel) apply(this.rightPanel, right, true);
        }

        createUI() {
            this.container = document.createElement('div');
            this.container.id = 'grok-prompt-manager-root';
            document.body.appendChild(this.container);
            this.shadow = this.container.attachShadow({ mode: 'open' });

            this.renderToggle();
            this.renderLeftPanel();
            this.renderRightPanel();
            this.renderBottomPanel();

            document.addEventListener('mousemove', (e) => this.handleMove(e));
            document.addEventListener('mouseup', (e) => this.handleUp(e));
        }

        injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                * { box-sizing: border-box; }
                .gpm-toggle {
                    position: fixed; bottom: 20px; right: 20px; width: 48px; height: 48px;
                    background: ${COLORS.bg}; border: 1px solid ${COLORS.border}; border-radius: 50%;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; display: flex;
                    align-items: center; justify-content: center; font-size: 24px; z-index: 10000;
                    user-select: none; transition: all 0.2s; color: white;
                }
                .gpm-toggle:hover { transform: scale(1.1); border-color: ${COLORS.primary}; }

                .gpm-sidebar {
                    position: fixed; top: 10%; height: 80%; width: 320px;
                    background: ${COLORS.bg}; backdrop-filter: blur(16px);
                    color: white; z-index: 9999; border-radius: 12px; display: flex; flex-direction: column;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5); transition: opacity 0.3s;
                    opacity: 0; pointer-events: none; border: 1px solid ${COLORS.border};
                    font-family: system-ui, sans-serif;
                }
                .gpm-sidebar.open { opacity: 1; pointer-events: auto; }
                .gpm-sidebar.minimized { height: 50px !important; overflow: hidden; }

                /* Bottom Panel (Draft & History) */
                .gpm-bottom-panel {
                    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translateY(20px);
                    width: 600px; height: 200px; background: ${COLORS.bg}; border: 1px solid ${COLORS.border};
                    border-radius: 12px; z-index: 10001; display: flex; flex-direction: column; opacity: 0; pointer-events: none;
                    transition: all 0.2s ease; backdrop-filter: blur(12px); box-shadow: 0 -4px 32px rgba(0,0,0,0.5);
                }
                .gpm-bottom-panel.open { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0); }
                
                .gpm-bp-header { display:flex; border-bottom:1px solid ${COLORS.border}; }
                .gpm-bp-tab { flex:1; text-align:center; padding:8px; cursor:pointer; color:${COLORS.textMuted}; font-size:12px; border-right:1px solid ${COLORS.border}; background:rgba(255,255,255,0.02); }
                .gpm-bp-tab:last-child { border-right:none; }
                .gpm-bp-tab.active { background:transparent; color:white; font-weight:bold; box-shadow:inset 0 -2px 0 ${COLORS.primary}; }
                .gpm-bp-close { width:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; color:${COLORS.textMuted}; border-left:1px solid ${COLORS.border}; }
                .gpm-bp-close:hover { color:white; }

                .gpm-bp-content { flex:1; overflow:hidden; display:flex; flex-direction:column; padding:10px; }
                .gpm-sp-textarea { flex:1; background: ${COLORS.inputBg}; border:1px solid ${COLORS.border}; color:white; border-radius:6px; padding:8px; resize:none; font-family:inherit; margin-bottom:8px; }
                .gpm-sp-actions { display:flex; gap:8px; justify-content:flex-end; }
                
                .gpm-hist-list { flex:1; overflow-y:auto; }
                .gpm-hist-item { padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; font-size:11px; color:#ccc; display:flex; justify-content:space-between; }
                .gpm-hist-item:hover { background:rgba(255,255,255,0.05); color:white; }
                .gpm-hist-time { font-family:monospace; color:#666; font-size:10px; margin-left:8px; flex-shrink:0; }

                .gpm-header { padding: 12px 16px; border-bottom: 1px solid ${COLORS.border}; background: rgba(255,255,255,0.02); border-radius: 12px 12px 0 0; cursor: grab; user-select: none; }
                .gpm-header:active { cursor: grabbing; }

                .gpm-modifiers { display:flex; gap:4px; margin-bottom:8px; overflow-x:auto; padding-bottom:4px; will-change:transform; }
                .gpm-modifiers::-webkit-scrollbar { height:2px; }
                .gpm-modifiers::-webkit-scrollbar-thumb { background: #444; }
                .gpm-chip { background:${COLORS.inputBg}; border:1px solid ${COLORS.border}; color:#aaa; font-size:10px; padding:2px 8px; border-radius:10px; white-space:nowrap; cursor:pointer; }
                .gpm-chip:hover { border-color:${COLORS.primary}; color:white; }

                .gpm-resize-handle { position: absolute; width: 15px; height: 15px; bottom: 0px; right: 0px; cursor: se-resize; z-index: 10; }
                .gpm-resize-right { position: absolute; top:0; bottom:0; right: -5px; width: 10px; cursor: ew-resize; z-index: 9; }
                .gpm-resize-left { position: absolute; top:0; bottom:0; left: -5px; width: 10px; cursor: ew-resize; z-index: 9; }

                .gpm-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                .gpm-title { font-weight: 600; font-size: 14px; opacity: 0.9; }
                .gpm-title.left { color: #ff8787; }
                .gpm-title.right { color: #74c0fc; }

                .gpm-ctrl-btn { background: transparent; border: none; color: ${COLORS.textMuted}; cursor: pointer; font-size: 18px; padding: 4px; border-radius: 4px; }
                .gpm-ctrl-btn:hover { color: white; background: rgba(255,255,255,0.1); }
                .gpm-ctrl-btn.active { color: ${COLORS.primary}; background: rgba(77, 171, 247, 0.1); }

                .gpm-add-area { margin-bottom: 8px; display: flex; gap: 6px; }
                .gpm-add-input { flex: 1; background: ${COLORS.inputBg}; border: 1px solid ${COLORS.border}; color: white; border-radius: 6px; padding: 6px 8px; font-size: 12px; resize: vertical; min-height: 32px; font-family: inherit; }
                .gpm-add-input:focus { outline: none; border-color: ${COLORS.primary}; }
                .gpm-add-btn { background: rgba(255,255,255,0.1); border: 1px solid ${COLORS.border}; color: ${COLORS.primary}; border-radius: 6px; padding: 0 10px; cursor: pointer; font-weight: bold; }
                .gpm-add-btn:hover { background: ${COLORS.primary}; color: white; border-color: ${COLORS.primary}; }

                .gpm-search { background: ${COLORS.inputBg}; border: 1px solid ${COLORS.border}; color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px; width: 100%; outline: none; margin-bottom: 8px; }

                .gpm-toolbar { display: flex; justify-content: space-between; gap: 8px; }
                .gpm-mode-switch { display: flex; background: rgba(0,0,0,0.3); border-radius: 6px; padding: 2px; flex: 1; }
                .gpm-mode-opt { flex: 1; text-align: center; font-size: 10px; padding: 4px 0; cursor: pointer; border-radius: 4px; color: ${COLORS.textMuted}; }
                .gpm-mode-opt.active { background: ${COLORS.primary}; color: white; font-weight: bold; }

                .gpm-lib-ctrl { display:flex; gap:4px; align-items:center; margin-bottom:8px; }
                .gpm-select { flex:1; background:${COLORS.inputBg}; border:1px solid ${COLORS.border}; color:${COLORS.text}; border-radius:4px; padding:4px; font-size:11px; outline:none; }
                .gpm-select option { background:#222; color:white; }
                .gpm-btn.small { padding:4px 8px; font-size:11px; min-width:28px; height: 26px; }

                .gpm-actions { display: flex; gap: 4px; }
                .gpm-btn { background: rgba(255,255,255,0.05); border: 1px solid transparent; color: ${COLORS.text}; font-size: 11px; padding: 4px 8px; cursor: pointer; border-radius: 4px; }
                .gpm-btn:hover { background: rgba(255,255,255,0.1); border-color: ${COLORS.border}; }
                .gpm-btn.danger:hover { color: #ff6b6b; background: rgba(255,107,107,0.1); }
                .gpm-btn.primary { background: ${COLORS.primary}; color: white; border:none; }
                .gpm-btn.primary:hover { opacity: 0.9; }

                .gpm-categories {
                display: flex; gap: 4px; padding: 6px 8px; overflow-x: auto; white-space: nowrap;
                background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.1);
                scrollbar-width: none; /* Firefox */
            }
            .gpm-categories::-webkit-scrollbar { display: none; }
            .gpm-cat-chip {
                padding: 2px 8px; border-radius: 10px; font-size: 11px; cursor: pointer;
                background: rgba(255,255,255,0.1); color: #ccc; transition: all 0.2s;
                border: 1px solid transparent;
            }
            .gpm-cat-chip:hover { background: rgba(255,255,255,0.2); color: #fff; }
            .gpm-cat-chip.active {
                background: ${COLORS.primary}; color: #fff; border-color: rgba(255,255,255,0.3);
                box-shadow: 0 0 5px ${COLORS.primary};
            }
            .gpm-list { flex: 1; overflow-y: auto; padding: 12px; }
                .gpm-list::-webkit-scrollbar { width: 4px; }
                .gpm-list::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }

                .gpm-prompt-item { background: rgba(255,255,255,0.03); padding: 10px; margin-bottom: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; line-height: 1.5; position: relative; border: 1px solid transparent; }
                .gpm-prompt-item:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1); }
                .gpm-prompt-text { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; color: #ddd; padding-right: 40px; }
                .gpm-item-actions { position: absolute; top: 6px; right: 6px; display:flex; gap:4px; opacity:0; transition:opacity 0.2s; }
                .gpm-prompt-item:hover .gpm-item-actions { opacity: 1; }
                .gpm-icon-btn { background: none; border: none; color: ${COLORS.textMuted}; cursor: pointer; font-size:14px; padding:0; }
                .gpm-icon-btn:hover { color: white; }
                .gpm-icon-btn.warn:hover { color: #ff6b6b; }
                .gpm-icon-btn.pinned { color: ${COLORS.pin}; opacity: 1 !important; }
                
                .gpm-toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.85); color: white; padding: 12px 24px; border-radius: 8px; z-index: 11000; backdrop-filter: blur(4px); pointer-events: none; }
            `;
            this.shadow.appendChild(style);
        }

        renderToggle() {
            this.toggleBtn = document.createElement('div');
            this.toggleBtn.className = 'gpm-toggle';
            this.toggleBtn.textContent = '🤖';
            this.toggleBtn.onclick = () => this.togglePanels();
            this.shadow.appendChild(this.toggleBtn);
        }

        renderBottomPanel() {
            this.bottomPanel = document.createElement('div');
            this.bottomPanel.className = `gpm-bottom-panel ${this.settings.showBottomPanel && this.isOpen ? 'open' : ''}`;
            this.updateBottomPanel();
            this.shadow.appendChild(this.bottomPanel);
        }

        updateBottomPanel() {
            const isDraft = this.settings.bottomPanelTab === 'draft';
            this.bottomPanel.innerHTML = `
                <div class="gpm-bp-header">
                    <div class="gpm-bp-tab ${isDraft ? 'active' : ''}" data-tab="draft">📝 Draft</div>
                    <div class="gpm-bp-tab ${!isDraft ? 'active' : ''}" data-tab="history">📜 History</div>
                    <div class="gpm-bp-close">×</div>
                </div>
                <div class="gpm-bp-content">
                    ${isDraft ? `
                        <textarea id="sp-text" class="gpm-sp-textarea" placeholder="Compose and edit prompts here...">${this.draftContent}</textarea>
                        <div class="gpm-sp-actions">
                            <button id="sp-clear" class="gpm-btn">Clear</button>
                            <button id="sp-copy" class="gpm-btn">Copy</button>
                            <button id="sp-send" class="gpm-btn primary">Send to Grok</button>
                        </div>
                    ` : `
                        <div id="history-list" class="gpm-hist-list"></div>
                        <div class="gpm-sp-actions" style="margin-top:8px">
                             <button id="hist-clear" class="gpm-btn danger">Clear History</button>
                        </div>
                    `}
                </div>
            `;

            // Events
            this.bottomPanel.querySelectorAll('.gpm-bp-tab').forEach(t => t.onclick = () => {
                this.settings.bottomPanelTab = t.dataset.tab;
                this.saveData();
                this.updateBottomPanel();
            });
            this.bottomPanel.querySelector('.gpm-bp-close').onclick = () => {
                this.settings.showBottomPanel = false;
                this.saveData();
                this.bottomPanel.classList.remove('open');
                this.shadow.querySelectorAll('.toggle-bp-btn').forEach(b => b.classList.remove('active'));
            };

            if (isDraft) {
                const spText = this.bottomPanel.querySelector('#sp-text');
                spText.addEventListener('input', (e) => { this.draftContent = e.target.value; this.saveData(); });
                this.bottomPanel.querySelector('#sp-clear').onclick = () => { this.draftContent = ''; spText.value = ''; this.saveData(); };
                this.bottomPanel.querySelector('#sp-copy').onclick = () => { navigator.clipboard.writeText(spText.value); this.showToast('Draft copied'); };
                this.bottomPanel.querySelector('#sp-send').onclick = () => { if (spText.value.trim()) this.insertPrompt(spText.value, true); };
            } else {
                this.renderHistoryList();
                this.bottomPanel.querySelector('#hist-clear').onclick = () => {
                    if (confirm('Clear history?')) { this.history = []; this.saveData(); this.renderHistoryList(); }
                };
            }
        }

        renderHistoryList() {
            const list = this.bottomPanel.querySelector('#history-list');
            if (!list) return;
            list.innerHTML = '';
            if (this.history.length === 0) { list.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">No history</div>'; return; }
            this.history.forEach(h => {
                const item = document.createElement('div');
                item.className = 'gpm-hist-item';
                const timeStr = new Date(h.time).toLocaleTimeString();
                item.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:10px;">${h.text}</span><span class="gpm-hist-time">${timeStr}</span>`;
                item.onclick = () => this.insertPrompt(h.text);
                list.appendChild(item);
            });
        }

        renderLeftPanel() {
            this.leftPanel = document.createElement('div');
            this.leftPanel.className = `gpm-sidebar gpm-sidebar-left ${this.isOpen ? 'open' : ''}`;
            this.leftPanel.innerHTML = this.getPanelContent('left', '文生图 (Text-to-Image)', 'left');
            this.addResizeHandles(this.leftPanel, true);
            this.shadow.appendChild(this.leftPanel);
            this.setupPanel('left', 'text_to_image', this.leftPanel);
        }

        renderRightPanel() {
            this.rightPanel = document.createElement('div');
            this.rightPanel.className = `gpm-sidebar gpm-sidebar-right ${this.isOpen ? 'open' : ''}`;
            this.rightPanel.innerHTML = this.getPanelContent('right', '图转视频 (Image-to-Video)', 'right');
            this.addResizeHandles(this.rightPanel, false);
            this.shadow.appendChild(this.rightPanel);
            this.setupPanel('right', 'image_to_video', this.rightPanel);
        }

        addResizeHandles(panel, isLeft) {
            const resizeSide = document.createElement('div');
            resizeSide.className = isLeft ? 'gpm-resize-right' : 'gpm-resize-left';
            resizeSide.addEventListener('mousedown', (e) => this.resizeStart(e, panel, isLeft ? 'e' : 'w'));
            panel.appendChild(resizeSide);

            const resizeCorner = document.createElement('div');
            resizeCorner.className = 'gpm-resize-handle';
            if (!isLeft) { resizeCorner.style.right = 'auto'; resizeCorner.style.left = '0px'; resizeCorner.style.cursor = 'sw-resize'; }
            resizeCorner.addEventListener('mousedown', (e) => this.resizeStart(e, panel, isLeft ? 'se' : 'sw'));
            panel.appendChild(resizeCorner);
        }

        // Library Management Methods
        createNewLibrary(name) {
            const newLib = {
                id: 'lib_' + Date.now(),
                name: name || '新提示词库',
                prompts: { text_to_image: [], image_to_video: [] }
            };
            this.libraries.push(newLib);
            this.switchLibrary(newLib.id);
        }

        switchLibrary(libId) {
            const temp = this.libraries.find(l => l.id === libId);
            if (temp) {
                this.currentLibrary = temp;
                this.prompts = temp.prompts; // Shortcut update
                this.settings.currentLibId = libId;
                this.saveData();
                this.renderAllLists();
                this.showToast(`已切换至: ${temp.name}`);
                // Re-render UI to update selector
                this.leftPanel.innerHTML = this.getPanelContent('left', '文生图 (Text-to-Image)', 'left');
                this.rightPanel.innerHTML = this.getPanelContent('right', '图转视频 (Image-to-Video)', 'right');
                this.setupPanel('left', 'text_to_image', this.leftPanel);
                this.setupPanel('right', 'image_to_video', this.rightPanel);
                this.addResizeHandles(this.leftPanel, true);
                this.addResizeHandles(this.rightPanel, false);
            }
        }

        deleteCurrentLibrary() {
            if (this.libraries.length <= 1) {
                alert('至少保留一个库');
                return;
            }
            if (confirm(`确定删除库 "${this.currentLibrary.name}" 吗？此操作无法撤销！`)) {
                this.libraries = this.libraries.filter(l => l.id !== this.currentLibrary.id);
                this.switchLibrary(this.libraries[0].id);
            }
        }

        renameCurrentLibrary() {
            const newName = prompt("请输入新名称:", this.currentLibrary.name);
            if (newName && newName.trim()) {
                this.currentLibrary.name = newName.trim();
                this.saveData();
                this.switchLibrary(this.currentLibrary.id); // Refresh
            }
        }

        getPanelContent(id, title, colorClass) {
            // Show library controls on BOTH panels now
            const options = this.libraries.map(l => `<option value="${l.id}" ${l.id === this.currentLibrary.id ? 'selected' : ''}>${l.name}</option>`).join('');
            const libraryControls = `
                <div class="gpm-lib-ctrl" style="margin-bottom:8px;display:flex;gap:4px;align-items:center;">
                    <select id="lib-select-${id}" class="gpm-select" style="flex:1;">${options}</select>
                    <button id="lib-add-${id}" class="gpm-btn small" title="新建库">➕</button>
                    <button id="lib-edit-${id}" class="gpm-btn small" title="重命名">✏️</button>
                    <button id="lib-del-${id}" class="gpm-btn small danger" title="删除库">🗑️</button>
                </div>`;

            return `
                <div class="gpm-header">
                    <div class="gpm-header-row">
                        <span class="gpm-title ${colorClass}">${title}</span>
                        <div style="display:flex;gap:4px">
                             <button class="gpm-ctrl-btn toggle-bp-btn ${this.settings.showBottomPanel ? 'active' : ''}" title="草稿/历史">📝</button>
                             <button class="gpm-ctrl-btn toggle-sort-btn" title="排序">⏳</button>
                             <button class="gpm-ctrl-btn minimize-btn" title="收起/展开">${this.settings[`${id}PanelCollapsed`] ? '+' : '−'}</button>
                        </div>
                    </div>
                    ${libraryControls}
                    <div class="gpm-modifiers" id="mod-${id}">
                         ${this.settings.modifiers.map(m => `<div class="gpm-chip" data-val="${m}">${m}</div>`).join('')}
                         <div class="gpm-chip add-mod-btn" title="添加新标签">+</div>
                    </div>
                    <div class="gpm-add-area">
                        <textarea id="add-input-${id}" class="gpm-add-input" placeholder="输入新提示词..." rows="1"></textarea>
                        <button id="add-btn-${id}" class="gpm-add-btn" title="添加">+</button>
                    </div>
                    <input type="text" class="gpm-search" id="search-${id}" placeholder="搜索...">
                    <div class="gpm-toolbar">
                        <div class="gpm-mode-switch">
                            <div class="gpm-mode-opt ${this.settings.mode === 'append' ? 'active' : ''}" data-mode="append">追加</div>
                            <div class="gpm-mode-opt ${this.settings.mode === 'replace' ? 'active' : ''}" data-mode="replace">替换</div>
                        </div>
                        <div class="gpm-actions">
                            <button id="import-${id}" class="gpm-btn">入</button>
                            <button id="export-${id}" class="gpm-btn">出</button>
                            <button id="clear-${id}" class="gpm-btn danger">清</button>
                        </div>
                    </div>
                </div>
                <!-- Theme/Category Filter Bar -->
                <div id="cats-${id}" class="gpm-categories" style="display:none;"></div>
                <div id="list-${id}" class="gpm-list"></div>
            `;
        }

        setupPanel(uiId, dataKey, panelEl) {
            panelEl.querySelector('.gpm-header').addEventListener('mousedown', (e) => this.dragStart(e, panelEl));
            panelEl.querySelector('.minimize-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const isMin = panelEl.classList.toggle('minimized');
                this.settings[`${uiId}PanelCollapsed`] = isMin;
                e.target.textContent = isMin ? '+' : '−';
                this.saveData();
            });

            // Bind Library Controls (Both Panels)
            const libSelect = panelEl.querySelector(`#lib-select-${uiId}`);
            if (libSelect) {
                libSelect.addEventListener('change', (e) => this.switchLibrary(e.target.value));
                libSelect.addEventListener('mousedown', e => e.stopPropagation()); // Prevent drag

                panelEl.querySelector(`#lib-add-${uiId}`).onclick = () => {
                    const name = prompt('输入新库名称 (例如: 赛博朋克风):');
                    if (name) this.createNewLibrary(name);
                };
                panelEl.querySelector(`#lib-edit-${uiId}`).onclick = () => this.renameCurrentLibrary();
                panelEl.querySelector(`#lib-del-${uiId}`).onclick = () => this.deleteCurrentLibrary();
            }

            // Modifier Actions
            const updateModifiersUI = () => {
                // Determine which panels need updates. Actually, modifiers are global in settings, 
                // but rendered in both panels independently. We should update both to stay in sync.
                // Simple re-render logic:
                ['left', 'right'].forEach(pid => {
                    const localPanel = this.shadow.querySelector(`.gpm-sidebar-${pid} .gpm-modifiers`);
                    if (localPanel) {
                        localPanel.innerHTML = this.settings.modifiers.map(m => `<div class="gpm-chip" data-val="${m}">${m}</div>`).join('') +
                            `<div class="gpm-chip add-mod-btn" title="添加新标签">+</div>`;
                        this.bindModifierEvents(localPanel);
                    }
                });
            };

            // Extract event binding to reusable function
            this.bindModifierEvents = (container) => {
                container.querySelectorAll('.gpm-chip:not(.add-mod-btn)').forEach(chip => {
                    chip.onclick = (e) => { e.stopPropagation(); this.insertPrompt(chip.dataset.val); };
                    chip.oncontextmenu = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`删除标签 "${chip.dataset.val}" ?`)) {
                            const idx = this.settings.modifiers.indexOf(chip.dataset.val);
                            if (idx > -1) {
                                this.settings.modifiers.splice(idx, 1);
                                this.saveData();
                                updateModifiersUI();
                            }
                        }
                    };
                });
                const addBtn = container.querySelector('.add-mod-btn');
                if (addBtn) {
                    addBtn.onclick = (e) => {
                        e.stopPropagation();
                        const newMod = prompt('输入新快捷标签 (例如: --ar 16:9 或 赛博朋克):');
                        if (newMod && newMod.trim()) {
                            this.settings.modifiers.push(newMod.trim());
                            this.saveData();
                            updateModifiersUI();
                        }
                    };
                }
            };

            // Initial bind
            this.bindModifierEvents(panelEl.querySelector('.gpm-modifiers'));

            // Bottom Panel Toggle
            panelEl.querySelector('.toggle-bp-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.settings.showBottomPanel = !this.settings.showBottomPanel;
                this.saveData();
                if (this.settings.showBottomPanel) {
                    this.bottomPanel.classList.add('open');
                    this.shadow.querySelectorAll('.toggle-bp-btn').forEach(b => b.classList.add('active'));
                } else {
                    this.bottomPanel.classList.remove('open');
                    this.shadow.querySelectorAll('.toggle-bp-btn').forEach(b => b.classList.remove('active'));
                }
            });

            // Sort Toggle
            const sortBtn = panelEl.querySelector('.toggle-sort-btn');
            const updateSortIcon = () => { sortBtn.textContent = this.settings.sort === 'newest' ? '⏳' : '📅'; };
            updateSortIcon();
            sortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.settings.sort = this.settings.sort === 'newest' ? 'oldest' : 'newest';
                this.saveData();
                this.shadow.querySelectorAll('.toggle-sort-btn').forEach(b => {
                    b.textContent = this.settings.sort === 'newest' ? '⏳' : '📅';
                });
                this.renderAllLists();
            });

            // Add
            const addInput = this.shadow.getElementById(`add-input-${uiId}`);
            const handleAdd = () => {
                const text = addInput.value.trim();
                if (!text) return;
                this.prompts[dataKey].unshift({ id: Date.now(), text, pinned: false });
                this.saveData();
                addInput.value = '';
                this.renderList(uiId, dataKey, this.shadow.getElementById(`search-${uiId}`).value);
                this.showToast('已添加');
            };
            this.shadow.getElementById(`add-btn-${uiId}`).addEventListener('click', handleAdd);
            addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } });
            addInput.addEventListener('mousedown', (e) => e.stopPropagation());

            // Mode
            const modeSwitch = panelEl.querySelector('.gpm-mode-switch');
            modeSwitch.querySelectorAll('.gpm-mode-opt').forEach(opt => {
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.settings.mode = opt.dataset.mode;
                    this.saveData();
                    this.updateModeUI(opt.dataset.mode);
                });
            });

            // Search
            const searchInput = this.shadow.getElementById(`search-${uiId}`);
            searchInput.addEventListener('input', (e) => this.renderList(uiId, dataKey, e.target.value));
            searchInput.addEventListener('mousedown', (e) => e.stopPropagation());

            this.bindActions(uiId, dataKey, searchInput);
            this.renderCategories(uiId, dataKey); // Render categories on init/refresh
            this.renderList(uiId, dataKey);
        }

        renderAllLists() {
            this.renderList('left', 'text_to_image', this.shadow.getElementById('search-left').value);
            this.renderList('right', 'image_to_video', this.shadow.getElementById('search-right').value);
        }

        updateModeUI(mode) {
            this.shadow.querySelectorAll('.gpm-mode-opt').forEach(el => el.classList.toggle('active', el.dataset.mode === mode));
        }

        bindActions(uiId, dataKey, searchInput) {
            this.activeCategories = this.activeCategories || {};
            if (!this.activeCategories[uiId]) this.activeCategories[uiId] = 'all';

            this.shadow.getElementById(`import-${uiId}`).addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.multiple = true; // Enable Batch Import
                input.onchange = async (e) => {
                    const files = Array.from(e.target.files);
                    if (!files.length) return;

                    let totalAdded = 0;

                    for (const file of files) {
                        try {
                            const text = await new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onload = (evt) => resolve(evt.target.result);
                                reader.readAsText(file);
                            });

                            const json = JSON.parse(text);
                            // Extract Filename as Category (e.g. "18x_Oral.json" -> "18x_Oral")
                            const categoryName = file.name.replace(/\.json$/i, '');

                            let rawList = [];
                            if (Array.isArray(json)) rawList = json;
                            else if (json[dataKey]) rawList = json[dataKey];
                            else if (json.prompts && Array.isArray(json.prompts)) rawList = json.prompts;
                            else rawList = [];

                            if (rawList.length > 0) {
                                const newPrompts = rawList.map(p => ({
                                    id: p.id || Date.now() + Math.random(),
                                    text: p.text || p.content || (typeof p === 'string' ? p : JSON.stringify(p)),
                                    desc: p.desc || '',
                                    category: categoryName, // Tag with filename!
                                    pinned: p.pinned || false
                                }));
                                this.prompts[dataKey] = [...newPrompts, ...this.prompts[dataKey]];
                                totalAdded += newPrompts.length;
                            }
                        } catch (err) {
                            console.error(`Error importing ${file.name}:`, err);
                        }
                    }

                    this.saveData();
                    this.renderCategories(uiId, dataKey); // Update category bar
                    this.renderList(uiId, dataKey, searchInput.value);
                    this.showToast(`批量导入完成: 新增 ${totalAdded} 条`);
                };
                input.click();
            });

            this.shadow.getElementById(`export-${uiId}`).addEventListener('click', () => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.prompts[dataKey], null, 2));
                const a = document.createElement('a'); a.href = dataStr; a.download = `grok_${dataKey}.json`;
                document.body.appendChild(a); a.click(); a.remove();
            });
            this.shadow.getElementById(`clear-${uiId}`).addEventListener('click', () => {
                if (confirm('确定要清空？')) {
                    this.prompts[dataKey] = [];
                    this.saveData();
                    this.renderList(uiId, dataKey, searchInput.value);
                }
            });
        }

        renderCategories(uiId, dataKey) {
            const catContainer = this.shadow.getElementById(`cats-${uiId}`);
            if (!catContainer) return;

            // Extract unique categories (filter out empty ones)
            const categories = ['all', ...new Set(this.prompts[dataKey].map(p => p.category).filter(c => c))];

            // Only show if we have actual categories
            if (categories.length <= 1) {
                catContainer.style.display = 'none';
                return;
            }
            catContainer.style.display = 'flex';

            const searchInput = this.shadow.getElementById(`search-${uiId}`);
            const currentCat = (this.activeCategories && this.activeCategories[uiId]) || 'all';

            // Check state
            const isExpanded = catContainer.classList.contains('expanded');
            const expandBtnIcon = isExpanded ? '▲' : '▼';

            catContainer.innerHTML = `
                <div class="gpm-cat-expand" title="展开/收起" style="padding:4px 6px; cursor:pointer; color:#888; font-size:10px; display:flex; align-items:center; margin-right:4px; margin-top:2px; background:rgba(255,255,255,0.05); border-radius:4px; height:20px;">${expandBtnIcon}</div>
                <div class="gpm-cat-scroll" style="display:flex; gap:4px; overflow-x:${isExpanded ? 'visible' : 'auto'}; flex-wrap:${isExpanded ? 'wrap' : 'nowrap'}; flex:1; scrollbar-width:none; align-content: flex-start;">
                    ${categories.map(cat => `
                        <div class="gpm-cat-chip ${cat === currentCat ? 'active' : ''}" data-cat="${cat}" style="flex-shrink:0;">
                            ${cat === 'all' ? '全部' : cat}
                        </div>
                    `).join('')}
                </div>
            `;

            // Adjust Container Style for Expansion
            if (isExpanded) {
                catContainer.style.flexWrap = 'nowrap'; // Container itself is row
                catContainer.style.height = 'auto';
                catContainer.style.alignItems = 'flex-start';
            } else {
                catContainer.style.overflowX = 'hidden';
                catContainer.style.alignItems = 'center';
            }

            // Events
            catContainer.querySelector('.gpm-cat-expand').onclick = () => {
                catContainer.classList.toggle('expanded');
                this.renderCategories(uiId, dataKey);
            };

            catContainer.querySelectorAll('.gpm-cat-chip').forEach(el => {
                el.addEventListener('click', () => {
                    this.activeCategories = this.activeCategories || {};
                    this.activeCategories[uiId] = el.dataset.cat;
                    this.saveData();
                    this.renderCategories(uiId, dataKey);
                    this.renderList(uiId, dataKey, searchInput ? searchInput.value : '');
                });
            });
        }

        renderList(uiId, dataKey, filterText = '') {
            const listEl = this.shadow.getElementById(`list-${uiId}`);
            if (!listEl) return;
            listEl.innerHTML = '';

            const lowerFilter = filterText.toLowerCase();
            const activeCat = (this.activeCategories && this.activeCategories[uiId]) || 'all';

            let filtered = this.prompts[dataKey].filter(p => {
                const matchesText = (p.desc || '').toLowerCase().includes(lowerFilter) || (p.text || '').toLowerCase().includes(lowerFilter);
                const matchesCat = activeCat === 'all' || p.category === activeCat;
                return matchesText && matchesCat;
            });

            // Sort: Pinned first, then Time/Old
            filtered.sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                const tA = a.id || 0;
                const tB = b.id || 0;
                return this.settings.sort === 'newest' ? tB - tA : tA - tB;
            });

            if (filtered.length === 0) { listEl.innerHTML = '<div style="text-align:center;color:#666;padding:20px;font-size:12px;">无内容</div>'; return; }

            filtered.forEach((p) => {
                const item = document.createElement('div');
                item.className = 'gpm-prompt-item';
                item.innerHTML = `
                    <div class="gpm-prompt-text" style="${p.pinned ? 'color:white;font-weight:bold;' : ''}">
                         ${p.pinned ? '📌 ' : ''}${p.desc || p.text}
                    </div>
                    ${p.desc ? `<div style="font-size:10px; color:#999; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.text}</div>` : ''}
                    <div class="gpm-item-actions">
                        <button class="gpm-icon-btn pinned" title="置顶">
                            ${p.pinned ? '★' : '☆'}
                        </button>
                        <button class="gpm-icon-btn warn" title="删除">×</button>
                    </div>
                `;
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.gpm-item-actions')) return;
                    this.insertPrompt(p.text);
                    this.showToast('已填入');
                });

                item.querySelector('.pinned').onclick = (e) => {
                    e.stopPropagation();
                    p.pinned = !p.pinned;
                    this.saveData();
                    this.renderList(uiId, dataKey, filterText); // Re-render to sort
                };
                item.querySelector('.warn').onclick = (e) => {
                    e.stopPropagation();
                    if (confirm('删除此提示词？')) {
                        this.prompts[dataKey] = this.prompts[dataKey].filter(x => x.id !== p.id);
                        this.saveData();
                        this.renderCategories(uiId, dataKey); // Update categories in case last item of cat removed
                        this.renderList(uiId, dataKey, filterText);
                    }
                };
                // D&D
                item.draggable = true;
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify(p));
                    e.dataTransfer.effectAllowed = 'copy';
                });

                listEl.appendChild(item);
            });
        }

        insertPrompt(text, forceAction = false) {
            let activeEl = this.shadow.activeElement;
            if (!activeEl) activeEl = document.activeElement;

            let input = document.querySelector('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]');

            // Check if inserting into Draft
            if (this.settings.showBottomPanel && this.settings.bottomPanelTab === 'draft') {
                const spText = this.shadow.getElementById('sp-text');
                if (activeEl === spText || !forceAction) {
                    // If user focused draft OR we are just clicking a tile (lazy assumption: add to draft if open)
                    // Actually, if Draft is open, user likely wants to combine things there unless they explicitly click "Send"
                    // Let's refine: If NOT forceAction, and Draft is Open, add to Draft.
                    if (!forceAction) input = spText;
                }
                if (forceAction) input = document.querySelector('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]');
            }

            if (!input) { navigator.clipboard.writeText(text); this.showToast('已复制 (未找到输入框)'); return; }
            input.focus();

            let mode = this.settings.mode;
            if (input.id === 'sp-text') mode = 'append';

            // Insert Logic
            if (mode === 'replace') {
                if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') input.value = ''; else input.textContent = '';
            } else {
                try { const range = document.createRange(); range.selectNodeContents(input); range.collapse(false); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); } catch (e) { }
            }

            let success = false;
            try {
                let textToInsert = text;
                const currentVal = input.value || input.textContent || '';
                if (mode === 'append' && currentVal.length > 0 && !currentVal.endsWith('\n')) textToInsert = '\n' + text;
                success = document.execCommand('insertText', false, textToInsert);
            } catch (e) { }

            if (!success) {
                if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                    const val = input.value;
                    let newText = text;
                    if (mode === 'append' && val.length > 0 && !val.endsWith('\n')) newText = '\n' + text;
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                    if (setter) setter.call(input, mode === 'replace' ? text : val + newText);
                    else input.value = mode === 'replace' ? text : val + newText;
                } else {
                    if (mode === 'append') input.innerText += '\n' + text; else input.innerText = text;
                }
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.scrollTop = input.scrollHeight;
            this.showToast(mode === 'replace' ? '已替换' : '已追加');

            // Save to History (Only if sending to real Grok, not draft)
            if (input.id !== 'sp-text') {
                this.addToHistory(text);
            } else {
                // if draft, update draft storage
                this.draftContent = input.value;
                this.saveData();
            }
        }

        addToHistory(text) {
            // Avoid dupes at top
            if (this.history.length > 0 && this.history[0].text === text) return;
            this.history.unshift({ time: Date.now(), text });
            if (this.history.length > 50) this.history.pop(); // limit 50
            this.saveData();
            if (this.settings.showBottomPanel && this.settings.bottomPanelTab === 'history') this.renderHistoryList();
        }

        showToast(msg) {
            const toast = document.createElement('div'); toast.className = 'gpm-toast'; toast.textContent = msg;
            this.shadow.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1000);
        }

        dragStart(e, panel) {
            if (e.button !== 0) return;
            if (['BUTTON', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            this.dragState = {
                active: true, target: panel,
                startX: e.clientX, startY: e.clientY,
                initialLeft: panel.offsetLeft, initialTop: panel.offsetTop
            };
        }

        resizeStart(e, panel, dir) {
            e.stopPropagation(); e.preventDefault();
            this.resizeState = {
                active: true, target: panel, direction: dir,
                startX: e.clientX, startY: e.clientY,
                initialW: panel.offsetWidth, initialH: panel.offsetHeight,
                initialLeft: panel.offsetLeft
            };
        }

        handleMove(e) {
            if (this.dragState.active) {
                e.preventDefault();
                const dx = e.clientX - this.dragState.startX;
                const dy = e.clientY - this.dragState.startY;
                this.dragState.target.style.left = (this.dragState.initialLeft + dx) + 'px';
                this.dragState.target.style.top = (this.dragState.initialTop + dy) + 'px';
                this.dragState.target.style.transform = 'none';
                this.dragState.target.style.right = 'auto';
            } else if (this.resizeState.active) {
                e.preventDefault();
                const rs = this.resizeState;
                const dx = e.clientX - rs.startX;
                const dy = e.clientY - rs.startY;

                if (rs.direction === 'se') {
                    rs.target.style.width = Math.max(200, rs.initialW + dx) + 'px';
                    rs.target.style.height = Math.max(200, rs.initialH + dy) + 'px';
                }
                else if (rs.direction === 'e') {
                    rs.target.style.width = Math.max(200, rs.initialW + dx) + 'px';
                }
                else if (rs.direction === 'w') {
                    const newW = Math.max(200, rs.initialW - dx);
                    rs.target.style.width = newW + 'px';
                    rs.target.style.left = (rs.initialLeft + (rs.initialW - newW)) + 'px';
                    rs.target.style.right = 'auto';
                }
                else if (rs.direction === 'sw') {
                    const newW = Math.max(200, rs.initialW - dx);
                    rs.target.style.width = newW + 'px';
                    rs.target.style.height = Math.max(200, rs.initialH + dy) + 'px';
                    rs.target.style.left = (rs.initialLeft + (rs.initialW - newW)) + 'px';
                }
            }
        }

        handleUp(e) {
            if (this.dragState.active) {
                this.savePanelState(this.dragState.target);
                this.dragState.active = false;
            }
            if (this.resizeState.active) {
                this.savePanelState(this.resizeState.target);
                this.resizeState.active = false;
            }
        }

        savePanelState(panel) {
            const state = {
                x: panel.offsetLeft,
                y: panel.offsetTop,
                width: panel.offsetWidth,
                height: panel.offsetHeight
            };
            if (panel === this.leftPanel) this.settings.leftPanel = state;
            if (panel === this.rightPanel) this.settings.rightPanel = state;
            this.saveData();
        }

        togglePanels() {
            this.isOpen = !this.isOpen;
            if (this.isOpen) {
                this.leftPanel.classList.add('open');
                this.rightPanel.classList.add('open');
                if (this.settings.showBottomPanel) this.bottomPanel.classList.add('open');
            } else {
                this.leftPanel.classList.remove('open');
                this.rightPanel.classList.remove('open');
                this.bottomPanel.classList.remove('open');
            }
        }
    }

    new GrokPromptManager();

})();
