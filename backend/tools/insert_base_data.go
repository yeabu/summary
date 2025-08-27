package main

import (
	"backend/db"
	"backend/models"
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

func loadEnv() {
	file, err := os.Open("../.env")
	if err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			if os.Getenv(key) == "" {
				os.Setenv(key, value)
			}
		}
	}
}

func main() {
	// 加载环境变量
	loadEnv()

	// 初始化数据库连接
	db.Init()

	// 创建基地数据
	bases := []models.Base{
		{Name: "北京总部基地", Code: "BJ001", Location: "北京市朝阳区CBD中心区", Description: "公司总部基地，负责全国业务协调", Status: "active", CreatedBy: 1},
		{Name: "上海运营中心", Code: "SH001", Location: "上海市浦东新区陆家嘴", Description: "华东地区运营中心，负责长三角业务", Status: "active", CreatedBy: 1},
		{Name: "深圳研发基地", Code: "SZ001", Location: "深圳市南山区科技园", Description: "技术研发中心，负责产品开发", Status: "active", CreatedBy: 1},
		{Name: "广州分部", Code: "GZ001", Location: "广州市天河区珠江新城", Description: "华南地区分部，负责珠三角业务", Status: "active", CreatedBy: 1},
		{Name: "杭州技术中心", Code: "HZ001", Location: "杭州市西湖区文三路", Description: "电商技术中心，负责电子商务平台", Status: "active", CreatedBy: 1},
		{Name: "成都西南基地", Code: "CD001", Location: "成都市高新区天府大道", Description: "西南地区总部，负责西南市场", Status: "active", CreatedBy: 1},
		{Name: "武汉中部中心", Code: "WH001", Location: "武汉市江汉区中央商务区", Description: "华中地区中心，负责中部市场开拓", Status: "active", CreatedBy: 1},
		{Name: "西安西北基地", Code: "XA001", Location: "西安市雁塔区高新技术开发区", Description: "西北地区基地，负责西北市场", Status: "active", CreatedBy: 1},
		{Name: "南京江苏分部", Code: "NJ001", Location: "南京市建邺区河西新城", Description: "江苏省分部，负责江苏市场", Status: "active", CreatedBy: 1},
		{Name: "青岛山东中心", Code: "QD001", Location: "青岛市市南区香港中路", Description: "山东省中心，负责山东半岛业务", Status: "active", CreatedBy: 1},
		{Name: "天津北方港口基地", Code: "TJ001", Location: "天津市和平区南京路", Description: "北方港口物流基地", Status: "active", CreatedBy: 1},
		{Name: "重庆山城中心", Code: "CQ001", Location: "重庆市渝中区解放碑", Description: "西南地区重要节点城市", Status: "active", CreatedBy: 1},
		{Name: "沈阳东北基地", Code: "SY001", Location: "沈阳市沈河区青年大街", Description: "东北地区总部基地", Status: "active", CreatedBy: 1},
		{Name: "长沙湖南中心", Code: "CS001", Location: "长沙市岳麓区橘子洲头", Description: "湖南省中心，负责湖南市场", Status: "active", CreatedBy: 1},
		{Name: "福州福建分部", Code: "FZ001", Location: "福州市鼓楼区五四路", Description: "福建省分部，负责福建市场", Status: "active", CreatedBy: 1},
		{Name: "昆明云南基地", Code: "KM001", Location: "昆明市盘龙区北京路", Description: "云南省基地，负责云南及东南亚业务", Status: "active", CreatedBy: 1},
		{Name: "郑州河南中心", Code: "ZZ001", Location: "郑州市金水区花园路", Description: "河南省中心，负责中原地区", Status: "active", CreatedBy: 1},
		{Name: "合肥安徽分部", Code: "HF001", Location: "合肥市蜀山区政务新区", Description: "安徽省分部，负责安徽市场", Status: "active", CreatedBy: 1},
		{Name: "石家庄河北基地", Code: "SJZ001", Location: "石家庄市长安区中山路", Description: "河北省基地，负责河北市场", Status: "active", CreatedBy: 1},
		{Name: "太原山西中心", Code: "TY001", Location: "太原市迎泽区迎泽大街", Description: "山西省中心，负责山西市场", Status: "active", CreatedBy: 1},
		{Name: "南昌江西分部", Code: "NC001", Location: "南昌市东湖区八一大道", Description: "江西省分部，负责江西市场", Status: "active", CreatedBy: 1},
		{Name: "海口海南基地", Code: "HK001", Location: "海口市龙华区国贸大道", Description: "海南省基地，负责海南及南海业务", Status: "active", CreatedBy: 1},
		{Name: "银川宁夏中心", Code: "YC001", Location: "银川市兴庆区解放东街", Description: "宁夏回族自治区中心", Status: "active", CreatedBy: 1},
		{Name: "呼和浩特内蒙古基地", Code: "HHHT001", Location: "呼和浩特市新城区新华大街", Description: "内蒙古自治区基地", Status: "active", CreatedBy: 1},
		{Name: "乌鲁木齐新疆中心", Code: "WLMQ001", Location: "乌鲁木齐市天山区人民路", Description: "新疆维吾尔自治区中心", Status: "active", CreatedBy: 1},
		{Name: "拉萨西藏分部", Code: "LS001", Location: "拉萨市城关区北京中路", Description: "西藏自治区分部", Status: "active", CreatedBy: 1},
		{Name: "贵阳贵州基地", Code: "GY001", Location: "贵阳市南明区中华南路", Description: "贵州省基地，负责贵州市场", Status: "active", CreatedBy: 1},
		{Name: "兰州甘肃中心", Code: "LZ001", Location: "兰州市城关区东岗西路", Description: "甘肃省中心，负责甘肃市场", Status: "active", CreatedBy: 1},
		{Name: "哈尔滨黑龙江基地", Code: "HRB001", Location: "哈尔滨市南岗区中央大街", Description: "黑龙江省基地，负责黑龙江市场", Status: "active", CreatedBy: 1},
		{Name: "长春吉林分部", Code: "CC001", Location: "长春市朝阳区人民大街", Description: "吉林省分部，负责吉林市场", Status: "active", CreatedBy: 1},
	}

	// 检查数据库中是否已有基地数据
	var count int64
	db.DB.Model(&models.Base{}).Count(&count)
	if count > 0 {
		fmt.Printf("数据库中已有 %d 条基地记录，是否要清空后重新插入？(y/N): ", count)
		var input string
		fmt.Scanln(&input)
		if strings.ToLower(input) == "y" || strings.ToLower(input) == "yes" {
			// 清空现有数据
			db.DB.Exec("DELETE FROM bases")
			fmt.Println("已清空现有基地数据")
		} else {
			fmt.Println("取消插入操作")
			return
		}
	}

	// 插入基地数据
	fmt.Println("开始插入基地数据...")
	for i, base := range bases {
		base.CreatedAt = time.Now()
		base.UpdatedAt = time.Now()

		result := db.DB.Create(&base)
		if result.Error != nil {
			log.Printf("插入第 %d 条基地数据失败: %v", i+1, result.Error)
		} else {
			fmt.Printf("成功插入基地: %s (%s)\n", base.Name, base.Code)
		}
	}

	// 查询插入结果
	var finalCount int64
	db.DB.Model(&models.Base{}).Count(&finalCount)
	fmt.Printf("\n插入完成！数据库中共有 %d 条基地记录\n", finalCount)
}
