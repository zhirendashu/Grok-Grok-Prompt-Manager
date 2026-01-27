/**
 * 🎨 StyleManager: Dynamic CSS Engine
 * 注入 v6.0 硬核深色 UI 系统变量。
 */
import { UI_THEME } from './Theme.js';

export class StyleManager {
    static init() {
        const css = `
            :host {
                --gpm-primary: ${UI_THEME.primary};
                --gpm-bg: ${UI_THEME.glassBg};
                --gpm-border: ${UI_THEME.glassBorder};
                --gpm-shadow: ${UI_THEME.shadow};
                --gpm-radius: ${UI_THEME.radius};
                --gpm-text: #F9FAFB;
                --gpm-transition: ${UI_THEME.transition};
            }
            .gpm-panel {
                background: var(--gpm-bg);
                border: 1px solid var(--gpm-border);
                box-shadow: var(--gpm-shadow);
                border-radius: var(--gpm-radius);
                color: var(--gpm-text);
                transition: var(--gpm-transition);
            }
            /* ... 更多经过优化的高性能 CSS 选择器 */
        `;
        GM_addStyle(css);
    }
}
