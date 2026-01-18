// ==UserScript==
// @name         DOM 结构记录器
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  右键点击任意元素，记录其 HTML 结构并自动复制
// @author       植人大树
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let selectedElement = null;

    // 获取元素的完整选择器路径
    const getSelector = (element) => {
        if (element.id) return `#${element.id}`;
        
        const path = [];
        let current = element;
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let selector = current.nodeName.toLowerCase();
            
            if (current.className) {
                const classes = current.className.split(' ').filter(c => c.trim());
                if (classes.length > 0) {
                    selector += '.' + classes.join('.');
                }
            }
            
            path.unshift(selector);
            current = current.parentNode;
            
            if (path.length > 5) break;
        }
        
        return path.join(' > ');
    };

    // 记录元素信息
    const logElement = (element) => {
        console.clear();
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #0f0');
        console.log('%c🎯 DOM 结构记录器', 'color: #0f0; font-size: 16px; font-weight: bold');
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #0f0');
        
        // 构建要复制的文本
        let copyText = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        copyText += '🎯 DOM 结构记录\n';
        copyText += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        
        // 基本信息
        console.log('%c\n📋 基本信息:', 'color: #ff0; font-weight: bold');
        copyText += '📋 基本信息:\n';
        console.log('标签名:', element.tagName);
        copyText += `标签名: ${element.tagName}\n`;
        console.log('ID:', element.id || '(无)');
        copyText += `ID: ${element.id || '(无)'}\n`;
        console.log('Class:', element.className || '(无)');
        copyText += `Class: ${element.className || '(无)'}\n`;
        const textContent = element.textContent?.trim().substring(0, 100) || '(无)';
        console.log('文本内容:', textContent);
        copyText += `文本内容: ${textContent}\n\n`;
        
        // 属性
        console.log('%c\n🏷️  所有属性:', 'color: #ff0; font-weight: bold');
        copyText += '🏷️ 所有属性:\n';
        Array.from(element.attributes).forEach(attr => {
            console.log(`  ${attr.name}:`, attr.value);
            copyText += `  ${attr.name}: ${attr.value}\n`;
        });
        
        // 选择器
        const selector = getSelector(element);
        console.log('%c\n🎯 CSS 选择器:', 'color: #ff0; font-weight: bold');
        console.log(selector);
        copyText += `\n🎯 CSS 选择器:\n${selector}\n\n`;
        
        // HTML 结构
        console.log('%c\n📝 HTML 结构:', 'color: #ff0; font-weight: bold');
        console.log(element.outerHTML);
        copyText += `📝 HTML 结构:\n${element.outerHTML}\n\n`;
        
        // 父元素
        if (element.parentElement) {
            console.log('%c\n👨‍👦 父元素:', 'color: #ff0; font-weight: bold');
            const parentHTML = element.parentElement.outerHTML.substring(0, 500) + '...';
            console.log(parentHTML);
            copyText += `👨‍👦 父元素:\n${parentHTML}\n\n`;
        }
        
        // 子元素
        if (element.children.length > 0) {
            console.log('%c\n👶 子元素数量:', 'color: #ff0; font-weight: bold', element.children.length);
            copyText += `👶 子元素数量: ${element.children.length}\n\n`;
        }
        
        console.log('%c\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #0f0');
        console.log('%c✅ 信息已自动复制到剪贴板', 'color: #0f0; font-weight: bold');
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'color: #0f0');
        
        copyText += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        
        // 自动复制到剪贴板
        navigator.clipboard.writeText(copyText).then(() => {
            alert('✅ DOM 信息已记录并复制到剪贴板！\n\n请按 Ctrl+V 粘贴给开发者。\n\n（也可以在控制台查看详细信息）');
        }).catch(err => {
            console.error('复制失败:', err);
            alert('⚠️ 信息已记录到控制台，但自动复制失败。\n\n请打开控制台（F12）手动复制内容。');
        });
    };

    // 高亮元素
    const highlightElement = (element) => {
        if (selectedElement) {
            selectedElement.style.outline = '';
        }
        element.style.outline = '3px solid #0f0';
        selectedElement = element;
    };

    // 监听鼠标悬停
    document.addEventListener('mouseover', (e) => {
        if (e.ctrlKey) {
            e.target.style.outline = '2px dashed #ff0';
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target !== selectedElement) {
            e.target.style.outline = '';
        }
    });

    // 监听右键点击
    document.addEventListener('contextmenu', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            highlightElement(e.target);
            logElement(e.target);
        }
    });

    // 启动提示
    console.log('%c🎯 DOM 结构记录器已启动', 'color: #0f0; font-size: 14px; font-weight: bold');
    console.log('%c使用方法: Ctrl + 右键点击任意元素', 'color: #888');
    console.log('%c按住 Ctrl 悬停可预览高亮\n', 'color: #888');
    
    alert('🎯 DOM 记录器已启动！\n\n使用方法：\n1. 按住 Ctrl 键\n2. 右键点击要记录的元素\n3. 信息会自动复制到剪贴板');
})();
