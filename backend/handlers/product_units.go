package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

// 列出商品的单位规格
func ListProductUnitSpecs(w http.ResponseWriter, r *http.Request) {
	if _, err := middleware.ParseJWT(r); err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}
	pid, _ := strconv.ParseUint(r.URL.Query().Get("product_id"), 10, 64)
	if pid == 0 {
		http.Error(w, "product_id 必填", http.StatusBadRequest)
		return
	}
	var rows []models.ProductUnitSpec
	db.DB.Where("product_id = ?", uint(pid)).Order("is_default desc, unit asc").Find(&rows)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rows)
}

// 新增或更新规格（唯一键：product_id+unit）
func UpsertProductUnitSpec(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}
	if role, _ := claims["role"].(string); role != "admin" && role != "warehouse_admin" {
		http.Error(w, "无权限", http.StatusForbidden)
		return
	}
	var body models.ProductUnitSpec
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}
	if body.ProductID == 0 || body.Unit == "" || body.FactorToBase <= 0 {
		http.Error(w, "参数不完整", http.StatusBadRequest)
		return
	}
	var cur models.ProductUnitSpec
	if err := db.DB.Where("product_id = ? AND unit = ?", body.ProductID, body.Unit).First(&cur).Error; err == nil {
		cur.FactorToBase = body.FactorToBase
		if body.Kind != "" {
			cur.Kind = body.Kind
		}
		cur.IsDefault = body.IsDefault
		if err := db.DB.Save(&cur).Error; err != nil {
			http.Error(w, "更新失败", http.StatusInternalServerError)
			return
		}
		// 如果设为默认，则取消同商品其他规格的默认
		if cur.IsDefault {
			db.DB.Model(&models.ProductUnitSpec{}).
				Where("product_id = ? AND id <> ?", cur.ProductID, cur.ID).
				Update("is_default", false)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(cur)
		return
	}
	if err := db.DB.Create(&body).Error; err != nil {
		http.Error(w, "创建失败", http.StatusInternalServerError)
		return
	}
	if body.IsDefault {
		db.DB.Model(&models.ProductUnitSpec{}).
			Where("product_id = ? AND id <> ?", body.ProductID, body.ID).
			Update("is_default", false)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(body)
}

func DeleteProductUnitSpec(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}
	if role, _ := claims["role"].(string); role != "admin" && role != "warehouse_admin" {
		http.Error(w, "无权限", http.StatusForbidden)
		return
	}
	id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if id == 0 {
		http.Error(w, "无效ID", http.StatusBadRequest)
		return
	}
	if err := db.DB.Delete(&models.ProductUnitSpec{}, uint(id)).Error; err != nil {
		http.Error(w, "删除失败", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "ok"})
}

// 通过商品名称新增/更新规格（若商品不存在则创建）
func UpsertProductUnitSpecByName(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}
	if role, _ := claims["role"].(string); role != "admin" && role != "warehouse_admin" {
		http.Error(w, "无权限", http.StatusForbidden)
		return
	}
	var body struct {
		ProductName  string  `json:"product_name"`
		Unit         string  `json:"unit"`
		FactorToBase float64 `json:"factor_to_base"`
		Kind         string  `json:"kind"`
		IsDefault    bool    `json:"is_default"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(body.ProductName) == "" || strings.TrimSpace(body.Unit) == "" || body.FactorToBase <= 0 {
		http.Error(w, "参数不完整", http.StatusBadRequest)
		return
	}
	// upsert product by name
	var prod models.Product
	if err := db.DB.Where("name = ?", body.ProductName).First(&prod).Error; err != nil {
		prod = models.Product{Name: body.ProductName, BaseUnit: "", Status: "active"}
		if err := db.DB.Create(&prod).Error; err != nil {
			http.Error(w, "创建商品失败", http.StatusInternalServerError)
			return
		}
	}
	// upsert spec
	var spec models.ProductUnitSpec
	if err := db.DB.Where("product_id = ? AND unit = ?", prod.ID, body.Unit).First(&spec).Error; err == nil {
		spec.FactorToBase = body.FactorToBase
		if body.Kind != "" {
			spec.Kind = body.Kind
		}
		spec.IsDefault = body.IsDefault
		if err := db.DB.Save(&spec).Error; err != nil {
			http.Error(w, "更新失败", http.StatusInternalServerError)
			return
		}
		if spec.IsDefault {
			db.DB.Model(&models.ProductUnitSpec{}).
				Where("product_id = ? AND id <> ?", spec.ProductID, spec.ID).
				Update("is_default", false)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(spec)
		return
	}
	spec = models.ProductUnitSpec{ProductID: prod.ID, Unit: body.Unit, FactorToBase: body.FactorToBase, Kind: body.Kind, IsDefault: body.IsDefault}
	// Ensure default Kind when empty
	if spec.Kind == "" {
		spec.Kind = "both"
	}
	if err := db.DB.Create(&spec).Error; err != nil {
		http.Error(w, "创建失败", http.StatusInternalServerError)
		return
	}
	if spec.IsDefault {
		db.DB.Model(&models.ProductUnitSpec{}).
			Where("product_id = ? AND id <> ?", spec.ProductID, spec.ID).
			Update("is_default", false)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(spec)
}
