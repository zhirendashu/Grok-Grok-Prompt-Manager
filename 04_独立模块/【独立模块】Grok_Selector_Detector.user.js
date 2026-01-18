// ==UserScript==
// @name         Grok 选择器探测器
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  记录点击操作，自动识别升级按钮的选择器
// @author       You
// @match        https://grok.x.ai/*
// @match        https://x.ai/*
// @match        https://*.grok.com/*
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ========== 样式 ==========
    const styles = `
        #selector-detective-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 450px;
            max-height: 600px;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 999999;
            font-family: 'Consolas', 'Monaco', monospace;
            color: #fff;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        #selector-detective-header {
            background: rgba(0,0,0,0.2);
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid rgba(255,255,255,0.1);
            cursor: move;
        }

        #selector-detective-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .detective-status {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #4CAF50;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        #selector-detective-controls {
            display: flex;
            gap: 8px;
        }

        .detective-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s;
        }

        .detective-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-1px);
        }

        .detective-btn.active {
            background: #4CAF50;
        }

        #selector-detective-content {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }

        .click-record {
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            border-left: 3px solid #4CAF50;
            animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .click-record.highlighted {
            border-left-color: #FF9800;
            background: rgba(255, 152, 0, 0.1);
        }

        .record-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .record-time {
            font-size: 11px;
            opacity: 0.7;
        }

        .record-tag {
            background: #FF9800;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
        }

        .element-info {
            font-size: 12px;
            margin-bottom: 8px;
            padding: 8px;
            background: rgba(0,0,0,0.2);
            border-radius: 4px;
        }

        .element-info strong {
            color: #FFD700;
        }

        .selector-list {
            margin-top: 8px;
        }

        .selector-item {
            background: rgba(0,0,0,0.4);
            padding: 8px 10px;
            margin: 4px 0;
            border-radius: 4px;
            font-size: 11px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s;
        }

        .selector-item:hover {
            background: rgba(0,0,0,0.6);
            transform: translateX(2px);
        }

        .selector-label {
            color: #64B5F6;
            font-weight: bold;
            min-width: 80px;
        }

        .selector-value {
            flex: 1;
            word-break: break-all;
            color: #A5D6A7;
            margin: 0 8px;
        }

        .copy-btn {
            background: #2196F3;
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            white-space: nowrap;
            transition: all 0.2s;
        }

        .copy-btn:hover {
            background: #1976D2;
        }

        .copy-btn:active {
            transform: scale(0.95);
        }

        .stats-bar {
            background: rgba(0,0,0,0.3);
            padding: 10px 15px;
            border-top: 2px solid rgba(255,255,255,0.1);
            font-size: 12px;
            display: flex;
            justify-content: space-between;
        }

        .stat-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .stat-value {
            font-weight: bold;
            color: #4CAF50;
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            opacity: 0.6;
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }

        /* 滚动条样式 */
        #selector-detective-content::-webkit-scrollbar {
            width: 8px;
        }

        #selector-detective-content::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.2);
            border-radius: 4px;
        }

        #selector-detective-content::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.3);
            border-radius: 4px;
        }

        #selector-detective-content::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.5);
        }

        .minimize-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
        }

        #selector-detective-panel.minimized {
            width: auto;
            max-height: none;
        }

        #selector-detective-panel.minimized #selector-detective-content,
        #selector-detective-panel.minimized .stats-bar {
            display: none;
        }

        #selector-detective-panel.minimized #selector-detective-header {
            padding: 10px 15px;
        }
    `;

    // ========== 核心变量 ==========
    let clickRecords = [];
    let isRecording = true;
    let recordCount = 0;
    let panel = null;
    let isPanelMinimized = false;

    // ========== 工具函数 ==========

    // 生成唯一选择器
    function generateSelectors(element) {
        const selectors = {};

        // 1. ID 选择器
        if (element.id) {
            selectors.id = `#${element.id}`;
        }

        // 2. Class 选择器
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/).filter(c => c);
            if (classes.length > 0) {
                selectors.class = `.${classes.join('.')}`;
                selectors.singleClass = `.${classes[0]}`;
            }
        }

        // 3. 标签选择器
        selectors.tag = element.tagName.toLowerCase();

        // 4. 标签 + Class
        if (selectors.singleClass) {
            selectors.tagClass = `${selectors.tag}${selectors.singleClass}`;
        }

        // 5. Data 属性选择器
        const dataAttrs = Array.from(element.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => `[${attr.name}="${attr.value}"]`);
        if (dataAttrs.length > 0) {
            selectors.dataAttr = dataAttrs[0];
            selectors.allDataAttr = dataAttrs.join('');
        }

        // 6. 路径选择器 (简化版)
        const path = [];
        let current = element;
        for (let i = 0; i < 3 && current && current !== document.body; i++) {
            let selector = current.tagName.toLowerCase();
            if (current.id) {
                selector = `#${current.id}`;
                path.unshift(selector);
                break;
            } else if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\s+/);
                if (classes.length > 0) {
                    selector += `.${classes[0]}`;
                }
            }
            path.unshift(selector);
            current = current.parentElement;
        }
        selectors.path = path.join(' > ');

        // 7. nth-child 选择器
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(element) + 1;
            selectors.nthChild = `${selectors.tag}:nth-child(${index})`;
        }

        // 8. 属性选择器
        const attrs = [];
        for (const attr of element.attributes) {
            if (!attr.name.startsWith('data-') && attr.name !== 'class' && attr.name !== 'id') {
                attrs.push(`[${attr.name}="${attr.value}"]`);
            }
        }
        if (attrs.length > 0) {
            selectors.attribute = attrs[0];
        }

        // 9. 完整路径 (CSS Selector)
        try {
            const fullPath = getCssPath(element);
            selectors.fullPath = fullPath;
        } catch (e) {
            // 忽略错误
        }

        return selectors;
    }

    // 获取完整 CSS 路径
    function getCssPath(element) {
        if (!(element instanceof Element)) return '';
        const path = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let selector = element.nodeName.toLowerCase();
            if (element.id) {
                selector += `#${element.id}`;
                path.unshift(selector);
                break;
            } else {
                let sibling = element;
                let nth = 1;
                while (sibling.previousElementSibling) {
                    sibling = sibling.previousElementSibling;
                    if (sibling.nodeName.toLowerCase() === selector) nth++;
                }
                if (nth !== 1) selector += `:nth-of-type(${nth})`;
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
    }

    // 获取元素文本 (截断)
    function getElementText(element) {
        const text = element.textContent?.trim() || '';
        return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }

    // 检测是否可能是升级按钮
    function isPossibleUpscaleButton(element) {
        const text = element.textContent?.toLowerCase() || '';
        const keywords = ['升级', 'upscale', 'hd', 'enhance', '提升', '增强'];

        // 检查文本内容
        if (keywords.some(keyword => text.includes(keyword))) {
            return true;
        }

        // 检查 aria-label
        const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
        if (keywords.some(keyword => ariaLabel.includes(keyword))) {
            return true;
        }

        // 检查 title
        const title = element.getAttribute('title')?.toLowerCase() || '';
        if (keywords.some(keyword => title.includes(keyword))) {
            return true;
        }

        // 检查类名
        const className = element.className?.toLowerCase() || '';
        if (keywords.some(keyword => className.includes(keyword))) {
            return true;
        }

        return false;
    }

    // 复制到剪贴板
    function copyToClipboard(text) {
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text);
            showToast('已复制到剪贴板!');
        } else {
            // 备用方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('已复制到剪贴板!');
        }
    }

    // 显示提示
    function showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999999;
            animation: fadeInOut 2s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    // ========== UI 创建 ==========

    function createPanel() {
        // 添加样式
        const styleEl = document.createElement('style');
        styleEl.textContent = styles + `
            @keyframes fadeInOut {
                0%, 100% { opacity: 0; }
                10%, 90% { opacity: 1; }
            }
        `;
        document.head.appendChild(styleEl);

        // 创建面板
        panel = document.createElement('div');
        panel.id = 'selector-detective-panel';
        panel.innerHTML = `
            <div id="selector-detective-header">
                <h3>
                    <span class="detective-status"></span>
                    🔍 选择器探测器
                </h3>
                <div id="selector-detective-controls">
                    <button class="detective-btn active" id="toggle-recording">
                        ⏺ 录制中
                    </button>
                    <button class="detective-btn" id="export-records">
                        📤 导出
                    </button>
                    <button class="detective-btn" id="clear-records">
                        🗑️ 清空
                    </button>
                    <button class="minimize-btn" id="minimize-panel">−</button>
                </div>
            </div>
            <div id="selector-detective-content">
                <div class="empty-state">
                    <div class="empty-state-icon">👆</div>
                    <p>点击页面上的任何元素<br>自动记录其选择器</p>
                </div>
            </div>
            <div class="stats-bar">
                <div class="stat-item">
                    📊 总记录: <span class="stat-value" id="total-records">0</span>
                </div>
                <div class="stat-item">
                    ⭐ 疑似按钮: <span class="stat-value" id="possible-buttons">0</span>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // 绑定事件
        document.getElementById('toggle-recording').addEventListener('click', toggleRecording);
        document.getElementById('export-records').addEventListener('click', exportRecords);
        document.getElementById('clear-records').addEventListener('click', clearRecords);
        document.getElementById('minimize-panel').addEventListener('click', toggleMinimize);

        // 使面板可拖动
        makeDraggable(panel, document.getElementById('selector-detective-header'));
    }

    function makeDraggable(panel, header) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        header.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            panel.style.top = (panel.offsetTop - pos2) + 'px';
            panel.style.right = 'auto';
            panel.style.left = (panel.offsetLeft - pos1) + 'px';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function toggleMinimize() {
        isPanelMinimized = !isPanelMinimized;
        panel.classList.toggle('minimized', isPanelMinimized);
        const btn = document.getElementById('minimize-panel');
        btn.textContent = isPanelMinimized ? '+' : '−';
    }

    function toggleRecording() {
        isRecording = !isRecording;
        const btn = document.getElementById('toggle-recording');
        const status = panel.querySelector('.detective-status');

        if (isRecording) {
            btn.textContent = '⏺ 录制中';
            btn.classList.add('active');
            status.style.background = '#4CAF50';
        } else {
            btn.textContent = '⏸ 已暂停';
            btn.classList.remove('active');
            status.style.background = '#FF5722';
        }
    }

    function clearRecords() {
        if (confirm('确定要清空所有记录吗?')) {
            clickRecords = [];
            recordCount = 0;
            updatePanel();
            showToast('已清空所有记录');
        }
    }

    function exportRecords() {
        if (clickRecords.length === 0) {
            showToast('⚠️ 没有记录可导出');
            return;
        }

        // 创建导出菜单
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            z-index: 9999999;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
            min-width: 300px;
        `;

        menu.innerHTML = `
            <h3 style="margin: 0 0 15px 0; font-size: 18px;">📤 导出记录</h3>
            <p style="margin: 0 0 20px 0; font-size: 13px; opacity: 0.8;">
                已记录 ${clickRecords.length} 个元素，其中 ${clickRecords.filter(r => r.isPossible).length} 个疑似升级按钮
            </p>
            <button id="export-json" style="
                width: 100%;
                padding: 12px;
                margin: 8px 0;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
            ">📋 复制为 JSON (推荐)</button>
            <button id="export-text" style="
                width: 100%;
                padding: 12px;
                margin: 8px 0;
                background: #2196F3;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
            ">📝 复制为文本</button>
            <button id="export-file" style="
                width: 100%;
                padding: 12px;
                margin: 8px 0;
                background: #FF9800;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
            ">💾 下载为文件</button>
            <button id="export-cancel" style="
                width: 100%;
                padding: 12px;
                margin: 8px 0;
                background: rgba(255,255,255,0.2);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">取消</button>
        `;

        document.body.appendChild(menu);

        // JSON 导出
        document.getElementById('export-json').onclick = () => {
            const data = {
                exportTime: new Date().toLocaleString('zh-CN'),
                totalRecords: clickRecords.length,
                possibleButtons: clickRecords.filter(r => r.isPossible).length,
                records: clickRecords.map(record => ({
                    time: record.time,
                    tag: record.tag,
                    text: record.text,
                    isPossible: record.isPossible,
                    selectors: record.selectors
                }))
            };

            const json = JSON.stringify(data, null, 2);
            copyToClipboard(json);
            showToast('✅ JSON 已复制到剪贴板！');
            menu.remove();
        };

        // 文本导出
        document.getElementById('export-text').onclick = () => {
            let text = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            text += `📊 Grok 选择器探测报告\n`;
            text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            text += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
            text += `总记录数: ${clickRecords.length}\n`;
            text += `疑似按钮: ${clickRecords.filter(r => r.isPossible).length}\n`;
            text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            clickRecords.forEach((record, index) => {
                text += `\n【记录 #${index + 1}】${record.isPossible ? ' ⭐ 疑似升级按钮' : ''}\n`;
                text += `时间: ${record.time}\n`;
                text += `标签: ${record.tag}\n`;
                text += `文本: ${record.text || '(无)'}\n`;
                text += `\n选择器:\n`;

                Object.entries(record.selectors).forEach(([key, value]) => {
                    text += `  - ${key}: ${value}\n`;
                });

                text += `${'─'.repeat(50)}\n`;
            });

            copyToClipboard(text);
            showToast('✅ 文本已复制到剪贴板！');
            menu.remove();
        };

        // 文件导出
        document.getElementById('export-file').onclick = () => {
            const data = {
                exportTime: new Date().toLocaleString('zh-CN'),
                totalRecords: clickRecords.length,
                possibleButtons: clickRecords.filter(r => r.isPossible).length,
                records: clickRecords.map(record => ({
                    time: record.time,
                    tag: record.tag,
                    text: record.text,
                    isPossible: record.isPossible,
                    selectors: record.selectors
                }))
            };

            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `grok-selectors-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('✅ 文件已下载！');
            menu.remove();
        };

        // 取消
        document.getElementById('export-cancel').onclick = () => {
            menu.remove();
        };
    }

    function updatePanel() {
        const content = document.getElementById('selector-detective-content');
        const totalRecords = document.getElementById('total-records');
        const possibleButtons = document.getElementById('possible-buttons');

        totalRecords.textContent = clickRecords.length;
        possibleButtons.textContent = clickRecords.filter(r => r.isPossible).length;

        if (clickRecords.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👆</div>
                    <p>点击页面上的任何元素<br>自动记录其选择器</p>
                </div>
            `;
            return;
        }

        const html = clickRecords.map((record, index) => {
            const selectorsHtml = Object.entries(record.selectors)
                .map(([key, value]) => `
                    <div class="selector-item">
                        <span class="selector-label">${key}</span>
                        <code class="selector-value">${value}</code>
                        <button class="copy-btn" data-value="${value.replace(/"/g, '&quot;')}">复制</button>
                    </div>
                `).join('');

            return `
                <div class="click-record ${record.isPossible ? 'highlighted' : ''}">
                    <div class="record-header">
                        <span class="record-time">#${clickRecords.length - index} - ${record.time}</span>
                        ${record.isPossible ? '<span class="record-tag">⭐ 疑似升级按钮</span>' : ''}
                    </div>
                    <div class="element-info">
                        <strong>标签:</strong> ${record.tag}<br>
                        <strong>文本:</strong> ${record.text || '(无文本)'}
                    </div>
                    <div class="selector-list">
                        ${selectorsHtml}
                    </div>
                </div>
            `;
        }).reverse().join('');

        content.innerHTML = html;

        // 绑定复制按钮事件
        content.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                copyToClipboard(btn.dataset.value);
            });
        });
    }

    // ========== 核心监听 ==========

    function handleClick(event) {
        if (!isRecording) return;

        // 忽略探测器面板内的点击
        if (event.target.closest('#selector-detective-panel')) {
            return;
        }

        const element = event.target;

        // 记录点击
        const record = {
            time: new Date().toLocaleTimeString('zh-CN'),
            tag: element.tagName.toLowerCase(),
            text: getElementText(element),
            selectors: generateSelectors(element),
            isPossible: isPossibleUpscaleButton(element),
            element: element
        };

        clickRecords.push(record);
        recordCount++;

        // 更新面板
        updatePanel();

        // 如果是疑似按钮，闪烁提示
        if (record.isPossible) {
            showToast('⭐ 检测到疑似升级按钮!');
            highlightElement(element);
        }

        console.log('🔍 选择器探测:', record);
    }

    function highlightElement(element) {
        const originalBorder = element.style.border;
        const originalBoxShadow = element.style.boxShadow;

        element.style.border = '3px solid #FF9800';
        element.style.boxShadow = '0 0 20px rgba(255, 152, 0, 0.6)';

        setTimeout(() => {
            element.style.border = originalBorder;
            element.style.boxShadow = originalBoxShadow;
        }, 2000);
    }

    // ========== 初始化 ==========

    function init() {
        console.log('🔍 Grok 选择器探测器已启动!');

        createPanel();

        // 监听所有点击事件
        document.addEventListener('click', handleClick, true);

        // 添加快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+D: 切换录制
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggleRecording();
            }
            // Ctrl+Shift+M: 最小化/最大化
            if (e.ctrlKey && e.shiftKey && e.key === 'M') {
                e.preventDefault();
                toggleMinimize();
            }
        });

        console.log('💡 快捷键:');
        console.log('  Ctrl+Shift+D - 切换录制');
        console.log('  Ctrl+Shift+M - 最小化/展开面板');
    }

    // 等待页面加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }

})();

/*
 * 🔍 Grok 选择器探测器使用说明
 *
 * 功能:
 * - 记录你点击的所有元素
 * - 自动生成多种CSS选择器
 * - 智能识别疑似"升级"按钮
 * - 一键复制选择器
 * - 导出记录数据
 *
 * 使用方法:
 * 1. 安装 Tampermonkey 扩展
 * 2. 创建新脚本，粘贴此代码
 * 3. 访问 Grok 网站
 * 4. 点击"升级"按钮
 * 5. 点击"📤 导出"按钮导出数据
 * 6. 选择导出方式后发送给助手
 *
 * 导出方式:
 * - 📋 复制为 JSON: 结构化数据，推荐用于分析
 * - 📝 复制为文本: 可读性强的文本格式
 * - 💾 下载为文件: 保存为 JSON 文件
 *
 * 快捷键:
 * - Ctrl+Shift+D: 暂停/继续录制
 * - Ctrl+Shift+M: 最小化/展开面板
 *
 * 提示:
 * - 标有 ⭐ 的是智能识别的疑似升级按钮
 * - 点击"复制"按钮即可复制选择器
 * - 建议优先使用 id、class 或 dataAttr 选择器
 * - 导出后可直接发送给助手进行分析
 */