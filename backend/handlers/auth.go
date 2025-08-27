package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"backend/db"
	"backend/models"
	"backend/middleware"
)

type LoginReq struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}
type LoginResp struct {
	Token  string `json:"token"`
	Role   string `json:"role"`
	Base   string `json:"base"`
	UserID uint   `json:"user_id"`
}
func GenerateToken(uid uint, role, base string) (string, error) {
	claims := jwt.MapClaims{
		"uid":  uid,
		"role": role,
		"base": base,
		"exp":  time.Now().Add(time.Hour * 72).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}
func Login(w http.ResponseWriter, r *http.Request) {
	var req LoginReq
	json.NewDecoder(r.Body).Decode(&req)
	var user models.User
	if db.DB.Where("name = ?", req.Name).First(&user).Error != nil {
		http.Error(w, "账号不存在", http.StatusUnauthorized)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)) != nil {
		http.Error(w, "密码错误", http.StatusUnauthorized)
		return
	}
	token, _ := GenerateToken(user.ID, user.Role, user.Base)
	json.NewEncoder(w).Encode(LoginResp{
		Token:  token,
		Role:   user.Role,
		Base:   user.Base,
		UserID: user.ID,
	})
}

type ChangePwdReq struct {
	OldPassword string `json:"old_pwd"`
	NewPassword string `json:"new_pwd"`
}
func ChangePassword(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}
	uid := uint(claims["uid"].(float64))
	role := claims["role"].(string)
	var req ChangePwdReq
	json.NewDecoder(r.Body).Decode(&req)
	var user models.User
	if db.DB.First(&user, uid).Error != nil {
		http.Error(w, "用户不存在", http.StatusNotFound)
		return
	}
	if role != "admin" {
		if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)) != nil {
			http.Error(w, "原密码错误", http.StatusForbidden)
			return
		}
	}
	newHash, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	db.DB.Model(&user).Update("password", string(newHash))
	w.Write([]byte("密码修改成功"))
}