/**
 * 🚀 GPM Hyperion v6.0 Main Entry
 * 将所有模块拼装为完整的 Agentic 系统。
 */
import { StorageService } from './core/Storage.js';
import { InputManager } from './core/Input.js';
import { ApiInterceptor } from './core/Hooks.js';
import { StyleManager } from './style/StyleManager.js';
import { SidePanel } from './ui/Panel.js';

class App {
    static async start() {
        console.log('🌌 [GPM v6] Hyperion Engineering: Initiating...');

        // 1. 初始化基础设施
        StyleManager.init();
        const storage = new StorageService('GPM_V6_DB', 'GPM_BACKUP');
        const input = new InputManager();

        // 2. 启动 API 监听补丁
        ApiInterceptor.init((url, data) => {
            console.log(`[GPM v6] Intercepted: ${url}`);
            // 后续处理嗅探到的提示词数据
        });

        // 3. 挂载 UI 面板
        const panel = new SidePanel(storage, input);
        panel.init();

        console.log('✨ [GPM v6] System Online. Ready for Grok.');
    }
}

// 启动程序
App.start();
