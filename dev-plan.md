
---

# P0｜必须先做（稳定成一个可演示的RC）

1. OpenAPI 3.0 规范 + 生成类型

* **做什么**：为 `/upload、/session、/edit、/refine、/job、/image、/export、/stream` 写 `openapi.yaml`；在前端用 `openapi-typescript` 生成类型，替换 `services/api.ts` 中手写类型。
* **验收**：本地 `swagger-ui` 可打开，无 4xx/5xx；前端接口完全由自动生成类型约束。
* **提示**：在 `backend/routes/_openapi.ts` 增加 `/health` 与 `/version`；CI中加 `swagger-cli validate openapi.yaml`。

2. 统一任务状态机 & 幂等重试

* **做什么**：在 `jobs` 表中明确 `queued→running→succeeded/failed`，新增 `attempts`、`last_error`；`POST /edit|/refine` 使用 `idempotency-key`（Header）。
* **验收**：同一请求用同一 `idempotency-key` 重放不生成重复任务；服务异常重启后，`running` 超时任务能回收为 `queued`。
* **提示**：简单用 `SET LOCAL lock_timeout` + 行级 `FOR UPDATE SKIP LOCKED` 取队列。

3. 上传安全与图片管线最小化

* **做什么**：校验 MIME/扩展名/文件大小；统一将输入图像转为安全格式（strip EXIF、限制长边≤4096）；缩略图统一生成。
* **验收**：能拒绝可执行/伪装文件；EXIF 被移除；超大图自动等比压缩。
* **提示**：Node 用 `sharp`，或后端进程内 `libvips`；前端限制拖拽大小并即时提示。

4. 多模型工厂的“能力矩阵 + 回退”

* **做什么**：在 `aiServiceFactory.ts` 中显式维护 `capabilityMap`（optimize、bgReplace、refine）→ 优先 Gemini → 退到 Sora → 再退到 ChatGPT；同时落盘 `usage_model`。
* **验收**：当某模型 429/5xx 时自动切换且返回体标明 `model_used`；前端 UI 能看到“已回退到 X”。
* **提示**：把可用性策略做成小配置：`AI_FAILOVER_STRATEGY=prefer_quality|prefer_latency`。

5. SSE 可靠性 & 前端处理

* **做什么**：`/stream/{job_id}` 明确事件：`queued/running/progress/log/succeeded/failed`；前端 `ProcessingProgress` 支持断线重连（带 `Last-Event-ID`）。
* **验收**：杀后端进程并重启后，前端能自动续连并继续显示进度；无重复插入事件。
* **提示**：心跳 `ping` 每 10s；前端收到 `failed` 自动显示“重试/生成报告”。

6. 金融级错误分类 & 用户可见错误

* **做什么**：后端定义 `E_AI_MODEL_UNAVAILABLE/E_INPUT_TOO_LARGE/E_PROMPT_INVALID/E_STORAGE_IO` 等错误码；前端映射为友好提示。
* **验收**：故障注入下，前端能精准显示“模型限流，已自动回退”“图片过大，请压缩后再试”等。
* **提示**：日志打点带 `job_id`、`session_id`、`model_name`、`latency_ms`。

---

# P1｜建议紧随（提升可用性与团队效率）

7. 黄金用例集（回归集）

* **做什么**：在 `backend/test/fixtures/` 放 20 张标准电商图（鞋/表/杯/衣/数码等）+ 标准 Prompt，脚本跑一遍生成结果与指标。
* **验收**：一条命令 `pnpm run eval:golden` 输出 CSV（时延、成功率、Top-1 采纳率）。
* **提示**：前端做隐藏路由 `/lab/golden` 显示对比。

8. Prompt 模板库 & 会话记忆要点

* **做什么**：将 Optimize/BG Replace/Refine 模板提取为 JSON 模板；`Session.context_json` 明确字段：`lighting, perspective, color_tone, logo_anchor`。
* **验收**：多轮（5轮）微调对光源方向/色温保持一致；Logo 定位复用上轮坐标。
* **提示**：把“平台预设”（淘宝、亚马逊）也做成 JSON，可热更新。

9. 导出规格的配置化 + 压缩管线

* **做什么**：`exports.config.json` 定义规格（格式、长边、质量）；后端导出统一从 `Variant` 原图生成，避免二次损伤。
* **验收**：1080/1500 两档一键导出，画质稳定；导出文件 24h 清理。
* **提示**：WebP/JPG 并存；透明需求走 PNG。

10. 本地开发质量护栏

* **做什么**：加 `Makefile`/统一脚本别名；pre-commit 运行 `lint+test`；`docker-compose` 带最小 PG/Redis/MinIO。
* **验收**：新人 `pnpm run dev` 即可跑通；`pnpm test` 零红。
* **提示**：在 `CLAUDE.md` 附“常见故障排查”。

---

# P2｜体验/可靠性加分项（按需）

11. 任务并发与速率控制（应用内）

* **做什么**：在编排层加简单令牌桶（每用户并发≤N、每分钟≤M）；返回 `429` + `Retry-After`。
* **验收**：压测下不炸；前端能排队展示。

12. 观测性：指标 + 轻量追踪

* **做什么**：`/metrics` 输出 Prometheus 指标：`job_latency_ms_bucket{model,type}`、`model_error_total{reason}`；请求头透传 `x-request-id`。
* **验收**：Grafana 面板能看到 P50/P95、失败率、回退比例。

13. 前端“引导式提示”

* **做什么**：`ImageEditor` 加常用提示片段（chips）：“白底软阴影”“木纹背景”“柔和自然光”；点击即插入到 Prompt。
* **验收**：新手无输入也能完成一次合格生成。

---

## 快速任务清单


* [ ] 写 `openapi.yaml` + 接入 `swagger-ui`（/docs）
* [ ] 后端：状态机与 `idempotency-key`
* [ ] 上传校验 + EXIF 清理 + 长边限制
* [ ] SSE 心跳与断线重连

* [ ] 能力矩阵与自动回退（落盘 `model_used`）
* [ ] 错误码体系 & 前端错误映射
* [ ] 两个导出规格的配置化
* [ ] 黄金用例集（至少 10 张）与跑分脚本

---

## 验收门槛（作为 RC 发布标准）

* 功能链路：上传 →（一键优化/背景替换）→ 候选 → 多轮微调 → 导出
* 稳定性：**P95 首图 ≤ 12s**，失败率 ≤ 3%，回退成功率 ≥ 90%
* 可靠性：SSE 断线可恢复；任务幂等；异常可精确提示
* 质量：同一会话 5 轮编辑的一致性可见；导出尺寸准确
* 工程化：API 有规范，类型闭环，测试与黄金集可一键跑通

---

