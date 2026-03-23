# Habit Checkin

基于 Expo + React Native + TypeScript 的安卓习惯打卡 App MVP。

## 已实现

- 本地 JSON 持久化存储
- 习惯新建、删除
- 习惯分组
- 今日打卡 `+1 / -1`
- 今日真实打卡时间列表
- 年份历史视图
- 主题颜色切换并持久化
- 首页说明文案自定义并持久化
- 数据备份与覆盖恢复

## 数据结构

```ts
type Habit = {
  id: string;
  name: string;
  groupId: string | null;
  createdAt: number;
  checkins: number[];
};

type HabitGroup = {
  id: string;
  name: string;
  createdAt: number;
};

type AppSettings = {
  themeId: 'forest' | 'ocean' | 'amber' | 'slate';
  homeHeroTitle: string;
  homeHeroDescription: string;
};

type AppData = {
  version: 2;
  habits: Habit[];
  groups: HabitGroup[];
  settings: AppSettings;
};
```

## 运行

```bash
npm install
npm run android
```

## 备份与恢复

- 备份会导出完整 JSON，包含习惯、分组和设置。
- 恢复前会先校验数据版本与关键字段。
- 当前恢复策略为覆盖恢复，确认后会覆盖本地现有数据。

## 兼容说明

- 已包含从旧版 `version: 1` 习惯列表数据到 `version: 2` 统一数据结构的迁移。
- 日期统计严格按设备本地日期计算。
