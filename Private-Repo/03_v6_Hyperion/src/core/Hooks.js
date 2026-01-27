/**
 * 🔒 Hooks: The Invisible Sentinel
 * 加固型 Fetch 劫持系统。
 */

export class ApiInterceptor {
    static init(callback) {
        const originalFetch = unsafeWindow.fetch;

        // 🛡️ 使用 Proxy 建立双重观察层
        unsafeWindow.fetch = new Proxy(originalFetch, {
            apply: async (target, thisArg, args) => {
                const response = await target.apply(thisArg, args);
                const url = args[0] instanceof Request ? args[0].url : args[0];

                // 如果是图片/提示词关键 API，进行深度镜像克隆
                if (url.includes('/image') || url.includes('/post')) {
                    const clone = response.clone();
                    clone.json().then(data => {
                        callback(url, data);
                    }).catch(() => {});
                }

                return response;
            }
        });

        console.log('[GPM v6] Hyperion Hook: Active and Fortified.');
    }
}
