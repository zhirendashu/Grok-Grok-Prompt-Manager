const fs = require('fs');
const path = require('path');

const DIR = 'c:\\Users\\trees\\下载\\Grok prompt';
const CSV_FILE = path.join(DIR, 'AGI 文生图 · 提示词备忘录 455eee7172bd455a9fe92adf188ab3a1_all.csv');
const TXT_MASTER = path.join(DIR, '全新母体.txt');
const MD_STYLE2 = path.join(DIR, '风格 2 变体 2cd2a6ab29f880fdb9afd1e6d2cebb0d.md');
const MD_TEST = path.join(DIR, '测试版本 基本可用版 2cc2a6ab29f880f1bbe2cad184b8650f.md');

const OUT_IMG = path.join(DIR, 'import_text_to_image.json');
const OUT_VID = path.join(DIR, 'import_image_to_video.json');
const OUT_TAGS = path.join(DIR, 'extracted_modifiers.txt');

function parseCSV(content) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuote = false;

    for (let i = 0; i < content.length; i++) {
        const c = content[i];
        const next = content[i + 1];

        if (c === '"') {
            if (inQuote && next === '"') {
                currentCell += '"'; // Escaped quote
                i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (c === ',' && !inQuote) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((c === '\r' || c === '\n') && !inQuote) {
            if (c === '\r' && next === '\n') i++; // Handle CRLF
            currentRow.push(currentCell.trim());
            if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0])) { // Skip empty lines
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += c;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }
    return rows;
}

function normalize(text) {
    return text ? text.replace(/\r\n/g, '\n').trim() : '';
}

function main() {
    console.log('Staring migration...');

    let imgPrompts = [];
    let vidPrompts = [];
    let modifiers = new Set();

    // --- 1. Process CSV ---
    if (fs.existsSync(CSV_FILE)) {
        console.log(`Processing CSV: ${CSV_FILE}`);
        const content = fs.readFileSync(CSV_FILE, 'utf8');
        // Handle potentially BOM
        const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;

        const rows = parseCSV(cleanContent);
        if (rows.length > 0) {
            const headers = rows[0];
            const pIdx = headers.indexOf('Prompt');
            const mIdx = headers.indexOf('Modality');
            const tIdx = headers.indexOf('Style Tags');

            console.log(`Headers found: Prompt=${pIdx}, Modality=${mIdx}, Tags=${tIdx}`);

            for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                if (!r[pIdx]) continue;

                const promptText = normalize(r[pIdx]);
                if (promptText.length < 5) continue; // Skip too short

                const modality = r[mIdx] ? r[mIdx].toLowerCase() : 'image';
                const tagStr = r[tIdx];

                const item = { text: promptText, pinned: false };

                if (modality.includes('video')) {
                    vidPrompts.push(item);
                } else {
                    imgPrompts.push(item);
                }

                if (tagStr && tagStr !== 'Style Tags') {
                    tagStr.split(',').forEach(t => {
                        const cleanTag = t.trim();
                        if (cleanTag && cleanTag.length < 30) modifiers.add(cleanTag);
                    });
                }
            }
        }
    } else {
        console.log('CSV file not found!');
    }

    // --- 2. Process TXT/MD (Heuristic Extraction) ---
    const processHeuristic = (filePath, defaultType = 'image') => {
        if (!fs.existsSync(filePath)) {
            console.log(`Skipping missing file: ${filePath}`);
            return;
        }
        console.log(`Processing file: ${filePath}`);
        const text = fs.readFileSync(filePath, 'utf8');
        // Split by double newlines or similar separators
        const blocks = text.split(/\n\s*\n/);

        blocks.forEach(block => {
            const clean = normalize(block);
            if (clean.length > 40 && !clean.startsWith('#')) {
                // Determine type based on keywords if not explicit
                const isVideo = clean.toLowerCase().includes('video') || clean.includes('10秒') || clean.includes('fps');
                const item = { text: clean, pinned: false };
                if (isVideo) vidPrompts.push(item);
                else imgPrompts.push(item);
            }
        });
    };

    processHeuristic(TXT_MASTER);
    processHeuristic(MD_STYLE2);
    processHeuristic(MD_TEST);

    // --- 3. Deduplicate ---
    const dedupe = (list) => {
        const seen = new Set();
        const res = [];
        list.forEach(item => {
            // Simplified normalization for dedupe (remove whitespace, lowercase)
            const signature = item.text.toLowerCase().replace(/\s+/g, '');
            if (!seen.has(signature)) {
                seen.add(signature);
                item.id = Date.now() + Math.random(); // Add ID for userscript
                res.push(item);
            }
        });
        return res;
    };

    const uniqueImg = dedupe(imgPrompts);
    const uniqueVid = dedupe(vidPrompts);

    console.log(`Extracted ${uniqueImg.length} Image prompts`);
    console.log(`Extracted ${uniqueVid.length} Video prompts`);
    console.log(`Extracted ${modifiers.size} Modifiers`);

    // --- 4. Output ---
    fs.writeFileSync(OUT_IMG, JSON.stringify(uniqueImg, null, 2));
    fs.writeFileSync(OUT_VID, JSON.stringify(uniqueVid, null, 2));

    // Sort modifiers alphabetically
    const sortedMods = Array.from(modifiers).sort();
    fs.writeFileSync(OUT_TAGS, sortedMods.join('\n'));
}

main();
