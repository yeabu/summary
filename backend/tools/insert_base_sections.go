package main

import (
	"backend/db"
	"backend/models"
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

func main() {
	// 初始化数据库连接
	db.Init()

	// 确保表已创建
	db.DB.AutoMigrate(&models.User{}, &models.Base{}, &models.BaseSection{})

	// 检查是否有基地数据，如果没有则创建一些示例基地
	bases, err := checkOrCreateBases(db.DB)
	if err != nil {
		log.Fatal("检查或创建基地时出错:", err)
	}

	// 检查是否有队长用户，如果没有则创建一些示例队长
	captains, err := checkOrCreateCaptains(db.DB)
	if err != nil {
		log.Fatal("检查或创建队长时出错:", err)
	}

	// 插入10条基地分区数据
	err = insertBaseSections(db.DB, bases, captains)
	if err != nil {
		log.Fatal("插入基地分区数据时出错:", err)
	}

	fmt.Println("成功插入10条基地分区数据!")
}

func checkOrCreateBases(DB *gorm.DB) ([]models.Base, error) {
	var bases []models.Base
	DB.Find(&bases)

	// 如果没有基地数据，则创建一些示例基地
	if len(bases) == 0 {
		sampleBases := []models.Base{
			{Name: "A基地", Code: "BASE-A", Location: "北京市朝阳区", Description: "主要生产基地", Status: "active", CreatedBy: 1},
			{Name: "B基地", Code: "BASE-B", Location: "上海市浦东新区", Description: "研发中心基地", Status: "active", CreatedBy: 1},
			{Name: "C基地", Code: "BASE-C", Location: "广州市天河区", Description: "测试基地", Status: "active", CreatedBy: 1},
		}

		for i := range sampleBases {
			sampleBases[i].CreatedAt = time.Now()
			sampleBases[i].UpdatedAt = time.Now()
			result := DB.Create(&sampleBases[i])
			if result.Error != nil {
				return nil, result.Error
			}
		}

		// 重新查询基地数据
		DB.Find(&bases)
	}

	return bases, nil
}

func checkOrCreateCaptains(DB *gorm.DB) ([]models.User, error) {
	var captains []models.User
	DB.Where("role = ?", "captain").Find(&captains)

	// 如果没有队长用户，则创建一些示例队长
	if len(captains) == 0 {
		sampleCaptains := []models.User{
			{Name: "梁队长", Role: "captain", Base: "A基地", Password: "password123"},
			{Name: "潘队长", Role: "captain", Base: "A基地", Password: "password123"},
			{Name: "赵队长", Role: "captain", Base: "A基地", Password: "password123"},
			{Name: "李队长", Role: "captain", Base: "B基地", Password: "password123"},
			{Name: "王队长", Role: "captain", Base: "C基地", Password: "password123"},
		}

		for i := range sampleCaptains {
			result := DB.Create(&sampleCaptains[i])
			if result.Error != nil {
				return nil, result.Error
			}
		}

		// 重新查询队长数据
		DB.Where("role = ?", "captain").Find(&captains)
	}

	return captains, nil
}

func insertBaseSections(DB *gorm.DB, bases []models.Base, captains []models.User) error {
	// 确保有足够的基地和队长
	if len(bases) == 0 {
		return fmt.Errorf("没有可用的基地数据")
	}

	// 准备10条基地分区数据
	sections := make([]models.BaseSection, 10)

	// 创建分区数据
	sections[0] = models.BaseSection{
		Name:        "1区",
		BaseID:      bases[0].ID,
		LeaderID:    &captains[0].ID,
		Description: "A基地1区",
		CreatedBy:   1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	sections[1] = models.BaseSection{
		Name:        "2区",
		BaseID:      bases[0].ID,
		LeaderID:    &captains[1].ID,
		Description: "A基地2区",
		CreatedBy:   1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	sections[2] = models.BaseSection{
		Name:        "3区",
		BaseID:      bases[0].ID,
		LeaderID:    &captains[2].ID,
		Description: "A基地3区",
		CreatedBy:   1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	sections[3] = models.BaseSection{
		Name:        "研发区",
		BaseID:      bases[0].ID,
		Description: "A基地研发区（暂无队长）",
		CreatedBy:   1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	sections[4] = models.BaseSection{
		Name:        "测试区",
		BaseID:      bases[0].ID,
		Description: "A基地测试区（暂无队长）",
		CreatedBy:   1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	sections[5] = models.BaseSection{
		Name:        "生产区",
		BaseID:      bases[1].ID,
		Description: "B基地生产区（暂无队长）",
		CreatedBy:   1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	sections[6] = models.BaseSection{
		Name:        "质量区",
		BaseID:      bases[1].ID,
		Description: "B基地质量区（暂无队长）",
		CreatedBy:   1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	sections[7] = models.BaseSection{
		Name:        "物流区",
		BaseID:      bases[2].ID,
		Description: "C基地物流区（暂无队长）",
		CreatedBy:   1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	sections[8] = models.BaseSection{
		Name:        "4区",
		BaseID:      bases[1].ID,
		Description: "B基地4区（暂无队长）",
		CreatedBy:   1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	sections[9] = models.BaseSection{
		Name:        "5区",
		BaseID:      bases[2].ID,
		Description: "C基地5区（暂无队长）",
		CreatedBy:   1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// 插入数据
	for i := range sections {
		result := DB.Create(&sections[i])
		if result.Error != nil {
			return result.Error
		}
	}

	return nil
}
