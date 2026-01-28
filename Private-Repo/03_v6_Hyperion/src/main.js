/**
 * 🚀 GPM Hyperion v6.0 Main Entry
 * 核心：初始化基础设施、挂载双侧面板、启动 API 拦截与自动重试模块。
 */
import { StorageService } from './core/Storage.js';
import { InputManager } from './core/Input.js';
import { ApiInterceptor } from './core/Hooks.js';
import { StyleManager } from './style/StyleManager.js';
import { SidePanel } from './ui/Panel.js';
import { LibrarySelector } from './ui/LibrarySelector.js';
import { BottomPanel } from './ui/BottomPanel.js';
import { GlobalToggleButton } from './ui/GlobalToggleButton.js';
import { Automation } from './core/Automation.js';

class App {
    static async start() {
        console.log('🌌 [GPM v6] Hyperion Engineering: Initiating...');

        // 1. 初始化基础设施
        StyleManager.init();
        const storage = new StorageService(); // IDB 优先存储实现
        const input = new InputManager();
        const auto = new Automation();

        // 2. 启动 API 拦截器 (嗅探、指令补全、重试触发)
        ApiInterceptor.init((url, response) => {
            auto.handleApiResponse(url, response);
        });

        // 3. 构建 UI 系统 (左侧：图片 | 右侧：视频)
        this.leftPanel = new SidePanel(storage, input, { side: 'left', visible: true });
        this.rightPanel = new SidePanel(storage, input, { side: 'right', visible: false });

        // 4. 挂载子组件
        this.leftLibSelector = new LibrarySelector(storage, { side: 'left' });
        this.rightLibSelector = new LibrarySelector(storage, { side: 'right' });
        this.bottomPanel = new BottomPanel(storage, input);

        // 建立 UI 联动
        this.leftPanel.onLibrarySelectorToggle = () => this.leftLibSelector.toggle();
        this.rightPanel.onLibrarySelectorToggle = () => this.rightLibSelector.toggle();

        this.leftPanel.onDraftToggle = () => this.bottomPanel.toggle();
        this.rightPanel.onDraftToggle = () => this.bottomPanel.toggle();

        this.leftPanel.onAiAssistTrigger = () => auto.toggleRetryPanel();

        // 5. 渲染并挂载
        this.leftPanel.mount(document.body);
        this.rightPanel.mount(document.body);
        this.leftLibSelector.mount(document.body);
        this.rightLibSelector.mount(document.body);
        this.bottomPanel.mount(document.body);

        // 6. 全局魔术按钮联动
        this.magicButton = new GlobalToggleButton((isActive) => {
            isActive ? this.leftPanel.show() : this.leftPanel.hide();
            // 右侧面板通常默认隐藏，除非用户手动开启过，这里保持逻辑简单：同步左侧显隐
            //isActive ? this.rightPanel.show() : this.rightPanel.hide();
        });
        this.magicButton.mount(document.body);

        // 7. 全局 UI 注册与菜单绑定
        this.registerGlobalCommands(this.leftPanel, this.rightPanel);

        console.log('✨ [GPM v6] System Online. Ready for Grok.');
    }

    static registerGlobalCommands(left, right) {
        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('🖼️ 开启/隐藏 图片面板', () => left.toggle());
            GM_registerMenuCommand('🎬 开启/隐藏 视频面板', () => right.toggle());
        }
    }
}

// 启动程序
App.start();
