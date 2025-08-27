package middleware

import (
	"errors"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func getJwtSecret() []byte {
	return []byte(os.Getenv("JWT_SECRET"))
}

func ParseJWT(r *http.Request) (jwt.MapClaims, error) {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return nil, errors.New("token缺失")
	}
	tokenStr := strings.TrimPrefix(auth, "Bearer ")
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return getJwtSecret(), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("无效token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("无效claims")
	}
	return claims, nil
}

func AuthMiddleware(next http.HandlerFunc, allowedRoles ...string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, err := ParseJWT(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}
		role := claims["role"].(string)
		ok := false
		for _, ar := range allowedRoles {
			if ar == role {
				ok = true
				break
			}
		}
		if !ok {
			http.Error(w, "无权限", http.StatusForbidden)
			return
		}
		next(w, r)
	}
}
