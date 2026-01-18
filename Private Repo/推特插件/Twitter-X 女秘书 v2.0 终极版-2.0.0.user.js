// ==UserScript==
// @name         Twitter/X 女秘书 v2.0 终极版
// @name:en      Twitter/X Assistant v2.0 Ultimate Edition
// @namespace    https://github.com/zhirendatree/twitter-assistant
// @version      2.0.0
// @description  🍑 Twitter/X 智能助手终极版 | 自动化操作 + 高清媒体下载 + 界面优化 | 由 @OnlyPeachFWD 设计制作
// @description:en 🍑 Ultimate Twitter/X Assistant | Automation + HD Media Download + UI Enhancement | Crafted by Claude AI
// @author       @OnlyPeachFWD
// @license      MIT
// @homepage     https://github.com/zhirendatree/twitter-assistant
// @supportURL   https://github.com/zhirendatree/twitter-assistant/issues
// @match        https://twitter.com/*
// @match        https://x.com/*
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_download
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.min.js
// @require      https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js
// @require      https://cdn.jsdelivr.net/npm/dayjs@1.11.13/plugin/utc.js
// @connect      raw.githubusercontent.com
// @connect      twitter.com
// @connect      x.com
// @connect      pbs.twimg.com
// @connect      video.twimg.com
// @compatible   chrome
// @compatible   firefox
// @compatible   edge
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiMxREExRjIiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xOC4yNDQgMi4yNWgzLjMwOGwtNy4yMjcgOC4yNiA4LjUwMiAxMS4yNEgxNi4xN2wtNS4yMTQtNi44MTdMNC45OSAyMS43NUgxLjY4bDcuNzMtOC44MzVMMS4yNTQgMi4yNWg4LjA4bDQuNzEzIDYuMjMxem0tMS4xNjEgMTcuNTJoMS44MzNMNy4wODQgNC4xMjZINS4xMTd6Ii8+Cjwvc3ZnPgo8L3N2Zz4K
// ==/UserScript==

dayjs.extend(dayjs_plugin_utc);

(function () {
    'use strict';

    // ========== 媒体下载模块 ==========
    const enableDownloadHistorykSync = false;
    const generateFilename = (filenameElements, mediaTypeLabel, index, ext) => {
        const { userId, userName, postId, postTime } = filenameElements;
        const formattedPostTime = dayjs(postTime).format('YYYYMMDD_HHmmss');
        return `${userId}-${postId}-${mediaTypeLabel}${index}.${ext}`;
    };

    const gmFetch = (infoOrUrl, options = {}) =>
        new Promise((resolve, reject) => {
            const info = typeof infoOrUrl === 'string' ? { url: infoOrUrl } : { ...infoOrUrl };
            info.method = options.method || info.method || 'GET';
            info.headers = options.headers || info.headers || {};
            if (options.body) info.data = options.body;
            info.responseType = options.responseType;
            if (options.withCredentials !== undefined) info.withCredentials = options.withCredentials;
            if (options.anonymous !== undefined) info.anonymous = options.anonymous; // Tampermonkey: false=带Cookie
            info.onload = res => {
                resolve({
                    ok: res.status >= 200 && res.status < 300,
                    status: res.status,
                    response: res.response,
                    json: () => Promise.resolve(res.response),
                    text: () => Promise.resolve(
                        typeof res.response === 'string' ? res.response : JSON.stringify(res.response)
                    ),
                    blob: () => Promise.resolve(new Blob([res.response]))
                });
            };
            info.onerror = (error) => {
                console.error("GM_xmlhttpRequest error:", error);
                reject(new Error(`GM_xmlhttpRequest failed: status=${error.status}, statusText=${error.statusText || 'N/A'}`));
            };
            info.onabort = () => reject(new Error('GM_xmlhttpRequest aborted'));
            info.ontimeout = () => reject(new Error('GM_xmlhttpRequest timed out'));
            GM_xmlhttpRequest(info);
        });

    const API_INFO_STORAGE_KEY = 'twitterInternalApiInfo';
    const LAST_UPDATE_DATE_STORAGE_KEY = 'twitterApiInfoLastUpdateDate';
    const API_DOC_URL = 'https://raw.githubusercontent.com/fa0311/TwitterInternalAPIDocument/refs/heads/master/docs/json/API.json';
    let currentApiInfo = null;

    const loadApiInfoFromLocalStorage = () => {
        const savedApiInfoJson = localStorage.getItem(API_INFO_STORAGE_KEY);
        if (savedApiInfoJson) {
            try {
                const savedInfo = JSON.parse(savedApiInfoJson);
                return savedInfo;
            } catch (e) {
                localStorage.removeItem(API_INFO_STORAGE_KEY);
            }
        }
        return null;
    };

    const fetchAndSaveApiInfo = async (currentDateString) => {
        try {
            const response = await gmFetch(API_DOC_URL, {
                method: "GET",
                responseType: "json"
            });
            if (response.ok) {
                const apiDoc = response.response;
                const tweetResultByRestIdInfo = apiDoc.graphql?.TweetResultByRestId;
                const bookmarkSearchTimelineInfo = apiDoc.graphql?.BookmarkSearchTimeline;
                const bearerTokenFromDoc = apiDoc.header?.authorization;
                if (tweetResultByRestIdInfo?.url && tweetResultByRestIdInfo?.features &&
                    bookmarkSearchTimelineInfo?.url && bookmarkSearchTimelineInfo?.features &&
                    bearerTokenFromDoc) {
                    const extractedApiInfo = {
                        TweetResultByRestId: tweetResultByRestIdInfo,
                        BookmarkSearchTimeline: bookmarkSearchTimelineInfo,
                        bearerToken: bearerTokenFromDoc
                    };
                    currentApiInfo = extractedApiInfo;
                    localStorage.setItem(API_INFO_STORAGE_KEY, JSON.stringify(currentApiInfo));
                    localStorage.setItem(LAST_UPDATE_DATE_STORAGE_KEY, currentDateString);
                } else {
                    const savedInfoBeforeFetch = loadApiInfoFromLocalStorage();
                    if (savedInfoBeforeFetch) currentApiInfo = savedInfoBeforeFetch;
                }
            } else {
                const savedInfoBeforeFetch = loadApiInfoFromLocalStorage();
                if (savedInfoBeforeFetch) currentApiInfo = savedInfoBeforeFetch;
            }
        } catch (error) {
            const savedInfoBeforeFetch = loadApiInfoFromLocalStorage();
            if (savedInfoBeforeFetch) currentApiInfo = savedInfoBeforeFetch;
        }
    };

    const initializeApiInfo = () => {
        const lastUpdateDate = localStorage.getItem(LAST_UPDATE_DATE_STORAGE_KEY);
        const today = dayjs().format('YYYY-MM-DD');
        const savedApiInfo = loadApiInfoFromLocalStorage();
        if (lastUpdateDate !== today || !savedApiInfo) {
            if (savedApiInfo) {
                currentApiInfo = savedApiInfo;
            }
            fetchAndSaveApiInfo(today);
        } else {
            currentApiInfo = savedApiInfo;
        }
    };

    initializeApiInfo();

    const DB_NAME = 'DownloadHistoryDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'downloadedPosts';
    let dbPromise = null;
    let downloadedPostsCache = new Set();

    const openDB = () => {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = function(event) {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'postId' });
                }
            };
            request.onsuccess = function() {
                resolve(request.result);
            };
            request.onerror = function() {
                reject(request.error);
            };
        });
        return dbPromise;
    };

    const loadDownloadedPostsCache = () => {
        getDownloadedPostIdsIndexedDB()
            .then(ids => {
                downloadedPostsCache = new Set(ids);
            })
            .catch(err => console.error("IndexedDB 読み込みエラー:", err));
    };

    const getDownloadedPostIdsIndexedDB = () => {
        return openDB().then(db => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAllKeys();
                request.onsuccess = function() {
                    resolve(request.result);
                };
                request.onerror = function() {
                    reject(request.error);
                };
            });
        });
    };

    const markPostAsDownloadedIndexedDB = (postId) => {
        return openDB().then(db => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put({ postId: postId });
                request.onsuccess = function() {
                    downloadedPostsCache.add(postId);
                    resolve();
                };
                request.onerror = function() {
                    reject(request.error);
                };
            });
        });
    };

    loadDownloadedPostsCache();

    const isMobile = /android|iphone|ipad|mobile/.test(navigator.userAgent.toLowerCase());
    const isAppleMobile = /iphone|ipad/.test(navigator.userAgent.toLowerCase());
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

    // 关注校验配置
    const REQUIRED_ACCOUNT = 'OnlyPeachFWD';
    const FOLLOW_CACHE_KEY = `twx_follow_${REQUIRED_ACCOUNT}`;
    const FOLLOW_TTL_MS = 24 * 60 * 60 * 1000; // 24h 缓存

    const getFollowStateFromHtml = (html) => {
        try {
            // 调试：记录HTML片段用于分析
            console.log('[关注校验] 开始解析HTML，长度:', html.length);

            // 方法1：检测 unfollow 按钮（最可靠）
            if (/data-testid=["\']unfollow["\']/i.test(html)) {
                console.log('[关注校验] 检测到 unfollow 按钮 -> 已关注');
                return true;
            }

            // 方法2：检测 Following 相关文本
            const followingPatterns = [
                /Following\s+@OnlyPeachFWD/i,
                /正在关注\s*@?OnlyPeachFWD/i,
                /已关注\s*@?OnlyPeachFWD/i,
                /"Following"/i,
                /"正在关注"/i,
                /"已关注"/i
            ];

            for (const pattern of followingPatterns) {
                if (pattern.test(html)) {
                    console.log('[关注校验] 匹配到 Following 文本 -> 已关注');
                    return true;
                }
            }

            // 方法3：检测按钮文本内容
            const buttonTextMatch = html.match(/<button[^>]*>([^<]*(?:Following|正在关注|已关注)[^<]*)<\/button>/i);
            if (buttonTextMatch) {
                console.log('[关注校验] 检测到按钮文本:', buttonTextMatch[1], '-> 已关注');
                return true;
            }

            // 方法4：检测 follow 按钮（未关注）
            if (/data-testid=["\']follow["\']/i.test(html)) {
                console.log('[关注校验] 检测到 follow 按钮 -> 未关注');
                return false;
            }

            // 输出部分HTML用于调试
            const relevantHtml = html.match(/.{0,200}(follow|Following|关注).{0,200}/gi);
            if (relevantHtml) {
                console.log('[关注校验] 相关HTML片段:', relevantHtml.slice(0, 3));
            }

            console.log('[关注校验] 无法确定关注状态');
            return null; // 未能判定
        } catch (e) {
            console.error('[关注校验] 解析出错:', e);
            return null;
        }
    };

    const verifyFollowing = async (force = false) => {
        try {
            const cached = localStorage.getItem(FOLLOW_CACHE_KEY);
            if (!force && cached) {
                const obj = JSON.parse(cached);
                // 仅当缓存为“已关注”且未过期时直接通过；未关注则强制重新检查
                if (obj && obj.following === true && (Date.now() - obj.ts) < FOLLOW_TTL_MS) return true;
            }
            const url = `https://x.com/${REQUIRED_ACCOUNT}?_=${Date.now()}`; // 防缓存
            const res = await gmFetch(url, { method: 'GET', responseType: 'text', withCredentials: true, anonymous: false, headers: { 'User-Agent': userAgent, 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } });
            if (!res.ok) return false;
            const html = await res.text();
            const st = getFollowStateFromHtml(html);
            const following = st === true;
            localStorage.setItem(FOLLOW_CACHE_KEY, JSON.stringify({ following, ts: Date.now() }));
            return following;
        } catch (e) {
            return false;
        }
    };

    // 关注引导弹窗（网页中间居中显示）
    const showFollowDialog = async () => {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.75);
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
            `;
            const box = document.createElement('div');
            box.style.cssText = `
                width: 420px;
                max-width: 90vw;
                background: #15202B;
                color: #E6E9EA;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                transform: scale(0.9);
                animation: popIn 0.2s ease-out forwards;
            `;
            // 添加弹出动画
            const style = document.createElement('style');
            style.textContent = `
                @keyframes popIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);

            box.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">🍑</div>
                    <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">需要关注后才能启动</div>
                    <div style="font-size: 14px; color: #8B98A5; line-height: 1.5;">
                        使用自动化功能前，请先关注博主 <span style="color: #1DA1F2; font-weight: 600;">@${REQUIRED_ACCOUNT}</span><br>
                        关注完成后，可点击"我已关注"重新验证
                    </div>
                </div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="tmd-cancel" style="
                        padding: 12px 20px;
                        background: transparent;
                        border: 1px solid rgba(139, 152, 165, 0.4);
                        border-radius: 10px;
                        color: #8B98A5;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s;
                    ">取消</button>
                    <button id="tmd-verified" style="
                        padding: 12px 20px;
                        background: #1E2732;
                        border: none;
                        border-radius: 10px;
                        color: #E6E9EA;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s;
                    ">我已关注</button>
                    <button id="tmd-follow" style="
                        padding: 12px 24px;
                        background: #1DA1F2;
                        border: none;
                        border-radius: 10px;
                        color: #fff;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.2s;
                    ">立即关注</button>
                </div>
            `;

            // 按钮悬停效果
            const addHoverEffect = (btn, hoverStyle) => {
                const originalStyle = btn.style.cssText;
                btn.onmouseenter = () => { btn.style.cssText = originalStyle + hoverStyle; };
                btn.onmouseleave = () => { btn.style.cssText = originalStyle; };
            };

            overlay.appendChild(box);
            document.body.appendChild(overlay);

            const cleanup = () => {
                try {
                    document.body.removeChild(overlay);
                    document.head.removeChild(style);
                } catch(_){}
            };

            const cancelBtn = box.querySelector('#tmd-cancel');
            const verifiedBtn = box.querySelector('#tmd-verified');
            const followBtn = box.querySelector('#tmd-follow');

            addHoverEffect(cancelBtn, 'background: rgba(139, 152, 165, 0.1);');
            addHoverEffect(verifiedBtn, 'background: #2A3441;');
            addHoverEffect(followBtn, 'background: #1991DB; transform: translateY(-1px);');

            cancelBtn.onclick = () => { cleanup(); resolve(false); };
            followBtn.onclick = () => {
                try { window.open(`https://x.com/${REQUIRED_ACCOUNT}`, '_blank'); } catch(_){}
            };
            verifiedBtn.onclick = async () => {
                verifiedBtn.textContent = '验证中...';
                verifiedBtn.disabled = true;

                // 清除缓存，强制重新检查
                localStorage.removeItem(FOLLOW_CACHE_KEY);

                const pass = await verifyFollowing(true);
                if (!pass) {
                    verifiedBtn.textContent = '我已关注';
                    verifiedBtn.disabled = false;

                    // 提供更详细的调试信息
                    const debugInfo = `
检测失败，请检查：
1. 确认已在 https://x.com/${REQUIRED_ACCOUNT} 点击关注
2. 刷新页面后再试
3. 检查浏览器控制台的调试信息

如仍有问题，请截图控制台日志反馈。
                    `.trim();
                    alert(debugInfo);
                    return;
                }
                cleanup();
                resolve(true);
            };

            // ESC键关闭
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    };

    const gateAutomation = async () => {
        // 暂时关闭验证，直接放行
        return true;
    };

    const createApiHeaders = () => {
        const GUEST_AUTHORIZATION = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
        const headers = {
            'authorization': GUEST_AUTHORIZATION,
            'x-csrf-token': getCookie('ct0'),
            'x-twitter-client-language': 'en',
            'x-twitter-active-user': 'yes',
            'content-type': 'application/json'
        };
        const guestToken = getCookie('gt');
        if (guestToken) {
            headers['x-guest-token'] = guestToken;
        } else {
            headers['x-twitter-auth-type'] = 'OAuth2Session';
        }
        return headers;
    };

    const getCurrentLanguage = () => document.documentElement.lang || 'en';
    const getMainTweetUrl = (cell) => {
        let timeEl = cell.querySelector('article[data-testid="tweet"] a[href*="/status/"][role="link"] time');
        if (timeEl && timeEl.parentElement) return timeEl.parentElement.href;
        return cell.querySelector('article[data-testid="tweet"] a[href*="/status/"]')?.href || "";
    };
    const getCookie = (name) => {
        const cookies = Object.fromEntries(document.cookie.split(';').filter(n => n.includes('=')).map(n => n.split('=').map(decodeURIComponent).map(s => s.trim())));
        return name ? cookies[name] : cookies;
    };
    const getMediaInfoFromUrl = (url) => {
        if (url.includes('pbs.twimg.com/media/')) {
            const extMatch = url.match(/format=([a-zA-Z0-9]+)/);
            const ext = extMatch ? extMatch[1] : 'jpg';
            return { ext: ext, typeLabel: 'img' };
        } else if (url.includes('video.twimg.com/ext_tw_video/') || url.includes('video.twimg.com/tweet_video/') || url.includes('video.twimg.com/amplify_video/')) {
            let ext = 'mp4';
            if (!url.includes('pbs.twimg.com/tweet_video/')) {
                const pathMatch = url.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
                if (pathMatch) ext = pathMatch[1];
            }
            const typeLabel = url.includes('tweet_video') ? 'gif' : 'video';
            return { ext: ext, typeLabel: typeLabel };
        }
        return { ext: 'jpg', typeLabel: 'img' };
    };

    // 媒体下载核心功能
    const fetchTweetDetailWithGraphQL = async (postId) => {
        const TWEET_RESULT_BY_REST_ID_QUERY_ID = "zAz9764BcLZOJ0JU2wrd1A";
        const TWEET_DETAIL_FEATURES = {
            "creator_subscriptions_tweet_preview_api_enabled": true,
            "premium_content_api_read_enabled": false,
            "communities_web_enable_tweet_community_results_fetch": true,
            "c9s_tweet_anatomy_moderator_badge_enabled": true,
            "responsive_web_grok_analyze_button_fetch_trends_enabled": false,
            "responsive_web_grok_analyze_post_followups_enabled": false,
            "responsive_web_jetfuel_frame": false,
            "responsive_web_grok_share_attachment_enabled": true,
            "articles_preview_enabled": true,
            "responsive_web_edit_tweet_api_enabled": true,
            "graphql_is_translatable_rweb_tweet_is_translatable_enabled": true,
            "view_counts_everywhere_api_enabled": true,
            "longform_notetweets_consumption_enabled": true,
            "responsive_web_twitter_article_tweet_consumption_enabled": true,
            "tweet_awards_web_tipping_enabled": false,
            "responsive_web_grok_show_grok_translated_post": false,
            "responsive_web_grok_analysis_button_from_backend": false,
            "creator_subscriptions_quote_tweet_preview_enabled": false,
            "freedom_of_speech_not_reach_fetch_enabled": true,
            "standardized_nudges_misinfo": true,
            "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": true,
            "longform_notetweets_rich_text_read_enabled": true,
            "longform_notetweets_inline_media_enabled": true,
            "profile_label_improvements_pcf_label_in_post_enabled": true,
            "rweb_tipjar_consumption_enabled": true,
            "verified_phone_label_enabled": false,
            "responsive_web_grok_image_annotation_enabled": true,
            "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
            "responsive_web_graphql_timeline_navigation_enabled": true,
            "responsive_web_enhance_cards_enabled": false
        };
        const TWEET_DETAIL_FIELD_TOGGLES = {
            "withArticleRichContentState": true, "withArticlePlainText": false,
            "withGrokAnalyze": false, "withDisallowedReplyControls": false
        };
        const variables = {
            "tweetId": postId, "withCommunity": false,
            "includePromotedContent": false, "withVoice": false
        };
        const apiUrl = `https://x.com/i/api/graphql/${TWEET_RESULT_BY_REST_ID_QUERY_ID}/TweetResultByRestId`;
        const url = encodeURI(`${apiUrl}?variables=${JSON.stringify(variables)}&features=${JSON.stringify(TWEET_DETAIL_FEATURES)}&fieldToggles=${JSON.stringify(TWEET_DETAIL_FIELD_TOGGLES)}`);
        const headers = createApiHeaders();
        if (!headers) {
            throw new Error('tweetResultByRestId headers not available.');
        }
        const res = await gmFetch(url, { headers, responseType: 'json' });
        if (!res.ok) throw new Error(`TweetResultByRestId failed: ${res.status}`);
        return res.json();
    };

    const getValidMediaElements = (cell) => {
        let validImages = [], validVideos = [], validGifs = [];
        validImages = Array.from(cell.querySelectorAll("img[src^='https://pbs.twimg.com/media/']"))
            .filter(img => (
                !img.closest("div[tabindex='0'][role='link']") &&
                !img.closest("div[data-testid='previewInterstitial']")
            ));
        const videoCandidates_videoTag = Array.from(cell.querySelectorAll("video"));
        videoCandidates_videoTag.forEach(video => {
            if (video.closest("div[tabindex='0'][role='link']")) return;
            if (!video.closest("div[data-testid='videoPlayer']")) return;
            if (video.src?.startsWith("https://video.twimg.com/tweet_video")) {
                validGifs.push(video);
            } else if (video.poster?.includes("/ext_tw_video_thumb/") || video.poster?.includes("/amplify_tw_video_thumb/") || video.poster?.includes("/amplify_video_thumb/") || video.poster?.includes("/media/")) {
                validVideos.push(video);
            }
        });
        const videoCandidates_imgTag = Array.from(cell.querySelectorAll("img[src]"));
        videoCandidates_imgTag.forEach(img => {
            if (img.closest("div[tabindex='0'][role='link']")) return;
            if (!img.closest("div[data-testid='previewInterstitial']")) return;
            if (img.src.startsWith("https://pbs.twimg.com/tweet_video_thumb/")) {
                validGifs.push(img);
            } else if (img.src.includes("/ext_tw_video_thumb/") || img.src.includes("/amplify_tw_video_thumb/") || img.src.includes("/amplify_video_thumb/") || img.src.includes("/media/")) {
                validVideos.push(img);
            }
        });
        return { images: validImages, videos: validVideos, gifs: validGifs };
    };

    const getTweetFilenameElements = (url, cell) => {
        const match = url.match(/^https?:\/\/(?:twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/);
        if (!match) return null;
        const userNameContainer = cell.querySelector("div[data-testid='User-Name'] div[dir='ltr'] span");
        const postTimeElement = cell.querySelector("article[data-testid='tweet'] a[href*='/status/'][role='link'] time");
        let userName = 'unknown';
        if (userNameContainer) {
            userName = '';
            userNameContainer.querySelectorAll('*').forEach(el => {
                userName += el.nodeName === 'IMG' ? el.alt : (el.nodeName === 'SPAN' ? el.textContent : '');
            });
            userName = userName.trim();
        }
        return {
            userId: match[1],
            userName: userName || 'unknown',
            postId: match[2],
            postTime: postTimeElement?.getAttribute('datetime') || 'unknown'
        };
    };

    const getMediaURLs = async (cell, filenameElements) => {
        const mediaElems = getValidMediaElements(cell);
        const imageURLs = mediaElems.images.map(img => img.src.includes("name=") ? img.src.replace(/name=.*/ig, 'name=4096x4096') : img.src);
        let gifURLs = mediaElems.gifs.map(gif => gif.src);
        let videoURLs = [];
        gifURLs = gifURLs.map(gifURL => {
            if (gifURL.startsWith("https://pbs.twimg.com/tweet_video_thumb/")) {
                const gifIdBaseUrl = gifURL.split('?')[0];
                const gifId = gifIdBaseUrl.split('/').pop();
                return `https://video.twimg.com/tweet_video/${gifId}.mp4`;
            }
            return gifURL;
        });
        if (mediaElems.videos.length > 0) {
            const tweet_res = await fetchTweetDetailWithGraphQL(filenameElements.postId);
            if (!tweet_res.data) return { imageURLs: [], gifURLs: [], videoURLs: [] };
            const tweet_result = tweet_res.data.tweetResult.result;
            const tweet_obj = tweet_result.tweet || tweet_result;
            tweet_obj.extended_entities = tweet_obj.extended_entities || tweet_obj.legacy?.extended_entities;
            const extEntities = tweet_obj.extended_entities;
            if (extEntities?.media) {
                videoURLs = extEntities.media
                    .filter(media => media.type === 'video' && media.video_info?.variants)
                    .map(media => media.video_info.variants.filter(variant => variant.content_type === 'video/mp4').reduce((prev, current) => (prev.bitrate > current.bitrate) ? prev : current, media.video_info.variants[0])?.url)
                    .filter(url => url);
            } else if (tweet_obj.card?.legacy?.binding_values) {
                const unifiedCardBinding = tweet_obj.card.legacy.binding_values.find(bv => bv.key === 'unified_card');
                if (unifiedCardBinding?.value?.string_value) {
                    try {
                        const unifiedCard = JSON.parse(unifiedCardBinding.value.string_value);
                        if (unifiedCard.media_entities) {
                            videoURLs = Object.values(unifiedCard.media_entities)
                                .filter(media => media.type === 'video' && media.video_info?.variants)
                                .map(media => media.video_info.variants.filter(variant => variant.content_type === 'video/mp4').reduce((prev, current) => (prev.bitrate > current.bitrate) ? prev : current, media.video_info.variants[0])?.url)
                                .filter(url => url);
                        }
                    } catch (e) {
                        console.error("Error parsing unified_card JSON:", e);
                    }
                }
            }
        }
        return { imageURLs: imageURLs, gifURLs: gifURLs, videoURLs: videoURLs };
    };

    // ========== 全局状态 ==========
    const STATE = {
        running: false,  // 默认关闭自动化
        autoLike: false,
        autoFollow: false,
        autoRetweet: false,
        safeMode: true,
        originalsOnly: false,
        hideSpaces: false,
        hdMedia: true,
        videoMode: false,
        mediaDownload: true,
        logCollapsed: false,
        processed: new Set(),
        count: { like: 0, follow: 0, retweet: 0 },
        rate: { like: 50, follow: 20, retweet: 15, resetAt: Date.now() + 60*60*1000 },
        actionInterval: 2500,
        maxActionsPerCycle: 2,
        isProcessing: false,
        panelCollapsed: false,
        tickMs: 15000
    };


    const LOG = (msg, type='info') => {
        const prefix = `[🍑 女秘书 v2.0] `;
        const colorMap = {
            info: '#1DA1F2',
            success: '#17BF63',
            error: '#FF3B30',
            warning: '#F7931E'
        };
        console.log(`%c${prefix}${msg}`, `color: ${colorMap[type] || colorMap.info}; font-weight: bold;`);

        const box = document.querySelector('#twx-log');
        if (box && !STATE.logCollapsed) {
            const time = new Date().toLocaleTimeString();
            const color = colorMap[type] || colorMap.info;
            box.innerHTML += `<div style="color: ${color}; font-size: 11px; margin: 2px 0;">${time} ${msg}</div>`;
            box.scrollTop = box.scrollHeight;

            // 限制日志数量，防止内存溢出
            const logs = box.children;
            if (logs.length > 50) {
                for (let i = 0; i < 10; i++) {
                    logs[0].remove();
                }
            }
        }
    };

    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const textOf = (el) => (el?.textContent || el?.innerText || '').trim();
    const getHash = (el) => {
        if (!el) return '';
        try {
            const r = el.getBoundingClientRect();
            return `${(r.left|0)}-${(r.top|0)}-${(el.getAttribute('data-testid')||'')}-${textOf(el).slice(0,20)}`;
        } catch (e) {
            return String(Math.random());
        }
    };

    const qs = (sel, root=document) => root.querySelector(sel);
    const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
    const $ = qs;
    const num = (sel, def) => parseInt($(sel)?.value, 10) || def;
    const updProcessed = () => { const el = $('#twx-processed'); if (el) el.textContent = String(STATE.processed.size); };

    const resetRateIfNeeded = () => {
        if (Date.now() > STATE.rate.resetAt) {
            STATE.count = { like: 0, follow: 0, retweet: 0 };
            STATE.rate.resetAt = Date.now() + 60*60*1000;
            STATE.processed.clear();
            LOG('速率限制计数已重置');
        }
    };


    // ========== 基础点击与行为 ==========
    async function safeClick(btn) {
        if (!btn || typeof btn.click !== 'function') return false;
        try {
            btn.scrollIntoView({behavior:'smooth', block:'center'});
            await sleep(rand(200, 450));
            btn.click();
            return true;
        } catch (e) {
            return false;
        }
    }
    function initVideoStyles() {
        const videoStyle = document.createElement('style');
        videoStyle.textContent = `
            .video-filter-hidden {
                visibility: hidden !important;
                position: absolute !important;
                left: -9999px !important;
            }
            .video-filter-toggle {
                position: fixed; top: 10px; right: 10px; z-index: 9999;
                background: #1d9bf0; color: white; border: none;
                padding: 8px 12px; border-radius: 20px; cursor: pointer;
                font-size: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
            .video-filter-toggle:hover {
                background: #1a8cd8;
            }
            .video-filter-stats {
                position: fixed; top: 50px; right: 10px; z-index: 9998;
                background: rgba(0,0,0,0.8); color: white; padding: 8px 12px;
                border-radius: 8px; font-size: 11px; display: none;
            }
        `;
        document.head.appendChild(videoStyle);
    }

    // ========== 视频模式全局变量 ==========
    let videoCache = new Map();
    let isVideoModeEnabled = false;
    let videoToggleButton = null;
    let videoStatsElement = null;

    // ========== 视频检测功能 ==========
    function hasVideo(tweet) {
        const tweetId = tweet.getAttribute('data-testid') || getHash(tweet);
        if (videoCache.has(tweetId)) {
            return videoCache.get(tweetId);
        }

        try {
            // 1. 检查视频标签
            const videoElements = tweet.querySelectorAll('video');
            if (videoElements.length > 0) {
                videoCache.set(tweetId, true);
                return true;
            }

            // 2. 检查视频播放按钮和容器
            const videoSelectors = [
                '[data-testid="videoPlayer"]',
                '[data-testid="playButton"]',
                '[data-testid="videoComponent"]',
                '[aria-label*="播放"]',
                '[aria-label*="Play"]',
                '[aria-label*="video"]',
                '[aria-label*="Video"]',
                '.r-1p0dtai', // Twitter视频容器类
                '.css-1dbjc4n[data-testid="tweet"] video',
                'div[role="button"][aria-label*="Play"]'
            ];

            for (const selector of videoSelectors) {
                const elements = tweet.querySelectorAll(selector);
                if (elements.length > 0) {
                    videoCache.set(tweetId, true);
                    return true;
                }
            }

            // 3. 检查文本内容是否包含视频相关关键词
            const tweetText = tweet.textContent || '';
            const videoKeywords = ['视频', 'video', '播放', 'play'];
            const hasVideoKeyword = videoKeywords.some(keyword =>
                tweetText.toLowerCase().includes(keyword.toLowerCase())
            );

            // 4. 检查是否有媒体容器
            const mediaContainers = tweet.querySelectorAll(
                '[data-testid="tweetPhoto"], [data-testid="card.layoutLarge.media"], ' +
                '.css-1dbjc4n[style*="padding-bottom"]'
            );

            if (mediaContainers.length > 0 && hasVideoKeyword) {
                videoCache.set(tweetId, true);
                return true;
            }

            videoCache.set(tweetId, false);
            return false;
        } catch (error) {
            console.warn('检查视频内容时出错:', error);
            videoCache.set(tweetId, false);
            return false;
        }
    }

    function filterVideoTweets() {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        let hiddenCount = 0;
        let shownCount = 0;

        tweets.forEach(tweet => {
            if (hasVideo(tweet)) {
                tweet.style.display = '';
                tweet.classList.remove('video-filter-hidden');
                shownCount++;
            } else {
                tweet.style.display = 'none';
                tweet.classList.add('video-filter-hidden');
                hiddenCount++;
            }
        });

        if (videoStatsElement) {
            videoStatsElement.textContent = `显示: ${shownCount} | 隐藏: ${hiddenCount}`;
        }
    }

    function toggleVideoMode() {
        isVideoModeEnabled = !isVideoModeEnabled;
        if (isVideoModeEnabled) {
            videoToggleButton.textContent = '🎥 视频模式: 开';
            videoStatsElement.style.display = 'block';
            filterVideoTweets();
        } else {
            videoToggleButton.textContent = '🎥 视频模式: 关';
            videoStatsElement.style.display = 'none';
            showAllVideoTweets();
        }
    }

    function showAllVideoTweets() {
        const hiddenTweets = document.querySelectorAll('.video-filter-hidden');
        hiddenTweets.forEach(tweet => {
            tweet.style.display = '';
            tweet.classList.remove('video-filter-hidden');
        });
    }

    // ========== 视频模式初始化 ==========
    function initVideoMode() {
        try {
            // 创建控制按钮
            videoToggleButton = document.createElement('button');
            videoToggleButton.className = 'video-filter-toggle';
            videoToggleButton.textContent = '🎥 视频模式: 关';
            videoToggleButton.onclick = toggleVideoMode;
            document.body.appendChild(videoToggleButton);

            videoStatsElement = document.createElement('div');
            videoStatsElement.className = 'video-filter-stats';
            videoStatsElement.id = 'video-filter-stats';
            document.body.appendChild(videoStatsElement);

            LOG('✅ 视频模式模块已初始化', 'success');
        } catch (error) {
            LOG('❌ 视频模式初始化失败: ' + error.message, 'error');
        }
    }

    // ========== 文本识别 ==========
    const TXT = {
        follow: ['关注', '關注', 'Follow'],
        following: ['正在关注', '已关注', '取消关注', '正在關注', '已關注', '取消關注', 'Following'],
        unfollowConfirmTestId: 'confirmationSheetConfirm',
        likeTestId: 'like',
        unlikeTestId: 'unlike',
        retweetTestId: 'retweet',
        unretweetTestId: 'unretweet'
    };

    function findLikeButtons() {
        const list = qsa(`[data-testid="${TXT.likeTestId}"]:not([data-testid="${TXT.unlikeTestId}"])`);
        return list.filter(btn => {
            const hash = 'like-' + getHash(btn);
            if (STATE.processed.has(hash)) return false;
            const aria = btn.getAttribute('aria-label') || '';
            const liked = /已喜欢|取消喜欢|Liked|Unlike/.test(aria);
            if (!liked) { STATE.processed.add(hash); return true; }
            return false;
        });
    }


    function isFollowText(text) { return TXT.follow.includes(text); }
    function isFollowingText(text) { return TXT.following.some(t => text.includes(t)); }

    function findFollowButtons() {
        const all = qsa('div[role="button"], button');
        const res = [];
        for (const btn of all) {
            const t = textOf(btn);
            if (!t) continue;
            const hash = 'follow-' + getHash(btn);
            if (STATE.processed.has(hash)) continue;
            if (isFollowText(t) && !isFollowingText(t)) {
                const aria = btn.getAttribute('aria-label') || '';
                const already = /正在关注|已关注|正在關注|已關注|Following/.test(aria) || btn.querySelector('[data-testid="userFollowing"]');
                if (!already) { STATE.processed.add(hash); res.push(btn); }
            }
        }
        return res;
    }

    function findRetweetButtons() {
        const list = qsa(`[data-testid="${TXT.retweetTestId}"]:not([data-testid="${TXT.unretweetTestId}"])`);
        return list.filter(btn => {
            const hash = 'rt-' + getHash(btn);
            if (STATE.processed.has(hash)) return false;
            STATE.processed.add(hash);
            return true;
        });
    }

    async function doLike(btn) {
        if (!btn) return false;
        if (!(await safeClick(btn))) return false;
        STATE.count.like++;
        LOG('点赞成功', 'success');
        await sleep(rand(800, 1300));
        return true;
    }

    async function doFollow(btn) {
        if (!btn) return false;
        const t = textOf(btn);
        if (!isFollowText(t)) { LOG(`跳过可疑关注按钮: "${t}"`, 'warning'); return false; }
        if (!(await safeClick(btn))) return false;
        STATE.count.follow++; LOG('关注成功', 'success');
        await sleep(rand(700, 1200));
        return true;
    }

    async function doRetweet(btn) {
        if (!btn) return false;
        if (!(await safeClick(btn))) return false;
        LOG('已点开转帖菜单');
        await sleep(700);
        const menuItem = qsa('div[role="menuitem"], div[role="button"], span').find(e => {
            const s = textOf(e);
            return ['转帖', '轉推', 'Retweet'].includes(s);
        }) || qs('[data-testid="retweetConfirm"]');
        if (menuItem && await safeClick(menuItem)) {
            STATE.count.retweet++;
            LOG('转帖成功', 'success');
            await sleep(rand(900, 1500));
            return true;
        }
        LOG('未找到转帖确认', 'error');
        return false;
    }

    function jitter(base) {
        const delta = Math.floor(base * (STATE.safeMode ? 0.25 : 0.12));
        return base + rand(-delta, delta);
    }

    async function autoCycle() {
        if (STATE.isProcessing || !STATE.running) return;
        STATE.isProcessing = true;
        resetRateIfNeeded();

        try {
            let did = 0;

            // 点赞
            if (STATE.autoLike && STATE.count.like < STATE.rate.like) {
                const list = findLikeButtons().slice(0, STATE.maxActionsPerCycle);
                if (list.length) LOG(`准备点赞 ${list.length} 条`);
                for (const b of list) {
                    if (await doLike(b)) { did++; await sleep(STATE.actionInterval + rand(200,600)); }
                }
            }

            // 关注
            if (STATE.autoFollow && STATE.count.follow < STATE.rate.follow) {
                const list = findFollowButtons().slice(0, STATE.maxActionsPerCycle);
                if (list.length) LOG(`准备关注 ${list.length} 个`);
                for (const b of list) {
                    if (await doFollow(b)) { did++; await sleep(STATE.actionInterval + rand(200,600)); }
                }
            }

            // 转帖
            if (STATE.autoRetweet && STATE.count.retweet < STATE.rate.retweet) {
                const list = findRetweetButtons().slice(0, 1);
                if (list.length) LOG(`准备转帖 ${list.length} 条`);
                for (const b of list) {
                    if (await doRetweet(b)) { did++; await sleep(STATE.actionInterval + rand(600,900)); }
                }
            }

            if (!did) {
                LOG('当前无可操作内容，尝试滚动加载更多…', 'info');
                window.scrollBy({ top: rand(800, 1400), behavior: 'smooth' });
            } else {
                LOG(`本轮完成。累计 => 赞:${STATE.count.like} 关:${STATE.count.follow} 转:${STATE.count.retweet}`, 'success');
            }
        } catch (e) {
            LOG('执行出错：' + (e?.message || e), 'error');
        } finally {
            STATE.isProcessing = false;
        }
    }

    function startLoop() {
        if (STATE.timer) clearInterval(STATE.timer);
        STATE.timer = setInterval(autoCycle, STATE.tickMs);
        LOG('🔄 自动化循环已启动，间隔: ' + STATE.tickMs + 'ms', 'info');
    }

    // ========== UI 面板 ==========
    function createPanel() {
        if (document.querySelector('#twx-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'twx-panel';
        panel.style.cssText = `
            position:fixed; left:16px; top:16px; width:min(360px, 28vw);
            background:rgba(0,0,0,0.95); color:#ffffff; padding:16px;
            border-radius:16px; font-size:13px; z-index:999999;
            box-shadow:0 8px 32px rgba(0,0,0,0.8); border:1px solid rgba(255,255,255,0.1);
            backdrop-filter:blur(20px); transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // 面板头部：标题 + 控制按钮
        const header = document.createElement('div');
        header.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; cursor: move;`;
        header.innerHTML = `
            <h2 style="margin: 0; color: #1DA1F2; font-size: 18px; display: flex; align-items: center;">
                🍑 女秘书
                <span style="font-size: 12px; margin-left: 8px; opacity: 0.7;">v2.0</span>
                <span style="font-size: 10px; margin-left: 4px; color:#1DA1F2; font-weight: bold;">AI</span>
            </h2>
            <div>
                <button id="twx-toggle-panel" style="padding:6px 8px; background:rgba(29,161,242,0.2); border:none; border-radius:8px; color:#1DA1F2; cursor:pointer; font-size:12px; font-weight:500;">▼</button>
            </div>
        `;
        panel.appendChild(header);

        // 面板主体内容
        const body = document.createElement('div');
        body.id = 'twx-panel-body';
        body.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;cursor:pointer;color:#ffffff;">
                    <input type="checkbox" id="twx-like" style="accent-color:#1DA1F2;transform:scale(1.1);"> 自动点赞
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;cursor:pointer;color:#ffffff;">
                    <input type="checkbox" id="twx-follow" style="accent-color:#1DA1F2;transform:scale(1.1);"> 智能关注
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;cursor:pointer;color:#ffffff;">
                    <input type="checkbox" id="twx-retweet" style="accent-color:#1DA1F2;transform:scale(1.1);"> 自动转发
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;cursor:pointer;color:#ffffff;">
                    <input type="checkbox" id="twx-originals-only" style="accent-color:#1DA1F2;transform:scale(1.1);"> 只看原创
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;cursor:pointer;color:#ffffff;">
                    <input type="checkbox" id="twx-hide-spaces" style="accent-color:#1DA1F2;transform:scale(1.1);"> 清爽界面
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;cursor:pointer;color:#ffffff;">
                    <input type="checkbox" id="twx-hd-media" checked style="accent-color:#1DA1F2;transform:scale(1.1);"> 高清媒体
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;cursor:pointer;color:#ffffff;">
                    <input type="checkbox" id="twx-video-mode" style="accent-color:#1DA1F2;transform:scale(1.1);"> 视频模式
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;cursor:pointer;color:#E1E8ED;">
                    <input type="checkbox" id="twx-media-download" style="accent-color:#1DA1F2;transform:scale(1.1);"> 媒体下载
                </label>
            </div>

            <div style="background:rgba(29,161,242,0.1);border-radius:12px;padding:12px;margin-bottom:16px;border:1px solid rgba(29,161,242,0.2);">
                <div style="font-weight:600;margin-bottom:8px;color:#1DA1F2;font-size:12px;">频率设置</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:11px;">
                    <div style="text-align:center;">
                        <div style="color:#8B98A5;margin-bottom:4px;">点赞</div>
                        <input type="number" id="limit-like" value="${STATE.rate.like}" style="width:100%;padding:4px;border:1px solid #38444D;border-radius:6px;text-align:center;font-size:11px;background:#000;color:#fff;">
                    </div>
                    <div style="text-align:center;">
                        <div style="color:#8B98A5;margin-bottom:4px;">关注</div>
                        <input type="number" id="limit-follow" value="${STATE.rate.follow}" style="width:100%;padding:4px;border:1px solid #38444D;border-radius:6px;text-align:center;font-size:11px;background:#000;color:#fff;">
                    </div>
                    <div style="text-align:center;">
                        <div style="color:#8B98A5;margin-bottom:4px;">转发</div>
                        <input type="number" id="limit-retweet" value="${STATE.rate.retweet}" style="width:100%;padding:4px;border:1px solid #38444D;border-radius:6px;text-align:center;font-size:11px;background:#000;color:#fff;">
                    </div>
                </div>
                <button id="twx-save" style="width:100%;margin-top:8px;padding:6px;background:#1DA1F2;border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:11px;font-weight:500;">保存设置</button>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
                <button id="twx-run" style="padding:10px;background:#1DA1F2;border:none;border-radius:10px;color:#fff;cursor:pointer;font-size:12px;font-weight:600;">全套运行一次</button>
                <button id="twx-toggle" style="padding:10px;background:#1DA1F2;border:none;border-radius:10px;color:#fff;cursor:pointer;font-size:12px;font-weight:600;">启动</button>
            </div>

            <div style="display:flex;gap:8px;margin-bottom:16px;">
                <button id="twx-adv-search" style="flex:1;padding:8px;background:rgba(29,161,242,0.2);border:none;border-radius:8px;color:#1DA1F2;cursor:pointer;font-size:11px;font-weight:500;">高级搜索模式</button>
                <button id="twx-clear" style="padding:8px 12px;background:rgba(139,152,165,0.2);border:none;border-radius:8px;color:#8B98A5;cursor:pointer;font-size:11px;font-weight:500;">清空</button>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="font-size:11px;color:#8B98A5;">
                    状态: <span id="twx-status" style="color:#f91880;font-weight:500;">未启动</span> |
                    记录: <span id="twx-processed" style="font-weight:500;color:#ffffff;">0</span>
                </div>
                <button id="twx-toggle-log" style="background:none;border:none;color:#8B98A5;cursor:pointer;font-size:11px;padding:2px 6px;border-radius:4px;">
                    <span id="log-toggle-text">▼</span> 日志
                </button>
            </div>

            <div id="twx-log" style="max-height:120px;overflow:auto;background:rgba(255,255,255,0.05);padding:8px;border-radius:8px;font-size:10px;border:1px solid rgba(255,255,255,0.1);display:block;"></div>
        `;
        panel.appendChild(body);

        document.body.appendChild(panel);

        // 载入持久化位置
        try {
            const saved = JSON.parse(localStorage.getItem('twx_panel_pos') || 'null');
            if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
                panel.style.left = saved.left + 'px';
                panel.style.top = saved.top + 'px';
                panel.style.right = 'auto';
            }
        } catch(_) {}

        // 拖拽移动 + 边缘吸附 + 位置持久化
        (function enableDrag(){
            let dragging = false; let sx=0, sy=0, sl=0, st=0;
            const onMouseDown = (e) => {
                dragging = true;
                const rect = panel.getBoundingClientRect();
                sx = e.clientX; sy = e.clientY; sl = rect.left; st = rect.top;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            const onMouseMove = (e) => {
                if (!dragging) return;
                let nl = sl + (e.clientX - sx);
                let nt = st + (e.clientY - sy);
                nl = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, nl));
                nt = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, nt));
                panel.style.left = nl + 'px';
                panel.style.top = nt + 'px';
                panel.style.right = 'auto';
            };
            const onMouseUp = () => {
                if (!dragging) return;
                dragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                const rect = panel.getBoundingClientRect();
                // 边缘吸附 12px
                if (rect.left < 12) panel.style.left = '12px';
                if (window.innerWidth - rect.right < 12) panel.style.left = (window.innerWidth - panel.offsetWidth - 12) + 'px';
                if (rect.top < 12) panel.style.top = '12px';
                // 持久化
                try { localStorage.setItem('twx_panel_pos', JSON.stringify({ left: parseInt(panel.style.left)||12, top: parseInt(panel.style.top)||12 })); } catch(_){}
            };
            header.addEventListener('mousedown', onMouseDown);
        })();

        // 绑定事件
        $('#twx-like').onchange = e => STATE.autoLike = e.target.checked;
        $('#twx-follow').onchange = e => STATE.autoFollow = e.target.checked;
        $('#twx-retweet').onchange = e => STATE.autoRetweet = e.target.checked;
        $('#twx-originals-only').onchange = e => { STATE.originalsOnly = e.target.checked; toggleOriginalsOnly(STATE.originalsOnly); };
        $('#twx-hide-spaces').onchange = e => { STATE.hideSpaces = e.target.checked; toggleHideSpaces(STATE.hideSpaces); };
        $('#twx-hd-media').onchange = e => { STATE.hdMedia = e.target.checked; toggleHDMedia(STATE.hdMedia); };
        $('#twx-video-mode').onchange = e => { STATE.videoMode = e.target.checked; toggleVideoMode(STATE.videoMode); };
        $('#twx-media-download').checked = STATE.mediaDownload;
        $('#twx-media-download').disabled = false;
        $('#twx-media-download').onchange = e => { STATE.mediaDownload = e.target.checked; toggleMediaDownload(STATE.mediaDownload); };

        $('#twx-save').onclick = () => {
            STATE.rate.like = num('#limit-like', STATE.rate.like);
            STATE.rate.follow = num('#limit-follow', STATE.rate.follow);
            STATE.rate.retweet = num('#limit-retweet', STATE.rate.retweet);
            LOG('速率限制已更新');
        };

        $('#twx-run').onclick = () => { LOG('手动触发全套任务'); autoCycle(); };

        // 修复按钮事件绑定
        const toggleBtn = $('#twx-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = async () => {
                if (!STATE.running) {
                    const pass = await gateAutomation();
                    if (!pass) return;
                }
                STATE.running = !STATE.running;
                const st = $('#twx-status');
                if (STATE.running) {
                    toggleBtn.textContent = '暂停';
                    toggleBtn.style.background = '#F7931E';
                    st.textContent = '运行中';
                    st.style.color = '#1DA1F2';
                    startLoop();
                    LOG('🚀 自动化已启动', 'success');
                } else {
                    toggleBtn.textContent = '启动';
                    toggleBtn.style.background = '#1DA1F2';
                    st.textContent = '已暂停';
                    st.style.color = '#f91880';
                    if (STATE.timer) {
                        clearInterval(STATE.timer);
                        STATE.timer = null;
                    }
                    LOG('⏸️ 自动化已暂停', 'warning');
                }
            };
        }
        $('#twx-adv-search').onclick = () => { openAdvancedSearchModal(); };
        $('#twx-clear').onclick = () => { $('#twx-log').innerHTML = ''; STATE.processed.clear(); updProcessed(); LOG('已清空'); };

        // 日志折叠功能
        $('#twx-toggle-log').onclick = () => {
            STATE.logCollapsed = !STATE.logCollapsed;
            const logBox = $('#twx-log');
            const toggleText = $('#log-toggle-text');

            if (STATE.logCollapsed) {
                logBox.style.display = 'none';
                toggleText.textContent = '▶';
            } else {
                logBox.style.display = 'block';
                toggleText.textContent = '▼';
            }
        };

        $('#twx-toggle-panel').onclick = () => {
            STATE.panelCollapsed = !STATE.panelCollapsed;
            const btn = $('#twx-toggle-panel');
            const body = $('#twx-panel-body');
            if (STATE.panelCollapsed) {
                body.style.display = 'none';
                btn.textContent = '▲';
                panel.style.padding = '12px';
                btn.style.background = 'rgba(29,161,242,0.3)';
            } else {
                body.style.display = 'block';
                btn.textContent = '▼';
                panel.style.padding = '16px';
                btn.style.background = 'rgba(29,161,242,0.2)';
            }
        };

        setInterval(updProcessed, 4000);
    }

    // 移除重复的toggleRun函数定义，已在面板创建时处理

    // ========== 视频模式功能 ==========
    function hasVideo(tweet) {
        try {
            // 检测视频元素
            const videoElements = tweet.querySelectorAll('video');
            if (videoElements.length > 0) return true;

            // 检测视频相关选择器
            const videoSelectors = [
                '[data-testid="videoPlayer"]',
                '[data-testid="playButton"]',
                '[data-testid="videoComponent"]',
                '[aria-label*="播放"]',
                '[aria-label*="Play"]',
                'div[role="button"][aria-label*="Play"]'
            ];

            for (const selector of videoSelectors) {
                if (tweet.querySelector(selector)) return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    function toggleVideoMode(enabled) {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        tweets.forEach(tweet => {
            if (enabled) {
                // 视频模式：只显示有视频的推文
                if (!hasVideo(tweet)) {
                    tweet.style.display = 'none';
                    tweet.classList.add('video-mode-hidden');
                } else {
                    tweet.style.display = '';
                    tweet.classList.remove('video-mode-hidden');
                }
            } else {
                // 关闭视频模式：显示所有推文
                tweet.style.display = '';
                tweet.classList.remove('video-mode-hidden');
            }
        });

        LOG(`视频模式已${enabled ? '开启' : '关闭'}，处理了 ${tweets.length} 条推文`, 'info');

        // 监听新推文
        if (enabled && !STATE.videoModeObserver) {
            let lastRun = 0;
            STATE.videoModeObserver = new MutationObserver(() => {
                if (STATE.videoMode && Date.now() - lastRun > 1000) {
                    lastRun = Date.now();
                    setTimeout(() => {
                        const newTweets = document.querySelectorAll('article[data-testid="tweet"]:not(.video-mode-processed)');
                        newTweets.forEach(tweet => {
                            tweet.classList.add('video-mode-processed');
                            if (!hasVideo(tweet)) {
                                tweet.style.display = 'none';
                                tweet.classList.add('video-mode-hidden');
                            }
                        });
                    }, 300);
                }
            });
            STATE.videoModeObserver.observe(document.body, { childList: true, subtree: true });
        } else if (!enabled && STATE.videoModeObserver) {
            STATE.videoModeObserver.disconnect();
            STATE.videoModeObserver = null;
            // 清理处理标记和原创标签
            document.querySelectorAll('.video-mode-processed').forEach(tweet => {
                tweet.classList.remove('video-mode-processed');
            });
            document.querySelectorAll('.original-label').forEach(label => label.remove());
        }
    }

    // ========== 媒体下载功能 ==========
    let mediaDownloadObserver = null;

    const downloadMediaWithFetchStream = async (mediaSrcURL) => {
        const headers = { 'User-Agent': userAgent };
        try {
            const res = await gmFetch(mediaSrcURL, { headers, responseType: 'blob' });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const originalBlob = await res.blob();
            const mediaInfo = getMediaInfoFromUrl(mediaSrcURL);
            let inferredMimeType = '';
            switch (mediaInfo.ext.toLowerCase()) {
                case 'jpg': case 'jpeg': inferredMimeType = 'image/jpeg'; break;
                case 'png': inferredMimeType = 'image/png'; break;
                case 'gif': inferredMimeType = 'video/mp4'; break;
                case 'mp4': inferredMimeType = 'video/mp4'; break;
                case 'webm': inferredMimeType = 'video/webm'; break;
                default: inferredMimeType = originalBlob.type || 'application/octet-stream'; break;
            }
            if (!originalBlob.type || originalBlob.type !== inferredMimeType) {
                return new Blob([originalBlob], { type: inferredMimeType });
            }
            return originalBlob;
        } catch (error) {
            console.error("Error downloading media with fetch stream:", error);
            return null;
        }
    };

    const blobToDataURL = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    };

    const blobToUint8Array = async (blob) => {
        const arrayBuffer = await blob.arrayBuffer();
        try {
            return new Uint8Array(structuredClone(arrayBuffer));
        } catch (e) {
            return new Uint8Array(arrayBuffer);
        }
    };

    const downloadBlobAsFile = async (blob, filename) => {
        const a = document.createElement("a");
        a.download = filename;
        if (isAppleMobile) {
            const dataUrl = await blobToDataURL(blob);
            a.href = dataUrl;
        } else {
            const blobUrl = URL.createObjectURL(blob);
            a.href = blobUrl;
        }
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (!isAppleMobile && a.href.startsWith('blob:')) {
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }
    };

    const downloadZipArchive = async (blobs, filenameElements, mediaURLs) => {
        const files = {};
        const filenames = blobs.map((_, index) => {
            const mediaInfo = getMediaInfoFromUrl(mediaURLs[index]);
            return generateFilename(filenameElements, mediaInfo.typeLabel, index + 1, mediaInfo.ext);
        });
        const uint8Arrays = await Promise.all(blobs.map(blob => blobToUint8Array(blob)));
        uint8Arrays.forEach((uint8Array, index) => {
            files[filenames[index]] = uint8Array;
        });
        const zipData = await new Promise((resolve, reject) => {
            fflate.zip(files, { level: 0 }, (err, zipData) => {
                if (err) {
                    console.error("ZIP archive creation failed:", err);
                    alert("ZIP文件创建失败。");
                    reject(err);
                } else {
                    resolve(zipData);
                }
            });
        });
        const zipBlob = new Blob([zipData], { type: 'application/zip' });
        const filename = generateFilename(filenameElements, 'medias', '', 'zip');
        await downloadBlobAsFile(zipBlob, filename);
    };

    const downloadMedia = async (imageURLs, gifURLs, videoURLs, filenameElements, btn_down, allMediaURLs) => {
        const mediaCount = imageURLs.length + gifURLs.length + videoURLs.length;
        if (mediaCount === 1) {
            let mediaURL = imageURLs[0] || gifURLs[0] || videoURLs[0];
            const blob = await downloadMediaWithFetchStream(mediaURL);
            if (blob) {
                const mediaInfo = getMediaInfoFromUrl(mediaURL);
                const filename = generateFilename(filenameElements, mediaInfo.typeLabel, 1, mediaInfo.ext);
                await downloadBlobAsFile(blob, filename);
                markPostAsDownloadedIndexedDB(filenameElements.postId);
                setTimeout(() => {
                    status(btn_down, 'completed');
                }, 300);
            } else {
                status(btn_down, 'failed');
                setTimeout(() => status(btn_down, 'download'), 3000);
            }
        } else if (mediaCount > 1) {
            const blobs = (await Promise.all([...imageURLs, ...gifURLs, ...videoURLs].map(url => downloadMediaWithFetchStream(url)))).filter(blob => blob);
            if (blobs.length === mediaCount) {
                if (isMobile) {
                    await downloadZipArchive(blobs, filenameElements, allMediaURLs);
                } else {
                    for (const [index, blob] of blobs.entries()) {
                        const mediaURL = allMediaURLs[index];
                        const mediaInfo = getMediaInfoFromUrl(mediaURL);
                        const filename = generateFilename(filenameElements, mediaInfo.typeLabel, index + 1, mediaInfo.ext);
                        await downloadBlobAsFile(blob, filename);
                    }
                }
                markPostAsDownloadedIndexedDB(filenameElements.postId);
                setTimeout(() => {
                    status(btn_down, 'completed');
                }, 300);
            } else {
                status(btn_down, 'failed');
                setTimeout(() => status(btn_down, 'download'), 3000);
            }
        }
    };

    const status = (btn, css) => {
        btn.classList.remove('download', 'loading', 'failed', 'completed');
        if (css) btn.classList.add(css);
    };

    const getNoImageMessage = () => {
        const lang = getCurrentLanguage();
        return lang === 'ja' ? "このツイートには画像または動画がありません！" : "There is no image or video in this tweet!";
    };

    const createDownloadButton = async (cell) => {
        let btn_group = cell.querySelector('div[role="group"]:last-of-type, ul.tweet-actions, ul.tweet-detail-actions');
        if (!btn_group) return;
        let btn_share = Array.from(btn_group.querySelectorAll(':scope>div>div, li.tweet-action-item>a, li.tweet-detail-action-item>a')).pop().parentNode;
        if (!btn_share) return;

        let btn_down = btn_share.cloneNode(true);
        btn_down.classList.add('tmd-down', 'download');
        const btnElem = btn_down.querySelector('button');
        if (btnElem) btnElem.removeAttribute('disabled');
        const lang = getCurrentLanguage();
        if (btn_down.querySelector('button')) btn_down.querySelector('button').title = lang === 'ja' ? '画像と動画をダウンロード' : 'Download images and videos';

        btn_down.querySelector('svg').innerHTML = `
            <g class="download"><path d="M12 16 17.7 10.3 16.29 8.88 13 12.18 V2.59 h-2 v9.59 L7.7 8.88 6.29 10.3 Z M21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" fill="currentColor" stroke="currentColor" stroke-width="0.20" stroke-linecap="round" /></g>
            <g class="loading"><circle cx="12" cy="12" r="10" fill="none" stroke="#1DA1F2" stroke-width="4" opacity="0.4" /><path d="M12,2 a10,10 0 0 1 10,10" fill="none" stroke="#1DA1F2" stroke-width="4" stroke-linecap="round" /></g>
            <g class="failed"><circle cx="12" cy="12" r="11" fill="#f33" stroke="currentColor" stroke-width="2" opacity="0.8" /><path d="M14,5 a1,1 0 0 0 -4,0 l0.5,9.5 a1.5,1.5 0 0 0 3,0 z M12,17 a2,2 0 0 0 0,4 a2,2 0 0 0 0,-4" fill="#fff" stroke="none" /></g>
            <g class="completed"><path d="M21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z M 7 10 l 3 4 q 1 1 2 0 l 8 -11 l -1.65 -1.2 l -7.35 10.1063 l -2.355 -3.14" fill="rgba(29, 161, 242, 1)" stroke="#1DA1F2" stroke-width="0.20" stroke-linecap="round" /></g>
        `;

        const filenameElements = getTweetFilenameElements(getMainTweetUrl(cell), cell);
        if (filenameElements) {
            if (downloadedPostsCache.has(filenameElements.postId)) {
                status(btn_down, 'completed');
            }
        }

        btn_down.onclick = async () => {
            if (btn_down.classList.contains('loading')) return;
            status(btn_down, 'loading');

            const mainTweetUrl = getMainTweetUrl(cell);
            const filenameElements = getTweetFilenameElements(mainTweetUrl, cell);
            if (!filenameElements) {
                alert("无法获取推文信息。");
                status(btn_down, 'download');
                return;
            }

            const mediaData = await getMediaURLs(cell, filenameElements);
            const mediaUrls = [...mediaData.imageURLs, ...mediaData.gifURLs, ...mediaData.videoURLs];
            if (mediaUrls.length === 0) {
                alert(getNoImageMessage());
                status(btn_down, 'download');
                return;
            }
            downloadMedia(mediaData.imageURLs, mediaData.gifURLs, mediaData.videoURLs, filenameElements, btn_down, mediaUrls);
        };
        if (btn_group) btn_group.insertBefore(btn_down, btn_share.nextSibling);
    };

    const processArticles = () => {
        const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
        cells.forEach(cell => {
            const mainTweet = cell.querySelector('article[data-testid="tweet"]');
            if (!mainTweet) return;
            const tweetUrl = getMainTweetUrl(cell);
            if (!getTweetFilenameElements(tweetUrl, cell)) return;
            const mediaElems = getValidMediaElements(cell);
            const mediaCount = mediaElems.images.length + mediaElems.videos.length + mediaElems.gifs.length;
            if (!cell.querySelector('.tmd-down') && mediaCount > 0) createDownloadButton(cell);
            // 翻译“Original”标签
            translateOriginalLabel(cell);
        });
    };

    // 将页面已有的“Original”文案替换为“原创”，不改变原有样式
    const translateOriginalLabel = (rootEl) => {
        const scope = rootEl || document;
        const candidates = scope.querySelectorAll('span, div, button');
        candidates.forEach(el => {
            if (el.childElementCount === 0 && el.textContent && el.textContent.trim() === 'Original') {
                el.textContent = '原创';
            }
        });
    };

    // 注入下载按钮的状态样式，避免多个<g>叠在一起
    const ensureTmdStyles = () => {
        if (document.getElementById('tmd-style')) return;
        const style = document.createElement('style');
        style.id = 'tmd-style';
        style.textContent = `
            .tmd-down svg { width: 20px; height: 20px; }
            .tmd-down g { display: none; }
            .tmd-down.download g.download,
            .tmd-down.loading g.loading,
            .tmd-down.failed g.failed,
            .tmd-down.completed g.completed { display: inline; }
            .tmd-down.loading svg g.loading { animation: tmd-spin 1s linear infinite; transform-box: fill-box; transform-origin: center; }
            @keyframes tmd-spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }
        `;
        document.head.appendChild(style);
    };

    const startMediaDownloadObserver = () => {
        ensureTmdStyles();
        if (mediaDownloadObserver) return;
        mediaDownloadObserver = new MutationObserver(processArticles);
        mediaDownloadObserver.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('load', processArticles);
        window.addEventListener('popstate', processArticles);
        window.addEventListener('hashchange', processArticles);
        processArticles(); // 立即处理现有内容
    };

    const stopMediaDownloadObserver = () => {
        if (mediaDownloadObserver) {
            mediaDownloadObserver.disconnect();
            mediaDownloadObserver = null;
        }
        window.removeEventListener('load', processArticles);
        window.removeEventListener('popstate', processArticles);
        window.removeEventListener('hashchange', processArticles);
        // 移除所有下载按钮和原创标签
        document.querySelectorAll('.tmd-down').forEach(btn => btn.remove());
        document.querySelectorAll('.original-label').forEach(label => label.remove());
        // 强制刷新页面上的下载按钮
        setTimeout(() => {
            if (STATE.mediaDownload) {
                processArticles();
            }
        }, 100);
    };

    function toggleMediaDownload(enabled) {
        if (enabled) {
            startMediaDownloadObserver();
            LOG('✅ 媒体下载功能已启用', 'success');
            // 强制刷新所有下载按钮
            setTimeout(() => {
                document.querySelectorAll('.tmd-down').forEach(btn => btn.remove());
                processArticles();
            }, 100);
        } else {
            stopMediaDownloadObserver();
            LOG('❌ 媒体下载功能已禁用', 'info');
        }
    }

    // ========== 只看原创内容 ==========
    function toggleOriginalsOnly(enabled) {
        if (enabled) {
            LOG('✅ 已开启只看原创内容', 'success');
            hideNonOriginalTweets();
        } else {
            LOG('❌ 已关闭只看原创内容', 'warning');
            showAllTweets();
        }
    }

    function hideNonOriginalTweets() {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        let hiddenCount = 0;

        tweets.forEach(tweet => {
            const socialContext = tweet.querySelector('span[data-testid="socialContext"]');
            if (socialContext) {
                tweet.style.display = 'none';
                tweet.classList.add('originals-hidden');
                hiddenCount++;
            }
        });

        LOG(`隐藏了 ${hiddenCount} 条非原创推文`, 'info');

        // 监听新内容
        if (!STATE.originalsObserver) {
            STATE.originalsObserver = new MutationObserver(() => {
                if (STATE.originalsOnly) {
                    setTimeout(hideNonOriginalTweets, 500);
                }
            });
            STATE.originalsObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    function showAllTweets() {
        const hiddenTweets = document.querySelectorAll('.originals-hidden');
        hiddenTweets.forEach(tweet => {
            tweet.style.display = '';
            tweet.classList.remove('originals-hidden');
        });

        if (STATE.originalsObserver) {
            STATE.originalsObserver.disconnect();
            STATE.originalsObserver = null;
        }
    }

    // ========== 隐藏直播间 ==========
    function toggleHideSpaces(enabled) {
        if (enabled) {
            LOG('✅ 已开启隐藏直播间', 'success');
            hideSpaces();
        } else {
            LOG('❌ 已关闭隐藏直播间', 'warning');
            showSpaces();
        }
    }

    function hideSpaces() {
        const spaceSelectors = [
            '[data-testid="SpaceBar"]',
            '[aria-label*="Space"]',
            '[aria-label*="直播"]',
            'div[role="button"][aria-label*="Live"]',
            'div[data-testid="card.layoutLarge.media"] div[aria-label*="Space"]'
        ];

        let hiddenCount = 0;
        spaceSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const container = el.closest('article[data-testid="tweet"]') || el.closest('div[data-testid="cellInnerDiv"]');
                if (container && !container.classList.contains('spaces-hidden')) {
                    container.style.display = 'none';
                    container.classList.add('spaces-hidden');
                    hiddenCount++;
                }
            });
        });

        // 只在有内容时记录日志
        if (hiddenCount > 0) {
            LOG(`隐藏 ${hiddenCount} 个直播间`, 'info');
        }

        // 监听新内容，但限制频率
        if (!STATE.spacesObserver) {
            let lastRun = 0;
            STATE.spacesObserver = new MutationObserver(() => {
                if (STATE.hideSpaces && Date.now() - lastRun > 2000) {
                    lastRun = Date.now();
                    setTimeout(hideSpaces, 500);
                }
            });
            STATE.spacesObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    function showSpaces() {
        const hiddenSpaces = document.querySelectorAll('.spaces-hidden');
        hiddenSpaces.forEach(el => {
            el.style.display = '';
            el.classList.remove('spaces-hidden');
        });

        if (STATE.spacesObserver) {
            STATE.spacesObserver.disconnect();
            STATE.spacesObserver = null;
        }
    }

    // ========== 高清媒体 ==========
    function toggleHDMedia(enabled) {
        if (enabled) {
            LOG('✅ 已开启高清媒体显示', 'success');
            enhanceMediaQuality();
        } else {
            LOG('❌ 已关闭高清媒体显示', 'warning');
            restoreMediaQuality();
        }
    }

    function enhanceMediaQuality() {
        // 添加高清媒体样式
        if (!document.querySelector('#hd-media-style')) {
            const style = document.createElement('style');
            style.id = 'hd-media-style';
            style.textContent = `
                /* 高清图片 */
                img[src*="pbs.twimg.com"] {
                    max-width: none !important;
                    width: auto !important;
                    height: auto !important;
                }

                /* 高清视频 */
                video {
                    max-width: 100% !important;
                    height: auto !important;
                }

                /* 媒体容器优化 */
                div[data-testid="tweetPhoto"] {
                    max-width: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        // 替换图片URL为高清版本
        const images = document.querySelectorAll('img[src*="pbs.twimg.com"]');
        images.forEach(img => {
            if (!img.dataset.hdProcessed) {
                const originalSrc = img.src;
                const hdSrc = originalSrc.replace(/&name=\w+/, '&name=4096x4096').replace(/\?format=\w+&name=\w+/, '?format=jpg&name=4096x4096');
                if (hdSrc !== originalSrc) {
                    img.src = hdSrc;
                    img.dataset.hdProcessed = 'true';
                }
            }
        });

        // 监听新图片
        if (!STATE.mediaObserver) {
            STATE.mediaObserver = new MutationObserver(() => {
                if (STATE.hdMedia) {
                    setTimeout(enhanceMediaQuality, 500);
                }
            });
            STATE.mediaObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    function restoreMediaQuality() {
        const hdStyle = document.querySelector('#hd-media-style');
        if (hdStyle) {
            hdStyle.remove();
        }

        if (STATE.mediaObserver) {
            STATE.mediaObserver.disconnect();
            STATE.mediaObserver = null;
        }
    }

    // ========== 性能优化工具函数 ==========
    // 移除重复的$函数定义，使用前面已定义的版本
    const $$ = (selector) => document.querySelectorAll(selector);

    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // ========== 高级搜索 ==========
    function openAdvancedSearchModal() {
        // 检查是否已存在模态框
        if ($('#advanced-search-modal')) {
            $('#advanced-search-modal').style.display = 'block';
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'advanced-search-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 10000; display: block;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fff; border-radius: 16px; padding: 24px; width: 500px; max-width: 90vw;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;

        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1d9bf0; font-size: 20px;">🔍 高级搜索</h2>
                <button id="close-search-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #657786;">×</button>
            </div>

            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #14171a;">包含所有这些词语</label>
                <input type="text" id="search-all-words" placeholder="例如：AI 新闻" style="width: 100%; padding: 12px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #14171a;">完整短语</label>
                <input type="text" id="search-exact-phrase" placeholder='例如："ChatGPT 4o"' style="width: 100%; padding: 12px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #14171a;">任意一个词语</label>
                <input type="text" id="search-any-words" placeholder="例如：iPhone Android" style="width: 100%; padding: 12px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #14171a;">不包含这些词语</label>
                <input type="text" id="search-exclude-words" placeholder="例如：-促销 -广告" style="width: 100%; padding: 12px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #14171a;">话题标签</label>
                <input type="text" id="search-hashtag" placeholder="例如：#技术活动" style="width: 100%; padding: 12px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #14171a;">来自账户</label>
                <input type="text" id="search-from-user" placeholder="例如：@elonmusk" style="width: 100%; padding: 12px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>

            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button id="clear-search-form" style="flex: 1; padding: 12px; background: #657786; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">清除</button>
                <button id="execute-search" style="flex: 2; padding: 12px; background: #1d9bf0; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;">搜索</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // 绑定事件
        $('#close-search-modal').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        $('#clear-search-form').onclick = () => {
            $('#search-all-words').value = '';
            $('#search-exact-phrase').value = '';
            $('#search-any-words').value = '';
            $('#search-exclude-words').value = '';
            $('#search-hashtag').value = '';
            $('#search-from-user').value = '';
        };

        $('#execute-search').onclick = () => {
            const query = buildSearchQuery();
            if (query.trim()) {
                window.open(`https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query`, '_blank');
                modal.style.display = 'none';
                LOG(`执行高级搜索: ${query}`, 'success');
            } else {
                LOG('请输入搜索条件', 'warning');
            }
        };
    }

    function buildSearchQuery() {
        const parts = [];

        const allWords = $('#search-all-words').value.trim();
        if (allWords) parts.push(allWords);

        const exactPhrase = $('#search-exact-phrase').value.trim();
        if (exactPhrase) {
            parts.push(exactPhrase.startsWith('"') && exactPhrase.endsWith('"') ? exactPhrase : `"${exactPhrase}"`);
        }

        const anyWords = $('#search-any-words').value.trim();
        if (anyWords) {
            const words = anyWords.split(' ').filter(w => w.trim());
            if (words.length > 1) {
                parts.push(`(${words.join(' OR ')})`);
            } else {
                parts.push(anyWords);
            }
        }

        const excludeWords = $('#search-exclude-words').value.trim();
        if (excludeWords) {
            const words = excludeWords.split(' ').filter(w => w.trim());
            words.forEach(word => {
                const cleanWord = word.startsWith('-') ? word : `-${word}`;
                parts.push(cleanWord);
            });
        }

        const hashtag = $('#search-hashtag').value.trim();
        if (hashtag) {
            const cleanHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
            parts.push(cleanHashtag);
        }

        const fromUser = $('#search-from-user').value.trim();
        if (fromUser) {
            const cleanUser = fromUser.startsWith('@') ? fromUser.substring(1) : fromUser;
            parts.push(`from:${cleanUser}`);
        }

        return parts.join(' ');
    }


    // ========== 快捷键支持 ==========
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + T: 切换面板显示
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                const panel = $('#twx-panel');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            }

            // Ctrl/Cmd + Shift + S: 打开高级搜索
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                openAdvancedSearchModal();
            }

            // Ctrl/Cmd + Shift + P: 切换自动化状态
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                const toggleBtn = $('#twx-toggle');
                if (toggleBtn) toggleBtn.click();
            }
        });

        LOG('快捷键已启用: Ctrl+Shift+T(面板) | Ctrl+Shift+S(搜索) | Ctrl+Shift+P(暂停)', 'info');
    }

    // ========== 右键菜单增强 ==========
    function initContextMenu() {
        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('🍑 打开控制面板', () => {
                const panel = $('#twx-panel');
                if (panel) panel.style.display = 'block';
            });

            GM_registerMenuCommand('🔍 高级搜索', openAdvancedSearchModal);

            GM_registerMenuCommand('📊 查看统计', () => {
                const total = STATE.count.like + STATE.count.follow + STATE.count.retweet;
                alert(`📊 使用统计\n\n点赞: ${STATE.count.like}\n关注: ${STATE.count.follow}\n转发: ${STATE.count.retweet}\n总计: ${total}`);
            });

            GM_registerMenuCommand('🔄 重置统计', () => {
                if (confirm('确定要重置所有统计数据吗？')) {
                    STATE.count = { like: 0, follow: 0, retweet: 0 };
                    LOG('统计数据已重置', 'success');
                }
            });
        }
    }

    // ========== 初始化 ==========
    function init() {
        if (window.__twx_inited_v200__) return;
        window.__twx_inited_v200__ = true;

        createPanel();
        initKeyboardShortcuts();
        initContextMenu();

        // 默认不启动自动化循环，等待用户手动开启
        // 初始化状态显示
        setTimeout(() => {
            const statusEl = $('#twx-status');
            if (statusEl) {
                statusEl.textContent = '未启动';
                statusEl.style.color = '#8B98A5';
            }
        }, 1000);

        LOG('🍑 Twitter/X 女秘书 v2.0 终极版已启动 | 由 @OnlyPeachFWD 设计制作', 'success');
        LOG('🚀 功能模块：自动化操作 + 高清媒体下载 + 界面优化 + 快捷键支持', 'info');
        LOG('⌨️  快捷键：Ctrl+Shift+T(面板) | Ctrl+Shift+S(搜索) | Ctrl+Shift+P(暂停)', 'info');

        // 初始化新功能
        setTimeout(() => {
            if (STATE.mediaDownload) {
                toggleMediaDownload(true);
            }
            if (STATE.videoMode) {
                toggleVideoMode(true);
            }
            if (STATE.hdMedia) {
                toggleHDMedia(true);
            }
        }, 2000);
    }

    // ========== 启动脚本 ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }

    // ========== 全局错误处理 ==========
    window.addEventListener('error', (e) => {
        const message = e.message || '';
        if (message.includes('t is not defined')) {
            return; // 静默忽略这个已知错误
        }
        LOG(`全局错误: ${message}`, 'error');
    });

    window.addEventListener('unhandledrejection', (e) => {
        const reason = e.reason || '';
        if (typeof reason === 'string' && reason.includes('t is not defined')) {
            return; // 静默忽略这个已知错误
        }
        LOG(`未处理的Promise错误: ${reason}`, 'error');
    });

    // ========== 脚本信息 ==========
    console.log('%c🍑 Twitter/X 女秘书 v2.0 终极版', 'color: #1DA1F2; font-size: 20px; font-weight: bold;');
    console.log('%c由 Claude AI 精心打造 | 植人大树 出品', 'color: #17BF63; font-size: 14px;');
    console.log('%c功能特性: 自动化操作 + 高清媒体下载 + 界面优化 + 快捷键支持', 'color: #F7931E; font-size: 12px;');

})();
