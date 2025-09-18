package handlers

import (
    "encoding/json"
    "net/http"
    "os"
    "strings"
    "time"
    "golang.org/x/crypto/bcrypt"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
)

type SeedAdminRequest struct {
    Name      string   `json:"name"`
    Password  string   `json:"password"`
    Role      string   `json:"role"`          // default: admin
    BaseNames []string `json:"base_names"`    // optional list of base names to create/map
}

type SeedAdminResponse struct {
    UserID  uint     `json:"user_id"`
    Role    string   `json:"role"`
    Bases   []string `json:"bases"`
    Message string   `json:"message"`
}

// SeedAdmin creates or updates an admin/base_agent user and maps bases.
// Security: only allowed when DEV_SEED_ENABLED=true in env (no auth required).
func SeedAdmin(w http.ResponseWriter, r *http.Request) {
    if os.Getenv("DEV_SEED_ENABLED") != "true" {
        http.Error(w, "seed disabled", http.StatusForbidden)
        return
    }
    var req SeedAdminRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err.Error() != "EOF" {
        http.Error(w, "bad body", http.StatusBadRequest)
        return
    }
    if req.Name == "" { req.Name = "admin" }
    if req.Password == "" { req.Password = "admin123" }
    if req.Role == "" { req.Role = "admin" }

    // upsert user
    var u models.User
    if err := db.DB.Where("name = ?", req.Name).First(&u).Error; err != nil {
        // create
        hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
        u = models.User{
            Name: req.Name,
            Role: req.Role,
            Password: string(hash),
            CreatedAt: time.Now(),
            UpdatedAt: time.Now(),
        }
        if err := db.DB.Create(&u).Error; err != nil { http.Error(w, "create user failed", http.StatusInternalServerError); return }
    } else {
        // update password/role
        hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
        u.Role = req.Role
        u.Password = string(hash)
        u.UpdatedAt = time.Now()
        if err := db.DB.Save(&u).Error; err != nil { http.Error(w, "update user failed", http.StatusInternalServerError); return }
    }

    // create/map bases
    createdBases := []string{}
    for _, bn := range req.BaseNames {
        name := strings.TrimSpace(bn)
        if name == "" { continue }
        var b models.Base
        if err := db.DB.Where("name = ?", name).First(&b).Error; err != nil {
            code := genBaseCode(name)
            b = models.Base{ Name: name, Code: code, Status: "active", CreatedAt: time.Now(), UpdatedAt: time.Now() }
            if err := db.DB.Create(&b).Error; err != nil { continue }
        }
        // map user_bases if not exists
        var cnt int64
        db.DB.Model(&models.UserBase{}).Where("user_id = ? AND base_id = ?", u.ID, b.ID).Count(&cnt)
        if cnt == 0 {
            _ = db.DB.Create(&models.UserBase{ UserID: u.ID, BaseID: b.ID, CreatedAt: time.Now(), UpdatedAt: time.Now() }).Error
        }
        createdBases = append(createdBases, b.Name)
    }

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(SeedAdminResponse{ UserID: u.ID, Role: u.Role, Bases: createdBases, Message: "seed ok" })
}

func genBaseCode(name string) string {
    up := strings.ToUpper(name)
    repl := strings.Builder{}
    for _, r := range up {
        if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
            repl.WriteRune(r)
        } else if r == ' ' || r == '-' || r == '_' {
            repl.WriteRune('_')
        }
    }
    code := repl.String()
    if code == "" { code = "BASE" }
    // ensure uniqueness-ish by appending timestamp seconds if conflict
    var cnt int64
    db.DB.Model(&models.Base{}).Where("code = ?", code).Count(&cnt)
    if cnt > 0 { code = code + "_" + time.Now().Format("150405") }
    return code
}

