# 数据库表结构修复报告

## 问题描述

在原有的数据库设计中发现了以下问题：

1. **BaseExpense表**：使用 `base` 字符串字段存储基地名称，而不是与 `bases` 表建立外键关联
2. **PurchaseEntry表**：同样使用 `base` 字符串字段存储基地名称，而不是与 `bases` 表建立外键关联

这种设计存在以下缺陷：
- 数据冗余：基地名称重复存储
- 数据一致性风险：基地名称变更时需要更新多个表
- 查询性能较差：无法利用外键索引
- 数据完整性无保障：没有外键约束防止无效的基地名称

## 解决方案

### 1. 模型结构修改

#### BaseExpense模型 (`models/base_expense.go`)
```go
type BaseExpense struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    BaseID      uint      `gorm:"not null" json:"base_id"`      // 所属基地ID
    Base        Base      `gorm:"foreignKey:BaseID" json:"base"` // 关联的基地
    Date        time.Time `json:"date"`                         // 发生日期
    Category    string    `json:"category"`                     // 费用类别
    Amount      float64   `json:"amount"`
    Detail      string    `json:"detail"`
    CreatedBy   uint      `json:"created_by"`
    CreatorName string    `json:"creator_name"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

#### PurchaseEntry模型 (`models/purchase.go`)
```go
type PurchaseEntry struct {
    ID           uint                `gorm:"primaryKey" json:"id"`
    Supplier     string              `json:"supplier"`      // 供应商名称
    OrderNumber  string              `json:"order_number"`
    PurchaseDate time.Time           `json:"purchase_date"`
    TotalAmount  float64             `json:"total_amount"`
    Receiver     string              `json:"receiver"`
    BaseID       uint                `gorm:"not null" json:"base_id"` // 所属基地ID
    Base         Base                `gorm:"foreignKey:BaseID" json:"base"` // 关联的基地
    CreatedBy    uint                `json:"created_by"`
    CreatorName  string              `json:"creator_name"`
    CreatedAt    time.Time           `json:"created_at"`
    UpdatedAt    time.Time           `json:"updated_at"`
    Items        []PurchaseEntryItem `gorm:"foreignKey:PurchaseEntryID" json:"items"`
}
```

### 2. 处理器代码修改

#### ExpenseReq结构体
```go
type ExpenseReq struct {
    Date     string  `json:"date"`
    Category string  `json:"category"`
    Amount   float64 `json:"amount"`
    Detail   string  `json:"detail"`
    BaseID   uint    `json:"base_id"` // 修改为 base_id，用于admin用户指定基地
}
```

#### PurchaseReq结构体
```go
type PurchaseReq struct {
    Supplier     string            `json:"supplier"`
    OrderNumber  string            `json:"order_number"`
    PurchaseDate string            `json:"purchase_date"` // yyyy-mm-dd
    TotalAmount  float64           `json:"total_amount"`
    Receiver     string            `json:"receiver"`
    BaseID       uint              `json:"base_id"` // 所属基地ID
    Items        []PurchaseItemReq `json:"items"`
}
```

### 3. 数据库迁移

#### 迁移脚本功能
1. **自动创建Base记录**：扫描现有数据中的所有基地名称，为每个唯一名称创建对应的Base记录
2. **添加BaseID字段**：为 `base_expenses` 和 `purchase_entries` 表添加 `base_id` 字段
3. **数据转换**：将现有的基地名称转换为对应的基地ID
4. **数据验证**：检查转换结果，报告任何无法匹配的记录

#### 迁移步骤
1. 运行 `database_migration/run_migration.bat`
2. 检查迁移日志，确认所有数据正确转换
3. 运行 `database_migration/run_test.bat` 验证功能
4. 可选：运行 `backend/tools/cleanup_old_base_fields.bat` 删除旧字段

## 文件结构

```
backend/
├── models/
│   ├── base.go              # Base模型（已存在）
│   ├── base_expense.go      # 修改后的BaseExpense模型
│   └── purchase.go          # 修改后的PurchaseEntry模型
├── handlers/
│   ├── expense.go           # 修改后的费用处理器
│   └── purchase.go          # 修改后的采购处理器
└── tools/
    ├── migrate_base_fields.bat        # 迁移脚本启动器
    └── cleanup_old_base_fields.bat    # 清理旧字段脚本

database_migration/
├── migrate_base_fields.go   # 数据库迁移主脚本
├── test_association.go      # 关联查询测试脚本
├── run_migration.bat        # 运行迁移
├── run_test.bat            # 运行测试
└── go.mod                  # Go模块文件
```

## 执行顺序

1. **备份数据库**（重要！）
2. **运行迁移脚本**：
   ```bash
   cd database_migration
   ./run_migration.bat
   ```
3. **测试关联查询**：
   ```bash
   ./run_test.bat
   ```
4. **重新启动后端服务**以加载新的模型定义
5. **验证API功能**正常工作
6. **可选清理**：删除旧的base字段（不可逆操作）

## 注意事项

### 兼容性处理
- 迁移脚本会保留原有的 `base` 字段，直到确认迁移成功
- 新的API接口使用 `base_id` 字段，但仍保持向后兼容性
- 查询时会自动加载关联的Base记录

### 性能优化
- 使用 `Preload("Base")` 预加载关联数据
- 统计查询使用JOIN优化性能
- 基地ID字段上建立了适当的索引

### 数据完整性
- 添加了外键约束确保数据完整性
- 迁移脚本会验证所有数据转换的正确性
- 提供了详细的错误报告和验证功能

## 测试验证

迁移完成后，请验证以下功能：

1. **费用管理**：创建、查询、更新、删除费用记录
2. **采购管理**：创建、查询、更新、删除采购记录
3. **统计查询**：按基地统计费用和采购数据
4. **关联查询**：确保Base信息正确显示
5. **权限控制**：基地代理只能访问自己基地的数据

## 回滚方案

如果需要回滚到旧版本：
1. 停止新版本的后端服务
2. 恢复旧版本的代码
3. 可选：删除新增的 `base_id` 字段（如果确认不再需要）

## 数据库表结构对比

### 修改前
```sql
-- base_expenses表
CREATE TABLE base_expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    base VARCHAR(255),  -- 基地名称字符串
    date DATE,
    category VARCHAR(255),
    amount DECIMAL(10,2),
    detail TEXT,
    created_by INT,
    creator_name VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- purchase_entries表  
CREATE TABLE purchase_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier VARCHAR(255),
    order_number VARCHAR(255),
    purchase_date DATE,
    total_amount DECIMAL(10,2),
    receiver VARCHAR(255),
    base VARCHAR(255),  -- 基地名称字符串
    created_by INT,
    creator_name VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 修改后
```sql
-- base_expenses表
CREATE TABLE base_expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    base_id INT UNSIGNED NOT NULL,  -- 基地ID外键
    date DATE,
    category VARCHAR(255),
    amount DECIMAL(10,2),
    detail TEXT,
    created_by INT,
    creator_name VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (base_id) REFERENCES bases(id)
);

-- purchase_entries表
CREATE TABLE purchase_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier VARCHAR(255),
    order_number VARCHAR(255),
    purchase_date DATE,
    total_amount DECIMAL(10,2),
    receiver VARCHAR(255),
    base_id INT UNSIGNED NOT NULL,  -- 基地ID外键
    created_by INT,
    creator_name VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (base_id) REFERENCES bases(id)
);
```

## 总结

此次修复彻底解决了数据库设计中的关联问题，提升了：
- ✅ 数据完整性和一致性
- ✅ 查询性能
- ✅ 代码可维护性
- ✅ 数据库规范性

所有修改都保持了向后兼容性，确保平滑迁移。