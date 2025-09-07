-- Migration 007: Initialize Scenario and Feature Data
-- This migration populates the scenario system with initial data based on FEATURES.md

-- Insert scenarios (4 main categories)
INSERT INTO scenarios (code, name, description, icon, color, sort_order) VALUES
('ecommerce', '电商产品优化', '专业的电商产品图像优化，提升转化率和销售表现', '🏪', '#4F46E5', 1),
('creative', '创意营销', '趣味病毒式变换，打造独特的营销内容和社交媒体素材', '🎭', '#EC4899', 2),
('artistic', '艺术创作', '专业的艺术风格转换和创意表达工具', '🎨', '#F59E0B', 3),
('utility', '实用工具', '高效的图像处理实用工具，解决常见的图像编辑需求', '🔧', '#10B981', 4);

-- Insert features based on FEATURES.md classification
-- 🏪 电商产品优化 features
INSERT INTO features (code, name, description, prompt_template, icon, use_case_tags, processing_options, sort_order) VALUES
-- High quality enhancement
('hd_enhance', '高清增强', '提高图像分辨率和清晰度，AI超分辨率技术提升图像质量', 'Enhance this image to high resolution, improving sharpness and clarity.', '🔍', ARRAY['高清', '清晰度', '分辨率'], '{"dual_image": false, "mask_supported": true}', 1),
-- Background replacement  
('bg_y2k', '背景替换', '替换为Y2K复古美学背景，2000年代复古未来主义风格', 'Change the background to a Y2K aesthetic style.', '🪩', ARRAY['背景', 'Y2K', '复古'], '{"dual_image": false, "mask_supported": true}', 2),
-- Product rendering
('product_render', '产品渲染', '将产品草图转换为3D渲染图，专业产品展示级别', 'Turn this product sketch into a photorealistic 3D render with studio lighting.', '💡', ARRAY['3D', '渲染', '产品设计'], '{"dual_image": false, "mask_supported": false}', 3),
-- Industrial design
('industrial_design', '工业设计渲染', '工业设计草图转真实产品，博物馆级展示效果', 'Turn this industrial design sketch into a realistic product photo, rendered with light brown leather and displayed in a minimalist museum setting.', '🛋️', ARRAY['工业设计', '产品', '博物馆'], '{"dual_image": false, "mask_supported": false}', 4),
-- Soda can design
('soda_can', '汽水罐设计', '将图像应用到汽水罐产品设计上，完整包装设计', 'Design a soda can using this image as the main graphic, and show it in a professional product shot.', '🥤', ARRAY['包装设计', '产品', '汽水罐'], '{"dual_image": false, "mask_supported": false}', 5),
-- Fashion magazine
('fashion_mag', '时尚杂志', '制作时尚杂志封面风格照片，专业摄影效果', 'Transform the photo into a stylized, ultra-realistic fashion magazine portrait with cinematic lighting.', '📸', ARRAY['时尚', '杂志', '摄影'], '{"dual_image": false, "mask_supported": true}', 6),
-- Hyper realistic
('hyper_realistic', '超写实风格', '应用超写实摄影风格，强烈闪光灯效果', 'Generate a hyper-realistic, fashion-style photo with strong, direct flash lighting, grainy texture, and a cool, confident pose.', '✨', ARRAY['超写实', '摄影', '时尚'], '{"dual_image": false, "mask_supported": true}', 7);

-- 🎭 创意营销 features  
INSERT INTO features (code, name, description, prompt_template, icon, use_case_tags, processing_options, sort_order) VALUES
-- Custom prompt
('custom_prompt', '自定义提示词', '用户自定义任意变换效果，无限创意可能', 'USER_INPUT_REQUIRED', '✍️', ARRAY['自定义', '创意', '无限可能'], '{"dual_image": false, "mask_supported": true, "custom_prompt": true}', 1),
-- 3D figure
('3d_figure', '3D手办', '将人物照片转换为收藏级3D手办，包含制作场景', 'turn this photo into a character figure. Behind it, place a box with the character''s image printed on it, and a computer showing the Blender modeling process on its screen. In front of the box, add a round plastic base with the character figure standing on it. set the scene indoors if possible', '🧍', ARRAY['3D', '手办', '收藏'], '{"dual_image": false, "mask_supported": true}', 2),
-- Funko Pop
('funko_pop', 'Funko Pop手办', '转换为Funko Pop收藏玩具风格，可爱大头娃娃', 'Transform the person into a Funko Pop figure, shown inside and next to its packaging.', '📦', ARRAY['Funko', '玩具', '收藏'], '{"dual_image": false, "mask_supported": true}', 3),
-- LEGO figure
('lego_figure', '乐高小人', '转换为乐高积木人物，经典造型带包装', 'Transform the person into a LEGO minifigure, inside its packaging box.', '🧱', ARRAY['乐高', '积木', '玩具'], '{"dual_image": false, "mask_supported": true}', 4),
-- Crochet doll
('crochet_doll', '钩织玩偶', '转换为手工钩织娃娃，温暖手工质感', 'Transform the subject into a handmade crocheted yarn doll with a cute, chibi-style appearance.', '🧶', ARRAY['钩织', '手工', '娃娃'], '{"dual_image": false, "mask_supported": true}', 5),
-- Plushie
('plushie', '可爱毛绒玩具', '转换为柔软的毛绒玩具，柔软可抱质感', 'Turn the person in this photo into a cute, soft plushie doll.', '🧸', ARRAY['毛绒', '玩具', '可爱'], '{"dual_image": false, "mask_supported": true}', 6),
-- Acrylic keychain
('acrylic_keychain', '亚克力挂件', '制作亚克力钥匙扣挂件，展示在包包上', 'Turn the subject into a cute acrylic keychain, shown attached to a bag.', '🔑', ARRAY['亚克力', '挂件', '钥匙扣'], '{"dual_image": false, "mask_supported": true}', 7),
-- Anime to cosplay
('anime_cosplay', '动漫转真人cos', '将动漫角色转换为真人cosplay照片', 'Generate a highly detailed, realistic photo of a person cosplaying the character in this illustration. Replicate the pose, expression, and framing.', '🎭', ARRAY['动漫', 'cosplay', '真人'], '{"dual_image": false, "mask_supported": false}', 8);

-- 🎨 艺术创作 features
INSERT INTO features (code, name, description, prompt_template, icon, use_case_tags, processing_options, sort_order) VALUES
-- Color palette conversion (two-step process)
('color_palette', '颜色调色板转换', '先转换为线稿，再用另一张图的颜色重新上色', 'Turn this image into a clean, hand-drawn line art sketch.', '🎨', ARRAY['调色板', '线稿', '上色'], '{"dual_image": true, "two_step": true, "step2_prompt": "Color the line art using the colors from the second image."}', 1),
-- Line art
('line_art', '线稿绘画', '转换为手绘线稿风格，简洁黑白线条艺术', 'Turn the image into a clean, hand-drawn line art sketch.', '✍🏻', ARRAY['线稿', '手绘', '黑白'], '{"dual_image": false, "mask_supported": true}', 2),
-- Drawing process
('drawing_process', '绘画过程', '展示四步绘画创作过程，从草图到完成', 'Generate a 4-panel grid showing the artistic process of creating this image, from sketch to final render.', '🖼️', ARRAY['绘画过程', '创作', '四步'], '{"dual_image": false, "mask_supported": false}', 3),
-- Marker sketch
('marker_sketch', '马克笔素描', 'Copic马克笔素描风格，设计师绘画风格', 'Redraw the image in the style of a Copic marker sketch, often used in design.', '🖊️', ARRAY['马克笔', '素描', '设计'], '{"dual_image": false, "mask_supported": true}', 4),
-- Add illustration
('add_illustration', '添加插画', '在真实场景中添加卡通角色，现实与插画融合', 'Add a cute, cartoon-style illustrated couple into the real-world scene, sitting and talking.', '🧑‍🎨', ARRAY['插画', '卡通', '融合'], '{"dual_image": false, "mask_supported": true}', 5),
-- Cyberpunk
('cyberpunk', '赛博朋克', '转换为未来赛博朋克城市风格，霓虹闪烁', 'Transform the scene into a futuristic cyberpunk city.', '🤖', ARRAY['赛博朋克', '未来', '霓虹'], '{"dual_image": false, "mask_supported": true}', 6),
-- Van Gogh style
('van_gogh', '梵高星空风格', '应用梵高《星空》绘画风格，螺旋笔触', 'Reimagine the photo in the style of Van Gogh''s ''Starry Night''.', '🌌', ARRAY['梵高', '星空', '艺术'], '{"dual_image": false, "mask_supported": true}', 7);

-- 🔧 实用工具 features
INSERT INTO features (code, name, description, prompt_template, icon, use_case_tags, processing_options, sort_order) VALUES
-- Subject isolation
('subject_isolation', '抠图增强', '抠出人物并生成高清肖像，精确抠图', 'Isolate the person in the masked area and generate a high-definition photo of them against a neutral background.', '🎯', ARRAY['抠图', '人物', '肖像'], '{"dual_image": false, "mask_required": true}', 1),
-- 3D screen effect  
('3d_screen', '3D屏幕效果', '让屏幕内容呈现3D立体效果，裸眼3D', 'For an image with a screen, add content that appears to be glasses-free 3D, popping out of the screen.', '📺', ARRAY['3D', '屏幕', '立体'], '{"dual_image": false, "mask_supported": true}', 2),
-- Makeup analysis
('makeup_analysis', '妆容分析', '分析妆容并提供改进建议，专业化妆师级别', 'Analyze the makeup in this photo and suggest improvements by drawing with a red pen.', '💄', ARRAY['妆容', '分析', '美妆'], '{"dual_image": false, "mask_supported": false}', 3);

-- Additional utility features from FEATURES.md
INSERT INTO features (code, name, description, prompt_template, icon, use_case_tags, processing_options, sort_order) VALUES
-- Pose reference (dual image)
('pose_reference', '姿势参考', '将一张图的姿势应用到另一张图的角色上', 'Apply the pose from the second image to the character in the first image. Render as a professional studio photograph.', '💃', ARRAY['姿势', '参考', '双图'], '{"dual_image": true, "mask_supported": false}', 4),
-- Convert to realistic
('to_realistic', '转写实风格', '将插画或绘画转换为照片写实风格', 'Turn this illustration into a photorealistic version.', '🪄', ARRAY['写实', '转换', '照片'], '{"dual_image": false, "mask_supported": true}', 5),
-- Architectural model
('arch_model', '建筑模型', '将建筑照片转换为精细建筑模型', 'Convert this photo of a building into a miniature architecture model, placed on a cardstock in an indoor setting. Show a computer with modeling software in the background.', '🏗️', ARRAY['建筑', '模型', '精细'], '{"dual_image": false, "mask_supported": false}', 6);

-- Create scenario-feature mappings
-- 🏪 E-commerce scenario features
INSERT INTO scenario_features (scenario_id, feature_id, sort_order, is_featured) 
SELECT s.id, f.id, f.sort_order, (f.sort_order <= 3) as is_featured
FROM scenarios s, features f 
WHERE s.code = 'ecommerce' 
AND f.code IN ('hd_enhance', 'bg_y2k', 'product_render', 'industrial_design', 'soda_can', 'fashion_mag', 'hyper_realistic');

-- 🎭 Creative scenario features  
INSERT INTO scenario_features (scenario_id, feature_id, sort_order, is_featured)
SELECT s.id, f.id, f.sort_order, (f.sort_order <= 4) as is_featured  
FROM scenarios s, features f
WHERE s.code = 'creative'
AND f.code IN ('custom_prompt', '3d_figure', 'funko_pop', 'lego_figure', 'crochet_doll', 'plushie', 'acrylic_keychain', 'anime_cosplay');

-- 🎨 Artistic scenario features
INSERT INTO scenario_features (scenario_id, feature_id, sort_order, is_featured)
SELECT s.id, f.id, f.sort_order, (f.sort_order <= 3) as is_featured
FROM scenarios s, features f  
WHERE s.code = 'artistic'
AND f.code IN ('color_palette', 'line_art', 'drawing_process', 'marker_sketch', 'add_illustration', 'cyberpunk', 'van_gogh');

-- 🔧 Utility scenario features
INSERT INTO scenario_features (scenario_id, feature_id, sort_order, is_featured)
SELECT s.id, f.id, f.sort_order, (f.sort_order <= 2) as is_featured
FROM scenarios s, features f
WHERE s.code = 'utility'  
AND f.code IN ('subject_isolation', '3d_screen', 'makeup_analysis', 'pose_reference', 'to_realistic', 'arch_model');