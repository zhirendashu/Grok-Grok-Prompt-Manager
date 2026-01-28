import { Component } from './Component.js';
import { UI_THEME } from '../style/Theme.js';

/**
 * 📝 BottomPanel: 草稿与历史管控中心
 * 承载：全局草稿编辑、历史记录追溯、发送联动。
 */
export class BottomPanel extends Component {
    constructor(storage, input) {
        super();
        this.storage = storage;
        this.input = input;
        this.activeTab = 'draft';
        this.visible = false;
    }

    renderFramework() {
        this.render(`
            <style>
                .bottom-panel {
                    position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
                    width: 650px; height: 350px; background: rgba(20,20,30,0.95);
                    backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 12px; box-shadow: 0 12px 48px rgba(0,0,0,0.6);
                    z-index: 10001; display: none; flex-direction: column; overflow: hidden;
                    color: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .bp-header { padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: move; display: flex; justify-content: space-between; align-items: center; }
                .bp-tabs { display: flex; gap: 20px; }
                .bp-tab { cursor: pointer; font-size: 14px; opacity: 0.6; padding-bottom: 4px; border-bottom: 2px solid transparent; transition: all 0.2s; }
                .bp-tab.active { opacity: 1; border-bottom-color: #1d9bf0; font-weight: bold; }

                .bp-content { flex: 1; padding: 15px; display: flex; flex-direction: column; }
                textarea {
                    flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px; color: white; padding: 10px; resize: none; outline: none;
                    font-size: 14px; line-height: 1.5;
                }
                .bp-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }

                .gpm-btn {
                    padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;
                }
                .gpm-btn.primary { background: #1d9bf0; color: white; }

                .history-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
                .history-item { padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px; cursor: pointer; }
            </style>

            <div class="bottom-panel">
                <div class="bp-header">
                    <div class="bp-tabs">
                        <span class="bp-tab active" data-tab="draft">📝 草稿 (Draft)</span>
                        <span class="bp-tab" data-tab="history">📜 历史 (History)</span>
                    </div>
                    <button class="close-btn" style="background:none; border:none; color:#888; cursor:pointer; font-size:20px;">✕</button>
                </div>

                <div class="bp-content" id="draft-content">
                    <textarea placeholder="输入提示词内容..."></textarea>
                    <div class="bp-footer">
                        <button class="gpm-btn copy-btn">复制</button>
                        <button class="gpm-btn clear-btn">清空</button>
                        <button class="gpm-btn primary send-btn">立即发送</button>
                    </div>
                </div>

                <div class="bp-content" id="history-content" style="display: none;">
                    <div class="history-list"></div>
                </div>
            </div>
        `);
    }

    afterRender() {
        const panel = this.shadow.querySelector('.bottom-panel');
        const header = this.shadow.querySelector('.bp-header');

        // 拖拽逻辑
        let isDragging = false;
        let startX, startY, initialL, initialT;

        header.onmousedown = (e) => {
            if (e.target.closest('.bp-tab')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            initialL = rect.left;
            initialT = rect.top;
            panel.style.transform = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        };

        const onMove = (e) => {
            if (!isDragging) return;
            panel.style.left = (initialL + e.clientX - startX) + 'px';
            panel.style.top = (initialT + e.clientY - startY) + 'px';
        };

        const onUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        // 标签切换
        const tabs = this.shadow.querySelectorAll('.bp-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.dataset.tab;

                this.shadow.querySelector('#draft-content').style.display = this.activeTab === 'draft' ? 'flex' : 'none';
                this.shadow.querySelector('#history-content').style.display = this.activeTab === 'history' ? 'flex' : 'none';
                if (this.activeTab === 'history') this.renderHistory();
            };
        });

        this.shadow.querySelector('.close-btn').onclick = () => this.hide();

        const textarea = this.shadow.querySelector('textarea');
        this.shadow.querySelector('.clear-btn').onclick = () => {
            if (confirm('确认清空草稿？')) textarea.value = '';
        };

        this.shadow.querySelector('.send-btn').onclick = () => {
            const val = textarea.value.trim();
            if (val) {
                this.input.insert(val);
                this.input.submit();
                this.hide();
            }
        };

        this.shadow.querySelector('.copy-btn').onclick = () => {
            navigator.clipboard.writeText(textarea.value);
            const btn = this.shadow.querySelector('.copy-btn');
            btn.textContent = '已复制!';
            setTimeout(() => btn.textContent = '复制', 2000);
        };
    }

    renderHistory() {
        const list = this.shadow.querySelector('.history-list');
        const history = this.storage.data.history || [];
        list.innerHTML = history.length ? '' : '<div style="opacity:0.5; text-align:center; padding:20px;">暂无历史</div>';

        history.slice().reverse().forEach(item => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <div style="font-size:12px; opacity:0.6; margin-bottom:4px;">${new Date(item.time).toLocaleString()}</div>
                <div style="font-size:13px; line-height:1.4;">${item.content.slice(0, 100)}${item.content.length > 100 ? '...' : ''}</div>
            `;
            el.onclick = () => {
                this.shadow.querySelector('textarea').value = item.content;
                this.shadow.querySelector('[data-tab="draft"]').click();
            };
            list.appendChild(el);
        });
    }

    show() {
        const panel = this.shadow.querySelector('.bottom-panel');
        panel.style.display = 'flex';
        this.visible = true;
    }

    hide() {
        const panel = this.shadow.querySelector('.bottom-panel');
        panel.style.display = 'none';
        this.visible = false;
    }

    toggle() { this.visible ? this.hide() : this.show(); }
}
