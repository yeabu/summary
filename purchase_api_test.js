// 采购API测试脚本
// 直接在浏览器控制台中运行来验证API调用

// 1. 测试创建采购记录
const testCreatePurchase = async () => {
  try {
    const testData = {
      supplier: "测试供应商",
      order_number: "TEST-001",
      purchase_date: "2025-08-26",
      total_amount: 100.00,
      receiver: "测试收货人",
      base: "北京基地",
      notes: "测试采购记录",
      items: [
        {
          product_name: "测试商品",
          quantity: 1,
          unit_price: 100.00,
          amount: 100.00
        }
      ]
    };

    console.log('创建采购记录 - 请求数据:', testData);
    
    const response = await fetch('/api/purchase/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(testData)
    });

    console.log('创建采购记录 - 响应状态:', response.status);
    const result = await response.text();
    console.log('创建采购记录 - 响应内容:', result);
    
    if (response.ok) {
      console.log('✅ 采购记录创建成功');
      return JSON.parse(result);
    } else {
      console.log('❌ 采购记录创建失败');
      return null;
    }
  } catch (error) {
    console.error('采购记录创建错误:', error);
    return null;
  }
};

// 2. 测试获取采购记录列表
const testListPurchase = async () => {
  try {
    console.log('获取采购记录列表...');
    
    const response = await fetch('/api/purchase/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    console.log('获取采购列表 - 响应状态:', response.status);
    const result = await response.text();
    console.log('获取采购列表 - 响应内容:', result);
    
    if (response.ok) {
      const data = JSON.parse(result);
      console.log('✅ 采购记录列表获取成功，数量:', data.length);
      console.log('采购记录详情:', data);
      return data;
    } else {
      console.log('❌ 采购记录列表获取失败');
      return [];
    }
  } catch (error) {
    console.error('获取采购列表错误:', error);
    return [];
  }
};

// 3. 完整测试流程
const runFullTest = async () => {
  console.log('=== 开始采购API完整测试 ===');
  
  // 先获取当前列表
  console.log('1. 获取创建前的采购列表...');
  const beforeList = await testListPurchase();
  
  // 创建新记录
  console.log('2. 创建新的采购记录...');
  const created = await testCreatePurchase();
  
  if (created) {
    // 再次获取列表
    console.log('3. 获取创建后的采购列表...');
    setTimeout(async () => {
      const afterList = await testListPurchase();
      
      console.log('=== 测试结果对比 ===');
      console.log('创建前记录数量:', beforeList.length);
      console.log('创建后记录数量:', afterList.length);
      console.log('新增记录数量:', afterList.length - beforeList.length);
      
      if (afterList.length > beforeList.length) {
        console.log('✅ 测试成功！新记录已正确添加到列表中');
      } else {
        console.log('❌ 测试失败！新记录未出现在列表中');
      }
    }, 200);
  }
};

// 使用说明
console.log('采购API测试脚本已加载');
console.log('运行 runFullTest() 开始完整测试');
console.log('或分别运行 testCreatePurchase() 和 testListPurchase() 进行单独测试');