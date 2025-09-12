# user_bases 表数据填充报告

## 概述
本报告记录了为 [user_bases](file:///c%3A/Users/Administrator/CodeBuddy/Projects/summary/backend/models/user.go#L37-L37) 表填充测试数据的过程和结果。[user_bases](file:///c%3A/Users/Administrator/CodeBuddy/Projects/summary/backend/models/user.go#L37-L37) 表用于管理用户与基地之间的多对多关系。

## 表结构
[user_bases](file:///c%3A/Users/Administrator/CodeBuddy/Projects/summary/backend/models/user.go#L37-L37) 表包含以下字段：
- `user_id`: bigint unsigned, 非空, 主键之一
- `base_id`: bigint unsigned, 非空, 主键之一

该表通过复合主键 (user_id, base_id) 确保用户与基地的关联关系唯一性。

## 数据填充策略
根据系统中的用户角色和基地分布，制定了以下数据填充策略：

### 1. base_agent 用户分配
为 19 个 base_agent 用户分配基地，每个用户分配 1-3 个基地，确保：
- 用户能够访问其负责的基地数据
- 实现用户与基地的多对多关系

### 2. captain 用户分配
为 6 个 captain 用户各分配 1 个基地，确保：
- 每个队长负责一个特定基地
- 队长具有对其负责基地的管理权限

### 3. admin 用户
admin 用户具有全局访问权限，不需要在 [user_bases](file:///c%3A/Users/Administrator/CodeBuddy/Projects/summary/backend/models/user.go#L37-L37) 表中进行关联。

## 数据填充详情

### base_agent 用户分配详情
| 用户ID | 用户名    | 角色        | 分配基地数量 | 基地列表 |
|--------|-----------|-------------|--------------|----------|
| 2      | agent_1   | base_agent  | 3            | 北京总部基地、上海运营中心、深圳研发基地 |
| 3      | agent_2   | base_agent  | 2            | 广州分部、杭州技术中心 |
| 4      | agent_3   | base_agent  | 3            | 成都西南基地、武汉中部中心、西安西北基地 |
| 5      | agent_4   | base_agent  | 2            | 南京江苏分部、青岛山东中心 |
| 6      | agent_5   | base_agent  | 3            | 天津北方港口基地、重庆山城中心、沈阳东北基地 |
| 7      | agent_6   | base_agent  | 2            | 长沙湖南中心、福州福建分部 |
| 8      | agent_7   | base_agent  | 3            | 昆明云南基地、郑州河南中心、合肥安徽分部 |
| 9      | agent_8   | base_agent  | 2            | 石家庄河北基地、太原山西中心 |
| 10     | agent_9   | base_agent  | 3            | 南昌江西分部、海口海南基地、银川宁夏中心 |
| 11     | agent_10  | base_agent  | 2            | 呼和浩特内蒙古基地、乌鲁木齐新疆中心 |
| 12     | agent_11  | base_agent  | 3            | 拉萨西藏分部、贵阳贵州基地、兰州甘肃中心 |
| 13     | agent_12  | base_agent  | 2            | 哈尔滨黑龙江基地、长春吉林分部 |
| 14     | agent_13  | base_agent  | 3            | 成都基地、上海基地、武汉基地 |
| 15     | agent_14  | base_agent  | 2            | 西安基地、青岛基地 |
| 16     | agent_15  | base_agent  | 3            | 北京基地、南京基地、杭州基地 |
| 17     | agent_16  | base_agent  | 2            | 广州基地、深圳基地 |
| 18     | agent_17  | base_agent  | 3            | 北京总部基地、杭州技术中心、青岛山东中心 |
| 19     | agent_18  | base_agent  | 3            | 福州福建分部、太原山西中心、乌鲁木齐新疆中心 |
| 20     | agent_19  | base_agent  | 3            | 长春吉林分部、西安基地、深圳基地 |

### captain 用户分配详情
| 用户ID | 用户名  | 角色    | 分配基地 |
|--------|---------|---------|----------|
| 41     | 唐自红  | captain | 北京总部基地 |
| 42     | 队长2   | captain | 上海运营中心 |
| 43     | 队长3   | captain | 深圳研发基地 |
| 44     | 队长4   | captain | 广州分部 |
| 45     | 队长5   | captain | 杭州技术中心 |
| 46     | abu     | captain | 成都西南基地 |

## 填充结果
- 成功插入 55 条记录到 [user_bases](file:///c%3A/Users/Administrator/CodeBuddy/Projects/summary/backend/models/user.go#L37-L37) 表中
- 其中 base_agent 用户关联记录 49 条
- 其中 captain 用户关联记录 6 条
- 所有插入操作均成功执行，无错误记录

## 验证结果
通过查询验证，确认所有数据已正确插入 [user_bases](file:///c%3A/Users/Administrator/CodeBuddy/Projects/summary/backend/models/user.go#L37-L37) 表，并能正确关联到 users 表和 bases 表的相关信息。

## 结论
[user_bases](file:///c%3A/Users/Administrator/CodeBuddy/Projects/summary/backend/models/user.go#L37-L37) 表的测试数据填充工作已成功完成，为系统的用户权限管理和基地数据访问控制提供了必要的数据基础。