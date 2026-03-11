// ==UserScript==
// @name         【Magus】XLens AI Copilot v3.2.1 (Stable Core)
// @name:zh-CN   XLens AI Copilot 侧边聊天助手 (Gemini Pro) | 植人大树出品
// @namespace    http://link3.cc/zhirendashu
// @version      3.5.2
// @description  代号：Magus (魔术师) | 响应修复版 | 确保点击即展开
// @author       植人大树
// @match        https://grok.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      generativelanguage.googleapis.com
// @run-at       document-start
// ==/UserScript==

/**
 * 作者：植人大树
 * 版本：v3.5.2 (响应修复版)
 * 核心逻辑：
 * 1. 修复点击无反应：toggle 方法现在会检查窗口是否存在，若不存在则立即创建。
 * 2. 确保事件绑定：窗口创建后立即刷新事件监听。
 */

(function() {
    'use strict';

    const APP_ID = 'magus-gemini-v350';
    const UI_THEME = {
        primary: '#6366F1', // 经典的 Magus 紫
        bg: 'rgba(9, 9, 12, 0.98)',
        border: 'rgba(255, 255, 255, 0.08)',
        userBubble: 'rgba(99, 102, 241, 0.15)',
        aiBubble: 'rgba(255, 255, 255, 0.03)'
    };

    class MagusGemini {
        constructor() {
            this.config = GM_getValue('magus_config', { geminiKey: '' });
            this.isProcessing = false;
            // 移除 retryCount，改用守护进程模式
            this.init();
        }

        init() {
            // 不再依赖 injectStyles 的 CSS 注入，改为 React 风格的内联样式
            this.startDaemon();
            console.log('[Magus] v3.5.2 响应修复版已就绪');
        }

        // injectStyles 方法被移除，所有样式改为内联

        startDaemon() {
            // 守护进程：确保按钮永远在
            setInterval(() => {
                if (document.body && !document.getElementById(`${APP_ID}-trigger`)) {
                    this.mountTrigger();
                    console.log('[Magus] 🛡️ 守护进程：触发按钮已强制重载');
                }
                if (document.body && !document.getElementById(`${APP_ID}-window`)) {
                    // Only mount window if it doesn't exist, but don't force it open
                    // The window is opened by clicking the trigger
                    // this.mountWindow(); // Removed this as window should only be mounted on demand or when trigger is clicked
                }
            }, 1000);
        }

        mountTrigger() {
            const oldBtn = document.getElementById(`${APP_ID}-trigger`);
            if(oldBtn) oldBtn.remove();

            const btn = document.createElement('div');
            btn.id = `${APP_ID}-trigger`;
            btn.title = "Magus AI 摄影助理";
            btn.innerText = "📷"; // 摄影师专属图标

            // 强制内联样式，确保由 JS 直接渲染，不被 CSS 规则屏蔽
            Object.assign(btn.style, {
                position: 'fixed',
                left: '30px',
                bottom: '30px',
                width: '50px',
                height: '50px',
                background: UI_THEME.primary,
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                cursor: 'pointer',
                zIndex: '2147483647',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                transition: 'transform 0.2s',
                userSelect: 'none'
            });

            btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
            btn.onmouseout = () => btn.style.transform = 'scale(1)';
            btn.onclick = () => {
                this.toggle(true);
            };

            document.body.appendChild(btn);
        }

        mountWindow() {
            if(document.getElementById(`${APP_ID}-window`)) {
                this.window = document.getElementById(`${APP_ID}-window`);
                this.chatBox = this.window.querySelector('#chat-box');
                this.input = this.window.querySelector('#msg-input');
                this.setupEvents(); // Re-attach events if window already exists
                return;
            }

            this.root = document.createElement('div');
            this.root.id = `${APP_ID}-window`;

            // 窗口容器样式
            Object.assign(this.root.style, {
                position: 'fixed',
                left: '-450px', // 默认隐藏在左侧
                top: '20px',
                bottom: '20px',
                width: '400px',
                background: UI_THEME.bg,
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: `1px solid ${UI_THEME.border}`,
                boxShadow: '0 40px 100px rgba(0,0,0,0.9)',
                zIndex: '2147483647',
                transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                fontFamily: 'system-ui, sans-serif'
            });

            this.root.innerHTML = `
                <div class="magus-header" style="padding: 24px; border-bottom: 1px solid ${UI_THEME.border}; display: flex; justify-content: space-between; align-items: center; color: white;">
                    <div style="font-size: 14px; font-weight: 900; letter-spacing: 1px;">🪄 MAGUS GEMINI PRO</div>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <span id="magus-cfg-btn" style="cursor:pointer; opacity:0.6;">⚙️</span>
                        <span id="magus-close-win" style="cursor:pointer; font-size:24px; opacity:0.6;">×</span>
                    </div>
                </div>

                <style>
                    /* 局部样式，用于滚动条和动画 */
                    #${APP_ID}-window .magus-chat::-webkit-scrollbar { width: 4px; }
                    #${APP_ID}-window .magus-chat::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
                    @keyframes magusSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    .magus-bubble { animation: magusSlideIn 0.3s ease-out; }
                    #${APP_ID}-window.active { left: 15px !important; }
                    #${APP_ID}-window .magus-footer > div:focus-within { border-color: ${UI_THEME.primary}66 !important; background: rgba(255,255,255,0.06) !important; }
                    #${APP_ID}-window #send-btn:hover { transform: scale(1.05) !important; filter: brightness(1.1) !important; }
                    #${APP_ID}-window #send-btn:disabled { opacity: 0.3 !important; cursor: not-allowed !important; }
                    #${APP_ID}-window .magus-tools { margin-top: 10px; display: flex; gap: 12px; opacity: 0; transition: 0.3s; }
                    #${APP_ID}-window .magus-bubble:hover .magus-tools { opacity: 1; }
                    #${APP_ID}-window .magus-tool-btn { font-size: 11px; color: ${UI_THEME.primary}; cursor: pointer; font-weight: 800; border-bottom: 1.5px solid currentColor; }
                </style>

                <div class="magus-chat" id="chat-box" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                    <div class="magus-bubble" style="align-self: flex-start; background: ${UI_THEME.aiBubble}; border: 1px solid ${UI_THEME.border}; color: #e5e7eb; padding: 14px 18px; border-radius: 18px; border-bottom-left-radius: 4px; font-size: 14px; line-height: 1.6;">
                        你好。<b>Gemini 1.5 Pro</b> 已就位。<br><br>我是您的 AI 摄影助理。请告诉我您想要的画面（如光影、胶片质感、构图），我将为您生成 Midjourney 级提示词。
                    </div>
                </div>

                <div class="magus-footer" style="padding: 20px 24px 30px 24px; border-top: 1px solid ${UI_THEME.border}; background: rgba(0,0,0,0.1);">
                    <div style="display: flex; gap: 12px; align-items: flex-end; background: rgba(255,255,255,0.04); border-radius: 20px; padding: 10px 15px; border: 1px solid ${UI_THEME.border};">
                        <textarea id="msg-input" style="flex: 1; background: transparent; border: none; color: white; font-size: 14px; outline: none; padding: 5px; min-height: 24px; max-height: 120px; resize: none;" rows="1" placeholder="输入画面描述..."></textarea>
                        <button id="send-btn" style="width: 36px; height: 36px; border-radius: 12px; background: ${UI_THEME.primary}; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">🚀</button>
                    </div>
                </div>
            `;

            document.body.appendChild(this.root);
            this.window = this.root; // Assign this.window here
            this.chatBox = this.root.querySelector('#chat-box');
            this.input = this.root.querySelector('#msg-input');
            this.setupEvents();
        }

        setupEvents() {
            // Events are attached to the window's elements
            this.root.querySelector('#magus-close-win').onclick = () => this.toggle(false);

            const handleSend = () => {
                const text = this.input.value.trim();
                if(!text || this.isProcessing) return;
                this.executeChat(text);
            };

            this.root.querySelector('#send-btn').onclick = handleSend;
            this.input.onkeydown = (e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            };

            this.root.querySelector('#magus-cfg-btn').onclick = () => {
                const key = prompt("请输入您的 Gemini API Key:", this.config.geminiKey);
                if(key !== null) {
                    this.config.geminiKey = key.trim();
                    GM_setValue('magus_config', this.config);
                    this.addBubble('ai', '✅ 配置更新成功。');
                }
            };
        }

        toggle(show) {
            // 关键逻辑：如果请求打开但窗口不存在，先创建窗口
            if (show && (!this.window || !document.getElementById(`${APP_ID}-window`))) {
                this.mountWindow();
            }

            if (this.window) {
                // 使用 style.left 控制滑入滑出
                this.window.style.left = show ? '20px' : '-450px';
                if(show) setTimeout(() => this.input.focus(), 100);
            }
        }

        addBubble(role, text) {
            const b = document.createElement('div');
            b.className = `magus-bubble ${role}`;
            b.innerHTML = `
                <div>${text.replace(/\n/g, '<br>')}</div>
                ${role==='ai'?`<div class="magus-tools"><span class="magus-tool-btn inject">同步到输入框</span><span class="magus-tool-btn copy">全选复制</span></div>`:''}
            `;
            if(role === 'ai') {
                b.querySelector('.inject').onclick = () => {
                    const editor = document.querySelector('.ProseMirror') || document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
                    if(editor) {
                        editor.focus();
                        document.execCommand('selectAll', false, null);
                        document.execCommand('insertText', false, text);
                        this.toggle(false);
                    }
                };
                b.querySelector('.copy').onclick = (e) => {
                    navigator.clipboard.writeText(text);
                    e.target.innerText = '已复制';
                };
            }
            this.chatBox.appendChild(b);
            this.chatBox.scrollTop = this.chatBox.scrollHeight;
        }

        async executeChat(text) {
            this.addBubble('user', text);
            this.input.value = '';

            if(!this.config.geminiKey) {
                this.addBubble('ai', '⚠️ 尚未检测到 API Key。请点击右上角齿轮。');
                return;
            }

            const sendBtn = this.root.querySelector('#send-btn');
            this.isProcessing = true;
            sendBtn.disabled = true;

            // 核心修改：使用稳定版 Pro 模型 ID，确保 2026 年兼容性
            const MODEL_ID = 'gemini-1.5-pro';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${this.config.geminiKey}`;

            // 针对你摄影师背景定制的系统提示词
            const systemPrompt = `你是一位享誉全球的商业摄影师。
请将描述润色为极具视觉张力的 Midjourney 提示词。
重点突出：CineStill 800T 胶片感、专业光影构图。
仅输出提示词内容。`;

            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\n描述：${text}` }] }],
                    generationConfig: {
                        temperature: 0.8, // 激发创意
                        maxOutputTokens: 2048
                    }
                }),
                onload: (res) => {
                    try {
                        const d = JSON.parse(res.responseText);
                        if(res.status !== 200) throw new Error(d.error?.message || '请求失败');
                        const reply = d.candidates[0].content.parts[0].text;
                        this.addBubble('ai', reply);
                    } catch(e) {
                        this.addBubble('ai', `⚠️ 权限错误: ${e.message}。请确认已在 AI Studio 开启该模型。`);
                    } finally {
                        this.isProcessing = false;
                        sendBtn.disabled = false;
                    }
                },
                onerror: () => {
                    this.addBubble('ai', '⚠️ 网络拦截，请检查连接环境。');
                    this.isProcessing = false;
                    sendBtn.disabled = false;
                }
            });
        }
    }

    new MagusGemini();
})();
