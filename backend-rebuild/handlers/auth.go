package handlers

import (
    "encoding/json"
    "net/http"
    "os"
    "time"
    jwt "github.com/golang-jwt/jwt/v5"
    "golang.org/x/crypto/bcrypt"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
)

type LoginRequest struct {
    Name     string `json:"name"`
    Password string `json:"password"`
}

type LoginResponse struct {
    Token string   `json:"token"`
    Role  string   `json:"role"`
    Bases []string `json:"bases"`
    UserID uint    `json:"user_id"`
}

func Login(w http.ResponseWriter, r *http.Request) {
    var req LoginRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    var user models.User
    if err := db.DB.Where("name = ?", req.Name).First(&user).Error; err != nil { http.Error(w, "invalid credentials", http.StatusUnauthorized); return }
    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil { http.Error(w, "invalid credentials", http.StatusUnauthorized); return }

    // load bases by user_bases
    var ubs []models.UserBase
    db.DB.Where("user_id = ?", user.ID).Find(&ubs)
    baseIDs := make([]uint, 0, len(ubs))
    for _, ub := range ubs { baseIDs = append(baseIDs, ub.BaseID) }
    var bases []models.Base
    if len(baseIDs) > 0 { db.DB.Where("id IN ?", baseIDs).Find(&bases) }
    baseNames := make([]string, 0, len(bases))
    for _, b := range bases { baseNames = append(baseNames, b.Name) }

    // issue JWT
    secret := os.Getenv("JWT_SECRET")
    if secret == "" { http.Error(w, "server jwt secret not configured", http.StatusInternalServerError); return }
    ttl := 24 * time.Hour * 7
    if v := os.Getenv("JWT_TTL_HOURS"); v != "" {
        if d, err := time.ParseDuration(v+"h"); err == nil { ttl = d }
    }
    claims := jwt.MapClaims{
        "uid": user.ID,
        "role": user.Role,
        "username": user.Name,
        "bases": baseNames,
        "exp": time.Now().Add(ttl).Unix(),
        "iat": time.Now().Unix(),
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    tokenStr, err := token.SignedString([]byte(secret))
    if err != nil { http.Error(w, "sign token failed", http.StatusInternalServerError); return }

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(LoginResponse{ Token: tokenStr, Role: user.Role, Bases: baseNames, UserID: user.ID })
}

