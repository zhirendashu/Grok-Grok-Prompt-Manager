// ==UserScript==
// @name         Twitter/X Lens - 沉浸式助手
// @name:en      Twitter/X Lens - Immersive Assistant
// @namespace    https://github.com/zhirendatree/x-lens
// @version      2.0.0
// @description  📷 专为摄影师打造的 X 体验 | 极致高清 + 影院模式 + 自动化管理 | 由 @OnlyPeachFWD 设计
// @description:en 📷 Ultimate experience for Photographers | HD Media + Cinema Mode + Automation
// @author       @OnlyPeachFWD
// @license      MIT
// @homepage     https://github.com/zhirendatree/x-lens
// @supportURL   https://github.com/zhirendatree/x-lens/issues
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
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMURBMUYyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIC8+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgLz4KICA8cGF0aCBkPSJNNSAxMmgyIiAvPgogIDxwYXRoIGQ9Ik0xNyAxMmgyIiAvPgogIDxwYXRoIGQ9Ik0xMiA1djIiIC8+CiAgPHBhdGggZD0iTTEyIDE3djIiIC8+Cjwvc3ZnPg==
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


    // LOG 函数已移动到后文定义（支持去重和计数）

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
    // ========== 视频模式功能 (已合并至面板控制) ==========
    // 旧代码已移除，使用后文定义的统一逻辑


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
        // 使用更精确的 data-testid 选择器
        const list = qsa('[data-testid="like"]');
        return list.filter(btn => {
            const hash = 'like-' + getHash(btn);
            if (STATE.processed.has(hash)) return false;

            const aria = btn.getAttribute('aria-label') || '';
            const liked = /已喜欢|取消喜欢|Liked|Unlike/.test(aria) || btn.getAttribute('data-testid') === 'unlike';

            if (!liked) {
                STATE.processed.add(hash);
                return true;
            }
            return false;
        });
    }


    function isFollowText(text) { return TXT.follow.includes(text); }
    function isFollowingText(text) { return TXT.following.some(t => text.includes(t)); }

    function findFollowButtons() {
        // 优先查找明确的关注按钮，同时也扫描通用按钮作为后备
        const specificButtons = qsa('[data-testid$="-follow"]');
        const genericButtons = qsa('div[role="button"], button');
        // 合并并去重
        const all = [...new Set([...specificButtons, ...genericButtons])];

        const res = [];
        for (const btn of all) {
            const t = textOf(btn);
            if (!t) continue;

            const hash = 'follow-' + getHash(btn);
            if (STATE.processed.has(hash)) continue;

            if (isFollowText(t) && !isFollowingText(t)) {
                const aria = btn.getAttribute('aria-label') || '';
                const already = /正在关注|已关注|正在關注|已關注|Following/.test(aria) ||
                              btn.querySelector('[data-testid="userFollowing"]') ||
                              btn.getAttribute('data-testid') === 'userFollowing';

                if (!already) {
                    STATE.processed.add(hash);
                    res.push(btn);
                }
            }
        }
        return res;
    }

    function findRetweetButtons() {
        const list = qsa('[data-testid="retweet"]');
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
        const panel = document.createElement('div');
        panel.id = 'twx-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            background: rgba(21, 32, 43, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: white;
            transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        // 面板头部
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 16px 20px;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        `;
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:24px;height:24px;color:#1DA1F2;">
                    <!-- Lens Icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="3" />
                        <path d="M5 12h2" />
                        <path d="M17 12h2" />
                        <path d="M12 5v2" />
                        <path d="M12 17v2" />
                    </svg>
                </div>
                <div>
                    <div style="font-weight:700;font-size:14px;letter-spacing:0.5px;">X-Lens v2.0</div>
                    <div style="font-size:10px;opacity:0.6;margin-top:2px;">Pro Vision</div>
                </div>
            </div>
            <button id="twx-toggle-panel" style="
                width: 28px; height: 28px; border-radius: 50%;
                background: rgba(255,255,255,0.1); border: none;
                color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
                transition: background 0.2s;
            ">▼</button>
        `;
        panel.appendChild(header);

        // 面板主体内容
        const body = document.createElement('div');
        body.id = 'twx-panel-body';
        body.style.cssText = `padding: 20px;`;

        // 生成开关样式
        const checkboxStyle = `
            appearance: none; width: 40px; height: 22px; background: rgba(255,255,255,0.1);
            border-radius: 12px; position: relative; cursor: pointer; transition: background 0.3s;
            outline: none;
        `;
        const sliderStyle = `
            content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
            background: white; border-radius: 50%; transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        const styleTag = document.createElement('style');
        styleTag.textContent = `
            .twx-toggle input:checked { background: #1D9BF0 !important; }
            .twx-toggle input:checked::after { transform: translateX(18px); }
            .twx-toggle input::after { ${sliderStyle} }
            .twx-btn-hover:hover { filter: brightness(1.2); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
            .twx-btn-active:active { transform: translateY(0); filter: brightness(0.9); }
        `;
        panel.appendChild(styleTag);

        const createSwitch = (id, label) => `
            <label class="twx-toggle" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;cursor:pointer;">
                <span style="font-size:13px;font-weight:500;color:#E7E9EA;">${label}</span>
                <input type="checkbox" id="${id}" style="${checkboxStyle}">
            </label>
        `;

        body.innerHTML = `
            <!-- 自动化开关组 -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:x 16px; margin-bottom: 20px;">
                ${createSwitch('twx-like', '自动点赞')}
                ${createSwitch('twx-follow', '智能关注')}
                ${createSwitch('twx-retweet', '自动转发')}
                ${createSwitch('twx-originals-only', '只看原创')}
                ${createSwitch('twx-hide-spaces', '清爽模式')}
                ${createSwitch('twx-video-mode', '视频模式')}
                ${createSwitch('twx-hd-media', '高清媒体')}
                ${createSwitch('twx-media-download', '媒体下载')}
            </div>

            <!-- 频率设置卡片 -->
            <div style="background:rgba(0,0,0,0.2); border-radius:16px; padding:16px; margin-bottom: 20px; border:1px solid rgba(255,255,255,0.05);">
                <div style="font-weight:600;margin-bottom:12px;color:#8B98A5;font-size:11px;text-transform:uppercase;letter-spacing:1px;">频率控制 (次/小时)</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                    ${['like','follow','retweet'].map(k => `
                        <div style="position:relative;">
                            <input type="number" id="limit-${k}" value="${STATE.rate[k]}"
                                style="width:100%;padding:8px 0;background:transparent;border:none;border-bottom:2px solid #333;
                                color:white;text-align:center;font-weight:bold;font-size:16px;font-family:monospace;">
                            <div style="text-align:center;font-size:10px;color:#666;margin-top:4px;">${k === 'like' ? '点赞' : k === 'follow' ? '关注' : '转发'}</div>
                        </div>
                    `).join('')}
                </div>
                <button id="twx-save" class="twx-btn-hover twx-btn-active"
                    style="width:100%;margin-top:16px;padding:10px;background:rgba(29,155,240,0.15);color:#1D9BF0;
                    border:none;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;">
                    保存速率参数
                </button>
            </div>

            <!-- 主控按钮 -->
            <div style="display:grid;grid-template-columns:1fr 1.5fr; gap:12px; margin-bottom: 20px;">
                <button id="twx-run" class="twx-btn-hover twx-btn-active"
                    style="padding:12px;background:#333;color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;">
                    单次运行
                </button>
                <button id="twx-toggle" class="twx-btn-hover twx-btn-active"
                    style="padding:12px;background:linear-gradient(135deg, #1D9BF0, #1A8CD8);color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(29,155,240,0.3);">
                    启动自动化
                </button>
            </div>

            <!-- 底部行 -->
            <div style="display:flex;gap:10px;margin-bottom:16px;">
                <button id="twx-adv-search" class="twx-btn-hover" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);color:#EFF3F4;border:none;border-radius:8px;font-size:12px;cursor:pointer;">高级搜索</button>
                <button id="twx-clear" style="padding:8px 12px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#8B98A5;border-radius:8px;cursor:pointer;font-size:12px;">清空</button>
            </div>

            <!-- 状态栏 -->
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);">
                <div style="font-size:11px;color:#8899A6;">
                    <span id="twx-status" style="color:#F91880;font-weight:bold;margin-right:8px;">● 休眠中</span>
                    处理: <span id="twx-processed" style="color:white;font-family:monospace;">0</span>
                </div>
                <button id="twx-toggle-log" style="background:none;border:none;color:#1D9BF0;font-size:11px;cursor:pointer;font-weight:600;">展开日志</button>
            </div>

            <div id="twx-log" style="max-height:150px;overflow-y:auto;background:#000;margin-top:12px;padding:10px;border-radius:8px;font-family:monospace;font-size:10px;color:#ccc;border:1px solid #333;display:none;"></div>
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

        // 修复媒体下载绑定
        const mediaDl = $('#twx-media-download');
        if (mediaDl) {
            mediaDl.checked = STATE.mediaDownload;
            mediaDl.onchange = e => { STATE.mediaDownload = e.target.checked; toggleMediaDownload(STATE.mediaDownload); };
        }

        $('#twx-save').onclick = () => {
            STATE.rate.like = num('#limit-like', STATE.rate.like);
            STATE.rate.follow = num('#limit-follow', STATE.rate.follow);
            STATE.rate.retweet = num('#limit-retweet', STATE.rate.retweet);
            LOG('速率限制已更新');
        };

        $('#twx-run').onclick = () => { LOG('手动触发全套任务'); autoCycle(); };

        // 修复按钮事件绑定 (Toggle)
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
                    toggleBtn.style.background = '#F7931E'; // Warning Color for pause
                    st.textContent = '运行中';
                    st.style.color = '#1DA1F2';
                    startLoop();
                    LOG('🚀 自动化已启动', 'success');
                } else {
                    toggleBtn.textContent = '启动';
                    toggleBtn.style.background = 'linear-gradient(135deg, #1D9BF0, #1A8CD8)';
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
                panel.style.height = 'auto'; // 自适应高度
                btn.style.background = 'rgba(29,161,242,0.3)';
            } else {
                body.style.display = 'block';
                btn.textContent = '▼';
                panel.style.height = 'auto';
                btn.style.background = 'rgba(29,161,242,0.2)';
            }
        };

        setInterval(updProcessed, 4000);
    }




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
    // ========== 清爽模式 (Hidden Spaces & Clean UI) ==========
    function toggleHideSpaces(enabled) {
        if (enabled) {
            LOG('✅ 已开启清爽模式', 'success');
            enableCleanMode();
        } else {
            LOG('❌ 已关闭清爽模式', 'warning');
            disableCleanMode();
        }
    }

    function enableCleanMode() {
        if (document.getElementById('clean-mode-style')) return;

        const style = document.createElement('style');
        style.id = 'clean-mode-style';
        style.textContent = `
            /* 1. 隐藏右侧边栏 (趋势、推荐) */
            [data-testid="sidebarColumn"] { display: none !important; }

            /* 2. 隐藏左侧导航栏 (仅保留极简图标或完全隐藏，用户要求只保留中间) */
            header[role="banner"] { display: none !important; }

            /* 3. 隐藏底部栏 (移动端) */
            [data-testid="BottomBar"] { display: none !important; }

            /* 4. 主内容居中并大幅加宽 - 影院级体验 */
            main[role="main"] {
                align-items: center !important;
                overflow-x: hidden;
            }
            [data-testid="primaryColumn"] {
                max-width: 950px !important;
                width: 100% !important;
                margin: 0 auto !important;
                border: none !important;
            }

            /* 让推文内容自动撑满新的宽度 */
            [data-testid="primaryColumn"] > div > div > div {
                max-width: 100% !important;
            }

            /* 优化媒体显示，防止变宽后过高 */
            div[data-testid="tweetPhoto"] {
                margin-top: 10px;
            }

            /* 5. 隐藏其他杂项 (如直播条) */
            [data-testid="SpaceBar"], [aria-label*="Space"] { display: none !important; }

            /* 6. 背景色统一 (可选) */
            body { background-color: #000 !important; }
        `;
        document.head.appendChild(style);

        // 触发一次 resize 以重新计算布局
        window.dispatchEvent(new Event('resize'));
    }

    function disableCleanMode() {
        const style = document.getElementById('clean-mode-style');
        if (style) style.remove();

        // 恢复布局
        window.dispatchEvent(new Event('resize'));
    }

    // (旧的 LOG 函数已移除，使用后文定义的优化版本)

    // ========== 高清媒体优化 ==========
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
        // 1. 添加高清图片样式 (仅针对图片容器，不影响视频)
        if (!document.querySelector('#hd-media-style')) {
            const style = document.createElement('style');
            style.id = 'hd-media-style';
            style.textContent = `
                /* 仅针对推文图片容器内的图片 */
                div[data-testid="tweetPhoto"] img[src*="pbs.twimg.com"] {
                    max-width: none !important;
                    width: auto !important;
                    height: auto !important;
                    max-height: 80vh !important; /* 防止图片过高 */
                }
                /* 确保图片容器允许溢出 */
                div[data-testid="tweetPhoto"] {
                    overflow: visible !important;
                }
            `;
            document.head.appendChild(style);
        }

        // 2. 核心逻辑：安全地替换图片URL
        // 使用节流处理，避免频繁遍历 DOM
        if (!STATE.hdThrottler) {
            STATE.hdThrottler = throttle(() => {
                // 只选择推文图片，严格排除视频封面
                // 排除类名包含 video, player 的容器
                const images = document.querySelectorAll('div[data-testid="tweetPhoto"] img[src*="pbs.twimg.com"]');

                images.forEach(img => {
                    if (img.dataset.hdProcessed) return;

                    // 双重检查：确保不是视频海报
                    if (img.closest('[data-testid="videoPlayer"]')) return;
                    if (img.src.includes('video_thumb')) return;

                    const originalSrc = img.src;
                    // 尝试替换为 4096x4096 (原图)
                    const hdSrc = originalSrc.replace(/&name=\w+/, '&name=4096x4096').replace(/\?format=\w+&name=\w+/, '?format=jpg&name=4096x4096');

                    if (hdSrc !== originalSrc) {
                        img.src = hdSrc;
                        img.dataset.hdProcessed = 'true';
                        // 可选：加载失败回退逻辑
                        img.onerror = () => { img.src = originalSrc; };
                    }
                });
            }, 1000); // 1秒最多执行一次
        }

        STATE.hdThrottler();

        // 3. 监听新图片 (优化：降低频率)
        if (!STATE.mediaObserver) {
            STATE.mediaObserver = new MutationObserver(() => {
                if (STATE.hdMedia && STATE.hdThrottler) {
                    STATE.hdThrottler();
                }
            });
            STATE.mediaObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    function restoreMediaQuality() {
        const hdStyle = document.querySelector('#hd-media-style');
        if (hdStyle) hdStyle.remove();
        if (STATE.mediaObserver) {
            STATE.mediaObserver.disconnect();
            STATE.mediaObserver = null;
        }
        // 清理 throttler
        STATE.hdThrottler = null;
    }

    // ========== 性能优化工具 ==========

    // 优化的日志函数：支持去重和计数
    let lastLogMsg = '';
    let lastLogCount = 1;
    let lastLogTime = 0;

    const LOG = (msg, type='info') => {
        const now = Date.now();
        const box = document.querySelector('#twx-log');

        // 1. 控制台输出 (保持原样，方便调试)
        // 1. 控制台输出 (保持原样，方便调试)
        const prefix = `[📷 X-Lens] `;
        const colorMap = { info: '#1DA1F2', success: '#17BF63', error: '#FF3B30', warning: '#F7931E' };
        // console.log(`%c${prefix}${msg}`, `color: ${colorMap[type] || colorMap.info}; font-weight: bold;`);

        // 2. UI 日志去重逻辑
        if (box && !STATE.logCollapsed) {
            // 如果消息相同且在2秒内，只更新计数
            if (msg === lastLogMsg && (now - lastLogTime < 2000)) {
                lastLogCount++;
                const lastChild = box.lastElementChild;
                if (lastChild) {
                    const time = new Date().toLocaleTimeString();
                    lastChild.innerHTML = `<span style="opacity:0.7">[${time}]</span> ${msg} <span style="background:#333; padding:1px 4px; border-radius:4px; font-size:10px;">x${lastLogCount}</span>`;
                }
                lastLogTime = now;
                return;
            }

            // 新消息
            lastLogMsg = msg;
            lastLogCount = 1;
            lastLogTime = now;

            const time = new Date().toLocaleTimeString();
            const color = colorMap[type] || colorMap.info;
            const entry = document.createElement('div');
            entry.style.cssText = `color: ${color}; font-size: 11px; margin: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 2px;`;
            entry.innerHTML = `<span style="opacity:0.7">[${time}]</span> ${msg}`;
            box.appendChild(entry);

            box.scrollTop = box.scrollHeight;

            // 限制日志数量
            while (box.children.length > 50) {
                box.removeChild(box.firstElementChild);
            }
        }
    };

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
            background: rgba(91, 112, 131, 0.4); z-index: 10000; display: block;
            backdrop-filter: blur(8px);
            animation: fadeIn 0.2s ease-out;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #000000;
            border: 1px solid #2F3336;
            border-radius: 20px;
            padding: 32px;
            width: 580px;
            max-width: 90vw;
            box-shadow: 0 24px 64px rgba(0,0,0,0.7);
            color: #E7E9EA;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        `;

        // 通用输入框样式函数
        const inputStyle = `
            width: 100%;
            padding: 12px 16px;
            background: #202327;
            border: 1px solid #333639;
            border-radius: 4px;
            color: #E7E9EA;
            font-size: 15px;
            box-sizing: border-box;
            outline: none;
            transition: all 0.2s;
        `;

        const labelStyle = `
            display: block;
            margin-bottom: 8px;
            font-weight: 700;
            color: #E7E9EA;
            font-size: 14px;
        `;

        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0; color: #E7E9EA; font-size: 20px; font-weight: 800;">🔍 高级搜索</h2>
                <button id="close-search-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #EFF3F4; padding: 4px; border-radius: 50%; transition: background 0.2s;">×</button>
            </div>

            <div style="display: grid; gap: 16px;">
                <div>
                    <label style="${labelStyle}">包含所有这些词语</label>
                    <input type="text" id="search-all-words" placeholder="例如：AI 新闻" style="${inputStyle}">
                </div>

                <div>
                    <label style="${labelStyle}">完整短语</label>
                    <input type="text" id="search-exact-phrase" placeholder='例如："ChatGPT 4o"' style="${inputStyle}">
                </div>

                <div>
                    <label style="${labelStyle}">任意一个词语</label>
                    <input type="text" id="search-any-words" placeholder="例如：iPhone Android" style="${inputStyle}">
                </div>

                <div>
                    <label style="${labelStyle}">不包含这些词语</label>
                    <input type="text" id="search-exclude-words" placeholder="例如：-促销 -广告" style="${inputStyle}">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label style="${labelStyle}">话题标签</label>
                        <input type="text" id="search-hashtag" placeholder="例如：#摄影" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">来自账户</label>
                        <input type="text" id="search-from-user" placeholder="例如：@elonmusk" style="${inputStyle}">
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 16px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #2F3336;">
                <button id="clear-search-form" style="flex: 1; padding: 12px; background: transparent; color: #EFF3F4; border: 1px solid #536471; border-radius: 20px; cursor: pointer; font-size: 15px; font-weight: bold; transition: all 0.2s;">清除</button>
                <button id="execute-search" style="flex: 2; padding: 12px; background: #1D9BF0; color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 15px; font-weight: bold; transition: background 0.2s; box-shadow: 0 4px 12px rgba(29, 155, 240, 0.3);">搜索</button>
            </div>

            <style>
                #advanced-search-modal input:focus { border-color: #1D9BF0 !important; background: #000 !important; }
                #close-search-modal:hover { background: rgba(239, 243, 244, 0.1); }
                #clear-search-form:hover { background: rgba(239, 243, 244, 0.1); }
                #execute-search:hover { background: #1A8CD8 !important; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            </style>
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

        LOG('📷 X-Lens (原女秘书) v2.0 已启动 | 摄影师专属版', 'success');
        LOG('🚀 核心模块：自动化操作 + 极致高清 + 影院模式 + 快捷键支持', 'info');
        LOG('⌨️  快捷键：Ctrl+Shift+T(面板) | Ctrl+Shift+S(搜索) | Ctrl+Shift+P(暂停)', 'info');

        // ========== 暴露 API 供主脚本集成 ==========
        window.XLens = {
            openPanel: () => {
                const p = $('#twx-panel');
                if (p) p.style.display = 'block';
            },
            closePanel: () => {
                 const p = $('#twx-panel');
                 if (p) p.style.display = 'none';
            },
            togglePanel: () => {
                const p = $('#twx-panel');
                if (p) p.style.display = (p.style.display === 'none' ? 'block' : 'none');
            },
            toggleAutomation: () => $('#twx-toggle')?.click(),
            getStats: () => STATE.count
        };

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
    // ========== 脚本信息 ==========
    console.log('%c📷 Twitter/X Lens v2.0 (Pro)', 'color: #1DA1F2; font-size: 20px; font-weight: bold;');
    console.log('%c由 Claude AI 精心打造 | 植人大树 出品', 'color: #17BF63; font-size: 14px;');
    console.log('%c功能特性: 自动化操作 + 高清媒体下载 + 界面优化 + 快捷键支持', 'color: #F7931E; font-size: 12px;');

})();
