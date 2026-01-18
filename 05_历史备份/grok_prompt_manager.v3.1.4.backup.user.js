// ==UserScript==
// @name         植人大树 Prompt Manager 3.0
// @namespace    http://tampermonkey.net/
// @version      3.1.4
// @description  The Next-Gen Prompt Manager for Grok. Glassmorphism UI, Smart Templates, and Cloud Sync.
// @author       AntiGravity
// @match        https://grok.com/*
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/**
 * 📜 Changelog
 * v3.0.1 (2026-01-12):
 * - Baseline established.
 * - Version bump to 3.0.1 to allow strict versioning.
 *
 * v3.0.2 (2026-01-12):
 * - Fix: Modifiers (Tags) now follow the same smart insertion logic as prompts.
 *   (Insert to Input if draft closed / Insert to Draft if draft open)
 *
 * v3.0.3 (2026-01-12):
 * - Feat: Restored panel state persistence (Size & Position).
 * - Panels now remember their last position and size after reload.
 * - Added storage size monitoring (Log warning if > 4MB).
 *
 * v3.0.6 (2026-01-12):
 * - Feat: Integrated "Prompt Inspector" (Sniffer) functionality.
 * - Inspect original tags, prompts, and remix history directly on image cards.
 * - Stores prompt data locally via API fetch interception.
 *
 * v3.1.0/v3.1.1 (2026-01-13):
 * - Feat: Integrated Auto Retry & Auto Fix independently for Video Panel.
 * - Feat: Independent Quick Tags (Modifiers) for Image vs Video panels.
 * - Feat: Auto-hide panels on Favorites page for clean gallery view.
 * - UX: Smart Layout - Preview Windows and Auto Retry Panel now intelligently pop out to the left to avoid screen overflow.
 * - UX: Refined tooltip behaviors and visual alignment.
 *
 * v3.1.3 (2026-01-14):
 * - Fix: Restored "Image Inspector" (✦) button on image cards by user request.
 * - UX: Removed explicit "Edit" button from list items to reduce clutter (Edit accessible via Right-Click).
 * - UX: Clarified "Paste Import" instructions to support Tab-separated values and double line breaks.
 *
 * v3.1.4 (2026-01-14):
 * - Feat: Added "Right-Click to Rename" for Library Selector.
 * - Feat: Added Category Management (Add/Import/Export) buttons to the category bar.
 * - Feat: Auto-expand "Inspector" panel on Post Detail pages.
 * - UX: Standardized "Paste Import" description to Chinese format.
 */

(function () {
    'use strict';

    // ✨ SELF-EXCLUSION: Do not run UI in the Assist Popup
    if (window.name === 'GrokAssist') {
        console.log('[GPM] Running in Assist Mode - UI Disabled');
        return;
    }

    // --- CONSTANTS ---
    const DB_KEY = 'grok_v2_data';
    const OLD_DB_KEY = 'grok_prompt_manager_data';
    const APP_ID = 'grok-prompt-manager-v2';

    // --- PROMPT INSPECTOR STORE & HOOK ---
    const GLOBAL_POST_STORE = {};

    // 🔥 Fetch Hook - Intercept API requests to cache Prompt data
    // NOTE: Must use unsafeWindow because we are in a sandbox (GM_ grants)
    const originalFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = async function (...args) {
        // console.log('[GPM-Hook] Fetch:', args[0]); // Optional spam log
        const res = await originalFetch.apply(this, args);
        try {
            const url = args[0]?.toString() || '';
            if (url.includes('/rest/media/post')) {
                console.log('[GPM-Hook] Captured Post API:', url);
            }
            // ✅ list page
            if (url.includes('/rest/media/post/list')) {
                res.clone().json().then(data => {
                    data.posts?.forEach(post => {
                        GLOBAL_POST_STORE[post.id] = post;
                        if (post.originalPostId) GLOBAL_POST_STORE[post.originalPostId] = post;
                        post.childPosts?.forEach(child => GLOBAL_POST_STORE[child.id] = post);
                    });
                }).catch(() => { });
            }
            // ✅ post detail page
            if (url.includes('/rest/media/post/get')) {
                res.clone().json().then(data => {
                    if (data?.post?.id) {
                        GLOBAL_POST_STORE[data.post.id] = data.post;
                        if (data.post.originalPostId && data.post.originalPost) {
                            GLOBAL_POST_STORE[data.post.originalPostId] = data.post.originalPost;
                        }
                    }
                }).catch(() => { });
            }
        } catch (e) {
            console.error('[GPM] Fetch hook error:', e);
        }
        return res;
    };

    // --- ICONS & ASSETS ---
    // User can replace these SVG strings to customize icons.
    const ICON_SET = {
        // Toolbar Icons - "Neo-Glass / Cyber-Line" Style
        AddLib: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="11" x2="12" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="14" x2="15" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
        DelLib: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" stroke-width="2"/><line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" stroke-width="2"/></svg>`,
        Import: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="7 10 12 15 17 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
        Paste: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
        Export: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="17 8 12 3 7 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
        Backup: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="3" width="22" height="5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><line x1="10" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
        Draft: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><path d="M12 20h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

        // Action Icons
        Sort: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 15l3 3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 6v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        AddPrompt: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
        PreviewToggle: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,

        // Window Control
        Minimize: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,

        // Auto Retry (formerly AI Assist)
        AiAssist: `<svg class="gpm-svg-icon" viewBox="0 0 24 24"><path d="M23 4v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 20v-6h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    };

    // --- ICONS (Base64) ---
    const APP_ICON_BASE64 = `data:image/png;base64,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`;

    // --- HELPER CLASSES ---

    /**
     * 🕵️‍♂️ Grok Prompt Inspector (Sniffer)
     * Handles UI injection and Prompt Panel rendering on image cards.
     */
    class GrokPromptInspector {
        constructor() {
            this.activePanel = null;
            this.hoverTimer = null;
        }

        init() {
            console.log('[GPM] Initializing Prompt Inspector...');
            this.waitForBody();
        }

        waitForBody() {
            if (!document.body) {
                return setTimeout(() => this.waitForBody(), 50);
            }
            const observer = new MutationObserver(() => this.injectUI());
            observer.observe(document.body, { childList: true, subtree: true });
            this.injectUI();
        }

        isImaginePage() {
            return location.pathname === '/imagine' || location.pathname.startsWith('/imagine/');
        }

        isPublicImagineImage(src) {
            if (!src) return false;
            return src.includes('xai-images-public');
        }

        extractPostIdFromCard(card) {
            const media = card.querySelector('img, video');
            if (!media) return null;

            const src = media.src || media.poster;
            if (!src) return null;

            // 🟢 imagine-public (share-images / share-videos)
            if (this.isImaginePage() && src.includes('imagine-public')) {
                let m = src.match(/\/([0-9a-fA-F-]{36})\.(jpg|png|webp|mp4)(\?|$)/);
                if (m) return m[1];
                m = src.match(/\/share-(images|videos)\/([0-9a-fA-F-]{36})_thumbnail\.(jpg|png|webp)(\?|$)/);
                if (m) return m[2];
            }

            // 🔵 grok assets (legacy)
            let m2 = src.match(/\/([0-9a-fA-F-]{36})\/(content|preview_image|generated_video)/);
            if (m2) return m2[1];

            // 🆕 grok assets (generated/{id}/preview_image.jpg)
            m2 = src.match(/\/generated\/([0-9a-fA-F-]{36})\/preview_image\.(jpg|png|webp)(\?|$)/);
            if (m2) return m2[1];

            return null;
        }

        formatTime(iso) {
            if (!iso) return 'unknown time';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return 'unknown time';
            return d.toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        }

        renderPromptBlock(title, text, time, postId) {
            if (!text) return '';
            const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `
              <div style="margin-top:6px; padding:8px; border-radius:10px; background:rgba(255,255,255,0.06);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <div style="font-size:11px; opacity:.8;">
                    <b>${title}</b>
                    ${time ? `<span style="margin-left:6px;">· ${this.formatTime(time)}</span>` : ''}
                  </div>
                </div>
                <pre style="white-space:pre-wrap; margin:0; font-size:12px;">${escapedText}</pre><br/>
                <div style="display:flex;gap:6px;">
                    <button data-copy="${encodeURIComponent(text)}" style="
                        font-size:11px; padding:4px 6px; border-radius:6px; background:#222;
                        color:#fff; border:1px solid rgba(255,255,255,.15); cursor:pointer;
                    ">📋 Copy</button>
                    ${postId ? `<button data-open="${postId}" style="
                        font-size:11px; padding:4px 6px; border-radius:6px; background:#222;
                        color:#fff; border:1px solid rgba(255,255,255,.15); cursor:pointer;
                    ">🔗 Open</button>` : ''}
                </div>
              </div>`;
        }

        scheduleClosePanel() {
            clearTimeout(this.hoverTimer);
            this.hoverTimer = setTimeout(() => this.closeExistingPanel(), 150);
        }

        closeExistingPanel() {
            if (this.activePanel) {
                this.activePanel.remove();
                this.activePanel = null;
            }
        }

        openPanel(card) {
            clearTimeout(this.hoverTimer);
            this.closeExistingPanel();

            const postId = this.extractPostIdFromCard(card);
            if (!postId) {
                console.warn('[GPM] Could not extract Post ID from card');
                return;
            }

            const post = GLOBAL_POST_STORE[postId];
            console.log(`[GPM] Inspecting ${postId}:`, post ? 'Found' : 'MISSING', post);

            if (!post) {
                console.warn('[GPM] Data miss. Store size:', Object.keys(GLOBAL_POST_STORE).length);
                return;
            }

            // Build Content
            let html = '<div style="font-size:13px; font-weight:600; margin-bottom:6px;">📸 Prompt Inspector</div>';

            // Original
            if (post.originalPrompt || post.text) {
                html += this.renderPromptBlock('✨ Original Prompt', post.originalPrompt || post.text, post.createdAt, post.originalPostId || post.id);
            }
            // Remix
            if (post.remixPrompts?.length > 0) {
                post.remixPrompts.forEach((remix, i) => {
                    html += this.renderPromptBlock(`🎨 Remix #${i + 1}`, remix.prompt, remix.createdAt, remix.postId);
                });
            } else if (!post.originalPrompt && !post.text) {
                html = '<div style="opacity:0.6; font-size:12px;">No prompt data available</div>';
            }

            const panel = document.createElement('div');
            panel.className = 'prompt-inspector-panel';
            panel.innerHTML = html;
            Object.assign(panel.style, {
                position: 'absolute', top: '40px', left: '0', zIndex: 10000,
                background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
                color: '#fff', padding: '12px', borderRadius: '12px',
                maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'auto'
            });

            // Events
            panel.addEventListener('mouseenter', () => {
                clearTimeout(this.hoverTimer);
                card.style.pointerEvents = 'none'; // Prevent card click
            });
            panel.querySelectorAll('[data-copy]').forEach(btn => {
                btn.onclick = e => {
                    const text = decodeURIComponent(btn.dataset.copy);
                    navigator.clipboard.writeText(text).then(() => {
                        const orig = btn.textContent;
                        btn.textContent = '✅';
                        setTimeout(() => { btn.textContent = orig; }, 1000);
                    });
                    e.stopImmediatePropagation();
                };
            });
            panel.querySelectorAll('[data-open]').forEach(btn => {
                btn.onclick = e => {
                    window.open(`https://grok.com/imagine/post/${btn.dataset.open}`, '_blank');
                    e.stopImmediatePropagation();
                };
            });
            panel.addEventListener('mouseleave', () => {
                card.style.pointerEvents = '';
                this.scheduleClosePanel();
            });

            card.style.position = 'relative';
            card.appendChild(panel);
            this.activePanel = panel;
        }

        injectUI() {
            const cards = document.querySelectorAll('[role="listitem"] .group\\/media-post-masonry-card');
            cards.forEach(card => {
                if (card.querySelector('.prompt-inspector-btn')) return;

                const media = card.querySelector('img, video');
                if (!media) return;
                const src = media.src || media.poster;
                if (!src) return;
                if (this.isPublicImagineImage(src)) return; // Skip public/shared

                const btn = document.createElement('button');
                btn.className = 'prompt-inspector-btn';
                btn.textContent = '✦';
                Object.assign(btn.style, {
                    position: 'absolute', top: '8px', left: '8px', zIndex: 50,
                    background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '999px',
                    width: '32px', height: '32px', cursor: 'pointer', pointerEvents: 'auto',
                    border: 'none', fontSize: '16px'
                });

                btn.addEventListener('mouseenter', (e) => {
                    e.stopPropagation();
                    this.openPanel(card);
                });
                btn.addEventListener('mouseleave', () => this.scheduleClosePanel());

                card.style.position = 'relative';
                card.appendChild(btn);
            });

            // Post Detail Page
            if (location.pathname.startsWith('/imagine/post/')) {
                this.injectPostDetailUI();
            }
        }

        injectPostDetailUI() {
            const container = document.querySelector('.group.relative.mx-auto.rounded-2xl.overflow-hidden');
            if (!container || container.querySelector('.prompt-inspector-btn')) return;

            const btn = document.createElement('button');
            btn.className = 'prompt-inspector-btn';
            btn.textContent = '✦';
            Object.assign(btn.style, {
                position: 'absolute', top: '12px', left: '12px', zIndex: 9999,
                background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '999px',
                width: '32px', height: '32px', cursor: 'pointer', border: 'none', fontSize: '16px'
            });

            btn.addEventListener('mouseenter', () => this.openPanel(container));
            btn.addEventListener('mouseleave', () => this.scheduleClosePanel());

            container.style.position = 'relative';
            container.appendChild(btn);
        }
    }

    /**
     * StorageService: Handles Data Persistence & Migration
     */
    class StorageService {
        constructor() {
            this.data = this.load();
        }

        load() {
            // 1. Try loading v2 data (GM storage)
            let v2Data = GM_getValue(DB_KEY, null);
            if (v2Data) return JSON.parse(v2Data);

            // 1.5 ✨ RECOVERY: Check LocalStorage Mirror (Fixes new script instance data loss)
            try {
                const mirror = localStorage.getItem('GPM_V2_MIRROR');
                if (mirror) {
                    console.log('[GPM] ♻️ Found LocalStorage mirror! Restoring data...');
                    const restored = JSON.parse(mirror);
                    GM_setValue(DB_KEY, mirror); // Sync to new GM instance
                    return restored;
                }
            } catch (e) {
                console.error('[GPM] Failed to restore from mirror:', e);
            }

            // 2. Fallback: Try loading v0.19 data and migrate
            let oldData = GM_getValue(OLD_DB_KEY, null);
            if (oldData) {
                console.log('[GPM] Migrating data from v0.19...');
                return this.migrate(JSON.parse(oldData));
            }

            // 3. New User: Return Schema
            return this.defaultSchema();
        }

        defaultSchema() {
            return {
                version: '2.0',
                settings: {
                    theme: 'glass', // 'glass' | 'dark' | 'light'
                    panels: {
                        left: { collapsed: false, visible: false, width: 300, height: 700, top: 80, left: 20 },
                        right: { collapsed: false, visible: false, width: 300, height: 700, top: 80, right: 20 },
                        bottom: { visible: false, x: 0, y: 0, width: 600, height: 200 }
                    }
                },
                libraries: [
                    {
                        id: 'default',
                        name: '📚 默认库 (Default)',
                        prompts: [{ "id": 1701234567890, "name": "赛博朋克未来城市夜景", "content": "A futuristic cyberpunk city at night, neon lights reflecting on wet streets, flying cars in the distance, cinematic composition", "category": "Cyberpunk", "pinned": false, "type": "text" }, { "id": 1701234567891, "name": "柔光人像摄影", "content": "Portrait of a young woman with flowing hair, soft natural lighting, bokeh background, professional photography style", "category": "Portrait", "pinned": true, "type": "text" }, { "id": 1701234567892, "name": "史诗级奇幻巨龙", "content": "A majestic dragon flying over snow-capped mountains, epic fantasy scene, dramatic clouds, golden hour lighting", "category": "Fantasy", "pinned": false, "type": "text" }, { "id": 1701234567893, "name": "北欧简约室内设计", "content": "Minimalist modern interior design, Scandinavian style, natural wood furniture, large windows with city view", "category": "Interior Design", "pinned": false, "type": "text" }, { "id": 1701234567894, "name": "皮克斯风格卡通角色", "content": "Cute cartoon character, 3D render, Pixar style, colorful and cheerful, white background", "category": "Cartoon", "pinned": false, "type": "text" }, { "id": 1701234567895, "name": "复古胶片街拍", "content": "Vintage film photography aesthetic, grainy texture, warm tones, nostalgic mood, street photography", "category": "Vintage", "pinned": false, "type": "text" }, { "id": 1701234567896, "name": "抽象几何艺术", "content": "Abstract geometric patterns, vibrant colors, modern art style, high contrast, symmetrical composition", "category": "Abstract", "pinned": false, "type": "text" }, { "id": 1701234567897, "name": "动漫风格插画", "content": "Anime style illustration, detailed eyes, dynamic pose, colorful hair, studio lighting", "category": "Anime", "pinned": true, "type": "text" }, { "id": 1701234567898, "name": "美食摄影", "content": "Photorealistic food photography, gourmet dish, professional plating, shallow depth of field, appetizing presentation", "category": "Food", "pinned": false, "type": "text" }, { "id": 1701234567899, "name": "超现实梦境", "content": "Surreal dreamscape, floating islands, impossible architecture, Salvador Dali inspired, vibrant colors", "category": "Surreal", "pinned": false, "type": "text" }] // Unified array with type: 'text' | 'video'
                    }
                ],
                activeTextLibraryId: 'default',
                activeVideoLibraryId: 'default',
                modifiers: [
                    "4k", "8k", "HDR", "Cinematic", "Realistic", "Cyberpunk",
                    "Symmetrical", "Studio Lighting", "Vibrant", "Bokeh"
                ]
            };
        }

        migrate(oldData) {
            // Convert v0.19 structure to v2.0
            const newData = this.defaultSchema();

            // Migrate Libraries
            if (oldData.libraries) {
                newData.libraries = oldData.libraries.map(lib => ({
                    id: lib.id,
                    name: lib.name,
                    prompts: [
                        ...(lib.prompts.text_to_image || []).map(p => ({ ...p, type: 'text' })),
                        ...(lib.prompts.image_to_video || []).map(p => ({ ...p, type: 'video' }))
                    ]
                }));
            }

            // Migrate Settings
            if (oldData.settings) {
                // Approximate mapping of old settings
                if (oldData.settings.showBottomPanel) newData.settings.panels.bottom.visible = true;
            }

            // v2.0 -> v2.1 Migration: Split activeLibraryId
            if (oldData.activeLibraryId) {
                newData.activeTextLibraryId = oldData.activeLibraryId;
                newData.activeVideoLibraryId = oldData.activeLibraryId;
            }

            this.save(newData);
            return newData;
        }

        save(data) {
            this.data = data || this.data;
            const json = JSON.stringify(this.data);

            // ✨ Size Monitoring (5MB Browser Standard Warning)
            const size = json.length;
            // Browser LocalStorage limit is typically 5MB (approx 5 million characters)
            if (size > 5 * 1024 * 1024) { // 5MB
                console.warn(`[GPM] ⚠️ Storage usage exceeds 5MB standard (${(size / 1024 / 1024).toFixed(2)} MB). LocalStorage backup may fail.`);
            } else if (size > 4 * 1024 * 1024) { // 4MB
                console.log(`[GPM] ℹ️ Storage usage: ${(size / 1024 / 1024).toFixed(2)} MB (Approaching 5MB limit)`);
            }

            GM_setValue(DB_KEY, json);

            // Backup to localStorage for safety
            try {
                localStorage.setItem('GPM_V2_MIRROR', json);
            } catch (e) {
                console.warn('[GPM] LocalStorage mirror skipped (likely > 5MB quota). Data saved to GM only.');
            }
        }

        get() { return this.data; }
    }

    /**
     * StyleManager: Glassmorphism Theme System
     */
    class StyleManager {
        constructor() {
            this.initStyles();
        }

        initStyles() {
            const css = `
                :host {
                    --gpm-glass-bg: rgba(20, 20, 20, 0.65);
                    --gpm-glass-border: rgba(255, 255, 255, 0.1);
                    --gpm-glass-blur: 16px;
                    --gpm-primary: #1d9bf0;
                    --gpm-text: #ffffff;
                    --gpm-text-dim: #8899a6;
                    --gpm-radius: 12px;
                    --gpm-spacing: 8px;
                    --gpm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }

                .gpm-panel {
                    background: var(--gpm-glass-bg);
                    backdrop-filter: blur(var(--gpm-glass-blur));
                    -webkit-backdrop-filter: blur(var(--gpm-glass-blur));
                    border: 1px solid var(--gpm-glass-border);
                    border-radius: var(--gpm-radius);
                    color: var(--gpm-text);
                    font-family: var(--gpm-font);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                    transition: all 0.2s ease;
                }

                /* Highlight */
                .highlight {
                    background: rgba(255, 235, 59, 0.25);
                    color: #fff9c4;
                    border-radius: 2px;
                    padding: 0 2px;
                }

                /* Context Menu (Global) */
                .gpm-context-menu {
                    position: fixed;
                    background: rgba(30, 30, 30, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 6px;
                    z-index: 100000;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    min-width: 140px;
                    display: none;
                    flex-direction: column;
                }
                .gpm-context-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    color: white;
                    font-size: 13px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: background 0.2s;
                    user-select: none;
                }
                .gpm-context-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .gpm-context-item.delete {
                    color: #ff6b6b;
                }
                .gpm-context-item.delete:hover {
                    background: rgba(255, 107, 107, 0.2);
                }

                .gpm-btn {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                    padding: 4px 8px;
                    font-size: 12px;
                    transition: background 0.2s;
                }
                .gpm-btn:hover { background: rgba(255, 255, 255, 0.15); }
                .gpm-btn.primary { background: var(--gpm-primary); border: none; }

                /* Scrollbar */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }

                /* Reset */
                * { box-sizing: border-box; }

                /* Action Row & Mode Buttons */
                .gpm-btn {
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.08);
                    color: #ddd;
                    border-radius: 6px;
                    cursor: pointer;
                    padding: 4px 8px;
                    font-size: 12px;
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    user-select: none;
                }
                .gpm-btn:hover { background: rgba(255,255,255,0.15); color: white; border-color: rgba(255,255,255,0.15); }

                .gpm-btn.primary { background: var(--gpm-primary); color: white; border-color: transparent; }
                .gpm-btn.primary:hover { filter: brightness(1.1); }

                .gpm-btn.danger { color: #ff5555; background: rgba(255, 85, 85, 0.1); border-color: transparent; }
                .gpm-btn.danger:hover { background: rgba(255, 85, 85, 0.2); color: #ff7777; }

                .gpm-btn.min-btn { padding: 0; width: 22px; height: 22px; border-radius: 50%; opacity: 0.7; }
                .gpm-btn.min-btn:hover { opacity: 1; background: rgba(255,255,255,0.2); }

                /* Mode Switcher */
                .mode-group { display: flex; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 2px; border: 1px solid rgba(255,255,255,0.05); }
                .gpm-btn.mode-btn { background: transparent; color: #888; border: none; font-size: 12px; padding: 4px 10px; flex: 1; margin: 0; border-radius: 4px; }
                .gpm-btn.mode-btn.active { background: rgba(255,255,255,0.1); color: white; font-weight: bold; }
                .gpm-btn.mode-btn:hover:not(.active) { color: #ccc; }

                /* Inputs */
                input[type="text"], select, textarea {
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    border-radius: 6px;
                    font-size: 12px;
                    transition: border-color 0.2s;
                }
                input[type="text"]:focus, select:focus, textarea:focus {
                    outline: none;
                    border-color: var(--gpm-primary);
                    background: rgba(0,0,0,0.3);
                }

                /* Resize Handle */
                .gpm-resize-handle {
                    position: absolute;
                    bottom: 0;
                    width: 15px;
                    height: 15px;
                    z-index: 10002;
                    background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%);
                    transition: background 0.2s;
                }
                .gpm-resize-handle:hover {
                    background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.5) 50%);
                }
                /* Breathing Animation for SVG */
                @keyframes gpm-breathe {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }

                .gpm-svg-icon {
                    width: 16px; height: 16px;
                    fill: currentColor;
                    vertical-align: middle;
                }

                .gpm-svg-anim:hover {
                    animation: gpm-breathe 2s infinite ease-in-out;
                    color: var(--gpm-primary);
                }
            `;
            // Store for Shadow DOMs
            this.themeCSS = css;

            // Inject Globally for Context Menu (Light DOM)
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }

        getThemeCSS() {
            return this.themeCSS;
        }
    }

    /**
     * TemplateEngine: Handles dynamic prompt generation
     */
    class TemplateEngine {
        static extractVariables(template) {
            const regex = /\{([^}]+)\}/g;
            const vars = [];
            let match;
            while ((match = regex.exec(template)) !== null) {
                vars.push(match[1]);
            }
            return [...new Set(vars)];
        }

        static parse(template, values) {
            return template.replace(/\{([^}]+)\}/g, (match, key) => {
                return values[key] !== undefined ? values[key] : match;
            });
        }
    }

    /**
     * Base Component Class
     */
    class Component {
        constructor(styleManager) {
            this.styleManager = styleManager;
            this.root = document.createElement('div');
            this.shadow = this.root.attachShadow({ mode: 'open' });
        }

        render(htmlContent) {
            const style = document.createElement('style');
            style.textContent = this.styleManager.getThemeCSS();
            this.shadow.innerHTML = '';
            this.shadow.appendChild(style);

            const wrapper = document.createElement('div');
            wrapper.innerHTML = htmlContent;
            this.shadow.appendChild(wrapper);

            this.afterRender();
        }

        afterRender() {
            // To be overridden by subclasses for event binding
        }

        mount(parent) {
            parent.appendChild(this.root);
        }
    }

    /**
     * InputManager: Handles interaction with the website's input field
     */
    /**
     * InputManager: Handles interaction with the website's input field
     */
    /**
     * InputManager: Handles interaction with the website's input field
     */
    class InputManager {
        constructor() {
            this.inputElement = null;
        }

        _isValid(el) {
            // Check if element exists, is in DOM, and is visible
            return el && el.isConnected && el.offsetParent !== null && !el.disabled;
        }

        getInput() {
            if (this._isValid(this.inputElement)) {
                return this.inputElement;
            }
            return this.findInput();
        }

        findInput() {
            // Priority list of selectors
            const selectors = [
                'textarea[placeholder*="Grok"]',
                'textarea[aria-label*="Grok"]',
                'textarea[placeholder*="视频"]', // Video input (Chinese)
                'textarea[placeholder*="Video"]', // Video input (English)
                'textarea[placeholder*="自定义"]', // Custom input (Chinese)
                'textarea[placeholder*="Custom"]', // Custom input (English)
                'textarea[placeholder*="describe"]', // Generate image placeholder
                'textarea[placeholder*="描述"]',
                'textarea[data-testid="DmComposerTextInput"]', // X.com DM
                'div[contenteditable="true"][role="textbox"]', // Modern rich text editors
                'div[contenteditable="true"][data-testid="tweetTextarea_0"]', // X.com Tweet
                'div[contenteditable="true"]',
                'textarea'
            ];

            for (const sel of selectors) {
                const els = document.querySelectorAll(sel);
                for (const el of els) {
                    // CRITICAL: Exclude our own inputs (Grok Prompt Manager)
                    if (el.closest && el.closest('#grok-prompt-manager-v2')) continue;
                    if (el.closest && el.closest('.gpm-editor')) continue;
                    if (el.id && el.id.includes('gpm')) continue;

                    // Is Valid Check
                    if (this._isValid(el)) {
                        this.inputElement = el; // Cache it
                        return el;
                    }
                }
            }
            // console.warn('[GPM] No input field found.'); // Reduce noise
            this.inputElement = null;
            return null;
        }

        insert(text) {
            const el = this.getInput();
            if (!el) {
                console.warn('[GPM] No valid input found for insert');
                return;
            }

            el.focus();

            // Handle ContentEditable (Divs, Spans)
            if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
                const success = document.execCommand('insertText', false, text);
                if (!success) {
                    el.innerText += text;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            // Handle Textarea / Input
            else {
                const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;

                if (nativeTextAreaValueSetter) {
                    const currentVal = el.value;
                    const newVal = currentVal ? currentVal + '\n' + text : text;
                    nativeTextAreaValueSetter.call(el, newVal);
                } else {
                    el.value = (el.value || '') + '\n' + text;
                }

                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Scroll to bottom
            el.scrollTop = el.scrollHeight;
        }

        findSubmitButton() {
            const selectors = [
                'button[aria-label="Send"]',
                'button[aria-label="发送"]',
                'button[data-testid="sendMessageButton"]', // Grok/Twitter
                'button[data-testid="DmComposerSendButton"]', // X DMs
                'div[role="button"][aria-label="Send"]', // Sometimes div buttons
                'div[role="button"][aria-label="发送"]',
                'button[type="submit"]', // Generic fallback
                'button[aria-label="Submit"]'
            ];
            for (const sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn && !btn.disabled && btn.offsetWidth > 0) return btn;
            }
            return null;
        }

        submit() {
            const btn = this.findSubmitButton();
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        }

        getValue() {
            const el = this.getInput();
            if (!el) return '';

            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                return el.value || '';
            } else if (el.isContentEditable) {
                return el.innerText || '';
            }
            return '';
        }

        setValue(text) {
            const el = this.getInput();
            if (!el) return;

            // Handle Textarea / Input
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                if (nativeTextAreaValueSetter) {
                    nativeTextAreaValueSetter.call(el, text);
                } else {
                    el.value = text;
                }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            // Handle ContentEditable
            else if (el.isContentEditable) {
                el.innerText = text;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }
    /**
     * SidePanel Component
     */
    class SidePanel extends Component {
        constructor(styleManager, config = { side: 'left', width: 380 }) {
            super(styleManager);
            this.side = config.side;
            this.width = config.width || 380;
            this.height = config.height || 700;
            this.top = config.top || 80;
            this.leftPos = config.left || 20;
            this.rightPos = config.right || 20;
            this.isCollapsed = config.collapsed || false;
            // ✨ Feature: Persistent Visibility (Default: Hidden)
            this.visible = config.visible !== undefined ? config.visible : false;
            this.onStateChange = config.onStateChange;

            // ✨ Fix Persistence: If Right Panel has saved 'left' coordinate, use it.
            this.useFixedLeft = (this.side === 'right' && config.left !== undefined);
        }

        renderInternal() {
            const isLeft = this.side === 'left';
            const shouldUseLeft = isLeft || this.useFixedLeft;
            const posStyle = shouldUseLeft ? `left: ${this.leftPos}px; right: auto;` : `right: ${this.rightPos}px;`;
            // Init visibility
            const displayStyle = this.visible ? 'display: flex;' : 'display: none;';

            this.render(`
                <div class="gpm-panel side-panel" style="
                    position: fixed; top: ${this.top}px; ${posStyle}
                    width: ${this.width}px; height: ${this.height}px;
                    ${displayStyle} flex-direction: column; z-index: 10000;
                ">\r
                    <div class="header" style="
                        padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);
                        display: flex; flex-direction: column; gap: 8px; cursor: move;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: bold;">${isLeft ? '图片 (Image)' : '视频 (Video)'}</span>
                            <div style="display: flex; gap: 5px;">
                                <button class="gpm-btn min-btn">${ICON_SET.Minimize}</button>
                            </div>
                        </div>

                        <!-- Toolbar Row 1: Library Selection -->
                        <div class="lib-row" style="display: flex; gap: 6px; align-items: center;">
                            <select class="lib-select" style="
                                flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
                                color: white; border-radius: 4px; padding: 4px; font-size: 12px;
                            "></select>
                            <button class="gpm-btn add-lib-btn" title="新建库 (New Library)">${ICON_SET.AddLib}</button>
                            <button class="gpm-btn del-lib-btn" title="删除库 (Delete Library)">${ICON_SET.DelLib}</button>
                        </div>

                        <!-- Toolbar Row 2: Actions -->
                        <div class="action-row" style="display: flex; gap: 6px; align-items: center; justify-content: space-between;">
                            <button class="gpm-btn import-btn" style="flex: 1;" title="导入 (Import)">${ICON_SET.Import}</button>
                            <button class="gpm-btn paste-import-btn" style="flex: 1;" title="粘贴导入 (Paste)">${ICON_SET.Paste}</button>
                            <button class="gpm-btn export-btn" style="flex: 1;" title="导出 (Export)">${ICON_SET.Export}</button>
                            <button class="gpm-btn backup-btn" style="flex: 1;" title="备份 (Backup)">${ICON_SET.Backup}</button>
                            <button class="gpm-btn draft-btn" style="flex: 1;" title="草稿 (Draft)">${ICON_SET.Draft}</button>
                        </div>
                    </div>

            <!-- Modifiers Bar -->
            <div class="modifiers-bar" style="
                padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);
                display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none;
            "></div>

            <!-- Category Bar -->
             <div class="category-bar" style="
                padding: 8px 8px 0 8px; display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; flex-wrap: wrap;
            "></div>

            <div class="sticky-toolbar" style="padding: 10px 10px 0 10px; flex-shrink: 0;">
                <div class="search-row" style="display: flex; gap: 4px; margin-bottom: 8px;">
                    <input type="text" class="search-input" placeholder="搜索... (Search)" style="
                        flex: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);
                        color: white; border-radius: 4px; padding: 4px 8px; font-size: 12px;
                    ">
                    <button class="gpm-btn sort-btn" title="切换排序 (Sort)">${ICON_SET.Sort}</button>
                    <button class="gpm-btn add-prompt-btn" title="添加提示词 (Add Prompt)">${ICON_SET.AddPrompt}</button>
                </div>

                <!-- Mode & Import/Export Row -->
                <div class="mode-row" style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <div class="mode-toggle" style="
                        display: flex; flex: 1; background: rgba(0,0,0,0.3); border-radius: 4px; padding: 2px;
                    ">
                        <button class="gpm-btn mode-btn active" data-mode="append" style="
                            flex: 1; border-radius: 2px; font-size: 11px; background: var(--gpm-primary); color: white;
                        ">追加 (Append)</button>
                        <button class="gpm-btn mode-btn" data-mode="replace" style="
                            flex: 1; border-radius: 2px; font-size: 11px; background: transparent; opacity: 0.7;
                        ">替换 (Replace)</button>
                    </div>
                    <button class="gpm-btn preview-toggle-btn" title="预览开关 (Toggle Preview)" style="width: 30px; font-size: 14px;">${ICON_SET.PreviewToggle}</button>
                    <button class="gpm-btn ai-assist-btn" title="AI 助手 (AI Assist)" style="width: 30px; padding: 0;">
                        ${ICON_SET.AiAssist}
                    </button>
                </div>
            </div>

            <div class="content" style="flex: 1; padding: 0 10px 10px 10px; overflow-y: auto;">
                <div id="prompt-container" style="display: flex; flex-direction: column; gap: 8px;">
                    <!-- DYNAMIC CONTENT -->
                </div>
            </div>
            <!-- Resize Handle -->
            <div class="gpm-resize-handle resize-handle" style="
                ${isLeft ? 'right' : 'left'}: 0;
                cursor: ${isLeft ? 'nwse-resize' : 'nesw-resize'};
                transform: ${isLeft ? 'none' : 'scaleX(-1)'};
            "></div>
        </div>
    `);
        }

        afterRender() {
            // Drag Logic for Header
            const header = this.shadow.querySelector('.header');
            const panel = this.shadow.querySelector('.side-panel');

            // Expose visibility methods with save capability
            this.show = (save = true) => {
                panel.style.display = 'flex';
                this.visible = true;
                if (save && this.onStateChange) this.onStateChange({ visible: true });
            };
            this.hide = (save = true) => {
                panel.style.display = 'none';
                this.visible = false;
                if (save && this.onStateChange) this.onStateChange({ visible: false });
            };
            this.toggle = (save = true) => {
                // Toggle based on current DOM state to stay in sync
                panel.style.display === 'none' ? this.show(save) : this.hide(save);
            };

            // Toggle Logic (Append/Replace)
            const modeBtns = this.shadow.querySelectorAll('.mode-btn');
            modeBtns.forEach(btn => {
                btn.onclick = () => {
                    this.clickMode = btn.dataset.mode;
                    modeBtns.forEach(b => {
                        b.style.background = 'transparent';
                        b.style.opacity = '0.7';
                        b.classList.remove('active');
                    });
                    btn.style.background = 'var(--gpm-primary)';
                    btn.style.opacity = '1';
                    btn.classList.add('active');
                };
            });

            // Default Mode
            this.clickMode = 'append';

            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            header.onmousedown = (e) => {
                if (e.target.tagName === 'BUTTON') return;
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = panel.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;

                // Switch to fixed positioning if not already
                panel.style.right = 'auto';
                panel.style.left = initialLeft + 'px';
                panel.style.top = initialTop + 'px';

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            };

            const onMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                panel.style.left = (initialLeft + dx) + 'px';
                panel.style.top = (initialTop + dy) + 'px';
            };

            const onUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);

                // ✨ Fix Persistence: Save Position
                if (this.onStateChange) {
                    this.onStateChange({
                        left: parseFloat(panel.style.left) || 0,
                        top: parseFloat(panel.style.top) || 0,
                        // Ensure we don't save "right" if we switched to left
                        right: undefined
                    });
                }
            };

            // Minimize Logic
            const minBtn = this.shadow.querySelector('.min-btn');
            minBtn.onclick = () => {
                this.isCollapsed = !this.isCollapsed;
                const content = this.shadow.querySelector('.content');
                const mods = this.shadow.querySelector('.modifiers-bar');
                const cats = this.shadow.querySelector('.category-bar');
                const stickyToolbar = this.shadow.querySelector('.sticky-toolbar');

                [content, mods, cats, stickyToolbar].forEach(el => {
                    if (!el) return;
                    if (el === mods || el === cats) {
                        el.style.display = this.isCollapsed ? 'none' : 'flex';
                    } else {
                        el.style.display = this.isCollapsed ? 'none' : 'block';
                    }
                });



                const panel = this.shadow.querySelector('.side-panel');
                panel.style.height = this.isCollapsed ? 'auto' : `${this.height}px`;
                minBtn.textContent = this.isCollapsed ? '+' : '−';

                // ✨ Update state on toggle
                if (this.onStateChange) {
                    this.onStateChange({ collapsed: this.isCollapsed });
                }
            };

            // Search Logic
            const searchInput = this.shadow.querySelector('.search-input');
            if (searchInput) {
                searchInput.oninput = (e) => {
                    this.filterText = e.target.value;
                    this.renderList();
                };

                // ✨ FEATURE #1 (continued): Enter to apply first result
                searchInput.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        // Get first filtered prompt
                        let filtered = [...this.allPrompts];
                        if (this.activeCategory !== '全部 (All)') {
                            filtered = filtered.filter(p => (p.category || 'Uncategorized') === this.activeCategory);
                        }
                        if (this.filterText) {
                            const lower = this.filterText.toLowerCase();
                            filtered = filtered.filter(p =>
                                (p.name && p.name.toLowerCase().includes(lower)) ||
                                (p.content && p.content.toLowerCase().includes(lower))
                            );
                        }
                        if (filtered.length > 0 && this.onPromptClick) {
                            this.onPromptClick(filtered[0]); // Apply first result
                            searchInput.value = ''; // Clear search
                            this.filterText = '';
                            this.renderList();
                        }
                    }
                };
            }

            // Sort Logic
            this.sortOrder = 'newest'; // 'newest' | 'oldest'
            const sortBtn = this.shadow.querySelector('.sort-btn');
            if (sortBtn) {
                sortBtn.onclick = () => {
                    this.sortOrder = this.sortOrder === 'newest' ? 'oldest' : 'newest';
                    const icon = sortBtn.querySelector('.gpm-svg-icon');
                    if (icon) {
                        icon.style.transition = 'transform 0.3s';
                        icon.style.transform = this.sortOrder === 'newest' ? 'none' : 'scaleY(-1)';
                    }
                    this.renderList();
                };
            }

            // Add Prompt Logic
            const addPromptBtn = this.shadow.querySelector('.add-prompt-btn');
            if (addPromptBtn) {
                addPromptBtn.onclick = () => {
                    const content = searchInput.value.trim();
                    // If search has text, use it. Otherwise, prompt user.
                    const finalContent = content || prompt('请输入提示词内容 (Enter Prompt Content):');
                    if (finalContent && this.onAddPrompt) {
                        // Support optional custom name for paste import
                        this.onAddPrompt(finalContent, null); // null = auto-generate name
                        if (content) searchInput.value = ''; // Clear search if used
                        this.filterText = '';
                    }
                };
            }

            // Resize Logic
            const resizer = this.shadow.querySelector('.resize-handle');
            let isResizing = false;
            let startW, startH, startResizeX, startResizeY;

            if (resizer) {
                resizer.onmousedown = (e) => {
                    e.stopPropagation();
                    isResizing = true;
                    startResizeX = e.clientX;
                    startResizeY = e.clientY;
                    startW = panel.offsetWidth;
                    startH = panel.offsetHeight;

                    document.addEventListener('mousemove', onResize);
                    document.addEventListener('mouseup', onResizeUp);
                };

                const onResize = (e) => {
                    if (!isResizing) return;
                    const isLeft = this.side === 'left';
                    const dx = e.clientX - startResizeX;
                    const dy = e.clientY - startResizeY;

                    // For left panel, dragging right increases width. For right panel, dragging left increases width.
                    const w = isLeft ? (startW + dx) : (startW - dx);
                    const h = startH + dy;

                    if (w > 200) panel.style.width = w + 'px';
                    if (h > 300) panel.style.height = h + 'px';
                };

                const onResizeUp = () => {
                    isResizing = false;
                    document.removeEventListener('mousemove', onResize);
                    document.removeEventListener('mouseup', onResizeUp);

                    // ✨ Fix Persistence: Save Size
                    if (this.onStateChange) {
                        this.onStateChange({
                            width: parseFloat(panel.style.width) || 300,
                            height: parseFloat(panel.style.height) || 600
                        });
                    }
                };
            }
        }

        setup(libraryData, libraries, onPromptClick, onLibChange, onImport, onExport, onAddLib, onDeleteLib, onAddPrompt, onExportAll, onDraftToggle, onPromptAction, onReorder, onAiAssist, onRenameLib, onAddCategory, onImportCategory, onExportCategory) {
            this.library = libraryData;
            this.allPrompts = libraryData.prompts || [];
            this.onPromptClick = onPromptClick;
            this.onAddPrompt = onAddPrompt;
            this.onPromptAction = onPromptAction;
            this.onReorder = onReorder;
            this.onRenameLib = onRenameLib; // New
            this.onAddCategory = onAddCategory; // New
            this.onImportCategory = onImportCategory; // New
            this.onExportCategory = onExportCategory; // New

            // 🔴 FIX #3: Prevent duplicate event listener binding
            if (this._globalClickBound) {
                document.removeEventListener('click', this._globalClickHandler);
            }

            this._globalClickHandler = (e) => {
                const menu = this.shadow.querySelector('.gpm-context-menu');
                if (menu) menu.style.display = 'none';
            };

            document.addEventListener('click', this._globalClickHandler);
            this._globalClickBound = true;

            // Setup Toolbar
            const select = this.shadow.querySelector('.lib-select');
            select.innerHTML = libraries.map(l => `<option value="${l.id}" ${l.id === libraryData.id ? 'selected' : ''}>${l.name}</option>`).join('');
            select.onchange = (e) => onLibChange(e.target.value);

            this.shadow.querySelector('.import-btn').onclick = onImport;

            // ✨ NEW FEATURE: Paste import button (Fixed v2.7.1)
            const pasteBtn = this.shadow.querySelector('.paste-import-btn');
            if (pasteBtn) {
                pasteBtn.onclick = () => {
                    if (window.showGPMPasteImport) {
                        window.showGPMPasteImport((imported) => {
                            if (this.onAddPrompt && Array.isArray(imported)) {
                                imported.forEach(item => this.onAddPrompt(item.content, item.name));
                            }
                        });
                    } else {
                        alert('Paste Import loading...');
                    }
                };
            }

            const expBtn = this.shadow.querySelector('.export-btn');
            if (expBtn) expBtn.onclick = () => window.gpmExportLib ? window.gpmExportLib() : onExport();

            // Bind New Mode Toolbar Buttons (Quick Import/Export)
            const previewToggle = this.shadow.querySelector('.preview-toggle-btn');
            if (previewToggle) {
                this.previewEnabled = true; // Default ON
                previewToggle.onclick = () => {
                    this.previewEnabled = !this.previewEnabled;
                    previewToggle.textContent = this.previewEnabled ? '👁️' : '🕶️';
                    previewToggle.title = this.previewEnabled ? '预览开启 (Preview ON)' : '预览关闭 (Preview OFF)';
                    document.querySelectorAll('.gpm-preview-tooltip').forEach(el => el.remove());
                };
            }
            const aiAssist = this.shadow.querySelector('.ai-assist-btn');
            if (aiAssist) {
                if (onAiAssist) {
                    aiAssist.onclick = onAiAssist;
                } else {
                    aiAssist.style.display = 'none';
                }
            }

            const backupBtn = this.shadow.querySelector('.backup-btn');
            if (backupBtn && onExportAll) backupBtn.onclick = onExportAll;

            const draftBtn = this.shadow.querySelector('.draft-btn');
            if (draftBtn && onDraftToggle) draftBtn.onclick = onDraftToggle;

            const addBtn = this.shadow.querySelector('.add-lib-btn');
            if (addBtn) addBtn.onclick = onAddLib;

            const delBtn = this.shadow.querySelector('.del-lib-btn');
            if (delBtn) delBtn.onclick = onDeleteLib;

            // Setup Categories
            this.categories = ['全部 (All)', ...new Set(this.allPrompts.map(p => p.category || 'Uncategorized'))];
            this.activeCategory = '全部 (All)';

            // ✨ FEATURE #6: Store category callbacks for later use
            this.onCategoryRename = (oldName, newName) => {
                // Rename category in all prompts
                this.allPrompts.forEach(p => {
                    if (p.category === oldName) p.category = newName;
                });
                this.categories = ['全部 (All)', ...new Set(this.allPrompts.map(p => p.category || 'Uncategorized'))];
                if (this.activeCategory === oldName) this.activeCategory = newName;
                this.renderCategories();
                this.renderList();
                // Notify parent if needed
                if (onPromptAction) onPromptAction('category-rename', { oldName, newName });
            };

            this.onCategoryDelete = (catName) => {
                // Move prompts to Uncategorized
                this.allPrompts.forEach(p => {
                    if (p.category === catName) p.category = 'Uncategorized';
                });
                this.categories = ['全部 (All)', ...new Set(this.allPrompts.map(p => p.category || 'Uncategorized'))];
                this.activeCategory = '全部 (All)';
                this.renderCategories();
                this.renderList();
                // Notify parent if needed
                if (onPromptAction) onPromptAction('category-delete', { catName });
            };

            // ✨ FEATURE #4: Store batch delete callback
            this.onBatchDelete = (promptIds) => {
                if (onPromptAction) onPromptAction('batch-delete', { promptIds });
            };

            // Setup Library Context Menu (Right-Click Rename)
            const libSelect = this.shadow.querySelector('.lib-select');
            if (libSelect) {
                libSelect.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (onRenameLib) {
                        const menu = document.createElement('div');
                        menu.style.cssText = `
                            position: fixed; z-index: 100000;
                            background: rgba(20,20,20,0.95); backdrop-filter: blur(10px);
                            border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;
                            padding: 4px; min-width: 120px;
                        `;
                        menu.innerHTML = `
                            <div class="gpm-ctx-item" style="padding:6px 10px;cursor:pointer;border-radius:4px;font-size:12px;color:white;">✏️ 重命名 (Rename)</div>
                            <div class="gpm-ctx-item" style="padding:6px 10px;cursor:pointer;border-radius:4px;font-size:12px;color:#ff5555;">🗑️ 删除 (Delete)</div>
                        `;
                        menu.style.left = e.clientX + 'px';
                        menu.style.top = e.clientY + 'px';
                        document.body.appendChild(menu);

                        const items = menu.querySelectorAll('.gpm-ctx-item');
                        items[0].onclick = () => { onRenameLib(); menu.remove(); };
                        items[1].onclick = () => { if (onDeleteLib) onDeleteLib(); menu.remove(); };

                        items.forEach(item => {
                            item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.1)';
                            item.onmouseleave = () => item.style.background = '';
                        });

                        setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 100);
                    }
                };
            }

            this.renderCategories();
            this.renderList();
        }

        renderCategories() {
            const container = this.shadow.querySelector('.category-bar');
            if (!container) return;

            // Initialize expansion state if not present
            if (typeof this.isCategoryExpanded === 'undefined') {
                this.isCategoryExpanded = false;
            }

            const isExpanded = this.isCategoryExpanded;
            const expandBtnIcon = isExpanded ? '▲' : '▼';

            container.innerHTML = `
                <div class="gpm-cat-expand" title="展开/收起 (Toggle)" style="
                    padding: 4px 6px; cursor: pointer; color: #888; font-size: 10px;
                    display: flex; align-items: center; justify-content: center;
                    margin-right: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;
                    height: 20px; width: 20px; flex-shrink: 0;
                ">${expandBtnIcon}</div>
                <div class="gpm-cat-scroll" style="
                    display: flex; gap: 4px; flex: 1;
                    overflow-x: ${isExpanded ? 'visible' : 'auto'};
                    flex-wrap: ${isExpanded ? 'wrap' : 'nowrap'};
                    scrollbar-width: none; align-content: flex-start;
                "></div>
            `;

            // Apply container styles based on state
            if (isExpanded) {
                container.style.flexWrap = 'nowrap'; // Outer container doesn't wrap
                container.style.height = 'auto';
                container.style.alignItems = 'flex-start';
                container.style.overflowX = 'visible';
            } else {
                container.style.flexWrap = 'nowrap';
                container.style.height = '40px';
                container.style.alignItems = 'center';
                container.style.overflowX = 'hidden';
            }

            const scrollContainer = container.querySelector('.gpm-cat-scroll');
            const expandBtn = container.querySelector('.gpm-cat-expand');

            // Helper to create small action buttons (Shared style)
            const createTinyBtn = (text, title, onClickHandler) => {
                const btn = document.createElement('button');
                btn.className = 'gpm-btn';
                btn.textContent = text;
                btn.title = title;
                btn.style.cssText = 'min-width: 24px; padding: 0 4px; font-size: 10px; height: 20px;';
                btn.onclick = onClickHandler;
                return btn;
            };

            // Import Button
            if (this.onImportCategory) {
                scrollContainer.appendChild(createTinyBtn('📥', '导入分类 (Import to Category)', this.onImportCategory));
            }
            // Export Button
            if (this.onExportCategory) {
                scrollContainer.appendChild(createTinyBtn('📤', '导出分类 (Export Category)', this.onExportCategory));
            }
            // Add Button
            if (this.onAddCategory) {
                const addBtn = createTinyBtn('+', '新建分类 (New Category)', () => {
                    this.onAddCategory();
                });
                scrollContainer.appendChild(addBtn);
            }

            // Render Chips
            this.categories.forEach(cat => {
                const chip = document.createElement('div');
                chip.textContent = cat;
                chip.style.cssText = `
                    padding: 2px 8px; background: ${cat === this.activeCategory ? 'var(--gpm-primary)' : 'rgba(255,255,255,0.1)'};
                    border-radius: 12px; font-size: 10px; white-space: nowrap;
                    cursor: pointer; user-select: none; transition: background 0.2s;
                    height: 20px; display: flex; align-items: center;
                `;
                chip.onclick = () => {
                    this.activeCategory = cat;
                    this.renderCategories();
                    this.renderList();
                };

                // ✨ FEATURE #6: Category management via right-click
                chip.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (cat === '全部 (All)') return; // Cannot rename/delete "All"

                    const menu = document.createElement('div');
                    menu.style.cssText = `
                        position: fixed; z-index: 100000;
                        background: rgba(20,20,20,0.95); backdrop-filter: blur(10px);
                        border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;
                        padding: 4px; min-width: 120px;
                    `;
                    menu.innerHTML = `
                        <div class="gpm-cat-menu-item" style="padding:6px 10px;cursor:pointer;border-radius:4px;font-size:12px;color:white;" data-action="rename">✏️ 重命名</div>
                        <div class="gpm-cat-menu-item" style="padding:6px 10px;cursor:pointer;border-radius:4px;font-size:12px;color:#ff5555;" data-action="delete">🗑️ 删除</div>
                    `;
                    menu.style.left = e.clientX + 'px';
                    menu.style.top = e.clientY + 'px';
                    document.body.appendChild(menu);

                    menu.querySelectorAll('.gpm-cat-menu-item').forEach(item => {
                        item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.1)';
                        item.onmouseleave = () => item.style.background = '';
                        item.onclick = () => {
                            const action = item.dataset.action;
                            if (action === 'rename') {
                                const newName = prompt(`重命名分类 "${cat}":`, cat);
                                if (newName && newName !== cat && this.onCategoryRename) {
                                    this.onCategoryRename(cat, newName);
                                }
                            } else if (action === 'delete') {
                                if (confirm(`确定删除分类 "${cat}"？\n该分类下的提示词将变为"Uncategorized"`)) {
                                    if (this.onCategoryDelete) this.onCategoryDelete(cat);
                                }
                            }
                            menu.remove();
                        };
                    });

                    setTimeout(() => {
                        document.addEventListener('click', () => menu.remove(), { once: true });
                    }, 100);
                };

                scrollContainer.appendChild(chip);
            });

            // Bind Expand Event
            expandBtn.onclick = () => {
                this.isCategoryExpanded = !this.isCategoryExpanded;
                this.renderCategories();
            };
        }

        renderList() {
            const container = this.shadow.querySelector('#prompt-container');
            container.innerHTML = '';

            // 🐞 FIX: Clear all existing preview tooltips to prevent overlap
            document.querySelectorAll('.gpm-preview-tooltip').forEach(tooltip => tooltip.remove());

            let filtered = [...this.allPrompts]; // Copy to avoid mutating original

            // Filter by Category
            if (this.activeCategory !== '全部 (All)') {
                filtered = filtered.filter(p => (p.category || 'Uncategorized') === this.activeCategory);
            }

            // Filter by Search
            if (this.filterText) {
                const lower = this.filterText.toLowerCase();

                // ✨ FEATURE #5: Smart search with pinyin support
                filtered = filtered.filter(p => {
                    const nameMatch = p.name && p.name.toLowerCase().includes(lower);
                    const contentMatch = p.content && p.content.toLowerCase().includes(lower);

                    // Pinyin initial matching (拼音首字母)
                    let pinyinMatch = false;
                    if (p.name) {
                        const pinyinInitials = this._getPinyinInitials(p.name);
                        pinyinMatch = pinyinInitials.includes(lower);
                    }

                    return nameMatch || contentMatch || pinyinMatch;
                });
            }

            // Sort: Pinned first, then by SortOrder
            // Sort: Pinned first, then by SortOrder (Array Order effectively)
            // If specific sort logic is needed (e.g. alphabetical), add here.
            // For 'manual' (drag & drop), we trust the array order.
            // Default "Newest" = Array Order (assuming unshift).
            // "Oldest" = Reversed Array Order.

            if (this.sortOrder === 'oldest') {
                filtered.reverse();
            }

            filtered.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return 0; // Maintain relative order (Newest/Manual)
            });

            if (filtered.length === 0) {
                container.innerHTML = '<div style="text-align:center; color: var(--gpm-text-dim);">No prompts found</div>';
                return;
            }

            // ✨ FEATURE #4: Initialize batch selection state
            if (!this.selectedPrompts) this.selectedPrompts = new Set();

            filtered.forEach(p => {
                const el = document.createElement('div');
                el.style.cssText = `
                    padding: 8px; background: ${p.pinned ? 'rgba(29, 155, 240, 0.15)' : 'rgba(255,255,255,0.05)'};
                    border: 1px solid ${p.pinned ? 'rgba(29, 155, 240, 0.3)' : 'rgba(255,255,255,0.05)'};
                    border-radius: 6px; cursor: pointer; transition: background 0.2s;
                `;
                el.onmouseover = () => el.style.background = p.pinned ? 'rgba(29, 155, 240, 0.25)' : 'rgba(255,255,255,0.1)';
                el.onmouseout = () => el.style.background = p.pinned ? 'rgba(29, 155, 240, 0.15)' : 'rgba(255,255,255,0.05)';

                // Check if it has variables
                const vars = TemplateEngine.extractVariables(p.content || '');
                const isTemplate = vars.length > 0;

                // Highlight Logic
                const escapeHtml = (text) => {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                };

                let htmlName = escapeHtml(p.name || (p.content ? p.content.slice(0, 30) + '...' : 'Untitled'));

                // If filtering, highlight match in Name OR Content (if name doesn't match but content does)
                if (this.filterText) {
                    const regex = new RegExp(this.filterText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    htmlName = htmlName.replace(regex, match => `<span class="highlight">${match}</span>`);
                    // If content match is important, maybe show snippet?
                    // For now, just highlight Name.
                }

                // Simplified view: Just Name + Icons
                const pinIcon = p.pinned ? '📌 ' : '';
                const tplIcon = isTemplate ? '🧩 ' : '';

                el.innerHTML = `
                    <div style="font-weight: 500; font-size: 13px; margin-bottom: 2px;">
                        ${pinIcon}${tplIcon}${htmlName}
                    </div>
                    <div style="font-size: 11px; color: var(--gpm-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                         ${escapeHtml(p.content || '').slice(0, 50)}
                    </div>
                `;

                // ✨ FEATURE #2: Quick preview on hover (Enhanced v2.7.3)
                let hoverTimer = null;
                let previewTooltip = null;
                let cleanupTimer = null;

                const cleanup = () => {
                    if (previewTooltip) {
                        previewTooltip.remove();
                        previewTooltip = null;
                    }
                };

                const startCleanup = () => {
                    if (cleanupTimer) clearTimeout(cleanupTimer);
                    cleanupTimer = setTimeout(cleanup, 300); // 300ms grace period
                };

                const cancelCleanup = () => {
                    if (cleanupTimer) {
                        clearTimeout(cleanupTimer);
                        cleanupTimer = null;
                    }
                };

                el.onmouseenter = (enterEvent) => {
                    if (this.previewEnabled === false) return;
                    cancelCleanup();
                    clearTimeout(hoverTimer);

                    hoverTimer = setTimeout(() => {
                        if (previewTooltip) return;

                        previewTooltip = document.createElement('div');
                        previewTooltip.className = 'gpm-preview-tooltip';
                        previewTooltip.style.cssText = `
                            position: fixed; z-index: 100001;
                            max-width: 400px; padding: 12px;
                            background: rgba(20, 20, 20, 0.95);
                            backdrop-filter: blur(10px);
                            border: 1px solid rgba(255,255,255,0.2);
                            border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                            color: white; font-size: 12px; line-height: 1.5;
                            pointer-events: auto;
                        `;

                        const fullContent = escapeHtml(p.content || 'No content');
                        previewTooltip.innerHTML = `
                            <div style="font-weight: bold; margin-bottom: 8px; color: #1d9bf0;">
                                ${p.name || 'Untitled'}
                            </div>
                            <div style="white-space: pre-wrap; word-break: break-word; max-height: 300px; overflow-y: auto;">
                                ${fullContent}
                            </div>
                            <button class="gpm-btn" style="margin-top: 8px; width: 100%; font-size: 11px;">📋 复制 (Copy)</button>
                        `;

                        // Position tooltip
                        const rect = el.getBoundingClientRect();

                        if (this.side === 'right') {
                            // Pop to left
                            previewTooltip.style.right = (window.innerWidth - rect.left + 10) + 'px';
                            previewTooltip.style.left = 'auto';
                        } else {
                            // Pop to right (default)
                            previewTooltip.style.left = (rect.right + 10) + 'px';
                            previewTooltip.style.right = 'auto';
                        }

                        if (rect.top + 300 > window.innerHeight) {
                            previewTooltip.style.bottom = '20px';
                            previewTooltip.style.top = 'auto';
                        } else {
                            previewTooltip.style.top = rect.top + 'px';
                        }

                        document.body.appendChild(previewTooltip);

                        previewTooltip.querySelector('button').onclick = () => {
                            navigator.clipboard.writeText(p.content).then(() => {
                                const btn = previewTooltip.querySelector('button');
                                btn.textContent = '✅ 已复制!';
                                btn.style.background = '#00ba7c';
                            });
                        };

                        // Keep alive logic
                        previewTooltip.onmouseenter = () => cancelCleanup();
                        previewTooltip.onmouseleave = () => startCleanup();

                    }, 800);
                };

                el.onmouseleave = () => {
                    clearTimeout(hoverTimer);
                    startCleanup();
                };


                el.oncontextmenu = (e) => {
                    e.preventDefault();
                    this.showContextMenu(e, p);
                };

                // ✨ FEATURE #4: Multi-select with Ctrl+Click
                el.onclick = (e) => {
                    const isMultiSelect = e.ctrlKey || e.metaKey;

                    if (isMultiSelect) {
                        // Toggle selection
                        if (this.selectedPrompts.has(p.id)) {
                            this.selectedPrompts.delete(p.id);
                            el.style.background = p.pinned ? 'rgba(29, 155, 240, 0.15)' : 'rgba(255,255,255,0.05)';
                            el.style.border = p.pinned ? '1px solid rgba(29, 155, 240, 0.3)' : '1px solid rgba(255,255,255,0.05)';
                        } else {
                            this.selectedPrompts.add(p.id);
                            el.style.background = 'rgba(29, 155, 240, 0.3)';
                            el.style.border = '2px solid var(--gpm-primary)';
                        }

                        // Show/hide batch toolbar
                        this._updateBatchToolbar();
                    } else {
                        // Normal click - clear selection and execute action
                        this.selectedPrompts.clear();
                        this._updateBatchToolbar();
                        const isReplace = (this.clickMode === 'replace') || e.shiftKey;
                        this.onPromptClick(p, isReplace);
                    }
                };

                // 🟡 FIX #5: Ensure ID is string for dataTransfer
                el.draggable = true;
                el.ondragstart = (e) => {
                    e.dataTransfer.setData('application/grok-prompt-id', String(p.id));
                    e.dataTransfer.effectAllowed = 'move';
                    el.style.opacity = '0.5';
                };
                el.ondragend = () => {
                    el.style.opacity = '1';
                    // clear highlights
                    this.shadow.querySelectorAll('.drop-target').forEach(e => e.classList.remove('drop-target'));
                };

                el.ondragover = (e) => {
                    e.preventDefault(); // Allow drop
                    e.dataTransfer.dropEffect = 'move';
                    el.style.borderTop = '2px solid var(--gpm-primary)'; // Visual cue
                };
                el.ondragleave = () => {
                    el.style.borderTop = ''; // Revert style
                    // Reverting to original border defined in cssText (1px solid ...)
                    // This direct style manipulation is a bit risky if cssText is static.
                    // Ideally use classes.
                    // But let's restore:
                    el.style.borderTop = ''; // Let cssText priority take over or fallback
                    // Actually el.style.border is set in cssText.
                    // resetting borderTop to '' removes the override, showing original border.
                };

                el.ondrop = (e) => {
                    e.preventDefault();
                    el.style.borderTop = '';
                    const sourceId = e.dataTransfer.getData('application/grok-prompt-id');
                    // 🟡 FIX #5 (continued): Compare as strings
                    if (sourceId && sourceId !== String(p.id)) {
                        if (this.onReorder) this.onReorder(sourceId, String(p.id));
                    }
                };
                // Drop handlers will be on container

                container.appendChild(el);
            });
        }

        // Deprecated: setPrompts is now handled by renderList() via setup()
        setPrompts(prompts, onPromptClick) { /* .. cleaned up .. */ }

        renderModifiers(modifiers, onAdd, onDelete, onClick, onImport, onExport) {
            const container = this.shadow.querySelector('.modifiers-bar');
            if (!container) return;

            // Initialize expansion state if not present
            if (typeof this.isModifiersExpanded === 'undefined') {
                this.isModifiersExpanded = false;
            }

            const isExpanded = this.isModifiersExpanded;
            const expandBtnIcon = isExpanded ? '▲' : '▼';

            container.innerHTML = `
                <div class="gpm-mod-expand" title="展开/收起 (Toggle)" style="
                    padding: 4px 6px; cursor: pointer; color: #888; font-size: 10px;
                    display: flex; align-items: center; justify-content: center;
                    margin-right: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;
                    height: 20px; width: 20px; flex-shrink: 0;
                ">${expandBtnIcon}</div>
                <div class="gpm-mod-scroll" style="
                    display: flex; gap: 4px; flex: 1;
                    overflow-x: ${isExpanded ? 'visible' : 'auto'};
                    flex-wrap: ${isExpanded ? 'wrap' : 'nowrap'};
                    scrollbar-width: none; align-items: center; align-content: flex-start;
                "></div>
            `;

            // Apply container styles based on state
            if (isExpanded) {
                container.style.flexWrap = 'nowrap';
                container.style.height = 'auto';
                container.style.alignItems = 'flex-start';
                container.style.overflowX = 'visible';
            } else {
                container.style.flexWrap = 'nowrap';
                container.style.height = '40px';
                container.style.alignItems = 'center';
                container.style.overflowX = 'hidden';
            }

            const scrollContainer = container.querySelector('.gpm-mod-scroll');
            const expandBtn = container.querySelector('.gpm-mod-expand');

            // Helper to create small action buttons
            const createTinyBtn = (text, title, onClickHandler) => {
                const btn = document.createElement('button');
                btn.className = 'gpm-btn';
                btn.textContent = text;
                btn.title = title;
                btn.style.cssText = 'min-width: 24px; padding: 0 4px; font-size: 10px; height: 20px;';
                btn.onclick = onClickHandler;
                return btn;
            };

            // Import Button
            if (onImport) {
                scrollContainer.appendChild(createTinyBtn('📥', '导入标签 (Import Tags)', onImport));
            }
            // Export Button
            if (onExport) {
                scrollContainer.appendChild(createTinyBtn('📤', '导出标签 (Export Tags)', onExport));
            }

            // Add Button
            const addBtn = document.createElement('button');
            addBtn.className = 'gpm-btn';
            addBtn.textContent = '+';
            addBtn.style.minWidth = '24px';
            addBtn.onclick = () => {
                const params = prompt('Enter modifier:');
                if (params) onAdd(params);
            };
            scrollContainer.appendChild(addBtn);

            modifiers.forEach(mod => {
                const chip = document.createElement('div');
                chip.textContent = mod;
                chip.className = 'gpm-modifier-chip';

                // Dynamic style based on state
                // If Expanded: allow wrap, height auto, max-width 100%
                // If Collapsed: nowrap, fixed height
                const chipStyle = isExpanded
                    ? `
                        padding: 4px 8px; background: rgba(255,255,255,0.1);
                        border-radius: 12px; font-size: 11px; cursor: pointer;
                        user-select: none; transition: background 0.2s;
                        white-space: normal; word-break: break-word; line-height: 1.3;
                        height: auto; width: auto; max-width: 100%;
                        display: inline-block; margin-bottom: 2px;
                      `
                    : `
                        padding: 2px 8px; background: rgba(255,255,255,0.1);
                        border-radius: 12px; font-size: 11px; cursor: pointer;
                        user-select: none; transition: background 0.2s; white-space: nowrap;
                        height: 20px; display: flex; align-items: center;
                      `;

                chip.style.cssText = chipStyle;

                chip.onclick = (e) => onClick(mod, e.shiftKey);
                chip.oncontextmenu = (e) => {
                    e.preventDefault();
                    if (confirm(`Delete modifier "${mod}"?`)) onDelete(mod);
                };
                scrollContainer.appendChild(chip);
            });

            // Bind Expand Event
            expandBtn.onclick = () => {
                this.isModifiersExpanded = !this.isModifiersExpanded;
                this.renderModifiers(modifiers, onAdd, onDelete, onClick, onImport, onExport);
            };
        }

        showContextMenu(e, prompt) {
            // Use a global ID for the context menu to avoid duplicates across panels
            let menu = document.getElementById('gpm-global-context-menu');
            if (!menu) {
                menu = document.createElement('div');
                menu.id = 'gpm-global-context-menu';
                menu.className = 'gpm-context-menu';
                document.body.appendChild(menu);

                // Global listener to close it
                document.addEventListener('mousedown', (evt) => {
                    if (!menu.contains(evt.target)) {
                        menu.style.display = 'none';
                    }
                });

                // Prevent context menu on the menu itself
                menu.oncontextmenu = (evt) => evt.preventDefault();
            }

            menu.innerHTML = `
                <div class="gpm-context-item" data-action="replace">🔄 替换输入 (Replace Input)</div>
                <div class="gpm-context-item" data-action="append">➕ 追加到输入 (Append Input)</div>
                <div class="gpm-context-item-separator" style="height:1px; background:rgba(255,255,255,0.1); margin:4px 0;"></div>
                <div class="gpm-context-item" data-action="rename">✏️ 重命名 (Rename)</div>
                <div class="gpm-context-item" data-action="edit">📝 编辑内容 (Edit)</div>
                <div class="gpm-context-item" data-action="copy">📋 复制内容 (Copy)</div>
                <div class="gpm-context-item" data-action="pin">${prompt.pinned ? '📍 取消置顶 (Unpin)' : '📌 置顶 (Pin)'}</div>
                <div class="gpm-context-item delete" data-action="delete">🗑️ 删除 (Delete)</div>
            `;

            menu.style.display = 'flex';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';

            // Re-bind actions for this specific prompt
            menu.querySelectorAll('.gpm-context-item').forEach(item => {
                item.onclick = (evt) => {
                    evt.stopPropagation(); // Prevent closing immediately
                    const action = item.dataset.action;
                    if (this.onPromptAction) this.onPromptAction(action, prompt);
                    menu.style.display = 'none';
                };
            });
        }

        // ✨ FEATURE #4: Update batch operation toolbar
        _updateBatchToolbar() {
            let toolbar = this.shadow.querySelector('.gpm-batch-toolbar');

            if (this.selectedPrompts.size === 0) {
                if (toolbar) toolbar.remove();
                return;
            }

            if (!toolbar) {
                toolbar = document.createElement('div');
                toolbar.className = 'gpm-batch-toolbar';
                toolbar.style.cssText = `
                    position: fixed; bottom: 100px; left: 50%;
                    transform: translateX(-50%); z-index: 10002;
                    background: rgba(20, 20, 20, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 12px; padding: 12px 20px;
                    display: flex; gap: 12px; align-items: center;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                `;
                this.shadow.appendChild(toolbar);
            }

            toolbar.innerHTML = `
                <span style="color: white; font-size: 13px; font-weight: bold;">
                    已选择 ${this.selectedPrompts.size} 项
                </span>
                <button class="gpm-btn" data-action="cancel">取消</button>
                <button class="gpm-btn" data-action="delete" style="background: #ff5555;">批量删除</button>
            `;

            // Bind events
            toolbar.querySelector('[data-action="cancel"]').onclick = () => {
                this.selectedPrompts.clear();
                this.renderList();
            };

            toolbar.querySelector('[data-action="delete"]').onclick = () => {
                if (confirm(`确定删除选中的 ${this.selectedPrompts.size} 个提示词？`)) {
                    if (this.onBatchDelete) {
                        this.onBatchDelete(Array.from(this.selectedPrompts));
                        this.selectedPrompts.clear();
                        this._updateBatchToolbar();
                    }
                }
            };
        }

        // ✨ NEW FEATURE: Paste import modal with smart parsing
        _showPasteImportModal() {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100000;
                display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                width: 600px; max-height: 80vh; padding: 20px; display: flex; flex-direction: column; gap: 15px;
                background: rgba(20,20,20,0.95); border: 1px solid rgba(255,255,255,0.2);
                border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); color: white;
            `;

            modal.innerHTML = `
                <h3 style="margin: 0; font-size: 18px;">📋 粘贴导入提示词</h3>
                <div style="font-size: 12px; color: #888; line-height: 1.5;">
                    支持多种格式：<br>
                    • <b>Tab分隔</b>: 标题[Tab]内容 (推荐)<br>
                    • <b>每行一个</b>: 每行作为一个提示词<br>
                    • <b>自动去重</b>: 重复内容会被跳过
                </div>
                <textarea style="
                    flex: 1; min-height: 300px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 6px; color: white; padding: 12px; resize: none; font-family: inherit; font-size: 13px;
                " placeholder="粘贴您的提示词...

示例格式 (Tab分隔):
闪现/掀衣露胸	Flashing boobs, lift shirt
挤胸/胸部挤压	Breast squeeze, pressing breasts

或每行一个:
Flashing boobs, lift shirt, flash tits
Breast squeeze, pressing breasts together"></textarea>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #666;">将导入到当前库</span>
                    <div style="display: flex; gap: 10px;">
                        <button class="cancel-btn" style="padding: 8px 16px; background: rgba(255,255,255,0.1); border: none; border-radius: 6px; color: white; cursor: pointer;">取消</button>
                        <button class="import-btn" style="padding: 8px 16px; background: var(--gpm-primary); border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold;">导入</button>
                    </div>
                </div>
            `;

            const textarea = modal.querySelector('textarea');
            const cancelBtn = modal.querySelector('.cancel-btn');
            const importBtn = modal.querySelector('.import-btn');

            cancelBtn.onclick = () => overlay.remove();
            importBtn.onclick = () => {
                const text = textarea.value.trim();
                if (!text) {
                    alert('请粘贴内容！');
                    return;
                }

                const parsed = this._parseImportText(text);
                if (parsed.length === 0) {
                    alert('未检测到有效内容！');
                    return;
                }

                // Import prompts
                parsed.forEach(item => {
                    if (this.onAddPrompt) {
                        this.onAddPrompt(item.content, item.name);
                    }
                });

                overlay.remove();
                alert(`成功导入 ${parsed.length} 个提示词！`);
            };

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            setTimeout(() => textarea.focus(), 100);
        }

        _parseImportText(text) {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            const results = [];
            const seen = new Set();

            lines.forEach(line => {
                let name = '';
                let content = '';

                // Format 1: Tab-separated (标题\t内容)
                if (line.includes('\t')) {
                    const parts = line.split('\t');
                    const chinesePart = parts[0].trim();
                    const englishPart = parts.slice(1).join(' ').trim();

                    // 🐞 FIX #3: Use Chinese as title, combine both as content
                    name = chinesePart;
                    content = chinesePart + ' ' + englishPart;
                }
                // Format 2: Plain text (每行一个)
                else {
                    content = line;
                    // Extract Chinese as name if exists, otherwise use first 30 chars
                    const chineseMatch = content.match(/[\u4e00-\u9fa5]+/);
                    if (chineseMatch) {
                        name = chineseMatch[0];
                    } else {
                        name = content.slice(0, 30) + (content.length > 30 ? '...' : '');
                    }
                }

                // Dedup check
                if (content && !seen.has(content)) {
                    seen.add(content);
                    results.push({ name, content });
                }
            });

            return results;
        }

        // ✨ FEATURE #5: Pinyin initial extraction helper
        _getPinyinInitials(text) {
            // Simple pinyin initial mapping for common Chinese characters
            const pinyinMap = {
                '赛': 's', '博': 'b', '朋': 'p', '克': 'k',
                '动': 'd', '漫': 'm', '风': 'f', '格': 'g',
                '插': 'c', '画': 'h', '未': 'w', '来': 'l',
                '城': 'c', '市': 's', '夜': 'y', '景': 'j',
                '史': 's', '诗': 's', '级': 'j', '幻': 'h',
                '巨': 'j', '龙': 'l', '北': 'b', '欧': 'o',
                '简': 'j', '约': 'y', '室': 's', '内': 'n',
                '设': 's', '计': 'j', '皮': 'p', '卡': 'k',
                '丘': 'q', '通': 't', '角': 'j', '色': 's',
                '复': 'f', '古': 'g', '胶': 'j', '片': 'p',
                '拍': 'p', '摄': 's', '抽': 'c', '象': 'x',
                '几': 'j', '何': 'h', '艺': 'y', '术': 's',
                '美': 'm', '食': 's', '摄': 's', '影': 'y',
                '超': 'c', '现': 'x', '实': 's', '梦': 'm',
                '境': 'j', '年': 'n', '轻': 'q', '女': 'n',
                '性': 'x', '长': 'c', '发': 'f', '柔': 'r',
                '和': 'h',
            };

            let initials = '';
            for (let char of text) {
                if (pinyinMap[char]) {
                    initials += pinyinMap[char];
                } else if (/[a-zA-Z]/.test(char)) {
                    initials += char.toLowerCase();
                }
            }
            return initials;
        }
    }


    /**
     * BottomPanel Component (Draft)
     */
    class BottomPanel extends Component {
        constructor(styleManager) {
            super(styleManager);
        }

        renderInternal() {
            this.render(`
                <div class="gpm-panel bottom-panel" style="
                    position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
                    width: 600px; height: 300px; z-index: 10001; display: none;
                    flex-direction: column;
                ">
                    <div class="bp-header" style="
                        padding: 8px 12px; background: rgba(255,255,255,0.05);
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                        display: flex; justify-content: space-between; align-items: center;
                        cursor: move;
                    ">
                        <div class="bp-tabs" style="display: flex; gap: 10px;">
                            <span class="bp-tab active" data-tab="draft" style="cursor:pointer; font-weight:bold; border-bottom: 2px solid white;">📝 草稿 (Draft)</span>
                            <span class="bp-tab" data-tab="history" style="cursor:pointer; color: #888;">📜 历史 (History)</span>
                        </div>
                        <button class="gpm-btn close-btn">×</button>
                    </div>

                    <!-- Draft Content -->
                    <div class="bp-content" id="tab-draft" style="flex: 1; padding: 10px; display: flex; flex-direction: column;">
                        <textarea style="
                            flex: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 6px; color: white; padding: 8px; resize: none; font-family: inherit;
                        " placeholder="Enter prompt here..."></textarea>
                        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
                            <button class="gpm-btn copy-btn">复制 (Copy)</button>
                            <button class="gpm-btn clear-btn">清空 (Clear)</button>
                            <button class="gpm-btn primary send-btn">发送 (Send)</button>
                        </div>
                    </div>

                    <!-- History Content -->
                    <div class="bp-content" id="tab-history" style="flex: 1; padding: 0; display: none; flex-direction: column; overflow-y: auto;">
                        <div id="history-list" style="padding: 10px; display: flex; flex-direction: column; gap: 8px;"></div>
                    </div>

                    <!-- Resize Handle -->
                    <div class="gpm-resize-handle bp-resize" style="
                        right: 0;
                        cursor: nwse-resize;
                    "></div>
                </div>
            `);
        }

        afterRender() {
            const panel = this.shadow.querySelector('.bottom-panel');
            const closeBtn = this.shadow.querySelector('.close-btn');

            this.show = () => {
                panel.style.display = 'flex';

                // 🟡 FIX #4: Only sync from input when draft is empty
                const draftContent = this.getText();
                if (this.inputManager && !draftContent.trim()) {
                    const currentVal = this.inputManager.getValue();
                    if (currentVal) this.setText(currentVal);
                }
            };
            this.hide = () => {
                panel.style.display = 'none';
                // User Request: Disable auto-sync to input on close. Manual only.
            };
            this.toggle = () => { panel.style.display === 'none' ? this.show() : this.hide(); };

            closeBtn.onclick = () => this.hide();

            // Tab Logic
            const tabs = this.shadow.querySelectorAll('.bp-tab');
            tabs.forEach(tab => {
                tab.onclick = () => {
                    // Update UI
                    tabs.forEach(t => {
                        t.classList.remove('active');
                        t.style.fontWeight = 'normal';
                        t.style.borderBottom = 'none';
                        t.style.color = '#888';
                    });
                    tab.classList.add('active');
                    tab.style.fontWeight = 'bold';
                    tab.style.borderBottom = '2px solid white';
                    tab.style.color = 'white';

                    const targetId = tab.dataset.tab;
                    this.shadow.querySelectorAll('.bp-content').forEach(c => c.style.display = 'none');
                    const targetContent = this.shadow.getElementById(`tab-${targetId}`);
                    if (targetContent) {
                        targetContent.style.display = 'flex';
                    }

                    // Load History if needed
                    if (targetId === 'history' && this.onHistoryReq) {
                        this.onHistoryReq();
                    }
                };
            });

            const textarea = this.shadow.querySelector('textarea');
            const placeholder = textarea.placeholder;

            // ✨ FEATURE #3: Auto-save draft to localStorage
            this._autoSaveTimer = null;
            const DRAFT_KEY = 'gpm_draft_autosave';

            const autoSave = () => {
                clearTimeout(this._autoSaveTimer);
                this._autoSaveTimer = setTimeout(() => {
                    const content = textarea.value;
                    if (content.trim()) {
                        localStorage.setItem(DRAFT_KEY, JSON.stringify({
                            content: content,
                            timestamp: Date.now()
                        }));
                    }
                }, 3000); // 3 second debounce
            };

            // Restore last draft on open
            const restoreLastDraft = () => {
                try {
                    const saved = localStorage.getItem(DRAFT_KEY);
                    if (saved && !textarea.value.trim()) {
                        const data = JSON.parse(saved);
                        const age = Date.now() - data.timestamp;
                        // Only restore if less than 24 hours old
                        if (age < 24 * 60 * 60 * 1000) {
                            textarea.value = data.content;
                            // Show subtle notification
                            const notice = document.createElement('div');
                            notice.textContent = '已恢复上次草稿 (Draft restored)';
                            notice.style.cssText = `
                                position: absolute; top: 10px; right: 10px;
                                padding: 6px 12px; background: rgba(29, 155, 240, 0.9);
                                color: white; border-radius: 4px; font-size: 11px;
                                z-index: 10; pointer-events: none;
                            `;

                            panel.appendChild(notice);
                            setTimeout(() => notice.remove(), 3000);
                        }
                    }
                } catch (e) {
                    console.warn('[GPM] Failed to restore draft:', e);
                }
            };

            // Call restore when panel opens
            const originalShow = this.show;
            this.show = () => {
                originalShow();
                setTimeout(restoreLastDraft, 100);
            };

            // Bind auto-save to input
            textarea.oninput = autoSave;

            // Enter to Send
            textarea.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (this.onSend) {
                        this.onSend(textarea.value);
                    }
                }
            };

            // Buttons
            const clearBtn = this.shadow.querySelector('.clear-btn');
            const sendBtn = this.shadow.querySelector('.send-btn');
            const copyBtn = this.shadow.querySelector('.copy-btn');

            if (copyBtn) {
                copyBtn.onclick = () => {
                    const text = textarea.value;
                    if (!text) return;
                    navigator.clipboard.writeText(text).then(() => {
                        const originalText = copyBtn.textContent;
                        copyBtn.textContent = '已复制! (Copied)';
                        copyBtn.style.background = 'var(--gpm-success, #00ba7c)';
                        copyBtn.style.color = 'white';
                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                            copyBtn.style.background = ''; // Revert
                            copyBtn.style.color = '';
                        }, 1500);
                    });
                };
            }

            if (clearBtn) {
                clearBtn.onclick = () => {
                    if (confirm('Clear draft?')) {
                        textarea.value = '';
                    }
                };
            }

            if (sendBtn) {
                sendBtn.onclick = () => {
                    if (this.onSend) {
                        this.onSend(this.getText());
                    }
                };
            }

            // Drag Logic
            const header = this.shadow.querySelector('.bp-header');
            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            header.onmousedown = (e) => {
                if (e.target === closeBtn) return;
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = panel.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;

                // Remove transform centering once moved
                panel.style.transform = 'none';
                panel.style.left = initialLeft + 'px';
                panel.style.top = initialTop + 'px';

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            };

            const onMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                panel.style.left = (initialLeft + dx) + 'px';
                panel.style.top = (initialTop + dy) + 'px';
            };

            const onUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);

                // ✨ Persistence: Save position
                if (this.onStateChange) {
                    const rect = panel.getBoundingClientRect();
                    const state = { top: rect.top };
                    if (this.side === 'left') state.left = rect.left;
                    if (this.side === 'right') state.right = document.documentElement.clientWidth - rect.right;
                    this.onStateChange(state);
                }
            };

            // Resize Logic
            const resizer = this.shadow.querySelector('.bp-resize');
            let isResizing = false;
            let startW, startH;

            resizer.onmousedown = (e) => {
                e.stopPropagation();
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startW = panel.offsetWidth;
                startH = panel.offsetHeight;

                document.addEventListener('mousemove', onResize);
                document.addEventListener('mouseup', onResizeUp);
            };

            const onResize = (e) => {
                if (!isResizing) return;
                const w = startW + (e.clientX - startX);
                const h = startH + (e.clientY - startY);
                panel.style.width = w + 'px';
                panel.style.height = h + 'px';
            };


            const onResizeUp = () => {
                isResizing = false;
                document.removeEventListener('mousemove', onResize);
                document.removeEventListener('mouseup', onResizeUp);

                // ✨ Persistence: Save size
                if (this.onStateChange) {
                    this.onStateChange({
                        width: panel.offsetWidth,
                        height: panel.offsetHeight
                    });
                }
            };
        }

        setInputManager(manager) {
            this.inputManager = manager;
        }

        setText(text) {
            const textarea = this.shadow.querySelector('textarea');
            if (textarea) textarea.value = text;

            // Auto-switch to Draft tab
            const draftTab = this.shadow.querySelector('.bp-tab[data-tab="draft"]');
            if (draftTab) draftTab.click();
        }

        insertText(text) {
            const textarea = this.shadow.querySelector('textarea');
            if (textarea) {
                const start = textarea.selectionStart || 0;
                const end = textarea.selectionEnd || 0;
                const value = textarea.value;
                const newValue = value.substring(0, start) + ' ' + text + value.substring(end); // Add space? User said "Append". Usually implies space. But if cursor is manual, maybe raw insert?
                // User said "Insert at cursor", implies exact insertion.
                // However, previous logic was `getText() + ' ' + content`.
                // If I insert at cursor, I should probably respect spacing if needed, but strict insertion is safer.
                // Let's add a space if the previous char is not whitespace?
                // For simplicity, just insert `text`. Users can manage spaces.
                // actually, for prompts, a leading space is usually desired if not at start.

                // Let's do a simple space check
                const pre = value.substring(0, start);
                const toInsert = (pre.length > 0 && !/\s$/.test(pre)) ? ' ' + text : text;

                textarea.value = value.substring(0, start) + toInsert + value.substring(end);

                const newPos = start + toInsert.length;
                textarea.selectionStart = newPos;
                textarea.selectionEnd = newPos;
                textarea.focus();
            }
            // Auto-switch to Draft tab
            const draftTab = this.shadow.querySelector('.bp-tab[data-tab="draft"]');
            if (draftTab) draftTab.click();
        }

        getText() {
            const textarea = this.shadow.querySelector('textarea');
            return textarea ? textarea.value : '';
        }

        setOnSend(callback) {
            this.onSend = callback;
        }

        setOnHistoryReq(callback) {
            this.onHistoryReq = callback;
        }

        setHistory(items) {
            const list = this.shadow.getElementById('history-list');
            if (!list) return;
            list.innerHTML = '';

            if (items.length === 0) {
                list.innerHTML = '<div style="text-align:center; color:#666;">No history</div>';
                return;
            }

            items.forEach(item => {
                const el = document.createElement('div');
                el.style.cssText = `
                    padding: 8px; background: rgba(255,255,255,0.05);
                    border-radius: 6px; font-size: 12px; cursor: pointer;
                `;
                el.innerHTML = `
                    <div style="font-weight:bold; margin-bottom:4px; opacity:0.7;">
                        ${new Date(item.time).toLocaleString()}
                    </div>
                    <div style="color: #ddd;">${item.text}</div>
                `;
                el.onclick = () => {
                    this.setText(item.text);
                    // Switch back to draft
                    this.shadow.querySelector('.bp-tab[data-tab="draft"]').click();
                };
                list.appendChild(el);
            });
        }
    }




    /**
     * AutoRetryManager (Ported from v1.2.0)
     */
    class AutoRetryManager {
        constructor() {
            this.autoRedo = localStorage.getItem("grok-auto-redo") === "1";
            this.fixPrompt = localStorage.getItem("grok-fix-prompt") === "1";
            this.maxRetryLimit = Number(localStorage.getItem("grok-max-retry-limit") || 5);
            this.lastTypedPrompt = localStorage.getItem("grok-last-typed-prompt") || "";

            this.currentImageId = null;
            this.retryCount = 0;
            this.isRetrying = false;
            this.panel = null;

            // Styles
            this.addStyles();
        }

        addStyles() {
            if (document.getElementById('gpm-retry-styles')) return;
            const style = document.createElement('style');
            style.id = 'gpm-retry-styles';
            style.textContent = `
                @keyframes grokRetryBreathe {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(0.95); }
                }
                .grok-retry-breathing {
                    animation: grokRetryBreathe 2s ease-in-out infinite;
                }
                .gpm-retry-panel {
                    position: fixed; top: 100px; right: 20px;
                    background: rgba(20, 20, 20, 0.6); /* Glassmorphism base */
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    color: white; padding: 16px; border-radius: 16px;
                    font-size: 13px; z-index: 999999;
                    width: 280px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.1);
                    display: none; flex-direction: column; gap: 12px;
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }
                .gpm-retry-row { display: flex; align-items: center; justify-content: space-between; }
                .gpm-retry-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
                .gpm-retry-input {
                    width: 50px; padding: 4px 8px; border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: rgba(0,0,0,0.3); color: white; text-align: center;
                }
            `;
            document.head.appendChild(style);
        }

        init() {
            this.createPanel();
            this.attachPromptListeners();
            this.checkImageIdChange();

            // Observe Moderation
            let isChecking = false;
            let lastAttachTime = 0;

            const observer = new MutationObserver(() => {
                if (isChecking) return;
                isChecking = true;
                setTimeout(() => {
                    this.checkModerationPopup();

                    const now = Date.now();
                    if (now - lastAttachTime > 3000) {
                        this.attachPromptListeners();
                        lastAttachTime = now;
                    }
                    isChecking = false;
                }, 500);
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // URL Monitor
            let lastUrl = location.href;
            setInterval(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    this.checkImageIdChange();
                    this.attachPromptListeners();
                    this.checkVisibility(); // Favorites hiding
                }
            }, 1000);

            this.checkVisibility();
        }

        checkVisibility() {
            // Hide on favorites page
            if (location.pathname.includes('/imagine/favorites')) {
                if (this.panel) this.panel.style.display = 'none';
            }
        }

        saveSettings() {
            localStorage.setItem("grok-auto-redo", this.autoRedo ? "1" : "0");
            localStorage.setItem("grok-fix-prompt", this.fixPrompt ? "1" : "0");
            localStorage.setItem("grok-max-retry-limit", this.maxRetryLimit);
        }

        checkImageIdChange() {
            const match = location.pathname.match(/^\/imagine\/([^\/]+)/);
            const imageId = match ? match[1] : null;
            if (imageId !== this.currentImageId) {
                this.currentImageId = imageId;
                this.retryCount = 0;
                this.updatePanel();
            }
        }

        createPanel() {
            if (this.panel) return;
            this.panel = document.createElement('div');
            this.panel.className = 'gpm-retry-panel';
            document.body.appendChild(this.panel);
            this.updatePanel();
        }

        togglePanel(anchorElement) {
            if (!this.panel) this.createPanel();

            // Toggle logic
            const isHidden = this.panel.style.display === 'none';

            if (!isHidden) {
                // Closing
                this.panel.style.display = 'none';
                return;
            }

            // Opening
            this.panel.style.display = 'flex';

            if (anchorElement) {
                // Determine width first (render invisible)
                this.panel.style.visibility = 'hidden';
                const panelRect = this.panel.getBoundingClientRect();
                const rect = anchorElement.getBoundingClientRect();

                // Position to the left of anchor
                const left = rect.left - panelRect.width - 10;
                const top = rect.top;

                this.panel.style.top = top + 'px';
                this.panel.style.left = left + 'px';
                this.panel.style.right = 'auto'; // Reset right
                this.panel.style.visibility = ''; // Show
            }
        }

        updatePanel() {
            if (!this.panel) return;

            // Status Icon State
            const statusIcon = this.retryCount > 0 && this.autoRedo ? 'grok-retry-breathing' : '';

            this.panel.innerHTML = `
                <div class="gpm-retry-row" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                    <div style="font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        <span class="${statusIcon}" style="font-size: 16px;">🔄</span>
                        <span>自动重试 (Auto Retry)</span>
                    </div>
                    <span style="font-family: monospace; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">
                        ${this.retryCount} / ${this.maxRetryLimit}
                    </span>
                </div>

                <label class="gpm-retry-checkbox">
                    <input type="checkbox" id="gpm-chk-redo" ${this.autoRedo ? 'checked' : ''}>
                    <span>启用自动重试 (Enable)</span>
                </label>

                <label class="gpm-retry-checkbox">
                    <input type="checkbox" id="gpm-chk-fix" ${this.fixPrompt ? 'checked' : ''}>
                    <span>自动修复提示词 (Auto Fix)</span>
                </label>

                <div class="gpm-retry-row">
                    <span>最大尝试 (Max Tries):</span>
                    <input type="number" id="gpm-input-limit" class="gpm-retry-input" value="${this.maxRetryLimit}" min="1" max="20">
                </div>

                <button id="gpm-btn-reset" class="gpm-btn" style="width: 100%; margin-top: 4px; justify-content: center;">
                    重置计数 (Reset Count)
                </button>
            `;

            // Bind Events
            this.panel.querySelector('#gpm-chk-redo').onchange = (e) => {
                this.autoRedo = e.target.checked;
                if (this.autoRedo) this.retryCount = 0;
                this.saveSettings();
                this.updatePanel();
            };
            this.panel.querySelector('#gpm-chk-fix').onchange = (e) => {
                this.fixPrompt = e.target.checked;
                this.saveSettings();
            };
            this.panel.querySelector('#gpm-input-limit').onchange = (e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= 50) {
                    this.maxRetryLimit = val;
                    this.saveSettings();
                    this.updatePanel();
                }
            };
            this.panel.querySelector('#gpm-btn-reset').onclick = () => {
                this.retryCount = 0;
                this.updatePanel();
            };
        }

        // --- Logic ---

        deepQuery(selector, root = document) {
            let results = [];
            const traverse = (node) => {
                if (!node) return;
                if (node.querySelectorAll) results.push(...node.querySelectorAll(selector));
                if (node.shadowRoot) {
                    results.push(...node.shadowRoot.querySelectorAll(selector));
                    node.shadowRoot.childNodes.forEach(traverse);
                }
                node.childNodes?.forEach(traverse);
            };
            traverse(root);
            return results;
        }

        attachPromptListeners() {
            const textarea = this.deepQuery("textarea")[0];
            if (!textarea || textarea.dataset.gpmListener) return;

            textarea.dataset.gpmListener = "1";
            const save = () => {
                if (textarea.value && textarea.value.trim()) {
                    this.lastTypedPrompt = textarea.value;
                    localStorage.setItem("grok-last-typed-prompt", this.lastTypedPrompt);
                }
            };

            textarea.addEventListener("input", save);
            textarea.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) save();
            });
        }

        checkModerationPopup() {
            if (!this.autoRedo || this.isRetrying) return;

            if (this.retryCount + 1 >= this.maxRetryLimit) {
                // Limit reached
                this.retryCount++;
                this.autoRedo = false;
                this.saveSettings();
                this.updatePanel();
                console.log("🛑 Max retry reached");
                return;
            }

            const toasts = this.deepQuery('li[data-sonner-toast][data-type="error"][data-visible="true"]');
            if (toasts.length === 0) return;

            console.log("⚠️ Moderation error detected");

            if (this.fixPrompt) this.fixPromptContent();
            this.clickRedo();
        }

        fixPromptContent() {
            const textarea = this.deepQuery("textarea")[0];
            if (!textarea) return;

            let txt = textarea.value || this.lastTypedPrompt;
            if (!txt) return;

            const map = {
                "nude": "wearing swimsuit", "naked": "partially clothed",
                "sex": "romantic", "sexual": "romantic",
                "kill": "defeat", "blood": "red liquid",
                "violent": "intense", "gun": "device",
                "drug": "substance", "illegal": "prohibited"
            };

            Object.keys(map).forEach(k => {
                const re = new RegExp("\\b" + k + "\\b", "gi");
                txt = txt.replace(re, map[k]);
            });

            this.lastTypedPrompt = txt;
            localStorage.setItem("grok-last-typed-prompt", txt);

            textarea.value = txt;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }

        clickRedo() {
            if (this.isRetrying) return;
            this.isRetrying = true;

            // Restore prompt
            const textarea = this.deepQuery("textarea")[0];
            if (textarea && this.lastTypedPrompt) {
                textarea.value = this.lastTypedPrompt;
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
            }

            // Find Redo/Submit
            // We need a robust finder.
            let redoBtn = null;
            const container = textarea ? textarea.closest("div") : null;
            if (container) {
                const buttons = container.querySelectorAll("button");
                // Look for the filled primitive button usually used for submit
                // or just the last button
                for (const btn of buttons) {
                    if (btn.className.includes("bg-button-filled")) { redoBtn = btn; break; }
                    if (btn.getAttribute("data-slot") === "button") { redoBtn = btn; break; }
                }
                if (!redoBtn && buttons.length > 0) redoBtn = buttons[buttons.length - 1];
            }

            if (!redoBtn) {
                console.log("❌ Redo button not found");
                this.autoRedo = false;
                this.saveSettings();
                this.updatePanel();
                this.isRetrying = false;
                return;
            }

            console.log("🔄 Retrying in 1s...");
            setTimeout(() => {
                redoBtn.click();
                this.retryCount++;
                this.updatePanel();
                setTimeout(() => { this.isRetrying = false; }, 1500);
            }, 1000);
        }
    }


    /**
     * Main App Entry Point
     */
    class App {
        constructor() {
            this.storage = new StorageService();
            this.styles = new StyleManager();
            this.inputManager = new InputManager();
            this.autoRetryManager = new AutoRetryManager();
            this.init();
        }

        showToast(message, duration = 3000) {
            const toast = document.createElement('div');
            toast.textContent = message;
            Object.assign(toast.style, {
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(29, 155, 240, 0.9)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                zIndex: '100000',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                pointerEvents: 'none',
                opacity: '0',
                transition: 'opacity 0.3s ease'
            });

            document.body.appendChild(toast);

            // Animate In
            requestAnimationFrame(() => toast.style.opacity = '1');

            // Auto Remove
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        init() {
            console.log('[GPM v2] Initializing...');
            this.container = document.createElement('div');
            this.container.id = APP_ID;
            document.body.appendChild(this.container);

            this.autoRetryManager.init();

            // Special Mode for x.com/home (Lite Mode) - Exclude Grok interface
            const isX = window.location.hostname.includes('x.com') || window.location.hostname.includes('twitter.com');
            // 🟡 FIX #6: More precise Grok detection
            const isGrok = window.location.pathname.includes('/i/grok') ||
                window.location.hostname === 'grok.com';

            if (isX && !isGrok) {
                console.log('[GPM] Lite Mode activated for X.com');
                this.renderXSearchWidget();
                return; // Stop here, do not load full AGI panels
            }

            // ✨ FEATURE #1: Global keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Ignore if user is typing in input/textarea (except our own)
                const target = e.target;
                const isOurElement = target.closest && target.closest('#grok-prompt-manager-v2');
                if (!isOurElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                    return;
                }

                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const modifier = isMac ? e.metaKey : e.ctrlKey;

                // Ctrl/Cmd + K: Toggle draft panel
                if (modifier && e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    if (this.bottomPanel) {
                        this.bottomPanel.toggle();
                    }
                }

                // Ctrl/Cmd + F: Focus search (left panel)
                if (modifier && e.key.toLowerCase() === 'f') {
                    e.preventDefault();
                    const searchInput = this.leftPanel?.shadow.querySelector('.search-input');
                    if (searchInput) {
                        this.leftPanel.show();
                        searchInput.focus();
                    }
                }

                // Esc: Close all panels
                if (e.key === 'Escape') {
                    this.leftPanel?.hide();
                    this.rightPanel?.hide();
                    this.bottomPanel?.hide();
                }
            });

            // Normal Mode (Grok / Full AGI)
            // Mount Panels
            const data = this.storage.get(); // Get latest config
            const pSettings = data.settings?.panels || {};

            // Left
            const leftCfg = pSettings.left || { width: 300, top: 80, left: 20 };
            this.leftPanel = new SidePanel(this.styles, {
                side: 'left',
                ...leftCfg,
                onStateChange: (newState) => this.savePanelState('left', newState)
            });
            this.leftPanel.renderInternal();
            this.leftPanel.mount(this.container);

            // Right
            const rightCfg = pSettings.right || { width: 300, top: 80, right: 20 };
            this.rightPanel = new SidePanel(this.styles, {
                side: 'right',
                ...rightCfg,
                onStateChange: (newState) => this.savePanelState('right', newState)
            });
            this.rightPanel.renderInternal();
            this.rightPanel.mount(this.container);

            this.bottomPanel = new BottomPanel(this.styles);
            this.bottomPanel.renderInternal();
            this.bottomPanel.mount(this.container);

            // Bottom Panel Persistence
            const bottomCfg = pSettings.bottom || {};
            const bpEl = this.bottomPanel.shadow.querySelector('.bottom-panel');
            if (bpEl && bottomCfg) {
                if (bottomCfg.top) bpEl.style.top = bottomCfg.top + 'px';
                if (bottomCfg.left) bpEl.style.left = bottomCfg.left + 'px';
                if (bottomCfg.width) bpEl.style.width = bottomCfg.width + 'px';
                if (bottomCfg.height) bpEl.style.height = bottomCfg.height + 'px';
                if (bottomCfg.left || bottomCfg.top) bpEl.style.transform = 'none';
            }
            this.bottomPanel.onStateChange = (newState) => this.savePanelState('bottom', newState);

            this.bottomPanel.setInputManager(this.inputManager);

            // Bind Send Action (Blue Button in Draft Panel)
            this.bottomPanel.setOnSend((text) => {
                if (!text) {
                    this.showToast('内容为空');
                    return;
                }

                this.inputManager.insert(text);

                // Auto Submit logic (User Request: "automatically send operation")
                setTimeout(() => {
                    const submitted = this.inputManager.submit();
                    if (submitted) {
                        this.showToast('已写入并发送 (Sent)');
                        this.bottomPanel.setText(''); // Clear draft on success
                        this.bottomPanel.hide(); // Auto Close
                    } else {
                        this.showToast('已写入输入框 (Inserted)');
                    }
                }, 100); // Small delay to ensure React state updates

                this.addToHistory(text);
            });

            this.bottomPanel.setOnHistoryReq(() => {
                const data = this.storage.get();
                this.bottomPanel.setHistory(data.history || []);
            });



            this.loadLibraryData();
            this.renderToggle();

            // ✨ Monitor Panel Visibility (Hide on Favorites)
            this.checkGlobalVisibility();
            setInterval(() => this.checkGlobalVisibility(), 1000);
        }

        checkGlobalVisibility() {
            const path = location.pathname;
            // Target pages: Home, Imagine, Favorites (triggered on path change)
            const isTargetPage = path === '/' || path.startsWith('/imagine');

            // Reset triggers on navigation
            if (this._lastPath !== path) {
                this._lastPath = path;
                this._hasAutoHidden = false;
                this._hasRestored = false;
                this._hasAutoExpandedPost = false;
            }

            // ✨ Feature: Auto-expand Main Panel on Post Detail Page
            if (path.startsWith('/imagine/post/')) {
                if (!this._hasAutoExpandedPost) {
                    this._hasAutoExpandedPost = true;
                    if (this.leftPanel && this.leftPanel.show) this.leftPanel.show(true);
                }
                return;
            }

            if (isTargetPage) {
                if (!this._hasAutoHidden) {
                    this._hasAutoHidden = true;
                    // Auto-Hide (Silent) - Enforce "Icon Only" default on entry
                    if (this.leftPanel && this.leftPanel.hide) this.leftPanel.hide(false);
                    if (this.rightPanel && this.rightPanel.hide) this.rightPanel.hide(false);
                    if (this.bottomPanel && this.bottomPanel.hide) this.bottomPanel.hide(false);
                }
            } else {
                // Non-Target Page: Restore Persistent State (Memory)
                if (!this._hasRestored) {
                    this._hasRestored = true;
                    const data = this.storage.get();
                    const s = data.settings?.panels || {};

                    if (this.leftPanel && this.leftPanel.show) {
                        s.left?.visible ? this.leftPanel.show(false) : this.leftPanel.hide(false);
                    }
                    if (this.rightPanel && this.rightPanel.show) {
                        s.right?.visible ? this.rightPanel.show(false) : this.rightPanel.hide(false);
                    }
                    // Bottom Panel: Manual Only (User Request) - Do not auto-restore
                    // if (this.bottomPanel && this.bottomPanel.show) {
                    //    s.bottom?.visible ? this.bottomPanel.show(false) : this.bottomPanel.hide(false);
                    // }
                }
            }
        }

        addNewPrompt(content, type = 'text', category = null, nameOverride = null) {
            const data = this.storage.get();
            const activeLibId = type === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const activeLib = data.libraries.find(l => l.id === activeLibId) || data.libraries.find(l => l.id === data.activeLibraryId);

            if (activeLib) {
                // Smart Title Logic
                let title = nameOverride || (content.slice(0, 20) + (content.length > 20 ? '...' : '')); // Default

                // Compare with existing prompts to find diff
                const existingPrompts = activeLib.prompts.filter(p => !p.type || p.type === type);
                // Find best match (longest shared prefix > 10 chars)
                let bestMatch = null;
                let maxPrefix = 0;

                existingPrompts.forEach(p => {
                    const pContent = p.content || '';
                    let i = 0;
                    while (i < content.length && i < pContent.length && content[i] === pContent[i]) {
                        i++;
                    }
                    if (i > 10 && i > maxPrefix) {
                        maxPrefix = i;
                        bestMatch = p;
                    }
                });

                if (bestMatch) {
                    // Title is the diff part
                    const diff = content.slice(maxPrefix).trim();
                    if (diff.length > 0) {
                        title = `(Diff) ${diff.slice(0, 20)}`;
                    }
                }

                const newPrompt = {
                    id: Date.now(),
                    name: title,
                    content: content,
                    category: category || 'Uncategorized',
                    pinned: false,
                    type: type
                };
                activeLib.prompts.unshift(newPrompt);
                this.storage.save(data);
                this.loadLibraryData();
                this.showToast('已添加提示词 (Prompt Added)');
            }
        }

        handlePromptAction(action, prompt, type) {
            const data = this.storage.get();
            const activeLibId = type === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const activeLib = data.libraries.find(l => l.id === activeLibId);
            if (!activeLib) return;

            const pIndex = activeLib.prompts.findIndex(p => p.id === prompt.id);
            if (pIndex === -1) return;

            switch (action) {
                case 'replace':
                    this.handlePromptClick(prompt, true);
                    break;
                case 'append':
                    this.handlePromptClick(prompt, false);
                    break;
                case 'rename':
                    const newName = window.prompt('重命名标题 (Rename Title):', prompt.name);
                    if (newName) {
                        activeLib.prompts[pIndex].name = newName;
                        this.storage.save(data);
                        this.loadLibraryData();
                    }
                    break;
                case 'edit':
                    if (window.showGPMEditModal) {
                        window.showGPMEditModal(prompt.content, (newContent) => {
                            activeLib.prompts[pIndex].content = newContent;
                            this.storage.save(data);
                            this.loadLibraryData();
                        });
                    } else {
                        // Fallback just in case
                        const newContent = window.prompt('编辑内容 (Edit Content):', prompt.content);
                        if (newContent) {
                            activeLib.prompts[pIndex].content = newContent;
                            this.storage.save(data);
                            this.loadLibraryData();
                        }
                    }
                    break;
                case 'copy':
                    navigator.clipboard.writeText(prompt.content).then(() => {
                        this.showToast('已复制 (Copied)');
                    });
                    break;
                case 'pin':
                    activeLib.prompts[pIndex].pinned = !activeLib.prompts[pIndex].pinned;
                    // Sort happen in renderList based on logic, but usually pinned items should come first?
                    // Currently sorting is just via ID (time). We might need to update sort logic in SidePanel.
                    // For now just save state.
                    this.storage.save(data);
                    this.loadLibraryData();
                    break;
                case 'delete':
                    if (confirm(`确定删除 "${prompt.name}"?`)) {
                        activeLib.prompts.splice(pIndex, 1);
                        this.storage.save(data);
                        this.loadLibraryData();
                        this.showToast('已删除 (Deleted)');
                    }
                    break;
            }
        }

        renameCurrentLibrary(type) {
            const data = this.storage.get();
            const activeLibId = type === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const lib = data.libraries.find(l => l.id === activeLibId);
            if (!lib) return;

            const newName = prompt('重命名库 (Rename Library):', lib.name);
            if (newName && newName.trim() !== '') {
                lib.name = newName.trim();
                this.storage.save(data);
                this.loadLibraryData();
                this.showToast(`库已重命名为 "${lib.name}"`);
            }
        }

        addNewCategory(type) {
            const name = prompt('新建分类名称 (New Category Name):');
            if (!name) return;
            this.addNewPrompt('New Prompt', type, name.trim());
        }

        exportCategory(type) {
            const panel = type === 'text' ? this.leftPanel : this.rightPanel;
            if (!panel) return;
            const cat = panel.activeCategory;
            if (!cat || cat === '全部 (All)') {
                alert('请先选择一个具体分类 (Please select a specific category to export)');
                return;
            }

            const data = this.storage.get();
            const activeLibId = type === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const lib = data.libraries.find(l => l.id === activeLibId);
            if (!lib) return;

            const prompts = lib.prompts.filter(p => p.category === cat && (!p.type || p.type === type));
            if (prompts.length === 0) {
                alert('该分类为空 (Category is empty)');
                return;
            }

            const blob = new Blob([JSON.stringify(prompts, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `GrokPrompts_${cat}_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        }

        importToCategory(type) {
            const panel = type === 'text' ? this.leftPanel : this.rightPanel;
            if (!panel) return;
            const cat = panel.activeCategory;
            if (!cat || cat === '全部 (All)') {
                alert('请先选择一个具体分类 (Please select a specific category to import into)');
                return;
            }

            // Reuse Paste Import Logic but override category
            if (window.showGPMPasteImport) {
                window.showGPMPasteImport((imported) => {
                    if (Array.isArray(imported)) {
                        imported.forEach(item => {
                            this.addNewPrompt(item.content, type, cat, item.name);
                        });
                        this.showToast(`已导入 ${imported.length} 个提示词到 "${cat}"`);
                    }
                });
            } else {
                alert('Import module not ready');
            }
        }

        loadLibraryData() {
            const data = this.storage.get();

            // 🔴 FIX #1: Ensure at least one default library exists
            if (!data.libraries || data.libraries.length === 0) {
                data.libraries = [this.storage.defaultSchema().libraries[0]];
                this.storage.save(data);
            }

            // Initialize independent states if missing
            if (!data.activeTextLibraryId) data.activeTextLibraryId = data.activeLibraryId || data.libraries[0].id;
            if (!data.activeVideoLibraryId) data.activeVideoLibraryId = data.activeLibraryId || data.libraries[0].id;

            const activeTextLibId = data.activeTextLibraryId;
            const activeVideoLibId = data.activeVideoLibraryId;

            const textLibrary = data.libraries.find(l => l.id === activeTextLibId) || data.libraries[0];
            const videoLibrary = data.libraries.find(l => l.id === activeVideoLibId) || data.libraries[0];

            const allLibraries = data.libraries.map(l => ({ id: l.id, name: l.name }));

            // Setup Left Panel (Text)
            if (textLibrary) {
                const textPrompts = textLibrary.prompts.filter(p => !p.type || p.type === 'text');

                this.leftPanel.setup(
                    { ...textLibrary, prompts: textPrompts, id: textLibrary.id, name: textLibrary.name },
                    allLibraries,
                    (prompt) => this.handlePromptClick(prompt),
                    (newLibId) => this.switchLibrary(newLibId, 'text'),
                    () => this.importLibrary(),
                    () => this.exportLibrary('text'),
                    () => this.addNewLibrary('text'),
                    () => this.deleteCurrentLibrary('text'),
                    (content) => this.addNewPrompt(content, 'text'),
                    () => this.exportAllLibraries(), // Add missing bulk export binding
                    () => this.bottomPanel.toggle(), // onDraftToggle
                    (action, prompt) => this.handlePromptAction(action, prompt, 'text'),
                    (src, tgt) => this.handleReorder(src, tgt, 'text'),
                    null, // onAiAssist
                    () => this.renameCurrentLibrary('text'),
                    () => this.addNewCategory('text'),
                    () => this.importToCategory('text'),
                    () => this.exportCategory('text')
                );
            }

            // Setup Right Panel (Video)
            if (videoLibrary) {
                const videoPrompts = videoLibrary.prompts.filter(p => p.type === 'video');

                this.rightPanel.setup(
                    { ...videoLibrary, prompts: videoPrompts, id: videoLibrary.id, name: videoLibrary.name },
                    allLibraries,
                    (prompt) => this.handlePromptClick(prompt),
                    (newLibId) => this.switchLibrary(newLibId, 'video'),
                    () => this.importLibrary(),
                    () => this.exportLibrary('video'),
                    () => this.addNewLibrary('video'),
                    () => this.deleteCurrentLibrary('video'),
                    (content) => this.addNewPrompt(content, 'video'),
                    () => this.exportAllLibraries(), // Add missing bulk export binding
                    () => this.bottomPanel.toggle(), // onDraftToggle, matches left signature for consistency or null
                    (action, prompt) => this.handlePromptAction(action, prompt, 'video'),
                    (src, tgt) => this.handleReorder(src, tgt, 'video'),
                    () => this.autoRetryManager.togglePanel(this.rightPanel.shadow.querySelector('.gpm-panel')),
                    () => this.renameCurrentLibrary('video'),
                    () => this.addNewCategory('video'),
                    () => this.importToCategory('video'),
                    () => this.exportCategory('video')
                );

                // Render Modifiers (Video Panel) - Separate list as requested
                this.rightPanel.renderModifiers(
                    data.videoModifiers || [],
                    (newMod) => this.addModifier(newMod, 'video'),
                    (modToDelete) => this.deleteModifier(modToDelete, 'video'),
                    (mod) => this.handleModifierClick(mod),
                    () => this.importModifiers('video'),
                    () => this.exportModifiers('video')
                );
            }

            // Render Modifiers (Left Panel Only for now)
            this.leftPanel.renderModifiers(
                data.modifiers || [],
                (newMod) => this.addModifier(newMod, 'text'),
                (modToDelete) => this.deleteModifier(modToDelete, 'text'),
                (mod) => this.handleModifierClick(mod),
                () => this.importModifiers('text'),
                () => this.exportModifiers('text')
            );
        }

        handleReorder(srcId, tgtId, type) {
            const data = this.storage.get();
            const activeLibId = type === 'text' ? data.activeTextLibraryId : data.activeVideoLibraryId;
            const activeLib = data.libraries.find(l => l.id === activeLibId);
            if (!activeLib || !activeLib.prompts) return;

            // Note: Data IDs might be numbers, but dragged IDs are strings usually.
            const srcIndex = activeLib.prompts.findIndex(p => String(p.id) === String(srcId));
            const tgtIndex = activeLib.prompts.findIndex(p => String(p.id) === String(tgtId));

            if (srcIndex === -1 || tgtIndex === -1 || srcIndex === tgtIndex) return;

            // Move
            const [moved] = activeLib.prompts.splice(srcIndex, 1);
            activeLib.prompts.splice(tgtIndex, 0, moved);

            this.storage.save(data);
            this.loadLibraryData();
            // Optional: Toast "Sorted" to confirm action? Maybe too noisy.
        }

        switchLibrary(libId, type) {
            const data = this.storage.get();
            if (data.libraries.some(l => l.id === libId)) {
                if (type === 'text') data.activeTextLibraryId = libId;
                else data.activeVideoLibraryId = libId;

                this.storage.save(data);
                this.loadLibraryData();
                this.showToast(`已切换库`);
            }
        }

        addNewLibrary(type) {
            const name = prompt('请输入新库名称:', 'New Library');
            if (!name) return;
            const data = this.storage.get();
            const newLib = {
                id: Date.now().toString(),
                name: name,
                prompts: []
            };
            data.libraries.push(newLib);

            if (type === 'text') data.activeTextLibraryId = newLib.id;
            else data.activeVideoLibraryId = newLib.id;

            this.storage.save(data);
            this.loadLibraryData();
            this.showToast('已创建新库');
        }

        deleteCurrentLibrary(type) {
            const data = this.storage.get();
            if (data.libraries.length <= 1) {
                alert('无法删除最后一个库');
                return;
            }
            if (!confirm('确定要删除当前库吗？此操作无法撤销。')) return;

            const activeKey = type === 'text' ? 'activeTextLibraryId' : 'activeVideoLibraryId';
            const currentId = data[activeKey] || data.libraries[0].id;

            data.libraries = data.libraries.filter(l => l.id !== currentId);

            const fallbackId = data.libraries[0].id;
            data.activeTextLibraryId = (data.activeTextLibraryId === currentId) ? fallbackId : data.activeTextLibraryId;
            data.activeVideoLibraryId = (data.activeVideoLibraryId === currentId) ? fallbackId : data.activeVideoLibraryId;

            this.storage.save(data);
            this.loadLibraryData();
            this.showToast('库已删除');
        }

        exportLibrary(type) {
            const data = this.storage.get();
            const activeKey = type === 'text' ? 'activeTextLibraryId' : 'activeVideoLibraryId';
            const currentId = data[activeKey] || data.libraries[0].id;
            const lib = data.libraries.find(l => l.id === currentId);

            if (lib) {
                this.downloadJSON(lib, lib.name);
            }
        }

        exportAllLibraries() {
            const data = this.storage.get();
            // Export as array of libraries
            const exportData = {
                version: '2.1',
                activeTextId: data.activeTextLibraryId,
                activeVideoId: data.activeVideoLibraryId,
                libraries: data.libraries
            };
            this.downloadJSON(exportData, `Grok_Backup_${new Date().toISOString().slice(0, 10)}`);
        }

        downloadJSON(obj, filename) {
            const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        importLibrary() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const json = JSON.parse(evt.target.result);
                        const data = this.storage.get();

                        // Case 1: Full Backup Import
                        if (json.libraries && Array.isArray(json.libraries)) {
                            let count = 0;
                            json.libraries.forEach(impLib => {
                                if (!data.libraries.some(l => l.id === impLib.id)) {
                                    data.libraries.push(impLib);
                                    count++;
                                } else {
                                    // Conflict -> Add as copy
                                    impLib.id = Date.now() + Math.random().toString().slice(2, 8);
                                    impLib.name = impLib.name + ' (Import)';
                                    data.libraries.push(impLib);
                                    count++;
                                }
                            });
                            this.storage.save(data);
                            this.loadLibraryData();
                            this.showToast(`已导入 ${count} 个库`);
                            return;
                        }

                        // Case 2: Single Library Import
                        let newLib = Array.isArray(json) ? { prompts: json } : json;

                        // Fallback ID
                        if (!newLib.id) newLib.id = Date.now().toString();

                        // Use Filename as Library Name (User Request)
                        // Remove extension
                        const filename = file.name.replace(/\.json$/i, '');
                        newLib.name = filename;

                        // Ensure not duplicate
                        if (data.libraries.some(l => l.id === newLib.id)) {
                            newLib.id = Date.now().toString();
                        }

                        // Ensure prompts array
                        if (!newLib.prompts) newLib.prompts = [];

                        data.libraries.push(newLib);
                        this.storage.save(data);
                        this.loadLibraryData();
                        this.showToast(`库 "${filename}" 已导入`);

                    } catch (err) {
                        console.error(err);
                        alert(`导入失败 (Import Failed):\n${err.message}`);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        importModifiers(type = 'text') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.style.display = 'none';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const json = JSON.parse(evt.target.result);
                        if (!Array.isArray(json)) {
                            throw new Error('格式无效：必须是字符串数组 (Invalid format: must be an array of strings)');
                        }

                        const data = this.storage.get();
                        const key = type === 'text' ? 'modifiers' : 'videoModifiers';
                        if (!data[key]) data[key] = [];

                        let count = 0;
                        json.forEach(mod => {
                            if (typeof mod === 'string' && !data[key].includes(mod)) {
                                data[key].push(mod);
                                count++;
                            }
                        });

                        this.storage.save(data);
                        this.loadLibraryData();
                        this.showToast(`已导入 ${count} 个标签 (${type})`);

                    } catch (err) {
                        console.error(err);
                        alert(`导入失败 (Import Failed):\n${err.message}`);
                    }
                };
                reader.readAsText(file);
            };
            document.body.appendChild(input);
            input.click();
            setTimeout(() => input.remove(), 100);
        }

        exportModifiers(type = 'text') {
            const data = this.storage.get();
            const key = type === 'text' ? 'modifiers' : 'videoModifiers';
            const modifiers = data[key] || [];
            if (modifiers.length === 0) {
                alert('没有可导出的标签 (No modifiers to export)');
                return;
            }

            const blob = new Blob([JSON.stringify(modifiers, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `modifiers_${type}_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        addModifier(mod, type = 'text') {
            const data = this.storage.get();
            const key = type === 'text' ? 'modifiers' : 'videoModifiers';
            if (!data[key]) data[key] = [];
            if (!data[key].includes(mod)) {
                data[key].push(mod);
                this.storage.save(data);
                this.loadLibraryData();
            }
        }

        deleteModifier(mod, type = 'text') {
            const data = this.storage.get();
            const key = type === 'text' ? 'modifiers' : 'videoModifiers';
            if (data[key]) {
                data[key] = data[key].filter(m => m !== mod);
                this.storage.save(data);
                this.loadLibraryData();
            }
        }

        // ✨ Persistence Helper
        savePanelState(side, newState) {
            const data = this.storage.get();
            if (!data.settings) data.settings = {};
            if (!data.settings.panels) data.settings.panels = {};
            if (!data.settings.panels[side]) data.settings.panels[side] = {}; // init if missing

            Object.assign(data.settings.panels[side], newState);
            this.storage.save(data);
            // console.log(`[GPM] Saved ${side} panel state:`, newState);
        }

        handleModifierClick(mod, isReplace = false) {
            // ✨ FIX (v3.0.2): Use smart routing logic similar to prompts
            this._sendContent(mod, isReplace);
            // Old Logic: Forced draft panel open
            // if (isReplace) { this.bottomPanel.setText(mod); } else { this.bottomPanel.insertText(mod); }
            // this.bottomPanel.show();
        }

        addToHistory(text) {
            if (!text || !text.trim()) return;
            const data = this.storage.get();
            if (!data.history) data.history = [];

            // Avoid duplicates at the top
            if (data.history.length > 0 && data.history[0].text === text) return;

            data.history.unshift({ time: Date.now(), text: text });
            if (data.history.length > 50) data.history.pop(); // Limit to 50 items

            this.storage.save(data);
        }

        showVariableModal(vars, onConfirm) {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000;
                display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);
            `;

            const modal = document.createElement('div');
            modal.className = 'gpm-panel';
            modal.style.cssText = `
                width: 400px; padding: 20px; display: flex; flex-direction: column; gap: 15px;
                background: var(--gpm-glass-bg); border: 1px solid var(--gpm-glass-border);
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            `;

            modal.innerHTML = `
                <h3 style="margin: 0 0 10px; font-size: 16px;">填写变量 (Fill Variables)</h3>
                <div class="vars-container" style="display: flex; flex-direction: column; gap: 10px;"></div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                    <button class="gpm-btn close-btn">取消 (Cancel)</button>
                    <button class="gpm-btn primary confirm-btn">确认 (Confirm)</button>
                </div>
            `;

            const container = modal.querySelector('.vars-container');
            const inputs = {};

            const submit = () => {
                const values = {};
                for (const v of vars) {
                    values[v] = inputs[v].value;
                }
                overlay.remove();
                onConfirm(values);
            };

            vars.forEach((v, index) => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.flexDirection = 'column';
                row.style.gap = '4px';

                const label = document.createElement('label');
                label.textContent = v;
                label.style.fontSize = '12px';
                label.style.color = 'var(--gpm-text-dim)';

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'var-input';
                input.placeholder = `Enter value for ${v}`;
                input.style.padding = '8px';

                input.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < vars.length - 1) {
                            // Focus next
                            const nextV = vars[index + 1];
                            if (inputs[nextV]) inputs[nextV].focus();
                        } else {
                            submit();
                        }
                    }
                };

                inputs[v] = input;
                row.appendChild(label);
                row.appendChild(input);
                container.appendChild(row);
            });

            modal.querySelector('.close-btn').onclick = () => overlay.remove();
            modal.querySelector('.confirm-btn').onclick = submit;

            overlay.appendChild(modal);
            this.container.appendChild(overlay);

            // Focus first
            setTimeout(() => {
                if (vars.length > 0) inputs[vars[0]].focus();
            }, 50);
        }

        handlePromptClick(prompt, isReplace = false) {
            const content = prompt.content;

            // Template Variable Logic
            const vars = TemplateEngine.extractVariables(content);
            if (vars.length > 0) {
                this.showVariableModal(vars, (values) => {
                    let filledContent = content;
                    vars.forEach(v => {
                        const val = values[v] || '';
                        filledContent = filledContent.replace(new RegExp(`\\{${v}\\}`, 'g'), val);
                    });

                    // ✨ NEW FEATURE: Smart routing based on draft panel state
                    this._sendContent(filledContent, isReplace);
                });
                return;
            }

            // ✨ NEW FEATURE: Smart routing based on draft panel state
            this._sendContent(content, isReplace);
        }

        // ✨ NEW FEATURE: Helper method for smart content routing
        _sendContent(content, isReplace) {
            const draftPanel = this.bottomPanel.shadow.querySelector('.bottom-panel');
            const isDraftOpen = draftPanel && draftPanel.style.display !== 'none';

            if (isDraftOpen) {
                // Draft panel is open → send to draft
                if (isReplace) {
                    this.bottomPanel.setText(content);
                    this.showToast('已替换草稿内容 (Replaced in Draft)');
                } else {
                    this.bottomPanel.insertText(content);
                    this.showToast('已插入草稿 (Inserted to Draft)');
                }
            } else {
                // Draft panel is closed → send directly to main input
                if (isReplace) {
                    this.inputManager.setValue(content);
                    this.showToast('已替换输入框 (Replaced in Input)');
                } else {
                    this.inputManager.insert(content);
                    this.showToast('已插入输入框 (Inserted to Input)');
                }
            }
        }



        renderXSearchWidget() {
            const widget = new Component(this.styles);
            const btnStyle = `
                width: 50px; height: 50px; border-radius: 50%;
                background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: transform 0.2s, background 0.2s;
                font-size: 24px; color: white;
            `;
            widget.render(`
                <div class="gpm-widget-container" style="
                    position: fixed; bottom: 80px; right: 20px;
                    display: flex; flex-direction: column; gap: 15px;
                    z-index: 9999;
                ">
                    <!-- Advanced Search -->
                    <div class="gpm-widget-btn search-btn" style="${btnStyle}" title="Advanced Search">
                        <span>🔍</span>
                    </div>

                    <!-- Grok -->
                    <div class="gpm-widget-btn grok-btn" style="${btnStyle}" title="Go to Grok">
                        <span>🤖</span>
                    </div>
                </div>
            `);
            widget.mount(this.container);

            const setupBtn = (selector, action) => {
                const el = widget.shadow.querySelector(selector);
                if (!el) return;
                el.onmouseenter = () => {
                    el.style.transform = 'scale(1.1)';
                    el.style.background = 'rgba(29, 155, 240, 0.8)';
                };
                el.onmouseleave = () => {
                    el.style.transform = 'scale(1)';
                    el.style.background = 'rgba(0,0,0,0.6)';
                };
                el.onclick = action;
            };

            setupBtn('.grok-btn', () => window.location.href = 'https://x.com/i/grok');
            setupBtn('.search-btn', () => window.location.href = 'https://x.com/search-advanced');
        }

        renderToggle() {
            const toggle = new Component(this.styles);
            toggle.afterRender = () => {
                const btn = toggle.shadow.querySelector('.gpm-toggle');
                // Sync Logic: Toggle all based on Left Panel state
                btn.onclick = () => {
                    const isLeftVisible = this.leftPanel.shadow.querySelector('.side-panel').style.display !== 'none';
                    if (isLeftVisible) {
                        this.leftPanel.hide();
                        this.rightPanel.hide();
                        this.bottomPanel.hide();
                    } else {
                        // User Request: Only expand side panels, keep bottom panel closed (manual trigger only)
                        this.leftPanel.show();
                        this.rightPanel.show();
                    }
                };
            };
            toggle.render(`
                <div class="gpm-toggle gpm-panel" style="
                    position: fixed; bottom: 20px; right: 20px;
                    width: 50px; height: 50px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; z-index: 9999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                ">
                    <img src="${APP_ICON_BASE64}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                </div>
            `);
            toggle.mount(this.container);
        }
    }

    // ===== GLOBAL HELPERS (v2.7.1 Fix) =====
    window.gpmExportLib = function () {
        try {
            let raw = (typeof GM_getValue !== 'undefined' ? GM_getValue('grok_v2_data') : null) || localStorage.getItem('GPM_V2_MIRROR') || localStorage.getItem('grok_v2_data');
            if (!raw) return alert('No data to export.');
            const data = JSON.parse(raw);
            const libId = data.activeTextLibraryId || 'default';
            const lib = data.libraries.find(l => l.id === libId);
            if (!lib) return alert('Library not found');
            const blob = new Blob([JSON.stringify(lib, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `GrokExport_${lib.name}_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        } catch (e) { alert('Export Error: ' + e.message); }
    };
    window.gpmBackupAll = function () {
        try {
            let raw = (typeof GM_getValue !== 'undefined' ? GM_getValue('grok_v2_data') : null) || localStorage.getItem('GPM_V2_MIRROR') || localStorage.getItem('grok_v2_data');
            if (!raw) return alert('No data found.');
            const blob = new Blob([raw], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `GrokBackup_FULL_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        } catch (e) { alert('Backup Error: ' + e.message); }
    };
    window.showGPMPasteImport = function (cb) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);';
        overlay.innerHTML = `
            <div style="width:600px;background:#202020;border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:20px;color:white;display:flex;flex-direction:column;gap:15px;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                <h3 style="margin:0;font-size:18px;">📋 粘贴导入 (Paste Import)</h3>
                <div style="color:#888;font-size:12px;">请遵循 “标题 + 双换行 + 内容” 的格式，或者 “标题 + Tab + 内容”</div>
                <textarea id="p-area" style="min-height:300px;background:rgba(0,0,0,0.3);color:white;border:1px solid rgba(255,255,255,0.1);padding:12px;border-radius:6px;resize:vertical;"></textarea>
                <div style="text-align:right;gap:10px;display:flex;justify-content:flex-end;">
                    <button id="p-cancel" class="gpm-btn" style="padding:8px 16px;background:rgba(255,255,255,0.1);border:none;border-radius:6px;color:white;cursor:pointer;">Cancel</button>
                    <button id="p-import" class="gpm-btn primary" style="background:#1d9bf0;border:none;padding:8px 16px;cursor:pointer;color:white;border-radius:6px;font-weight:bold;">Import</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#p-cancel').onclick = () => overlay.remove();
        overlay.querySelector('#p-import').onclick = () => {
            const text = overlay.querySelector('#p-area').value;
            if (text) {
                const lines = text.split('\n').filter(l => l.trim());
                cb(lines.map(l => {
                    l = l.trim();
                    const parts = l.split(/\s+/);
                    let name = parts[0];
                    if (name.length > 30) {
                        name = l.slice(0, 30) + '...';
                    }
                    const content = l.replace(/\t/g, ' ');
                    return { name: name, content: content };
                }));
            }
            overlay.remove();
        };
    };

    window.showGPMEditModal = function (initialContent, onSave) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);';

        const modal = document.createElement('div');
        modal.style.cssText = 'width:600px;max-width:90vw;background:#202020;border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:15px;box-shadow:0 10px 40px rgba(0,0,0,0.5);';

        modal.innerHTML = `
            <h3 style="margin:0;color:white;font-size:18px;">📝 编辑内容 (Edit Content)</h3>
            <textarea id="edit-area" style="
                flex:1;min-height:300px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);
                color:white;padding:12px;border-radius:6px;resize:vertical;font-family:inherit;line-height:1.5;
            "></textarea>
            <div style="display:flex;justify-content:flex-end;gap:10px;">
                <button id="edit-cancel" class="gpm-btn" style="padding:8px 16px;background:rgba(255,255,255,0.1);color:white;border:none;border-radius:6px;cursor:pointer;">取消</button>
                <button id="edit-save" class="gpm-btn primary" style="padding:8px 16px;background:#1d9bf0;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">保存</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const textarea = modal.querySelector('#edit-area');
        textarea.value = initialContent;
        setTimeout(() => textarea.focus(), 50);

        const close = () => overlay.remove();

        modal.querySelector('#edit-cancel').onclick = close;
        modal.querySelector('#edit-save').onclick = () => {
            const val = textarea.value.trim();
            if (val) onSave(val);
            close();
        };
        overlay.onclick = (e) => { if (e.target === overlay) close(); };
    };

    // --- BOOTSTRAP ---
    // 1. Start Inspector Immediately (like standalone script)
    new GrokPromptInspector().init();

    // 2. Start Manager App on Load
    window.addEventListener('load', () => {
        new App();
        // Safe Backup Binding
        setInterval(() => {
            const root = document.querySelector('#grok-prompt-manager-v2');
            if (root && root.shadowRoot) {
                const backBtn = root.shadowRoot.querySelector('.backup-btn');
                if (backBtn && !backBtn.dataset.bound) {
                    backBtn.onclick = () => window.gpmBackupAll ? window.gpmBackupAll() : null;
                    backBtn.dataset.bound = 'true';
                }
            }
        }, 3000);
    });
})();
