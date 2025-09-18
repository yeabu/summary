package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "time"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/middleware"
    "summary/backend-rebuild/models"
)

type baseSectionReq struct {
    Name        string `json:"name"`
    BaseID      uint   `json:"base_id"`
    LeaderID    *uint  `json:"leader_id"`
    Description string `json:"description"`
}

type baseSectionResp struct {
    ID          uint   `json:"id"`
    Name        string `json:"name"`
    BaseID      uint   `json:"base_id"`
    BaseName    string `json:"base_name"`
    LeaderID    *uint  `json:"leader_id"`
    LeaderName  string `json:"leader_name"`
    Description string `json:"description"`
    CreatedBy   uint   `json:"created_by"`
    CreatedAt   string `json:"created_at"`
    UpdatedAt   string `json:"updated_at"`
}

func BaseSectionCreate(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "没有权限创建基地分区", http.StatusForbidden); return }
    var req baseSectionReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || req.BaseID == 0 {
        http.Error(w, "参数错误", http.StatusBadRequest); return
    }
    // ensure base exists
    var base models.Base
    if err := db.DB.First(&base, req.BaseID).Error; err != nil { http.Error(w, "指定的基地不存在", http.StatusNotFound); return }
    // optional leader check
    if req.LeaderID != nil {
        var u models.User; if err := db.DB.First(&u, *req.LeaderID).Error; err != nil { http.Error(w, "指定的队长用户不存在", http.StatusNotFound); return }
    }
    bs := models.BaseSection{ Name: req.Name, BaseID: req.BaseID, LeaderID: req.LeaderID, Description: req.Description, CreatedBy: uint(claims["uid"].(float64)), CreatedAt: time.Now(), UpdatedAt: time.Now() }
    if err := db.DB.Create(&bs).Error; err != nil { http.Error(w, "创建基地分区失败", http.StatusInternalServerError); return }
    resp := baseSectionResp{ ID: bs.ID, Name: bs.Name, BaseID: bs.BaseID, BaseName: base.Name, LeaderID: bs.LeaderID, Description: bs.Description, CreatedBy: bs.CreatedBy, CreatedAt: bs.CreatedAt.Format("2006-01-02 15:04:05"), UpdatedAt: bs.UpdatedAt.Format("2006-01-02 15:04:05") }
    if bs.LeaderID != nil { var u models.User; if err := db.DB.First(&u, *bs.LeaderID).Error; err == nil { resp.LeaderName = u.Name } }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(resp)
}

func BaseSectionList(w http.ResponseWriter, r *http.Request) {
    if _, err := middleware.ParseJWT(r); err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    q := db.DB.Preload("Base").Preload("Leader").Order("id desc")
    if v := r.URL.Query().Get("base_id"); v != "" {
        if id, err := strconv.ParseUint(v, 10, 64); err == nil { q = q.Where("base_id = ?", id) }
    }
    var rows []models.BaseSection
    if err := q.Find(&rows).Error; err != nil { http.Error(w, "查询基地分区列表失败", http.StatusInternalServerError); return }
    out := make([]baseSectionResp, 0, len(rows))
    for _, s := range rows {
        resp := baseSectionResp{ ID: s.ID, Name: s.Name, BaseID: s.BaseID, BaseName: s.Base.Name, Description: s.Description, CreatedBy: s.CreatedBy, CreatedAt: s.CreatedAt.Format("2006-01-02 15:04:05"), UpdatedAt: s.UpdatedAt.Format("2006-01-02 15:04:05") }
        if s.Leader != nil { resp.LeaderID = s.LeaderID; resp.LeaderName = s.Leader.Name }
        out = append(out, resp)
    }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(out)
}

func BaseSectionGet(w http.ResponseWriter, r *http.Request) {
    if _, err := middleware.ParseJWT(r); err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "参数错误", http.StatusBadRequest); return }
    var s models.BaseSection
    if err := db.DB.Preload("Base").Preload("Leader").First(&s, id).Error; err != nil { http.Error(w, "基地分区不存在", http.StatusNotFound); return }
    resp := baseSectionResp{ ID: s.ID, Name: s.Name, BaseID: s.BaseID, BaseName: s.Base.Name, Description: s.Description, CreatedBy: s.CreatedBy, CreatedAt: s.CreatedAt.Format("2006-01-02 15:04:05"), UpdatedAt: s.UpdatedAt.Format("2006-01-02 15:04:05") }
    if s.Leader != nil { resp.LeaderID = s.LeaderID; resp.LeaderName = s.Leader.Name }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(resp)
}

func BaseSectionUpdate(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "没有权限更新基地分区", http.StatusForbidden); return }
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "参数错误", http.StatusBadRequest); return }
    var req baseSectionReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || req.BaseID == 0 { http.Error(w, "参数错误", http.StatusBadRequest); return }
    // checks
    var base models.Base; if err := db.DB.First(&base, req.BaseID).Error; err != nil { http.Error(w, "指定的基地不存在", http.StatusNotFound); return }
    if req.LeaderID != nil { var u models.User; if err := db.DB.First(&u, *req.LeaderID).Error; err != nil { http.Error(w, "指定的队长用户不存在", http.StatusNotFound); return } }
    if err := db.DB.Model(&models.BaseSection{}).Where("id = ?", id).Updates(map[string]interface{}{
        "name": req.Name, "base_id": req.BaseID, "leader_id": req.LeaderID, "description": req.Description,
    }).Error; err != nil { http.Error(w, "更新基地分区失败", http.StatusInternalServerError); return }
    var s models.BaseSection; _ = db.DB.Preload("Base").Preload("Leader").First(&s, id).Error
    resp := baseSectionResp{ ID: s.ID, Name: s.Name, BaseID: s.BaseID, BaseName: s.Base.Name, Description: s.Description, CreatedBy: s.CreatedBy, CreatedAt: s.CreatedAt.Format("2006-01-02 15:04:05"), UpdatedAt: s.UpdatedAt.Format("2006-01-02 15:04:05") }
    if s.Leader != nil { resp.LeaderID = s.LeaderID; resp.LeaderName = s.Leader.Name }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(resp)
}

func BaseSectionDelete(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "没有权限删除基地分区", http.StatusForbidden); return }
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "参数错误", http.StatusBadRequest); return }
    if err := db.DB.Delete(&models.BaseSection{}, id).Error; err != nil { http.Error(w, "删除基地分区失败", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(map[string]string{"message":"ok"})
}

