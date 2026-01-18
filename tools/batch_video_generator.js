/**
 * 批量生成视频管理器
 * 在收藏页面一键批量生成所有未生成的视频
 */
class BatchVideoGenerator {
    constructor() {
        this.isRunning = false;
        this.totalButtons = 0;
        this.processedCount = 0;
        this.skippedCount = 0;
        this.button = null;
    }

    // 查找所有"生成视频"按钮（排除已生成的）
    findAllVideoButtons() {
        // 只选择 aria-label="生成视频" 的按钮
        const buttons = Array.from(document.querySelectorAll('button[aria-label="生成视频"]'));
        return buttons.filter(btn => {
            // 确保按钮可见且未禁用
            const rect = btn.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !btn.disabled;
        });
    }

    // 创建控制按钮
    createButton() {
        if (this.button) return;

        this.button = document.createElement('button');
        this.button.textContent = '🎬 批量生成视频';
        this.button.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 999999;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        this.button.addEventListener('mouseenter', () => {
            this.button.style.transform = 'translateY(-2px)';
            this.button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        });

        this.button.addEventListener('mouseleave', () => {
            this.button.style.transform = 'translateY(0)';
            this.button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
        });

        this.button.addEventListener('click', () => this.start());

        document.body.appendChild(this.button);
    }

    // 更新按钮文本
    updateButton(text) {
        if (this.button) {
            this.button.textContent = text;
        }
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 开始批量生成
    async start() {
        if (this.isRunning) {
            alert('批量生成正在进行中，请稍候...');
            return;
        }

        const buttons = this.findAllVideoButtons();
        
        if (buttons.length === 0) {
            alert('未找到可生成视频的图片！\n\n可能原因：\n1. 所有视频都已生成\n2. 当前页面没有图片\n3. 请滚动页面加载更多图片');
            return;
        }

        const confirmed = confirm(`找到 ${buttons.length} 个可生成视频的图片。\n\n是否开始批量生成？\n\n注意：\n- 每个视频间隔 2 秒\n- 可能消耗大量配额\n- 过程中请勿关闭页面`);

        if (!confirmed) return;

        this.isRunning = true;
        this.totalButtons = buttons.length;
        this.processedCount = 0;
        this.skippedCount = 0;

        console.log(`[批量生成] 开始处理 ${this.totalButtons} 个视频`);

        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            
            try {
                // 更新进度
                this.updateButton(`🎬 生成中 ${i + 1}/${this.totalButtons}`);
                
                // 滚动到按钮位置
                btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.delay(500);

                // 点击按钮
                btn.click();
                this.processedCount++;
                
                console.log(`[批量生成] 已点击 ${i + 1}/${this.totalButtons}`);

                // 延迟 2 秒避免限流
                await this.delay(2000);

            } catch (error) {
                console.error(`[批量生成] 处理第 ${i + 1} 个按钮时出错:`, error);
                this.skippedCount++;
            }
        }

        this.isRunning = false;
        this.updateButton('🎬 批量生成视频');

        alert(`✅ 批量生成完成！\n\n成功: ${this.processedCount}\n跳过: ${this.skippedCount}\n总计: ${this.totalButtons}`);
        
        console.log(`[批量生成] 完成！成功: ${this.processedCount}, 跳过: ${this.skippedCount}`);
    }

    // 检查是否在收藏页面
    isFavoritesPage() {
        return location.pathname === '/imagine/favorites';
    }

    // 初始化
    init() {
        if (this.isFavoritesPage()) {
            this.createButton();
            console.log('[批量生成] 已在收藏页面启动');
        }
    }

    // 销毁
    destroy() {
        if (this.button) {
            this.button.remove();
            this.button = null;
        }
    }
}
