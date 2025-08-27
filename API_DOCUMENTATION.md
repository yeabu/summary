# Summary 项目 API 接口文档

## 项目概述

Summary 是一个用于管理消费记录和购买记录的系统，采用前后端分离架构。

**技术栈:**
- 后端: Go + GORM + MySQL
- 前端: React + TypeScript
- 认证: JWT Token

**服务地址:**
- 后端API: http://localhost:8080
- 前端应用: http://localhost:3000

---

## 认证说明

### JWT Token 认证
所有需要认证的API都需要在请求头中包含有效的JWT Token：

```http
Authorization: Bearer <token>
```

### 用户角色
- **admin**: 管理员，拥有所有权限
- **base_agent**: 基地代理，只能操作自己基地的数据

---

## API 接口

### 1. 用户认证

#### 1.1 用户登录

**接口地址:** `POST /api/login`

**请求参数:**
```json
{
  "name": "admin",
  "password": "admin123"
}
```

**响应示例:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "admin",
  "base": "",
  "user_id": 1
}
```

**测试账户:**
- 管理员: `admin` / `admin123`
- 基地代理: `agent_1` / `agent123`

#### 1.2 修改密码

**接口地址:** `POST /api/user/change_password`

**权限要求:** `admin` 或 `base_agent`

**请求参数:**
```json
{
  "old_pwd": "旧密码",  // base_agent必填，admin可选
  "new_pwd": "新密码"
}
```

**响应示例:**
```text
密码修改成功
```

---

### 2. 采购管理

#### 2.1 创建采购记录

**接口地址:** `POST /api/purchase/create`

**权限要求:** `admin`

**请求参数:**
```json
{
  "supplier": "阿里巴巴有限公司",
  "order_number": "PO20240001",
  "purchase_date": "2024-08-25",
  "total_amount": 15000.50,
  "receiver": "仓库1",
  "items": [
    {
      "product_name": "笔记本电脑",
      "quantity": 2,
      "unit_price": 5000.00,
      "amount": 10000.00
    },
    {
      "product_name": "显示器",
      "quantity": 5,
      "unit_price": 1100.10,
      "amount": 5500.50
    }
  ]
}
```

**响应示例:**
```json
{
  "id": 1,
  "supplier": "阿里巴巴有限公司",
  "order_number": "PO20240001",
  "purchase_date": "2024-08-25T00:00:00Z",
  "total_amount": 15500.50,
  "receiver": "仓库1",
  "created_by": 1,
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:30:00Z"
}
```

#### 2.2 查询采购记录

**接口地址:** `GET /api/purchase/list`

**权限要求:** `admin`

**查询参数:** 
- 暂无筛选参数，返回所有采购记录

**响应示例:**
```json
[
  {
    "id": 1,
    "supplier": "阿里巴巴有限公司",
    "order_number": "PO20240001",
    "purchase_date": "2024-08-25T00:00:00Z",
    "total_amount": 15500.50,
    "receiver": "仓库1",
    "created_by": 1,
    "created_at": "2024-08-25T17:30:00Z",
    "updated_at": "2024-08-25T17:30:00Z",
    "items": [
      {
        "id": 1,
        "purchase_entry_id": 1,
        "product_name": "笔记本电脑",
        "quantity": 2,
        "unit_price": 5000.00,
        "amount": 10000.00
      },
      {
        "id": 2,
        "purchase_entry_id": 1,
        "product_name": "显示器",
        "quantity": 5,
        "unit_price": 1100.10,
        "amount": 5500.50
      }
    ]
  }
]
```

---

### 3. 费用管理

#### 3.1 创建费用记录

**接口地址:** `POST /api/expense/create`

**权限要求:** `base_agent`

**请求参数:**
```json
{
  "date": "2024-08-25",
  "category": "办公用品",
  "amount": 299.50,
  "detail": "购买打印纸和文具"
}
```

**响应示例:**
```json
{
  "id": 1,
  "base": "北京基地",
  "date": "2024-08-25T00:00:00Z",
  "category": "办公用品",
  "amount": 299.50,
  "detail": "购买打印纸和文具",
  "created_by": 2,
  "creator_name": "",
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:30:00Z"
}
```

#### 3.2 查询费用记录

**接口地址:** `GET /api/expense/list`

**权限要求:** `admin` 或 `base_agent`

**查询参数:**
- `base`: 基地名称 (admin可用，用于筛选特定基地)
- `category`: 费用类别
- `month`: 月份筛选 (格式: 2024-08)

**权限说明:**
- `admin`: 可查看所有基地的费用记录
- `base_agent`: 只能查看自己基地的费用记录

**响应示例:**
```json
[
  {
    "id": 1,
    "base": "北京基地",
    "date": "2024-08-25T00:00:00Z",
    "category": "办公用品",
    "amount": 299.50,
    "detail": "购买打印纸和文具",
    "created_by": 2,
    "creator_name": "",
    "created_at": "2024-08-25T17:30:00Z",
    "updated_at": "2024-08-25T17:30:00Z"
  }
]
```

#### 3.3 修改费用记录

**接口地址:** `PUT /api/expense/update?id=1`

**权限要求:** `admin` 或记录创建者(`base_agent`)

**请求参数:**
```json
{
  "date": "2024-08-25",
  "category": "办公用品",
  "amount": 350.00,
  "detail": "购买打印纸、文具和订书机"
}
```

**响应示例:**
```json
{
  "id": 1,
  "base": "北京基地",
  "date": "2024-08-25T00:00:00Z",
  "category": "办公用品",
  "amount": 350.00,
  "detail": "购买打印纸、文具和订书机",
  "created_by": 2,
  "creator_name": "",
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:35:00Z"
}
```

#### 3.4 费用统计

**接口地址:** `GET /api/expense/stats?month=2024-08`

**权限要求:** `admin` 或 `base_agent`

**查询参数:**
- `month`: 月份 (必填，格式: 2024-08)
- `base`: 基地名称 (admin可用，筛选特定基地)

**权限说明:**
- `admin`: 可查看所有基地的统计数据
- `base_agent`: 只能查看自己基地的统计数据

**响应示例:**
```json
[
  {
    "base": "北京基地",
    "category": "办公用品",
    "month": "2024-08",
    "total": 1250.50
  },
  {
    "base": "北京基地",
    "category": "差旅费",
    "month": "2024-08",
    "total": 3200.00
  },
  {
    "base": "上海基地",
    "category": "办公用品",
    "month": "2024-08",
    "total": 800.00
  }
]
```

---

## 数据字典

### 用户角色 (User.Role)
- `admin`: 管理员
- `base_agent`: 基地代理

### 费用类别 (BaseExpense.Category)
- `办公用品`: 日常办公用品采购
- `差旅费`: 员工出差相关费用
- `通讯费`: 电话、网络等通讯费用
- `水电费`: 办公场所水电费
- `租金`: 办公室、设备租赁费用
- `维修费`: 设备维修保养费用
- `培训费`: 员工培训费用
- `会议费`: 会议相关费用
- `招待费`: 客户招待费用
- `广告费`: 宣传推广费用
- `运输费`: 物流运输费用
- `保险费`: 各类保险费用

### 基地列表
- 北京基地
- 上海基地
- 广州基地
- 深圳基地
- 杭州基地
- 南京基地
- 成都基地
- 武汉基地
- 西安基地
- 青岛基地

---

## 错误码说明

### HTTP 状态码
- `200`: 成功
- `400`: 请求参数错误
- `401`: 未授权（token无效或缺失）
- `403`: 禁止访问（权限不足）
- `404`: 资源不存在
- `500`: 服务器内部错误

### 常见错误响应
```json
{
  "error": "token无效"
}
```

---

## 测试数据说明

系统已生成以下测试数据：

### 用户数据 (20个)
- 1个管理员: `admin` / `admin123`
- 19个基地代理: `agent_1` 到 `agent_19` / `agent123`

### 采购记录 (30条)
- 随机供应商和产品
- 采购日期为最近3个月
- 每条记录包含1-5个采购项目

### 费用记录 (50条)
- 随机基地和费用类别
- 费用日期为最近6个月
- 金额范围：100-10000元

---

## 使用示例

### 1. 登录获取Token
```bash
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"name":"admin","password":"admin123"}'
```

### 2. 查看费用记录
```bash
curl -X GET "http://localhost:8080/api/expense/list?month=2024-08" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 创建费用记录
```bash
curl -X POST http://localhost:8080/api/expense/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-08-25",
    "category": "办公用品",
    "amount": 299.50,
    "detail": "购买打印纸和文具"
  }'
```

---

## 项目启动

### 后端启动
```bash
cd backend
go run .
# 或使用启动脚本
./start-backend.bat
```

### 生成测试数据
```bash
cd backend
./generate_data.bat
# 或手动运行
go run tools/generate_test_data.go
```

### 前端启动
```bash
cd react-app
npm install
npm run dev
```