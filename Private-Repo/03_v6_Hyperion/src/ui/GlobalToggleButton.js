import { Component } from './Component.js';
import { ICON_SET, UI_THEME } from '../style/Theme.js';

/**
 * 🔘 GlobalToggleButton: 全局魔术切换按钮
 * 职责：一键管控所有 GPM 面板（左、右、底、自动重试）的显隐，支持平滑拖拽。
 */
export class GlobalToggleButton extends Component {
    constructor(onToggle) {
        super();
        this.onToggle = onToggle;
        this.active = false;
    }

    renderFramework() {
        this.render(`
            <style>
                .gpm-main-toggle {
                    position: fixed; bottom: 30px; right: 30px;
                    width: 50px; height: 50px; background: ${UI_THEME.primary};
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 15px rgba(29, 155, 240, 0.4);
                    cursor: grab; z-index: 100000; transition: transform 0.2s, background 0.2s;
                    user-select: none;
                }
                .gpm-main-toggle:hover { transform: scale(1.1); background: #1a8cd8; }
                .gpm-main-toggle:active { cursor: grabbing; }
                .gpm-main-toggle svg { width: 24px; height: 24px; color: white; }
            </style>
            <div class="gpm-main-toggle">
                ${ICON_SET.Menu || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>'}
            </div>
        `);
    }

    afterRender() {
        const btn = this.shadow.querySelector('.gpm-main-toggle');

        let isDragging = false;
        let startX, startY, initialR, initialB;

        btn.onmousedown = (e) => {
            isDragging = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = btn.getBoundingClientRect();
            initialR = document.documentElement.clientWidth - rect.right;
            initialB = document.documentElement.clientHeight - rect.bottom;

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        };

        const onMove = (e) => {
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            if (dx > 5 || dy > 5) {
                isDragging = true;
                btn.style.right = (initialR - (e.clientX - startX)) + 'px';
                btn.style.bottom = (initialB - (e.clientY - startY)) + 'px';
            }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (!isDragging) {
                this.active = !this.active;
                if (this.onToggle) this.onToggle(this.active);
            }
        };
    }
}
