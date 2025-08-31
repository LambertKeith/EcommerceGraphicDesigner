

# 📝 AI 电商图片编辑器（基于 Gemini 2.5 Flash Image · nano-banana）

**开发说明文档 · MVP 阶段**

---

## 1. 范围说明

* ✅ **本阶段开发**

  * 一键优化（白底 / 提亮 / 尺寸适配）
  * 背景替换（自然语言 Prompt）
  * 多轮对话连续编辑（上下文记忆）
  * 导出（电商平台尺寸）

* ⏸ **保留但暂不开发**

  * 接入层 / API Gateway（鉴权、配额、网关）
  * 资产与合规模块 / Assets & Compliance（CDN、内容合规、审计）

---

## 2. MVP 功能清单

### F1 一键优化

* 输入：原始图片
* 输出：白底、提亮、阴影、平台尺寸
* 候选结果：2–3 张

### F2 背景替换

* 输入：原始图片 + Prompt（可选背景参考图）
* 输出：替换背景后的候选结果

### F3 多轮对话编辑

* 输入：会话ID + 上下文 + 新Prompt
* 输出：在已有结果上连续编辑（保持一致性）

### F4 导出

* 输出尺寸：电商平台常用（如 1080×1080、1500×1500）
* 输出：下载链接（有效期 24h）

---

## 3. 数据结构（简化版）

```sql
Project(id, name, owner_id, created_at)

Session(
  id, project_id,
  context_json,     -- 存储上下文和风格要点
  created_at, last_active_at
)

Image(
  id, project_id, path,
  width, height, meta_json,
  created_at
)

Job(
  id, session_id, input_image_id,
  type,           -- optimize | edit | refine | export
  prompt,
  status,         -- pending | running | done | error
  result_variant_ids[],
  created_at, finished_at, error_msg
)

Variant(
  id, job_id, image_id,
  score, thumb_path, meta_json
)
```

---

## 4. API（REST + SSE）

* `POST /upload` → `{image_id}`
* `POST /session` → `{session_id}`
* `POST /edit` → `{job_id}`
* `POST /refine` → `{job_id}`
* `GET /job/{id}` → 任务状态 + 结果
* `GET /stream/{job_id}` → SSE 进度
* `GET /image/{id}` → 原图 / 变体图
* `POST /export` → `{download_url}`

---

## 5. Prompt 模板

* **Optimize**
  `"Clean white background, soft shadow, enhance details, true colors, e-commerce ready."`

* **BG Replace**
  `"Replace background to {style}, ensure realistic shadow, consistent perspective, keep edges clean."`

* **Refine**
  `"{user_instructions}; keep product identity consistent; no logo distortion."`

---

## 6. 阶段性计划

### Sprint 1——能用

* 打通链路：上传 → 编辑 → 预览 → 导出
* 集成 Gemini：一键优化、背景替换
* 预览候选结果（2–3 张）
* 导出两种尺寸

✅ 验收：P95 首图 ≤ 12s

---

### Sprint 2——好用

* 多轮编辑（上下文记忆）
* 参考背景图引导
* SSE 实时进度显示
* 缩略图 & 懒加载
* 初版指标监控（耗时 / 失败率）
* 回归测试用例集（20 条黄金样例）

✅ 验收：连续 5 轮编辑上下文不丢；Top-1 选择率 ≥ 60%

---

## 7. 团队分工

* **后端 / 模型集成**：API、SSE、Prompt 模板、存储落盘
* **前端**：上传、预览、对话式编辑、导出
* **产品/设计**：模板语料、用例集、验收口径

---

## 8. 今日待办（Day 1）

1. 创建代码仓库（前端+后端骨架）
2. 配置 Gemini API Key + 最小调用 demo
3. 实现 `/upload` → `/edit` → `/job` → 预览链路
4. 写 5 条电商样例 Prompt（鞋/表/杯/衣/数码）
5. 实现“导出规格”配置（1080×1080、1500×1500）
6. 跑一次端到端 Demo，记录 P50/P95

---

👉 这样整理后，你们可以直接作为**开发需求文档**来用。
要不要我再帮你生成一份 **OpenAPI 3.0 的 YAML**，方便团队直接导入 Swagger / Postman？
