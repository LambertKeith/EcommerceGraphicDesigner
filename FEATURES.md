# Nano Bananary 功能文档

## 概述

Nano Bananary 是一个基于 AI 的图像变换工具，集成了 Google Gemini 2.5 Flash API，提供 24 种不同的图像处理和风格转换功能。

## 功能分类

### 🎭 趣味病毒式变换 (8种)

#### 1. ✍️ 自定义提示词
- **功能**: 用户自定义任意变换效果
- **提示词**: 用户输入
- **描述**: 无限创意可能，用户可以描述任何想象得到的变换

#### 2. 🧍 3D手办
- **功能**: 将人物照片转换为收藏级3D手办
- **提示词**: `turn this photo into a character figure. Behind it, place a box with the character's image printed on it, and a computer showing the Blender modeling process on its screen. In front of the box, add a round plastic base with the character figure standing on it. set the scene indoors if possible`
- **描述**: 生成完整的手办包装场景，包括包装盒和制作过程

#### 3. 📦 Funko Pop手办
- **功能**: 转换为 Funko Pop! 收藏玩具风格
- **提示词**: `Transform the person into a Funko Pop figure, shown inside and next to its packaging.`
- **描述**: 可爱的大头娃娃风格，带有经典包装盒

#### 4. 🧱 乐高小人
- **功能**: 转换为乐高积木人物
- **提示词**: `Transform the person into a LEGO minifigure, inside its packaging box.`
- **描述**: 经典乐高积木人物造型，附带包装

#### 5. 🧶 钩织玩偶
- **功能**: 转换为手工钩织娃娃
- **提示词**: `Transform the subject into a handmade crocheted yarn doll with a cute, chibi-style appearance.`
- **描述**: 温暖的手工制作质感，Q版可爱风格

#### 6. 🎭 动漫转真人cos
- **功能**: 将动漫角色转换为真人cosplay照片
- **提示词**: `Generate a highly detailed, realistic photo of a person cosplaying the character in this illustration. Replicate the pose, expression, and framing.`
- **描述**: 高度还原的cosplay效果，保持原始姿势和表情

#### 7. 🧸 可爱毛绒玩具
- **功能**: 转换为柔软的毛绒玩具
- **提示词**: `Turn the person in this photo into a cute, soft plushie doll.`
- **描述**: 柔软可抱的毛绒玩具质感

#### 8. 🔑 亚克力挂件
- **功能**: 制作亚克力钥匙扣挂件
- **提示词**: `Turn the subject into a cute acrylic keychain, shown attached to a bag.`
- **描述**: 精美的透明亚克力挂件，展示在包包上

### 📸 写实增强类 (5种)

#### 9. 🔍 高清增强
- **功能**: 提高图像分辨率和清晰度
- **提示词**: `Enhance this image to high resolution, improving sharpness and clarity.`
- **描述**: AI超分辨率技术，提升图像质量

#### 10. 💃 姿势参考 (双图模式)
- **功能**: 将一张图的姿势应用到另一张图的角色上
- **提示词**: `Apply the pose from the second image to the character in the first image. Render as a professional studio photograph.`
- **描述**: 需要两张图片：角色图和姿势参考图
- **特殊功能**: 双图像输入

#### 11. 🪄 转写实风格
- **功能**: 将插画或绘画转换为照片写实风格
- **提示词**: `Turn this illustration into a photorealistic version.`
- **描述**: 从卡通到真实的风格转换

#### 12. 📸 时尚杂志
- **功能**: 制作时尚杂志封面风格照片
- **提示词**: `Transform the photo into a stylized, ultra-realistic fashion magazine portrait with cinematic lighting.`
- **描述**: 专业的时尚摄影效果，电影级灯光

#### 13. ✨ 超写实风格
- **功能**: 应用超写实摄影风格
- **提示词**: `Generate a hyper-realistic, fashion-style photo with strong, direct flash lighting, grainy texture, and a cool, confident pose.`
- **描述**: 强烈闪光灯效果，颗粒质感，酷炫姿态

### 💡 设计产品类 (4种)

#### 14. 🏗️ 建筑模型
- **功能**: 将建筑照片转换为精细建筑模型
- **提示词**: `Convert this photo of a building into a miniature architecture model, placed on a cardstock in an indoor setting. Show a computer with modeling software in the background.`
- **描述**: 专业建筑模型效果，包含制作场景

#### 15. 💡 产品渲染
- **功能**: 将产品草图转换为3D渲染图
- **提示词**: `Turn this product sketch into a photorealistic 3D render with studio lighting.`
- **描述**: 专业产品展示级别的3D渲染

#### 16. 🥤 汽水罐设计
- **功能**: 将图像应用到汽水罐产品设计上
- **提示词**: `Design a soda can using this image as the main graphic, and show it in a professional product shot.`
- **描述**: 完整的产品包装设计和拍摄效果

#### 17. 🛋️ 工业设计渲染
- **功能**: 工业设计草图转真实产品
- **提示词**: `Turn this industrial design sketch into a realistic product photo, rendered with light brown leather and displayed in a minimalist museum setting.`
- **描述**: 博物馆级展示效果，皮革材质

### 🎨 艺术风格类 (7种)

#### 18. 🎨 颜色调色板转换 (双图+两步处理)
- **功能**: 先转换为线稿，再用另一张图的颜色重新上色
- **第一步提示词**: `Turn this image into a clean, hand-drawn line art sketch.`
- **第二步提示词**: `Color the line art using the colors from the second image.`
- **描述**: 需要原图和调色板图，分两步处理
- **特殊功能**: 双图像输入 + 两步处理

#### 19. ✍🏻 线稿绘画
- **功能**: 转换为手绘线稿风格
- **提示词**: `Turn the image into a clean, hand-drawn line art sketch.`
- **描述**: 简洁的黑白线条艺术

#### 20. 🖼️ 绘画过程
- **功能**: 展示四步绘画创作过程
- **提示词**: `Generate a 4-panel grid showing the artistic process of creating this image, from sketch to final render.`
- **描述**: 从草图到完成品的创作流程展示

#### 21. 🖊️ 马克笔素描
- **功能**: Copic马克笔素描风格
- **提示词**: `Redraw the image in the style of a Copic marker sketch, often used in design.`
- **描述**: 专业设计师常用的马克笔绘画风格

#### 22. 🧑‍🎨 添加插画
- **功能**: 在真实场景中添加卡通角色
- **提示词**: `Add a cute, cartoon-style illustrated couple into the real-world scene, sitting and talking.`
- **描述**: 现实与插画的完美融合

#### 23. 🤖 赛博朋克
- **功能**: 转换为未来赛博朋克城市风格
- **提示词**: `Transform the scene into a futuristic cyberpunk city.`
- **描述**: 霓虹闪烁的未来都市风格

#### 24. 🌌 梵高星空风格
- **功能**: 应用梵高《星空》的绘画风格
- **提示词**: `Reimagine the photo in the style of Van Gogh's 'Starry Night'.`
- **描述**: 经典的螺旋状笔触和色彩风格

### 🎯 实用工具类 (4种)

#### 25. 🎯 抠图增强
- **功能**: 抠出人物并生成高清肖像
- **提示词**: `Isolate the person in the masked area and generate a high-definition photo of them against a neutral background.`
- **描述**: 需要绘制蒙版，精确抠图
- **特殊功能**: 需要蒙版操作

#### 26. 📺 3D屏幕效果
- **功能**: 让屏幕内容呈现3D立体效果
- **提示词**: `For an image with a screen, add content that appears to be glasses-free 3D, popping out of the screen.`
- **描述**: 裸眼3D效果，内容跳出屏幕

#### 27. 💄 妆容分析
- **功能**: 分析妆容并提供改进建议
- **提示词**: `Analyze the makeup in this photo and suggest improvements by drawing with a red pen.`
- **描述**: 专业化妆师级别的分析和标注

#### 28. 🪩 背景替换
- **功能**: 替换为Y2K复古美学背景
- **提示词**: `Change the background to a Y2K aesthetic style.`
- **描述**: 2000年代复古未来主义风格背景

## 特殊功能说明

### 🔄 双图像模式
- **姿势参考**: 需要角色图 + 姿势参考图
- **颜色调色板转换**: 需要原图 + 调色板图

### 🎯 蒙版编辑
- 所有单图模式都支持蒙版绘制
- 可以精确控制编辑区域
- 保护非编辑区域不变

### ⚡ 两步处理
- **颜色调色板转换**采用两步处理：
  1. 先生成线稿
  2. 再根据调色板上色

### 📚 历史记录
- 自动保存所有生成结果
- 支持将历史结果作为新的输入
- 支持下载历史图像

### 🎨 自定义排序
- 可以拖拽调整变换效果的顺序
- 个人偏好自动保存到本地存储

## 使用流程

1. **选择变换效果** - 从24种预设效果中选择
2. **上传图像** - 单图或双图模式
3. **绘制蒙版** (可选) - 精确控制编辑区域  
4. **自定义提示词** (可选) - 如选择自定义模式
5. **生成结果** - AI处理并显示结果
6. **继续编辑** - 可将结果作为新输入继续处理
7. **下载保存** - 保存最终结果

## 技术特性

- **AI模型**: Google Gemini 2.5 Flash
- **支持格式**: PNG, JPEG等常见图像格式
- **自动水印**: 生成图像自动添加"Nano Bananary｜ZHO"水印
- **响应式设计**: 支持桌面和移动设备
- **实时预览**: 即时查看处理效果
- **批量处理**: 支持连续编辑工作流