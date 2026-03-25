# 打卡喵

基于 Expo + React Native + TypeScript 的安卓习惯打卡 App，本地存储、可备份恢复，适合做轻量习惯打卡和后续持续迭代。

## 当前结构

- 一级页面只保留：
  - 打卡
  - 设置
- 打卡页：
  - 顶部操作区：新增分组、新增习惯
  - 中部按分组折叠展示习惯
  - 长按习惯统一打开操作菜单
- 设置页：
  - 色系选择
  - 分组管理
  - 打卡页说明文案
  - 归档习惯
  - 数据备份与恢复

## 数据结构

```ts
type CheckinRecord = {
  id: string;
  dateKey: string;     // 设备本地日期，例如 2026-03-25
  timestamp: number;   // 具体打卡时间
  note: string;        // 备注，可为空
  createdAt: number;
};

type Habit = {
  id: string;
  name: string;
  groupId: string | null;
  createdAt: number;
  archivedAt: number | null;
  checkins: CheckinRecord[];
};

type HabitGroup = {
  id: string;
  name: string;
  createdAt: number;
};

type AppSettings = {
  themeId: 'forest' | 'ocean' | 'amber' | 'rose' | 'mint' | 'slate';
  homeHeroTitle: string;
  homeHeroDescription: string;
};

type AppData = {
  version: 4;
  habits: Habit[];
  groups: HabitGroup[];
  settings: AppSettings;
};
```

## 迁移说明

- 旧版 `version: 1` 的 `checkins: number[]` 会自动迁移到 `version: 4`。
- 旧版 `version: 2` 会把原来的隐藏状态迁移为归档状态。
- 旧版 `version: 3` 中：
  - 旧的 `hasTime / timestamp` 结构会迁移到新的 `timestamp / note`
  - 旧的 `hiddenAt` 会迁移到新的 `archivedAt`
- 旧版没有备注的记录，迁移后默认备注为空字符串。
- 旧版没有具体时间的记录，迁移后会保留原日期，并使用该日期的本地中午时间作为兼容时间。
- 日期统计始终严格按设备本地日期计算，避免 UTC 跨天误差。

## 主要交互

- 打卡页右侧 `+1`：
  - 新增一条当前本地时间的真实打卡记录
- 长按习惯：
  - 修改名称
  - 修改所属分组
  - 归档
  - 打开年视图
  - 删除习惯
- 历史视图：
  - 默认从年视图进入
  - 可切换到月视图
  - 点击日期打开当天记录详情
- 记录详情：
  - 普通习惯可新增、编辑、删除记录
  - 可修改时间和备注
  - 归档习惯只读查看

## 备份与恢复

- 备份会导出完整 JSON，包含习惯、分组、归档状态、设置和说明文案。
- 恢复前会校验版本和关键字段。
- 当前恢复策略为覆盖恢复，确认后会替换本地现有数据。

## 运行

```bash
npm install
npm run android
```

## 校验

```bash
npx tsc --noEmit
npx expo export --platform android --output-dir dist-test
```
