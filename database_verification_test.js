// 数据库验证脚本 - 检查采购记录存储情况
// 这个脚本可以帮助验证采购记录是否正确保存到数据库

// 1. 检查数据库连接和表结构
const checkDatabaseConnection = async () => {
  try {
    console.log('=== 数据库连接检查 ===');
    
    const response = await fetch('/api/purchase/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    console.log('数据库连接状态:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 数据库连接正常');
      console.log('当前采购记录总数:', Array.isArray(data) ? data.length : 0);
      return true;
    } else {
      console.log('❌ 数据库连接失败');
      return false;
    }
  } catch (error) {
    console.error('数据库连接检查失败:', error);
    return false;
  }
};

// 2. 创建测试记录并验证存储
const createAndVerifyRecord = async () => {
  try {
    console.log('=== 创建测试记录验证 ===');
    
    // 获取创建前的记录数量
    console.log('步骤1: 获取创建前的记录数量...');
    const beforeResponse = await fetch('/api/purchase/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const beforeData = await beforeResponse.json();
    const beforeCount = Array.isArray(beforeData) ? beforeData.length : 0;
    console.log('创建前记录数量:', beforeCount);
    
    // 创建测试记录
    console.log('步骤2: 创建测试采购记录...');
    const testRecord = {
      supplier: `测试供应商_${Date.now()}`,
      order_number: `TEST_${Date.now()}`,
      purchase_date: new Date().toISOString().split('T')[0],
      total_amount: 199.99,
      receiver: "数据库测试收货人",
      base: "北京基地",
      notes: "数据库验证测试记录",
      items: [
        {
          product_name: "测试商品A",
          quantity: 2,
          unit_price: 99.99,
          amount: 199.98
        }
      ]
    };
    
    console.log('测试记录数据:', testRecord);
    
    const createResponse = await fetch('/api/purchase/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(testRecord)
    });
    
    console.log('创建响应状态:', createResponse.status);
    const createResult = await createResponse.text();
    console.log('创建响应内容:', createResult);
    
    if (!createResponse.ok) {
      console.log('❌ 测试记录创建失败');
      return false;
    }
    
    const createdRecord = JSON.parse(createResult);
    console.log('✅ 测试记录创建成功');
    console.log('创建的记录ID:', createdRecord.id);
    console.log('创建的记录详情:', createdRecord);
    
    // 等待一段时间确保数据已保存
    console.log('步骤3: 等待数据保存...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 验证记录是否存在于数据库中
    console.log('步骤4: 验证记录是否正确保存...');
    const afterResponse = await fetch('/api/purchase/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const afterData = await afterResponse.json();
    const afterCount = Array.isArray(afterData) ? afterData.length : 0;
    console.log('创建后记录数量:', afterCount);
    
    // 查找刚创建的记录
    const newRecord = Array.isArray(afterData) ? 
      afterData.find(record => record.id === createdRecord.id || record.order_number === testRecord.order_number) : 
      null;
    
    if (newRecord) {
      console.log('✅ 记录已正确保存到数据库');
      console.log('数据库中的记录:', newRecord);
      
      // 验证字段完整性
      console.log('步骤5: 验证字段完整性...');
      const fieldChecks = {
        id: !!newRecord.id,
        supplier: newRecord.supplier === testRecord.supplier,
        order_number: newRecord.order_number === testRecord.order_number,
        purchase_date: !!newRecord.purchase_date,
        total_amount: newRecord.total_amount === testRecord.total_amount,
        receiver: newRecord.receiver === testRecord.receiver,
        base: newRecord.base === testRecord.base,
        creator_name: !!newRecord.creator_name,
        created_at: !!newRecord.created_at,
        updated_at: !!newRecord.updated_at,
        items: Array.isArray(newRecord.items) && newRecord.items.length > 0
      };
      
      console.log('字段完整性检查:', fieldChecks);
      
      const allFieldsValid = Object.values(fieldChecks).every(check => check === true);
      if (allFieldsValid) {
        console.log('✅ 所有字段都正确保存');
      } else {
        console.log('⚠️ 部分字段可能有问题');
      }
      
      return {
        success: true,
        beforeCount,
        afterCount,
        newRecord,
        fieldChecks
      };
    } else {
      console.log('❌ 记录未找到，可能保存失败');
      return {
        success: false,
        beforeCount,
        afterCount,
        error: '记录未找到'
      };
    }
    
  } catch (error) {
    console.error('创建和验证测试记录失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 3. 检查采购明细项关联
const checkPurchaseItems = async (purchaseId) => {
  try {
    console.log('=== 检查采购明细项关联 ===');
    console.log('采购记录ID:', purchaseId);
    
    // 获取采购记录列表，检查明细项
    const response = await fetch('/api/purchase/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const purchase = Array.isArray(data) ? 
        data.find(p => p.id === purchaseId) : null;
      
      if (purchase && purchase.items) {
        console.log('✅ 采购明细项正确关联');
        console.log('明细项数量:', purchase.items.length);
        console.log('明细项详情:', purchase.items);
        return true;
      } else {
        console.log('❌ 采购明细项关联失败');
        return false;
      }
    } else {
      console.log('❌ 无法获取采购记录');
      return false;
    }
  } catch (error) {
    console.error('检查采购明细项失败:', error);
    return false;
  }
};

// 4. 完整的数据库验证流程
const runDatabaseVerification = async () => {
  console.log('🔍 开始数据库验证流程...');
  console.log('时间:', new Date().toLocaleString());
  
  // 检查数据库连接
  const connectionOk = await checkDatabaseConnection();
  if (!connectionOk) {
    console.log('❌ 数据库验证失败：连接问题');
    return;
  }
  
  // 创建和验证记录
  const verificationResult = await createAndVerifyRecord();
  
  if (verificationResult.success) {
    console.log('✅ 数据库验证成功！');
    console.log('验证总结:');
    console.log('- 创建前记录数:', verificationResult.beforeCount);
    console.log('- 创建后记录数:', verificationResult.afterCount);
    console.log('- 新增记录数:', verificationResult.afterCount - verificationResult.beforeCount);
    console.log('- 字段完整性:', verificationResult.fieldChecks);
    
    // 检查明细项关联
    if (verificationResult.newRecord && verificationResult.newRecord.id) {
      await checkPurchaseItems(verificationResult.newRecord.id);
    }
    
    console.log('🎉 数据库验证完成，采购记录存储功能正常！');
  } else {
    console.log('❌ 数据库验证失败！');
    console.log('错误信息:', verificationResult.error);
    console.log('请检查后端服务和数据库配置');
  }
};

// 5. 简单的连接测试
const quickConnectionTest = async () => {
  console.log('🚀 快速连接测试...');
  return await checkDatabaseConnection();
};

// 使用说明
console.log('数据库验证脚本已加载');
console.log('可用命令:');
console.log('- runDatabaseVerification() : 完整数据库验证');
console.log('- quickConnectionTest() : 快速连接测试');
console.log('- createAndVerifyRecord() : 创建并验证记录');
console.log('- checkDatabaseConnection() : 检查数据库连接');