import { Component } from './Component.js';

/**
 * 📚 LibrarySelector: 独立浮动库选择面板
 */
export class LibrarySelector extends Component {
    constructor(storage, config = { side: 'left' }) {
        super();
        this.storage = storage;
        this.side = config.side;
        this.visible = false;

        this.storage.subscribe(() => {
            if (this.visible) this.renderList();
        });
    }

    renderFramework() {
        const isLeft = this.side === 'left';
        const posKey = isLeft ? 'gpm_libPanelPos_left' : 'gpm_libPanelPos_right';
        let savedPos = localStorage.getItem(posKey);
        let pos = { left: isLeft ? 400 : undefined, right: isLeft ? undefined : 400, top: 100, width: 320, height: 500 };

        if (savedPos) {
            try { pos = Object.assign(pos, JSON.parse(savedPos)); } catch(e) {}
        }

        const posStyle = pos.left !== undefined ? `left: ${pos.left}px;` : `right: ${pos.right}px;`;

        this.render(`
            <style>
                .lib-panel {
                    position: fixed; top: ${pos.top}px; ${posStyle}
                    width: ${pos.width}px; height: ${pos.height}px;
                    background: rgba(20, 20, 30, 0.95);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 12px;
                    box-shadow: 0 12px 48px rgba(0,0,0,0.7);
                    z-index: 100000; display: none; flex-direction: column; overflow: hidden;
                    color: white; font-size: 13px; transform: translateY(-10px); opacity: 0;
                    transition: all 0.2s ease;
                }
                .header { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; cursor: move; }
                .list { flex: 1; overflow-y: auto; padding: 8px; }
                .item { padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; transition: background 0.2s; }
                .item:hover { background: rgba(255,255,255,0.06); }
                .item.active { background: rgba(29, 155, 240, 0.12); color: #1d9bf0; border: 1px solid rgba(29, 155, 240, 0.3); }

                .resize-handle { position: absolute; bottom: 0; right: 0; width: 15px; height: 15px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%); }
            </style>

            <div class="lib-panel">
                <div class="header">
                    <span style="font-weight: bold;">切换库 (Switch Library)</span>
                    <button class="close-btn" style="background:none; border:none; color:#888; cursor:pointer; font-size:18px;">✕</button>
                </div>
                <div style="padding: 10px;">
                    <input type="text" class="search-input" placeholder="搜索库..." style="width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px 10px; color:white; outline:none;">
                </div>
                <div class="list"></div>
                <div class="resize-handle"></div>
            </div>
        `);
    }

    afterRender() {
        const panel = this.shadow.querySelector('.lib-panel');
        const header = this.shadow.querySelector('.header');

        // 拖拽逻辑
        let isDragging = false;
        let startX, startY, initialL, initialT;

        header.onmousedown = (e) => {
            if (e.target.closest('button') || e.target.tagName === 'INPUT') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            initialL = rect.left;
            initialT = rect.top;
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
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            this.saveState();
        };

        this.shadow.querySelector('.close-btn').onclick = () => this.hide();

        const searchInput = this.shadow.querySelector('.search-input');
        searchInput.oninput = (e) => this.renderList(e.target.value);
    }

    renderList(filter = '') {
        const container = this.shadow.querySelector('.list');
        if (!container) return;
        container.innerHTML = '';

        const libraries = this.storage.getLibraries();
        const currentLib = this.storage.getCurrentLibrary();

        let filtered = libraries;
        if (filter) {
            const lower = filter.toLowerCase();
            filtered = libraries.filter(l => l.name.toLowerCase().includes(lower));
        }

        filtered.forEach(lib => {
            const el = document.createElement('div');
            el.className = `item ${lib.id === currentLib.id ? 'active' : ''}`;
            el.innerHTML = `
                <span style="opacity:0.6;">⋮⋮</span>
                <span style="flex:1;">${lib.name}</span>
                ${lib.pinned ? '📌' : ''}
            `;
            el.onclick = () => {
                this.storage.switchLibrary(lib.id);
                this.hide();
            };
            container.appendChild(el);
        });
    }

    saveState() {
        const panel = this.shadow.querySelector('.lib-panel');
        const isLeft = this.side === 'left';
        const posKey = isLeft ? 'gpm_libPanelPos_left' : 'gpm_libPanelPos_right';
        const rect = panel.getBoundingClientRect();
        localStorage.setItem(posKey, JSON.stringify({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        }));
    }

    show() {
        const panel = this.shadow.querySelector('.lib-panel');
        panel.style.display = 'flex';
        requestAnimationFrame(() => {
            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        });
        this.visible = true;
        this.renderList();
    }

    hide() {
        const panel = this.shadow.querySelector('.lib-panel');
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(-10px)';
        setTimeout(() => { panel.style.display = 'none'; }, 200);
        this.visible = false;
    }

    toggle() { this.visible ? this.hide() : this.show(); }
}
