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

**权限要求:** `admin` 或 `base_agent`

**请求参数:**
```json
{
  "supplier_id": 1,
  "order_number": "PO20240001",
  "purchase_date": "2024-08-25",
  "total_amount": 15000.50,
  "receiver": "仓库1",
  "base_id": 1,
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
  "supplier_id": 1,
  "supplier": {
    "id": 1,
    "name": "阿里巴巴有限公司"
  },
  "order_number": "PO20240001",
  "purchase_date": "2024-08-25T00:00:00Z",
  "total_amount": 15500.50,
  "receiver": "仓库1",
  "base_id": 1,
  "base": {
    "id": 1,
    "name": "北京基地"
  },
  "created_by": 1,
  "creator_name": "管理员",
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
```

#### 2.2 查询采购记录

**接口地址:** `GET /api/purchase/list`

**权限要求:** `admin` 或 `base_agent`

**查询参数:** 
- `base`: 基地名称 (admin可用，用于筛选特定基地)
- `supplier`: 供应商名称 (模糊匹配)
- `order_number`: 订单号 (模糊匹配)
- `start_date`: 开始日期 (格式: 2024-08-01)
- `end_date`: 结束日期 (格式: 2024-08-31)

**权限说明:**
- `admin`: 可查看所有基地的采购记录
- `base_agent`: 只能查看自己基地的采购记录

**响应示例:**
```json
[
  {
    "id": 1,
    "supplier_id": 1,
    "supplier": {
      "id": 1,
      "name": "阿里巴巴有限公司"
    },
    "order_number": "PO20240001",
    "purchase_date": "2024-08-25T00:00:00Z",
    "total_amount": 15500.50,
    "receiver": "仓库1",
    "base_id": 1,
    "base": {
      "id": 1,
      "name": "北京基地"
    },
    "created_by": 1,
    "creator_name": "管理员",
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

#### 2.3 删除采购记录

**接口地址:** `DELETE /api/purchase/delete?id=1`

**权限要求:** `admin` 或 `base_agent`

**响应示例:**
```json
{
  "success": true,
  "message": "删除成功"
}
```

#### 2.4 批量删除采购记录

**接口地址:** `POST /api/purchase/batch-delete`

**权限要求:** `admin` 或 `base_agent`

**请求参数:**
```json
{
  "ids": [1, 2, 3]
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "批量删除成功",
  "deleted_count": 3
}
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
  "detail": "购买打印纸和文具",
  "base_id": 1
}
```

**响应示例:**
```json
{
  "id": 1,
  "date": "2024-08-25T00:00:00Z",
  "category": "办公用品",
  "amount": 299.50,
  "detail": "购买打印纸和文具",
  "base_id": 1,
  "base": {
    "id": 1,
    "name": "北京基地"
  },
  "created_by": 2,
  "creator_name": "基地代理1",
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
- `start_date`: 开始日期 (格式: 2024-08-01)
- `end_date`: 结束日期 (格式: 2024-08-31)

**权限说明:**
- `admin`: 可查看所有基地的费用记录
- `base_agent`: 只能查看自己基地的费用记录

**响应示例:**
```json
[
  {
    "id": 1,
    "date": "2024-08-25T00:00:00Z",
    "category": "办公用品",
    "amount": 299.50,
    "detail": "购买打印纸和文具",
    "base_id": 1,
    "base": {
      "id": 1,
      "name": "北京基地"
    },
    "created_by": 2,
    "creator_name": "基地代理1",
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
  "date": "2024-08-25T00:00:00Z",
  "category": "办公用品",
  "amount": 350.00,
  "detail": "购买打印纸、文具和订书机",
  "base_id": 1,
  "base": {
    "id": 1,
    "name": "北京基地"
  },
  "created_by": 2,
  "creator_name": "基地代理1",
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:35:00Z"
}
```

#### 3.4 删除费用记录

**接口地址:** `DELETE /api/expense/delete?id=1`

**权限要求:** `admin` 或记录创建者(`base_agent`)

**响应示例:**
```json
{
  "success": true,
  "message": "删除成功"
}
```

#### 3.5 批量删除费用记录

**接口地址:** `POST /api/expense/batch-delete`

**权限要求:** `admin` 或记录创建者(`base_agent`)

**请求参数:**
```json
{
  "ids": [1, 2, 3]
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "批量删除成功",
  "deleted_count": 3
}
```

#### 3.6 费用统计

**接口地址:** `GET /api/expense/stats`

**权限要求:** `admin` 或 `base_agent`

**查询参数:**
- `base`: 基地名称 (admin可用，筛选特定基地)
- `category`: 费用类别
- `start_date`: 开始日期 (格式: 2024-08-01)
- `end_date`: 结束日期 (格式: 2024-08-31)

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

### 4. 供应商管理

#### 4.1 创建供应商

**接口地址:** `POST /api/supplier/create`

**权限要求:** `admin` 或 `base_agent`

**请求参数:**
```json
{
  "name": "阿里巴巴有限公司",
  "contact_person": "张三",
  "phone": "010-12345678",
  "email": "zhangsan@ali.com",
  "address": "北京市朝阳区xxx街道"
}
```

**响应示例:**
```json
{
  "id": 1,
  "name": "阿里巴巴有限公司",
  "contact_person": "张三",
  "phone": "010-12345678",
  "email": "zhangsan@ali.com",
  "address": "北京市朝阳区xxx街道",
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:30:00Z"
}
```

#### 4.2 查询供应商列表

**接口地址:** `GET /api/supplier/list`

**权限要求:** `admin` 或 `base_agent`

**查询参数:**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20, 最大: 100)
- `name`: 供应商名称 (模糊匹配)

**响应示例:**
```json
{
  "records": [
    {
      "id": 1,
      "name": "阿里巴巴有限公司",
      "contact_person": "张三",
      "phone": "010-12345678",
      "email": "zhangsan@ali.com",
      "address": "北京市朝阳区xxx街道",
      "created_at": "2024-08-25T17:30:00Z",
      "updated_at": "2024-08-25T17:30:00Z"
    }
  ],
  "total": 1
}
```

#### 4.3 获取所有供应商

**接口地址:** `GET /api/supplier/all`

**权限要求:** `admin` 或 `base_agent`

**响应示例:**
```json
[
  {
    "id": 1,
    "name": "阿里巴巴有限公司",
    "contact_person": "张三",
    "phone": "010-12345678",
    "email": "zhangsan@ali.com",
    "address": "北京市朝阳区xxx街道",
    "created_at": "2024-08-25T17:30:00Z",
    "updated_at": "2024-08-25T17:30:00Z"
  }
]
```

#### 4.4 获取供应商详情

**接口地址:** `GET /api/supplier/detail?id=1`

**权限要求:** `admin` 或 `base_agent`

**响应示例:**
```json
{
  "id": 1,
  "name": "阿里巴巴有限公司",
  "contact_person": "张三",
  "phone": "010-12345678",
  "email": "zhangsan@ali.com",
  "address": "北京市朝阳区xxx街道",
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:30:00Z"
}
```

#### 4.5 更新供应商

**接口地址:** `PUT /api/supplier/update?id=1`

**权限要求:** `admin` 或 `base_agent`

**请求参数:**
```json
{
  "name": "阿里巴巴有限公司",
  "contact_person": "李四",
  "phone": "010-87654321",
  "email": "lisi@ali.com",
  "address": "北京市海淀区xxx街道"
}
```

**响应示例:**
```json
{
  "id": 1,
  "name": "阿里巴巴有限公司",
  "contact_person": "李四",
  "phone": "010-87654321",
  "email": "lisi@ali.com",
  "address": "北京市海淀区xxx街道",
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T18:30:00Z"
}
```

#### 4.6 删除供应商

**接口地址:** `DELETE /api/supplier/delete?id=1`

**权限要求:** `admin`

**说明:** 只有管理员可以删除供应商，且只有在没有关联采购记录或应付款记录时才能删除

**响应示例:**
```json
{
  "message": "供应商删除成功"
}
```

---

### 5. 基地管理

#### 5.1 创建基地

**接口地址:** `POST /api/base/create`

**权限要求:** `admin`

**请求参数:**
```json
{
  "name": "新基地",
  "code": "NEW001",
  "location": "新城市",
  "description": "新基地描述",
  "status": "active"
}
```

**响应示例:**
```json
{
  "id": 1,
  "name": "新基地",
  "code": "NEW001",
  "location": "新城市",
  "description": "新基地描述",
  "status": "active",
  "created_by": 1,
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:30:00Z"
}
```

#### 5.2 查询基地列表

**接口地址:** `GET /api/base/list`

**权限要求:** `admin`

**响应示例:**
```json
[
  {
    "id": 1,
    "name": "北京基地",
    "code": "BJ001",
    "location": "北京市",
    "description": "北京总部基地",
    "status": "active",
    "created_by": 1,
    "created_at": "2024-08-25T17:30:00Z",
    "updated_at": "2024-08-25T17:30:00Z"
  }
]
```

#### 5.3 获取基地详情

**接口地址:** `GET /api/base/get?id=1`

**权限要求:** `admin`

**响应示例:**
```json
{
  "id": 1,
  "name": "北京基地",
  "code": "BJ001",
  "location": "北京市",
  "description": "北京总部基地",
  "status": "active",
  "created_by": 1,
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:30:00Z"
}
```

#### 5.4 更新基地

**接口地址:** `PUT /api/base/update?id=1`

**权限要求:** `admin`

**请求参数:**
```json
{
  "name": "北京基地",
  "code": "BJ001",
  "location": "北京市朝阳区",
  "description": "北京总部基地-更新",
  "status": "active"
}
```

**响应示例:**
```json
{
  "id": 1,
  "name": "北京基地",
  "code": "BJ001",
  "location": "北京市朝阳区",
  "description": "北京总部基地-更新",
  "status": "active",
  "created_by": 1,
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T18:30:00Z"
}
```

#### 5.5 删除基地

**接口地址:** `DELETE /api/base/delete?id=1`

**权限要求:** `admin`

**响应示例:**
```json
{
  "success": true,
  "message": "删除成功"
}
```

#### 5.6 批量删除基地

**接口地址:** `POST /api/base/batch-delete`

**权限要求:** `admin`

**请求参数:**
```json
{
  "ids": [1, 2, 3]
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "批量删除成功",
  "deleted_count": 3
}
```

---

### 6. 基地区域管理

#### 6.1 创建基地区域

**接口地址:** `POST /api/base-section/create`

**权限要求:** `admin`

**请求参数:**
```json
{
  "name": "A区",
  "base_id": 1,
  "captain_id": 2,
  "area": 1000,
  "description": "A区描述"
}
```

**响应示例:**
```json
{
  "id": 1,
  "name": "A区",
  "base_id": 1,
  "base": {
    "id": 1,
    "name": "北京基地"
  },
  "captain_id": 2,
  "captain_name": "基地代理1",
  "area": 1000,
  "description": "A区描述",
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:30:00Z"
}
```

#### 6.2 查询基地区域列表

**接口地址:** `GET /api/base-section/list`

**权限要求:** `admin`

**查询参数:**
- `base_id`: 基地ID (可选，筛选特定基地的区域)

**响应示例:**
```json
[
  {
    "id": 1,
    "name": "A区",
    "base_id": 1,
    "base": {
      "id": 1,
      "name": "北京基地"
    },
    "captain_id": 2,
    "captain_name": "基地代理1",
    "area": 1000,
    "description": "A区描述",
    "created_at": "2024-08-25T17:30:00Z",
    "updated_at": "2024-08-25T17:30:00Z"
  }
]
```

#### 6.3 获取基地区域详情

**接口地址:** `GET /api/base-section/get?id=1`

**权限要求:** `admin`

**响应示例:**
```json
{
  "id": 1,
  "name": "A区",
  "base_id": 1,
  "base": {
    "id": 1,
    "name": "北京基地"
  },
  "captain_id": 2,
  "captain_name": "基地代理1",
  "area": 1000,
  "description": "A区描述",
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:30:00Z"
}
```

#### 6.4 更新基地区域

**接口地址:** `PUT /api/base-section/update?id=1`

**权限要求:** `admin`

**请求参数:**
```json
{
  "name": "A区",
  "base_id": 1,
  "captain_id": 3,
  "area": 1200,
  "description": "A区描述-更新"
}
```

**响应示例:**
```json
{
  "id": 1,
  "name": "A区",
  "base_id": 1,
  "base": {
    "id": 1,
    "name": "北京基地"
  },
  "captain_id": 3,
  "captain_name": "基地代理2",
  "area": 1200,
  "description": "A区描述-更新",
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T18:30:00Z"
}
```

#### 6.5 删除基地区域

**接口地址:** `DELETE /api/base-section/delete?id=1`

**权限要求:** `admin`

**响应示例:**
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

### 7. 人员管理

#### 7.1 创建用户

**接口地址:** `POST /api/user/create`

**权限要求:** `admin`

**请求参数:**
```json
{
  "name": "新用户",
  "password": "user123",
  "role": "base_agent",
  "base_id": 1,
  "join_date": "2024-08-25",
  "mobile": "13800138000",
  "passport_number": "P12345678",
  "visa_expiry_date": "2025-08-25"
}
```

**响应示例:**
```json
{
  "id": 1,
  "name": "新用户",
  "role": "base_agent",
  "base_id": 1,
  "base": {
    "id": 1,
    "name": "北京基地"
  },
  "join_date": "2024-08-25T00:00:00Z",
  "mobile": "13800138000",
  "passport_number": "P12345678",
  "visa_expiry_date": "2025-08-25T00:00:00Z",
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:30:00Z"
}
```

#### 7.2 查询用户列表

**接口地址:** `GET /api/user/list`

**权限要求:** `admin`

**响应示例:**
```json
[
  {
    "id": 1,
    "name": "管理员",
    "role": "admin",
    "base_id": null,
    "base": null,
    "join_date": null,
    "mobile": null,
    "passport_number": null,
    "visa_expiry_date": null,
    "created_at": "2024-08-25T17:30:00Z",
    "updated_at": "2024-08-25T17:30:00Z"
  }
]
```

#### 7.3 获取用户详情

**接口地址:** `GET /api/user/get?id=1`

**权限要求:** `admin`

**响应示例:**
```json
{
  "id": 1,
  "name": "管理员",
  "role": "admin",
  "base_id": null,
  "base": null,
  "join_date": null,
  "mobile": null,
  "passport_number": null,
  "visa_expiry_date": null,
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T17:30:00Z"
}
```

#### 7.4 更新用户

**接口地址:** `PUT /api/user/update?id=1`

**权限要求:** `admin`

**请求参数:**
```json
{
  "name": "管理员",
  "role": "admin",
  "base_id": null,
  "join_date": null,
  "mobile": "13800138000",
  "passport_number": "P12345678",
  "visa_expiry_date": "2025-08-25"
}
```

**响应示例:**
```json
{
  "id": 1,
  "name": "管理员",
  "role": "admin",
  "base_id": null,
  "base": null,
  "join_date": null,
  "mobile": "13800138000",
  "passport_number": "P12345678",
  "visa_expiry_date": "2025-08-25T00:00:00Z",
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T18:30:00Z"
}
```

#### 7.5 删除用户

**接口地址:** `DELETE /api/user/delete?id=1`

**权限要求:** `admin`

**响应示例:**
```json
{
  "success": true,
  "message": "删除成功"
}
```

#### 7.6 批量删除用户

**接口地址:** `POST /api/user/batch-delete`

**权限要求:** `admin`

**请求参数:**
```json
{
  "ids": [1, 2, 3]
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "批量删除成功",
  "deleted_count": 3
}
```

#### 7.7 重置用户密码

**接口地址:** `POST /api/user/reset-password?id=1`

**权限要求:** `admin`

**请求参数:**
```json
{
  "password": "newpassword123"
}
```

**响应示例:**
```text
密码重置成功
```

---

### 8. 应付款管理

#### 8.1 查询应付款列表

**接口地址:** `GET /api/payable/list`

**权限要求:** `admin` 或 `base_agent`

**查询参数:**
- `base`: 基地名称 (admin可用，筛选特定基地)
- `supplier`: 供应商名称 (模糊匹配)
- `status`: 状态 (pending, partial, paid)
- `overdue`: 是否超期 (true/false)

**响应示例:**
```json
[
  {
    "id": 1,
    "purchase_entry_id": 1,
    "supplier_id": 1,
    "supplier": {
      "id": 1,
      "name": "阿里巴巴有限公司"
    },
    "base_id": 1,
    "base": {
      "id": 1,
      "name": "北京基地"
    },
    "total_amount": 15500.50,
    "paid_amount": 5000.00,
    "remaining_amount": 10500.50,
    "status": "partial",
    "due_date": "2024-09-25T00:00:00Z",
    "created_by": 1,
    "creator": {
      "id": 1,
      "name": "管理员"
    },
    "created_at": "2024-08-25T17:30:00Z",
    "updated_at": "2024-08-25T18:30:00Z",
    "payment_records": [
      {
        "id": 1,
        "payable_record_id": 1,
        "payment_amount": 5000.00,
        "payment_date": "2024-08-30T00:00:00Z",
        "payment_method": "bank_transfer",
        "reference_number": "REF20240830001",
        "notes": "首次还款",
        "created_by": 1,
        "creator": {
          "id": 1,
          "name": "管理员"
        },
        "created_at": "2024-08-30T17:30:00Z"
      }
    ]
  }
]
```

#### 8.2 应付款统计摘要

**接口地址:** `GET /api/payable/summary`

**权限要求:** `admin` 或 `base_agent`

**查询参数:**
- `base`: 基地名称 (admin可用，筛选特定基地)

**响应示例:**
```json
{
  "total_amount": 100000.00,
  "paid_amount": 60000.00,
  "remaining_amount": 40000.00,
  "overdue_amount": 15000.00,
  "pending_count": 5,
  "partial_count": 3,
  "paid_count": 2,
  "overdue_count": 2
}
```

#### 8.3 按供应商统计应付款

**接口地址:** `GET /api/payable/by-supplier`

**权限要求:** `admin` 或 `base_agent`

**查询参数:**
- `base`: 基地名称 (admin可用，筛选特定基地)

**响应示例:**
```json
[
  {
    "supplier": "阿里巴巴有限公司",
    "total_amount": 50000.00,
    "paid_amount": 30000.00,
    "remaining_amount": 20000.00,
    "payment_rate": 60.0
  }
]
```

#### 8.4 超期应付款列表

**接口地址:** `GET /api/payable/overdue`

**权限要求:** `admin` 或 `base_agent`

**查询参数:**
- `base`: 基地名称 (admin可用，筛选特定基地)

**响应示例:**
```json
[
  {
    "id": 1,
    "purchase_entry_id": 1,
    "supplier_id": 1,
    "supplier": {
      "id": 1,
      "name": "阿里巴巴有限公司"
    },
    "base_id": 1,
    "base": {
      "id": 1,
      "name": "北京基地"
    },
    "total_amount": 15500.50,
    "paid_amount": 5000.00,
    "remaining_amount": 10500.50,
    "status": "partial",
    "due_date": "2024-08-20T00:00:00Z",
    "overdue_days": 5,
    "created_by": 1,
    "creator": {
      "id": 1,
      "name": "管理员"
    },
    "created_at": "2024-08-25T17:30:00Z",
    "updated_at": "2024-08-25T18:30:00Z"
  }
]
```

#### 8.5 应付款详情

**接口地址:** `GET /api/payable/detail?id=1`

**权限要求:** `admin` 或 `base_agent`

**响应示例:**
```json
{
  "id": 1,
  "purchase_entry_id": 1,
  "purchase_entry": {
    "id": 1,
    "supplier_id": 1,
    "supplier": {
      "id": 1,
      "name": "阿里巴巴有限公司"
    },
    "order_number": "PO20240001",
    "purchase_date": "2024-08-25T00:00:00Z",
    "total_amount": 15500.50,
    "receiver": "仓库1",
    "base_id": 1,
    "base": {
      "id": 1,
      "name": "北京基地"
    },
    "created_by": 1,
    "creator_name": "管理员",
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
      }
    ]
  },
  "supplier_id": 1,
  "supplier": {
    "id": 1,
    "name": "阿里巴巴有限公司"
  },
  "base_id": 1,
  "base": {
    "id": 1,
    "name": "北京基地"
  },
  "total_amount": 15500.50,
  "paid_amount": 5000.00,
  "remaining_amount": 10500.50,
  "status": "partial",
  "due_date": "2024-09-25T00:00:00Z",
  "created_by": 1,
  "creator": {
    "id": 1,
    "name": "管理员"
  },
  "created_at": "2024-08-25T17:30:00Z",
  "updated_at": "2024-08-25T18:30:00Z",
  "payment_records": [
    {
      "id": 1,
      "payable_record_id": 1,
      "payment_amount": 5000.00,
      "payment_date": "2024-08-30T00:00:00Z",
      "payment_method": "bank_transfer",
      "reference_number": "REF20240830001",
      "notes": "首次还款",
      "created_by": 1,
      "creator": {
        "id": 1,
        "name": "管理员"
      },
      "created_at": "2024-08-30T17:30:00Z"
    }
  ]
}
```

---

### 9. 还款记录管理

#### 9.1 创建还款记录

**接口地址:** `POST /api/payment/create`

**权限要求:** `admin` 或 `base_agent`

**请求参数:**
```json
{
  "payable_record_id": 1,
  "payment_amount": 5000.00,
  "payment_date": "2024-08-30",
  "payment_method": "bank_transfer",
  "reference_number": "REF20240830001",
  "notes": "第二次还款"
}
```

**响应示例:**
```json
{
  "id": 2,
  "payable_record_id": 1,
  "payment_amount": 5000.00,
  "payment_date": "2024-08-30T00:00:00Z",
  "payment_method": "bank_transfer",
  "reference_number": "REF20240830001",
  "notes": "第二次还款",
  "created_by": 1,
  "creator": {
    "id": 1,
    "name": "管理员"
  },
  "created_at": "2024-08-30T18:30:00Z"
}
```

#### 9.2 查询还款记录列表

**接口地址:** `GET /api/payment/list`

**权限要求:** `admin` 或 `base_agent`

**查询参数:**
- `payable_record_id`: 应付款记录ID

**响应示例:**
```json
[
  {
    "id": 1,
    "payable_record_id": 1,
    "payment_amount": 5000.00,
    "payment_date": "2024-08-30T00:00:00Z",
    "payment_method": "bank_transfer",
    "reference_number": "REF20240830001",
    "notes": "首次还款",
    "created_by": 1,
    "creator": {
      "id": 1,
      "name": "管理员"
    },
    "created_at": "2024-08-30T17:30:00Z"
  }
]
```

#### 9.3 删除还款记录

**接口地址:** `DELETE /api/payment/delete?id=1`

**权限要求:** `admin`

**响应示例:**
```json
{
  "success": true,
  "message": "删除成功"
}
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

### 应付款状态 (PayableRecord.Status)
- `pending`: 待付款
- `partial`: 部分付款
- `paid`: 已付清

### 还款方式 (PaymentRecord.PaymentMethod)
- `cash`: 现金
- `bank_transfer`: 银行转账
- `check`: 支票
- `other`: 其他

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
curl -X GET "http://localhost:8080/api/expense/list" \
  -H "Authorization: Bearer <token>"
```

### 3. 创建费用记录
```bash
curl -X POST http://localhost:8080/api/expense/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"date":"2024-08-25","category":"办公用品","amount":299.50,"detail":"购买打印纸和文具","base_id":1}'
```