# Cosmos Images Naming

为了避免命名混淆，三消图片统一使用以下规则：

- 恒星图片: `cosmos_star_01.jpg`, `cosmos_star_02.jpg`, ...
- 星云图片: `cosmos_nebula_01.jpg`, `cosmos_nebula_02.jpg`, ...

## 手动添加图片步骤

1. 把新图片放到当前目录，并按规则命名。
2. 打开 `src/data/cosmos.js`。
3. 在 `COSMOS` 数组中新增一项，并填入：
   - `key`: 例如 `star_04` 或 `nebula_04`
   - `name`: 显示名称
   - `image`: 对应文件路径，例如 `${IMG_BASE}/cosmos_star_04.jpg`
   - `filter`: 可选的图像滤镜
   - `color`: 粒子/发光色
   - `source`: 素材来源备注

## 历史文件

旧命名素材已移动到 `_legacy/`，避免影响当前配置。
