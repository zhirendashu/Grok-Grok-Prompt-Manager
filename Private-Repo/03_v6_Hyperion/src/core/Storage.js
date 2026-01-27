/**
 * 💾 StorageService: Industrial Data Persistence
 * 基于 @loki-mode 企业级标准，引入事件驱动总线。
 */
import { UI_THEME } from '../style/Theme.js';

export class StorageService {
    constructor(dbKey, fallbackKey) {
        this.DB_KEY = dbKey;
        this.FALLBACK_KEY = fallbackKey;
        this.listeners = [];
        this.data = this.load();
    }

    // 订阅数据变化
    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this.data));
    }

    load() {
        // 实现 v5.0.5 中经过验证的 GM + LocalStorage 双重镜像逻辑
        let raw = GM_getValue(this.DB_KEY, null);
        if (!raw) {
            raw = localStorage.getItem(this.FALLBACK_KEY);
            if (raw) GM_setValue(this.DB_KEY, raw);
        }

        try {
            return raw ? JSON.parse(raw) : this.defaultSchema();
        } catch (e) {
            console.error('[GPM v6] Data corruption detected, using default.');
            return this.defaultSchema();
        }
    }

    save(newData) {
        this.data = newData || this.data;
        const json = JSON.stringify(this.data);

        // 性能防护：大数据量监测
        if (json.length > 4.5 * 1024 * 1024) {
            console.warn('[GPM v6] Storage quota warning (>4.5MB)');
        }

        GM_setValue(this.DB_KEY, json);
        localStorage.setItem(this.FALLBACK_KEY, json);
        this.notify(); // 数据变动，全线拉响战斗警报
        return true;
    }

    defaultSchema() {
        return {
            version: '6.0.0',
            settings: { theme: 'dark', panels: { left: { visible: false }, right: { visible: false } } },
            libraries: [{ id: 'default', name: '📚 默认库', prompts: [] }],
            activeTextLibraryId: 'default'
        };
    }
}
