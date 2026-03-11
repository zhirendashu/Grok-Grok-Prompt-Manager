// ==UserScript==
// @name         Grok Input Debugger
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  诊断 Grok.com 输入框无法找到的问题
// @author       Debug
// @match        https://grok.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 创建诊断按钮
    const btn = document.createElement('button');
    btn.textContent = '🔍 诊断输入框';
    btn.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        z-index: 999999;
        padding: 10px 20px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
    `;
    document.body.appendChild(btn);

    // 诊断逻辑
    btn.onclick = () => {
        console.clear();
        console.log('--- 开始诊断 ---');

        const selectors = [
            'textarea[role="textbox"]',
            'div[contenteditable="true"][role="textbox"]',
            'textarea[placeholder*="Grok"]',
            'textarea[placeholder*="describe"]',
            'textarea',
            'div[contenteditable="true"]'
        ];

        let found = null;
        let logs = [];

        logs.push(`正在尝试 ${selectors.length} 个选择器...`);

        selectors.forEach((sel, index) => {
            const els = document.querySelectorAll(sel);
            logs.push(`[${index + 1}] 选择器 "${sel}": 找到 ${els.length} 个元素`);

            els.forEach((el, i) => {
                // 排除我们自己的输入框（如果存在）
                if (el.closest && el.closest('.gpm-panel')) {
                    logs.push(`    -> 排除: 属于 GPM 面板`);
                    return;
                }

                const rect = el.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                logs.push(`    -> 元素 #${i}: 可见=${isVisible}, Log=${el.tagName}, ID=${el.id}, Class=${el.className}`);

                if (isVisible && !found) {
                    found = el;
                    logs.push(`    ✅ 锁定目标!`);
                }
            });
        });

        // 结果报告
        if (found) {
            console.log('✅ 找到输入框:', found);
            // 视觉高亮
            found.style.border = '5px solid #00ff00';
            found.style.boxShadow = '0 0 20px #00ff00';

            // 尝试插入
            try {
                found.focus();
                // 模拟插入
                const success = document.execCommand('insertText', false, '【测试成功: 诊断脚本已找到输入框】');
                if (success) {
                    alert(`✅ 诊断成功！\n\n已找到输入框并成功插入文字。\n\n选择器: ${found.tagName}\n类名: ${found.className}\n\n看来网站结构没有大变，可能是脚本逻辑问题。`);
                } else {
                    // 尝试赋值
                    found.value = (found.value || '') + ' [测试赋值]';
                    found.dispatchEvent(new Event('input', { bubbles: true }));
                    alert(`⚠️ 找到输入框但 execCommand 失败。\n已尝试强制赋值。\n\n如果看到输入框有字，说明基础操作是可行的。`);
                }
            } catch (e) {
                alert(`❌ 找到输入框但操作出错: ${e.message}`);
                console.error(e);
            }
        } else {
            console.error('❌ 未找到任何符合条件的输入框');
            alert(`❌ 严重: 无法在页面上找到任何输入框！\n\n可能原因：\n1. 网站改版，更换了类名或结构\n2. 这是一个 iframe 页面？\n\n详细日志已打印到控制台 (F12)`);
        }

        console.log(logs.join('\n'));
    };

})();
