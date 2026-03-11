/**
 * 随机模式引导文案配置
 * 集中管理所有模式的首次使用引导内容
 */

export const GUIDE_CONFIGS = {
    portrait: {
        title: '📸 写真模式使用说明',
        color: '#1d9bf0',
        what: '一键生成专业写真提示词，自动组合标准开头 + 10条随机风格元素',
        how: [
            '创建一个名为 <code>写真模式标准描述</code> 的提示词库',
            '在此库中添加您的标准写真开头（可添加多条，系统会随机选择）',
            '点击写真模式，即可自动生成完整提示词'
        ],
        example: '真实胶片直闪摄影，亚洲女性，小红书网红脸，表情冷漠而自信，姿态略带挑逗，身材真实吸引人',
        storageKey: 'gpm_portrait_guide_seen'
    },

    adult_portrait: {
        title: '🔞 R18写真模式使用说明',
        color: '#e91e63',
        what: '专业成人写真提示词生成，自动组合：标准写真 + 成人修饰 + 10条随机元素',
        how: [
            '创建 <code>写真模式标准描述</code> 库（存放标准写真开头）',
            '创建 <code>成人模式标准添加词</code> 库（存放成人写真修饰词）',
            '点击R18写真，系统会从两个库各抽1条 + 10条全局随机元素'
        ],
        example: '【标准写真前缀】+ 【成人修饰词】+ 【10条随机风格元素】',
        storageKey: 'gpm_r18_guide_seen'
    },

    video_random: {
        title: '🎬 视频随机模式使用说明',
        color: '#673ab7',
        what: '专为视频生成设计的精简模式，避免提示词过多混淆AI判断，每次只从专用库中抽取1条提示词',
        how: [
            '创建一个名为 <code>随机视频专用</code> 的提示词库',
            '在此库中添加精选的视频提示词（建议每条都是完整的场景描述）',
            '点击视频随机，会从该库中随机抽取1条'
        ],
        example: '慢动作，晨光中的咖啡，蒸汽升腾，暖色调，柔和光线，宁静氛围',
        storageKey: 'gpm_video_random_guide_seen'
    },

    video_r18: {
        title: '🔞 R18视频模式使用说明',
        color: '#e91e63',
        what: '成人向视频提示词生成，自动组合：基础视频场景 + R18修饰词',
        how: [
            '创建 <code>随机视频专用</code> 库（存放基础视频场景）',
            '创建 <code>R18视频添加提示词</code> 库（存放成人向修饰词）',
            '点击R18视频，系统会从两个库各抽1条进行组合'
        ],
        example: '【基础视频场景】+ 【R18修饰词】',
        storageKey: 'gpm_video_r18_guide_seen'
    },

    random3: {
        title: '🎲 三连抽取模式',
        color: '#9c27b0',
        what: '从当前库中随机抽取3条提示词，快速组合创意灵感',
        how: [
            '确保当前库有足够的提示词',
            '点击三连抽取，自动随机选择3条',
            '提示词会自动用逗号连接'
        ],
        example: '（从当前库随机抽取3条组合）',
        storageKey: 'gpm_random3_guide_seen'
    },

    catmix: {
        title: '🎨 多类混合模式',
        color: '#ff9800',
        what: '从当前库的每个分类中各抽取1条，创造跨类别的创意组合',
        how: [
            '确保当前库有多个分类',
            '点击多类混合，每个分类自动抽1条',
            '适合探索不同风格的融合效果'
        ],
        example: '（从每个分类各抽1条组合）',
        storageKey: 'gpm_catmix_guide_seen'
    },

    chaos: {
        title: '🌀 混沌生成模式',
        color: '#4a148c',
        what: '从所有库中随机抽取5-12条提示词，创造极致的随机性和惊喜',
        how: [
            '系统会扫描所有同类型的库',
            '随机抽取5-12条（数量随机）',
            '最适合寻找意外的创意灵感'
        ],
        example: '（从所有库随机抽取5-12条）',
        storageKey: 'gpm_chaos_guide_seen'
    }
};
