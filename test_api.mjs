import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8080';

// 模拟登录获取token
async function login() {
  try {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'admin',
        password: 'admin123'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('登录成功:', data);
    return data.token;
  } catch (error) {
    console.error('登录失败:', error);
    return null;
  }
}

// 测试获取开支列表
async function testExpenseList(token) {
  try {
    const response = await fetch(`${API_BASE}/api/expense/list`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('开支列表API响应:');
    console.log('数据类型:', typeof data);
    console.log('是否为数组:', Array.isArray(data));
    console.log('数据长度:', data?.length || 'N/A');
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('\n第一条记录详情:');
      console.log(JSON.stringify(data[0], null, 2));
      
      console.log('\n字段检查:');
      const firstRecord = data[0];
      console.log('- id:', firstRecord.id, '(类型:', typeof firstRecord.id, ')');
      console.log('- date:', firstRecord.date, '(类型:', typeof firstRecord.date, ')');
      console.log('- category:', firstRecord.category, '(类型:', typeof firstRecord.category, ')');
      console.log('- amount:', firstRecord.amount, '(类型:', typeof firstRecord.amount, ')');
      console.log('- base:', firstRecord.base, '(类型:', typeof firstRecord.base, ')');
      console.log('- detail:', firstRecord.detail, '(类型:', typeof firstRecord.detail, ')');
    } else {
      console.log('⚠️  返回的数据为空或不是数组');
    }
    
    return data;
  } catch (error) {
    console.error('API测试失败:', error);
    return null;
  }
}

// 主测试函数
async function main() {
  console.log('=== API测试开始 ===');
  
  const token = await login();
  if (!token) {
    console.log('无法获取token，测试终止');
    return;
  }
  
  await testExpenseList(token);
  
  console.log('\n=== API测试完成 ===');
}

main().catch(console.error);