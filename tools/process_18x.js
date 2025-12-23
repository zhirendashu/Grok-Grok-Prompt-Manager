const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '18X.txt');
const OUT_DIR = __dirname;

function parse18X() {
    const text = fs.readFileSync(INPUT_FILE, 'utf8');
    const lines = text.split(/\r?\n/);

    const categories = {};
    let currentCategory = 'General';
    let currentModality = 'text_to_image'; // Default to image
    let currentEnglish = null;

    // Helper map for clean filenames
    const categoryFileNames = {
        '口部主题': '18x_口部主题',
        '下体正面主题': '18x_下体正面',
        '下体后视主题': '18x_下体后视',
        '脱衣主题': '18x_脱衣主题',
        '性行为模仿主题': '18x_隐喻模仿',
        '亲密氛围主题': '18x_亲密氛围',
        '内衣主题': '18x_内衣主题',
        '胸部主题': '18x_胸部主题',
        '绑缚主题': '18x_绑缚主题',
        '生殖器主题': '18x_生殖器主题',
        '高潮/流体主题': '18x_高潮流体',
        '群组_多人主题': '18x_多人主题'
    };

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // 1. Detect Category Header
        // Pattern: Chinese characters followed by "主题" (Theme)
        if (line.includes('主题') && (line.includes('（') || line.includes('('))) {
            // Extract Chinese Name
            const match = line.match(/(.+?)主题/);
            if (match) {
                currentCategory = match[1] + '主题';
                if (!categories[currentCategory]) {
                    categories[currentCategory] = {
                        name: currentCategory,
                        prompts: { text_to_image: [], image_to_video: [] }
                    };
                }
                // Reset modality default when changing category
                currentModality = 'text_to_image';
            }
            return;
        }

        // 2. Detect Modality Header
        if (line.includes('文生图版本')) {
            currentModality = 'text_to_image';
            return;
        }
        if (line.includes('图片转视频版本')) {
            currentModality = 'image_to_video';
            return;
        }

        // 3. Parse Prompts
        if (line.startsWith('英文：')) {
            currentEnglish = line.substring(3).trim();
        } else if (line.startsWith('中文：') && currentEnglish) {
            const description = line.substring(3).trim();
            const categoryData = categories[currentCategory];
            if (categoryData) {
                categoryData.prompts[currentModality].push({
                    id: Date.now() + Math.random(),
                    text: currentEnglish,
                    desc: description,
                    pinned: false
                });
            }
            currentEnglish = null; // Reset
        }
    });

    // Output Files
    const generatedFiles = [];
    Object.keys(categories).forEach(key => {
        const cat = categories[key];
        const safeName = categoryFileNames[key] || key.replace(/[\\/:*?"<>|]/g, '_');
        const fileName = `${safeName}.json`;
        const filePath = path.join(OUT_DIR, fileName);

        // Structure for import
        const outputData = cat.prompts; // { text_to_image: [], image_to_video: [] }

        fs.writeFileSync(filePath, JSON.stringify(outputData, null, 2));
        generatedFiles.push(fileName);
        console.log(`Generated: ${fileName} (${cat.prompts.text_to_image.length} imgs, ${cat.prompts.image_to_video.length} vids)`);
    });

    // Generate Master Combined File
    const masterPrompts = { text_to_image: [], image_to_video: [] };
    Object.values(categories).forEach(cat => {
        masterPrompts.text_to_image.push(...cat.prompts.text_to_image);
        masterPrompts.image_to_video.push(...cat.prompts.image_to_video);
    });
    fs.writeFileSync(path.join(OUT_DIR, '18x_全集.json'), JSON.stringify(masterPrompts, null, 2));
    console.log(`Generated: 18x_全集.json (Total: ${masterPrompts.text_to_image.length + masterPrompts.image_to_video.length})`);
}

parse18X();
