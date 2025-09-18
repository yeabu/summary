package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "time"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/middleware"
    "summary/backend-rebuild/models"
    "golang.org/x/crypto/bcrypt"
)

type userCreateReq struct {
    Name           string `json:"name"`
    Role           string `json:"role"`
    BaseIDs        []uint `json:"base_ids,omitempty"`
    Password       string `json:"password"`
    JoinDate       string `json:"join_date,omitempty"`
    Mobile         string `json:"mobile,omitempty"`
    PassportNumber string `json:"passport_number,omitempty"`
    VisaExpiryDate string `json:"visa_expiry_date,omitempty"`
}

type userUpdateReq struct {
    Name           string `json:"name"`
    Role           string `json:"role"`
    BaseIDs        []uint `json:"base_ids,omitempty"`
    Password       string `json:"password,omitempty"`
    JoinDate       string `json:"join_date,omitempty"`
    Mobile         string `json:"mobile,omitempty"`
    PassportNumber string `json:"passport_number,omitempty"`
    VisaExpiryDate string `json:"visa_expiry_date,omitempty"`
}

type userResp struct {
    ID             uint          `json:"id"`
    Name           string        `json:"name"`
    Role           string        `json:"role"`
    BaseIDs        []uint        `json:"base_ids,omitempty"`
    Bases          []models.Base `json:"bases,omitempty"`
    JoinDate       string        `json:"join_date,omitempty"`
    Mobile         string        `json:"mobile,omitempty"`
    PassportNumber string        `json:"passport_number,omitempty"`
    VisaExpiryDate string        `json:"visa_expiry_date,omitempty"`
    CreatedAt      string        `json:"created_at,omitempty"`
    UpdatedAt      string        `json:"updated_at,omitempty"`
}

func formatPtr(t *time.Time) string { if t == nil { return "" }; return t.Format("2006-01-02") }

func UserCreate(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "没有权限创建用户", http.StatusForbidden); return }
    var req userCreateReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || req.Role == "" || req.Password == "" { http.Error(w, "参数错误", http.StatusBadRequest); return }
    // non-admin requires base_ids
    if req.Role != "admin" && len(req.BaseIDs) == 0 { http.Error(w, "非管理员角色必须指定至少一个基地", http.StatusBadRequest); return }
    // unique name
    var cnt int64; db.DB.Model(&models.User{}).Where("name = ?", req.Name).Count(&cnt); if cnt > 0 { http.Error(w, "用户名已存在", http.StatusConflict); return }
    hpw, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    u := models.User{Name: req.Name, Role: req.Role, Password: string(hpw), Mobile: req.Mobile, PassportNumber: req.PassportNumber}
    if req.JoinDate != "" { if t, e := time.Parse("2006-01-02", req.JoinDate); e == nil { u.JoinDate = &t } }
    if req.VisaExpiryDate != "" { if t, e := time.Parse("2006-01-02", req.VisaExpiryDate); e == nil { u.VisaExpiryDate = &t } }
    tx := db.DB.Begin(); if err := tx.Create(&u).Error; err != nil { tx.Rollback(); http.Error(w, "创建用户失败", http.StatusInternalServerError); return }
    for _, bid := range req.BaseIDs { if err := tx.Create(&models.UserBase{UserID: u.ID, BaseID: bid}).Error; err != nil { tx.Rollback(); http.Error(w, "创建用户基地关联失败", http.StatusInternalServerError); return } }
    if err := tx.Commit().Error; err != nil { http.Error(w, "提交事务失败", http.StatusInternalServerError); return }
    db.DB.Preload("Bases").First(&u, u.ID)
    resp := userResp{ ID: u.ID, Name: u.Name, Role: u.Role, Bases: u.Bases, BaseIDs: make([]uint, len(u.Bases)), Mobile: u.Mobile, PassportNumber: u.PassportNumber, JoinDate: formatPtr(u.JoinDate), VisaExpiryDate: formatPtr(u.VisaExpiryDate), CreatedAt: u.CreatedAt.Format("2006-01-02 15:04:05"), UpdatedAt: u.UpdatedAt.Format("2006-01-02 15:04:05") }
    for i, b := range u.Bases { resp.BaseIDs[i] = b.ID }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(resp)
}

func UserList(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "没有权限查看用户列表", http.StatusForbidden); return }
    var users []models.User
    q := db.DB.Preload("Bases").Order("id desc")
    if v := r.URL.Query().Get("role"); v != "" { q = q.Where("role = ?", v) }
    if v := r.URL.Query().Get("base_id"); v != "" { if id, e := strconv.ParseUint(v, 10, 64); e == nil { q = q.Joins("JOIN user_bases ON users.id = user_bases.user_id").Where("user_bases.base_id = ?", id) } }
    if v := r.URL.Query().Get("name"); v != "" { q = q.Where("name LIKE ?", "%"+v+"%") }
    if err := q.Find(&users).Error; err != nil { http.Error(w, "查询用户列表失败", http.StatusInternalServerError); return }
    out := make([]userResp, 0, len(users))
    for _, u := range users { resp := userResp{ ID: u.ID, Name: u.Name, Role: u.Role, Bases: u.Bases, BaseIDs: make([]uint, len(u.Bases)), Mobile: u.Mobile, PassportNumber: u.PassportNumber, JoinDate: formatPtr(u.JoinDate), VisaExpiryDate: formatPtr(u.VisaExpiryDate), CreatedAt: u.CreatedAt.Format("2006-01-02 15:04:05"), UpdatedAt: u.UpdatedAt.Format("2006-01-02 15:04:05") }; for i, b := range u.Bases { resp.BaseIDs[i] = b.ID }; out = append(out, resp) }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(out)
}

func UserGet(w http.ResponseWriter, r *http.Request) {
    if _, err := middleware.ParseJWT(r); err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "参数错误", http.StatusBadRequest); return }
    var u models.User
    if err := db.DB.Preload("Bases").First(&u, id).Error; err != nil { http.Error(w, "用户不存在", http.StatusNotFound); return }
    resp := userResp{ ID: u.ID, Name: u.Name, Role: u.Role, Bases: u.Bases, BaseIDs: make([]uint, len(u.Bases)), Mobile: u.Mobile, PassportNumber: u.PassportNumber, JoinDate: formatPtr(u.JoinDate), VisaExpiryDate: formatPtr(u.VisaExpiryDate), CreatedAt: u.CreatedAt.Format("2006-01-02 15:04:05"), UpdatedAt: u.UpdatedAt.Format("2006-01-02 15:04:05") }
    for i, b := range u.Bases { resp.BaseIDs[i] = b.ID }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(resp)
}

func UserUpdate(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "没有权限更新用户", http.StatusForbidden); return }
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "参数错误", http.StatusBadRequest); return }
    var req userUpdateReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || req.Role == "" { http.Error(w, "参数错误", http.StatusBadRequest); return }
    updates := map[string]interface{}{ "name": req.Name, "role": req.Role, "mobile": req.Mobile, "passport_number": req.PassportNumber }
    if req.JoinDate != "" { if t, e := time.Parse("2006-01-02", req.JoinDate); e == nil { updates["join_date"] = &t } }
    if req.VisaExpiryDate != "" { if t, e := time.Parse("2006-01-02", req.VisaExpiryDate); e == nil { updates["visa_expiry_date"] = &t } }
    if req.Password != "" { if hpw, e := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost); e == nil { updates["password"] = string(hpw) } }
    tx := db.DB.Begin(); if err := tx.Model(&models.User{}).Where("id = ?", id).Updates(updates).Error; err != nil { tx.Rollback(); http.Error(w, "更新用户失败", http.StatusInternalServerError); return }
    // update bases mapping
    if err := tx.Where("user_id = ?", id).Delete(&models.UserBase{}).Error; err != nil { tx.Rollback(); http.Error(w, "更新用户基地关联失败", http.StatusInternalServerError); return }
    for _, bid := range req.BaseIDs { if err := tx.Create(&models.UserBase{UserID: uint(id), BaseID: bid}).Error; err != nil { tx.Rollback(); http.Error(w, "更新用户基地关联失败", http.StatusInternalServerError); return } }
    if err := tx.Commit().Error; err != nil { http.Error(w, "提交事务失败", http.StatusInternalServerError); return }
    var u models.User; db.DB.Preload("Bases").First(&u, id)
    resp := userResp{ ID: u.ID, Name: u.Name, Role: u.Role, Bases: u.Bases, BaseIDs: make([]uint, len(u.Bases)), Mobile: u.Mobile, PassportNumber: u.PassportNumber, JoinDate: formatPtr(u.JoinDate), VisaExpiryDate: formatPtr(u.VisaExpiryDate), CreatedAt: u.CreatedAt.Format("2006-01-02 15:04:05"), UpdatedAt: u.UpdatedAt.Format("2006-01-02 15:04:05") }
    for i, b := range u.Bases { resp.BaseIDs[i] = b.ID }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(resp)
}

func UserDelete(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "没有权限删除用户", http.StatusForbidden); return }
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "参数错误", http.StatusBadRequest); return }
    if err := db.DB.Delete(&models.User{}, id).Error; err != nil { http.Error(w, "删除失败", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(map[string]string{"message":"ok"})
}

func UserBatchDelete(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "没有权限删除用户", http.StatusForbidden); return }
    var body struct{ IDs []uint `json:"ids"` }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil || len(body.IDs) == 0 { http.Error(w, "参数错误", http.StatusBadRequest); return }
    if err := db.DB.Where("id IN ?", body.IDs).Delete(&models.User{}).Error; err != nil { http.Error(w, "删除失败", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(map[string]int{"deleted_count": len(body.IDs)})
}

func UserResetPassword(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "没有权限重置密码", http.StatusForbidden); return }
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "参数错误", http.StatusBadRequest); return }
    var body struct{ Password string `json:"password"` }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Password == "" { http.Error(w, "参数错误", http.StatusBadRequest); return }
    hpw, _ := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
    if err := db.DB.Model(&models.User{}).Where("id = ?", id).Update("password", string(hpw)).Error; err != nil { http.Error(w, "重置失败", http.StatusInternalServerError); return }
    w.WriteHeader(http.StatusNoContent)
}

