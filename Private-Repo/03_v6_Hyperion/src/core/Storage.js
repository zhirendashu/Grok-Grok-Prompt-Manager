/**
 * 💾 StorageService (IDB Edition): 工业级异步持久化存储
 * 职责：
 * 1. 优先使用 IndexedDB 处理大规模提示词库（消除 JSON 序列化性能瓶颈）。
 * 2. GM_setValue + LocalStorage 作为配置与轻量级同步备份。
 * 3. 完整支持从 v5.0.5 (Legacy JSON) 到 v6.0 (IDB) 的平滑数据迁移。
 */
export class StorageService {
    constructor(dbName = 'GPM_Hyperion_V6', storeName = 'PromptLibraries') {
        this.DB_NAME = dbName;
        this.STORE_NAME = storeName;
        this.listeners = [];
        this.db = null;
        this.data = null; // 内存缓存
        this.isReady = false;
    }

    /**
     * 初始化数据库并尝试迁移旧数据
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = async (e) => {
                this.db = e.target.result;
                await this.loadInitialData();
                this.isReady = true;
                this.notify();
                resolve();
            };

            request.onerror = (e) => reject(new Error('IndexedDB Open Failed'));
        });
    }

    async loadInitialData() {
        // 1. 尝试从 IDB 获取所有库
        const libs = await this.getAllFromIDB();

        // 2. 如果 IDB 为空，尝试从 Legacy (GM/LS) 迁移
        if (libs.length === 0) {
            await this.migrateFromLegacy();
        } else {
            // 从配置中恢复活跃库状态
            const settings = this.getSettingsFromLegacy();
            this.data = {
                libraries: libs,
                settings: settings,
                activeLibraryId: settings.activeLibraryId || libs[0].id
            };
        }
    }

    async migrateFromLegacy() {
        console.log('🔄 [GPM Storage] Detecting Legacy Data (v5.x)...');
        let legacyRaw = typeof GM_getValue !== 'undefined' ? GM_getValue('GPM_DATA_V5', null) : null;
        if (!legacyRaw) legacyRaw = localStorage.getItem('GPM_V6_MIRROR') || localStorage.getItem('GPM_DATA_V5');

        try {
            const legacyData = legacyRaw ? JSON.parse(legacyRaw) : this.defaultSchema();
            // 将迁移后的每个库写入 IDB
            for (const lib of (legacyData.libraries || [])) {
                await this.saveToIDB(lib);
            }
            this.data = legacyData;
            console.log('✅ [GPM Storage] Migration Complete.');
        } catch (e) {
            this.data = this.defaultSchema();
        }
    }

    // --- IDB 核心操作 (异步) ---

    async getAllFromIDB() {
        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    async saveToIDB(library) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            store.put(library);
            transaction.oncomplete = () => resolve();
        });
    }

    async removeFromIDB(id) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            store.delete(id);
            transaction.oncomplete = () => resolve();
        });
    }

    // --- 业务层交互 (同步缓存 + 异步刷盘) ---

    subscribe(callback) { this.listeners.push(callback); }
    notify() { this.listeners.forEach(cb => cb(this.data)); }

    getLibraries() { return this.data?.libraries || []; }

    getCurrentLibrary() {
        const libs = this.getLibraries();
        const activeId = this.data?.activeLibraryId || 'default';
        return libs.find(l => l.id === activeId) || libs[0];
    }

    async switchLibrary(id) {
        if (this.data) {
            this.data.activeLibraryId = id;
            this.saveSettingsToLegacy(); // 配置存配置库
            this.notify();
        }
    }

    async saveLibrary(lib) {
        await this.saveToIDB(lib);
        const idx = this.data.libraries.findIndex(l => l.id === lib.id);
        if (idx !== -1) this.data.libraries[idx] = lib;
        else this.data.libraries.push(lib);
        this.notify();
    }

    // --- 配置层持久化 (GM/LS) ---

    getSettingsFromLegacy() {
        const raw = typeof GM_getValue !== 'undefined' ? GM_getValue('GPM_V6_SETTINGS', null) : null;
        try {
            return raw ? JSON.parse(raw) : this.defaultSchema().settings;
        } catch(e) { return this.defaultSchema().settings; }
    }

    saveSettingsToLegacy() {
        const settings = {
            settings: this.data.settings,
            activeLibraryId: this.data.activeLibraryId
        };
        const json = JSON.stringify(settings);
        if (typeof GM_setValue !== 'undefined') GM_setValue('GPM_V6_SETTINGS', json);
        localStorage.setItem('GPM_V6_SETTINGS_MIRROR', json);
    }

    defaultSchema() {
        return {
            activeLibraryId: 'default',
            settings: {
                theme: 'dark',
                panels: {
                    left: { visible: true, width: 380, height: 700, top: 100, left: 20 },
                    right: { visible: false, width: 380, height: 700, top: 100, right: 20 }
                }
            },
            libraries: [
                { id: 'default', name: '📚 默认提示词库', prompts: [], pinned: true }
            ]
        };
    }
}
