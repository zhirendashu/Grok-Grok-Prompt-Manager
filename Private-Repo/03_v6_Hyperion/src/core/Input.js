/**
 * ⌨️ InputManager: Native Command Driver
 * 使用 v5.0.5 验证的 "Gold Standard" 原生指令模式。
 */

export class InputManager {
    constructor() {
        this.selectors = [
            'div[contenteditable="true"]',
            'textarea[dir="auto"]',
            'textarea'
        ];
    }

    getInput() {
        for (const selector of this.selectors) {
            const el = document.querySelector(selector);
            if (el && el.isConnected) return el;
        }
        return null;
    }

    insert(text) {
        const el = this.getInput();
        if (!el) return;

        el.focus();
        // ⚡ v6.0 核心指令：原生级插入，支持 Undo/Redo
        const success = document.execCommand('insertText', false, text);

        if (!success) {
            this.handleFallback(el, text);
        }

        // 自动触发 Grok 的 React 状态更新
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.scrollTop = el.scrollHeight;
    }

    handleFallback(el, text) {
        // ... 此处保留了 v5.0.5 的底层兜底逻辑
        if (el.tagName === 'TEXTAREA') {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            el.value = el.value.substring(0, start) + text + el.value.substring(end);
        } else {
            el.innerText += text;
        }
    }
}
