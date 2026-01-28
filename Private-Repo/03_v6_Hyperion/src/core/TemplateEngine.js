/**
 * 🧩 TemplateEngine: 提示词魔方引擎
 * 负责解析提示词中的占位符 {{variable}} 并提供表单交互。
 */
export class TemplateEngine {
    /**
     * 提取字符串中所有的变量 {{name}}
     */
    static extractVariables(text) {
        if (!text) return [];
        const matches = text.match(/{{(.*?)}}/g) || [];
        return [...new Set(matches.map(m => m.replace(/{{|}}/g, '').trim()))];
    }

    /**
     * 弹出交互式表单填充变量
     */
    static async resolve(template, callback) {
        const vars = this.extractVariables(template);
        if (vars.length === 0) {
            callback(template);
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100005;
            display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            width: 400px; background: #1a1a20; border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px; padding: 20px; color: white; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        `;

        let html = '<h3 style="margin-top:0;">🧩 填充模板变量</h3>';
        vars.forEach(v => {
            html += `
                <div style="margin-bottom:12px;">
                    <label style="display:block; font-size:12px; color:#888; margin-bottom:4px;">${v}</label>
                    <input type="text" class="tpl-input" data-var="${v}" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:8px; border-radius:6px; color:white; outline:none;">
                </div>
            `;
        });
        html += `
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                <button class="gpm-btn cancel-btn">取消</button>
                <button class="gpm-btn primary confirm-btn">确认插入</button>
            </div>
        `;
        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 绑定事件
        const inputs = modal.querySelectorAll('.tpl-input');
        if (inputs[0]) setTimeout(() => inputs[0].focus(), 100);

        modal.querySelector('.cancel-btn').onclick = () => overlay.remove();
        modal.querySelector('.confirm-btn').onclick = () => {
            let result = template;
            inputs.forEach(input => {
                const val = input.value || `{{${input.dataset.var}}}`;
                const regex = new RegExp(`{{${input.dataset.var}}}`, 'g');
                result = result.replace(regex, val);
            });
            overlay.remove();
            callback(result);
        };
    }
}
