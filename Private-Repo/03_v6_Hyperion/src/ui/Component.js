/**
 * 🧱 Base Component Class
 * 提供 Shadow DOM 隔离、样式注入及生命周期钩子。
 */
export class Component {
    constructor() {
        this.root = document.createElement('div');
        this.shadow = this.root.attachShadow({ mode: 'open' });
    }

    render(html) {
        this.shadow.innerHTML = html;
        this.afterRender();
    }

    afterRender() {
        // 子类重写：绑定事件
    }

    mount(parent) {
        if (!parent) parent = document.body;
        parent.appendChild(this.root);
    }

    unmount() {
        if (this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
    }
}
