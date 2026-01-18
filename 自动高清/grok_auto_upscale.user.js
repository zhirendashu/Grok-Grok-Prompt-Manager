// ==UserScript==
// @name         Grok Auto Upscale
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  The minimal tool for Grok Video Upscaling. Features powerful, multi-strategy button detection and Reference-grade Interaction Recorder.
// @author       AntiGravity
// @match        https://grok.com/*
// @match        https://x.com/*
// @match        https://twitter.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=grok.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // --- CONFIG ---
    const CONFIG = {
        enabled: GM_getValue('auto_upscale_enabled', true), // Default ON for instant action
        silent: true, // [NEW] Silent Mode: No UI status, no ripples, no borders
        debug: true,
        // [Advanced] Force specific coordinates (ignores button detection)
        USE_FIXED_POS: false, 
        FIXED_POS_X: 1294, 
        FIXED_POS_Y: 1034  
    };

    // --- LOGGER ---
    const log = (...args) => CONFIG.debug && console.log('%c[AutoUpscale]', 'color: #0f0; font-weight: bold;', ...args);
    const warn = (...args) => console.warn('%c[AutoUpscale]', 'color: yellow; font-weight: bold;', ...args);

    // --- ICON ---
    const ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

    // --- UI MANAGER ---
    class UIManager {
        constructor() {
            this.root = document.createElement('div');
            this.root.id = 'grok-upscale-manager';
            this.shadow = this.root.attachShadow({ mode: 'open' });
            this.render();
            document.body.appendChild(this.root);
        }

        render() {
            this.shadow.innerHTML = `
            <style>
                .wrapper {
                    position: fixed; top: 20px; right: 80px; z-index: 999999;
                    display: flex; align-items: center; gap: 8px;
                    background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(10px);
                    padding: 6px 12px; borderRadius: 30px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    transition: all 0.3s ease;
                    color: white; font-size: 13px; font-weight: 600;
                    user-select: none; cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }
                .wrapper:hover {
                    background: rgba(30, 30, 30, 0.9);
                    border-color: rgba(255, 255, 255, 0.3);
                }
                .wrapper.active {
                    background: rgba(29, 155, 240, 0.2);
                    border-color: rgba(29, 155, 240, 0.5);
                    color: #1d9bf0;
                }
                .indicator {
                    width: 8px; height: 8px; border-radius: 50%;
                    background: #666; transition: background 0.3s;
                }
                .active .indicator {
                    background: #00ba7c; box-shadow: 0 0 8px #00ba7c;
                }
                .icon { width: 16px; height: 16px; display: flex; }
                .text { margin-left: 4px; }
                
                /* Debug Button */
                .debug-btn {
                    margin-left: 8px; padding: 2px 6px; border-radius: 4px;
                    background: rgba(255,255,255,0.1); font-size: 10px; color: #aaa;
                }
                .debug-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }
            </style>
            
            <div class="wrapper ${CONFIG.enabled ? 'active' : ''}" id="main-btn">
                <div class="indicator"></div>
                <div class="icon">${ICON_SVG}</div>
                <div class="text">自动高清</div>
            </div>
            `;

            this.shadow.querySelector('#main-btn').onclick = (e) => {
                CONFIG.enabled = !CONFIG.enabled;
                GM_setValue('auto_upscale_enabled', CONFIG.enabled);
                this.render(); 
                log('State changed:', CONFIG.enabled);
                if (CONFIG.enabled) Observer.start();
                else Observer.stop();
            };
        }

        setStatus(text) {
             if (CONFIG.silent) return; // Silent mode check
             const t = this.shadow.querySelector('.text');
             if(t) t.textContent = text;
        }
    }







    // --- ACTION LOGIC (THE BRAIN) ---
    const Logic = {
        isProcessing: false,
        processedVideos: new Set(),

        // Helper: Strict Visibility Check
        isVisible(el) {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0' &&
                   rect.width > 0 && 
                   rect.height > 0;
        },

        // Helper: Get Best Candidate (Center Bias)
        getBestCandidate(candidates) {
            if (!candidates || candidates.length === 0) return null;
            
            // Filter visible first
            const visible = candidates.filter(el => this.isVisible(el));
            if (visible.length === 0) return null;
            if (visible.length === 1) return visible[0];

            // Sort by distance to screen center
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;

            return visible.sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();
                const da = Math.hypot(ra.left + ra.width/2 - cx, ra.top + ra.height/2 - cy);
                const db = Math.hypot(rb.left + rb.width/2 - cx, rb.top + rb.height/2 - cy);
                return da - db; // Shortest distance first
            })[0];
        },

        // Helper: Get Best Candidate (Top-Right Bias for Menu)
        // 专门寻找右上角的 "..." 按钮
        getTopRightCandidate(candidates) {
            if (!candidates || candidates.length === 0) return null;
            const visible = candidates.filter(el => this.isVisible(el));
            if (visible.length === 0) return null;
            
            // Sort by: 
            // 1. Higher is better (smaller Y)
            // 2. More Right is better (larger X)
            return visible.sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();
                
                // Weight Y (Top) more heavily than X
                // We want: Minimize Top, Maximize Left (Right side)
                // Score = Top - (Left * 0.5)  => Lower score is better (Higher Up, More Right)
                const scoreA = ra.top - (ra.left * 0.5);
                const scoreB = rb.top - (rb.left * 0.5);
                
                return scoreA - scoreB;
            })[0];
        },

        async simulateClick(element) {
            log('🖱️ Clicking:', element ? element : `Coordinate (${CONFIG.FIXED_POS_X}, ${CONFIG.FIXED_POS_Y})`);
            
            let x, y;

            if (CONFIG.USE_FIXED_POS && CONFIG.FIXED_POS_X && CONFIG.FIXED_POS_Y) {
                // Fixed Coordinate Mode
                x = CONFIG.FIXED_POS_X;
                y = CONFIG.FIXED_POS_Y;
                // Create a dummy element for visual feedback if none provided
                if (!element) {
                    element = document.elementFromPoint(x, y) || document.body;
                }
            } else {
                if (!element) return;
                // Standard Element Mode
                // 0. Ensure visible in viewport (Instant)
                element.scrollIntoView({ block: 'center', behavior: 'auto' });
                // await new Promise(r => setTimeout(r, 10)); // Removed delay entirely 
                
                const rect = element.getBoundingClientRect();
                x = rect.left + (rect.width / 2);
                y = rect.top + (rect.height / 2);
            }
            
            // 1. Visual Ripple Effect
            this.showClickAnimation(x, y);
            
            // 3. The Full "Human" Event Chain
            const eventOpts = { 
                bubbles: true, cancelable: true,
                clientX: x, clientY: y, screenX: x, screenY: y,
                pointerId: 1, width: 1, height: 1, pressure: 0.5,
                button: 0, buttons: 1
            };

            // Dispatch against the element found at that point (or the target element)
            const target = element || document.elementFromPoint(x, y) || document.body;

            target.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
            target.dispatchEvent(new MouseEvent('mousedown', eventOpts));
            target.focus();
            
            // Minimized hold time for speed
            await new Promise(r => setTimeout(r, 5)); 
            
            target.dispatchEvent(new PointerEvent('pointerup', eventOpts));
            target.dispatchEvent(new MouseEvent('mouseup', eventOpts));
            target.click();
        },

        showClickAnimation(x, y) {
             if (CONFIG.silent) return; // Silent mode check
             try {
                 // Support overload: (element) or (x, y)
                 if (typeof x === 'object') {
                     const rect = x.getBoundingClientRect();
                     x = rect.left + (rect.width/2);
                     y = rect.top + (rect.height/2);
                 }

                const ripple = document.createElement('div');
                ripple.style.cssText = `
                    position: fixed;
                    left: ${x - 20}px; top: ${y - 20}px;
                    width: 40px; height: 40px;
                    border: 2px solid #ff00ff; border-radius: 50%;
                    background: rgba(255, 0, 255, 0.2);
                    pointer-events: none; z-index: 999999;
                    transition: all 0.5s ease-out;
                `;
                document.body.appendChild(ripple);
                requestAnimationFrame(() => {
                    ripple.style.transform = 'scale(1.5)';
                    ripple.style.opacity = '0';
                });
                setTimeout(() => ripple.remove(), 500);
            } catch(e) {}
        },

        async waitForGeneration() {
            log('⏳ Checking generation status...');
            let checks = 0;
            const MAX_CHECKS = 60; // 30 seconds max
            
            while (this.isGenerating() && checks < MAX_CHECKS) {
                if (checks === 0) UI.setStatus('等待生成...');
                log(`...Generation in progress (${checks})`);
                await new Promise(r => setTimeout(r, 200)); // Faster polling
                checks++;
            }
            
            if (checks >= MAX_CHECKS) {
                log('⚠️ Wait timeout. Proceeding anyway...');
            } else if (checks > 0) {
                log('✅ Generation complete! Resuming...');
                await new Promise(r => setTimeout(r, 500)); 
            }
        },

        isGenerating() {
            const indicators = Array.from(document.querySelectorAll('div, span')).filter(el => {
                const t = (el.innerText || '').trim();
                return t === '生成中' || t === 'Generating' || t === 'Processing' || /^\d+%$/.test(t);
            });
            // Use getBestCandidate (effectively checks visibility) but here simply checking ANY visible is enough
            return indicators.some(el => this.isVisible(el));
        },

        async findAndClickUpscale() {
            if (this.isProcessing) return;
            
            // Deduplication Check based on URL (Post ID)
            // Example: grok.com/imagine/post/UUID
            const match = window.location.href.match(/\/post\/([a-zA-Z0-9-]+)/);
            const postId = match ? match[1] : window.location.href;
            
            if (this.processedVideos.has(postId)) {
                log('⏭️ Post already processed:', postId);
                return;
            }

            this.isProcessing = true;

            await this.waitForGeneration();

            UI.setStatus('🔍 搜索中...');
            await new Promise(r => setTimeout(r, 100)); // Minimized wait

            try {
                // Check if Upscale is ALREADY DONE (Disabled button)
                // We do a quick check for disabled buttons with relevant keywords
                const disabledBtn = Array.from(document.querySelectorAll('button[disabled]')).find(b => {
                     const t = (b.innerText || b.ariaLabel || '').toLowerCase();
                     return t.includes('升级') || t.includes('upscale') || t.includes('hd');
                });
                
                if (disabledBtn && this.isVisible(disabledBtn)) {
                    log('🛑 Already Upscaled (Button Disabled)');
                    this.processedVideos.add(postId); // Mark as done
                    UI.setStatus('✅ 已是高清');
                    return; 
                }

                // Strategy A: Direct
                let btn = this.findBtnByKeywords(['升级视频', '升级', '放大', 'Upscale', '高清', 'HD']);
                
                // Strategy B: "More" Menu
                if (!btn) {
                    log('Direct not found. Trying Menu...');
                    const moreBtn = this.findMoreButton();
                    if (moreBtn) {
                        log('Found More Button:', moreBtn);
                        await this.simulateClick(moreBtn);
                        
                        // Retry finding inside menu
                        for(let i=0; i<5; i++) {
                            await new Promise(r => setTimeout(r, 200)); 
                            
                            // Check for DISABLED upscale button in menu
                            // This means we opened the menu and found "Upscale" but it's greyed out -> Done.
                             const menuDisabled = Array.from(document.querySelectorAll('div[role="menuitem"][aria-disabled="true"], button[disabled]')).find(b => {
                                const t = (b.innerText || b.ariaLabel || '').toLowerCase();
                                return t.includes('升级') || t.includes('upscale') || t.includes('hd');
                            });
                            
                            if (menuDisabled) {
                                log('🛑 Found Disabled Upscale option in menu. Task complete.');
                                this.processedVideos.add(postId);
                                UI.setStatus('✅ 已是高清');
                                // Close menu if possible? Or just leave it.
                                return;
                            }

                            btn = this.findBtnByKeywords(['升级视频', '升级', '放大', 'Upscale', '高清', 'HD']);
                            if(btn) break;
                        }
                    }
                }

                // Strategy C: XPath Fallback
                if (!btn) {
                     log('Menu failed. Trying XPath...');
                     const xpath = "//*[contains(text(), '升级视频')] | //*[contains(text(), 'Upscale')]";
                     const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                     let candidates = [];
                     for (let i = 0; i < result.snapshotLength; i++) {
                         candidates.push(result.snapshotItem(i));
                     }
                     btn = this.getBestCandidate(candidates);
                }

                if (btn) {
                    UI.setStatus('🚀 升级中...');
                    log('✅ Found Upscale Button:', btn);
                    
                    if (!CONFIG.silent) {
                        btn.style.outline = '3px solid #00ff00';
                        btn.style.boxShadow = '0 0 15px #00ff00';
                    }

                    await this.simulateClick(btn);
                    
                    // Mark as processed immediately after successful click
                    this.processedVideos.add(postId);
                    
                    // Reduced post-click wait
                    await new Promise(r => setTimeout(r, 2000)); 
                    UI.setStatus('✅ 完成');
                } else {
                    log('❌ No Upscale button found.');
                    // Don't mark as processed if failed, so it can retry? 
                    // Or maybe mark it to prevent infinite loops? 
                    // Let's NOT mark it, but the observer loop limit will handle it.
                    UI.setStatus('❓ 未找到');
                }

            } catch (e) {
                console.error('Auto Upscale Error:', e);
                UI.setStatus('❌ 错误');
            } finally {
                this.isProcessing = false;
                setTimeout(() => UI.setStatus('🟢 就绪'), 3000);
            }
        },

        findBtnByKeywords(keywords) {
             const elements = Array.from(document.querySelectorAll('button, div[role="button"], div[role="menuitem"]'));
             // Filter candidates first
             const candidates = elements.filter(el => {
                 const content = (el.innerText || el.ariaLabel || el.textContent || '').toLowerCase();
                 if (content.includes('supergrok')) return false;
                 
                 const match = keywords.some(k => content.includes(k.toLowerCase()));
                 return match && !el.disabled;
             });
             
             return this.getBestCandidate(candidates);
        },

        findMoreButton() {
            const allBtns = Array.from(document.querySelectorAll('button, div[role="button"]'));
            
            // STRICT FILTER: Only look for buttons in the TOP HALF of the screen
            // The user explicitely wants the "Top Right" menu, distinguishing it from bottom player controls.
            const visibleBtns = allBtns.filter(b => {
                if (!this.isVisible(b)) return false;
                const rect = b.getBoundingClientRect();
                return rect.top < (window.innerHeight / 2); // Must be in top half
            });

            // Priority 1: High Confidence (Aria Labels)
            let candidates = visibleBtns.filter(b => {
                const l = (b.ariaLabel || b.title || '').toLowerCase();
                return (l.includes('更多') || l.includes('more') || l.includes('option') || l.includes('选项'));
            });
            let btn = this.getTopRightCandidate(candidates);

            // Priority 2: Text Content "..."
            if (!btn) {
                candidates = visibleBtns.filter(b => {
                    const t = (b.innerText || '').trim();
                    return t === '...' || t === '…';
                });
                btn = this.getTopRightCandidate(candidates);
            }

            // Priority 3: Proximity to "Edit" (编辑图像)
            // Look for the "Edit" button, then pick its right-most sibling
            if (!btn) {
                const editBtn = visibleBtns.find(b => {
                     const t = (b.innerText || b.ariaLabel || '').toLowerCase();
                     return t.includes('edit') || t.includes('编辑');
                });
                if (editBtn && editBtn.parentElement) {
                     candidates = Array.from(editBtn.parentElement.querySelectorAll('button'));
                     // Re-filter for visibility just in case
                     btn = this.getTopRightCandidate(candidates);
                }
            }

            log('🔍 Find More Button Candidate:', btn);
            return btn;
        },

    };

    // --- OBSERVER ---
    const Observer = {
        obs: null,
        start() {
            if (this.obs) return;
            log('👁️ Observer Started');
            this.scan();
            this.obs = new MutationObserver((mutations) => {
                if (!CONFIG.enabled) return;
                this.scan();
            });
            this.obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
        },
        
        scan() {
            const videos = document.querySelectorAll('video');
            videos.forEach(v => {
                if (v.src && !Logic.processedVideos.has(v.src)) {
                    log('New Video Detected:', v.src);
                    Logic.processedVideos.add(v.src);
                    // React almost instantly to new video detection
                    setTimeout(() => Logic.findAndClickUpscale(), 500); 
                }
            });
        },

        stop() {
             if (this.obs) {
                 this.obs.disconnect();
                 this.obs = null;
                 log('🛑 Observer Stopped');
             }
        }
    };

    // --- INIT ---
    // --- INIT ---
    // InteractionRecorder.init(); // Removed

    const UI = new UIManager();
    if (CONFIG.enabled) Observer.start();

})();