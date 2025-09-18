package middleware

import (
    "context"
    "encoding/base64"
    "encoding/json"
    "net/http"
    "os"
    "strings"
    jwt "github.com/golang-jwt/jwt/v5"
)

type ctxKey string

const ClaimsKey ctxKey = "claims"

// Claims represents minimal JWT-like claims used by the app
type Claims map[string]interface{}

// AuthMiddleware gates routes by roles. When AUTH_BYPASS=true, injects admin claims.
func AuthMiddleware(next http.HandlerFunc, roles ...string) http.HandlerFunc {
    bypass := os.Getenv("AUTH_BYPASS")
    return func(w http.ResponseWriter, r *http.Request) {
        if bypass == "true" || bypass == "1" {
            claims := Claims{"role": "admin", "uid": float64(1)}
            ctx := context.WithValue(r.Context(), ClaimsKey, claims)
            next.ServeHTTP(w, r.WithContext(ctx))
            return
        }

        auth := r.Header.Get("Authorization")
        if !strings.HasPrefix(auth, "Bearer ") {
            http.Error(w, "missing bearer token", http.StatusUnauthorized)
            return
        }
        tokenStr := strings.TrimPrefix(auth, "Bearer ")
        secret := os.Getenv("JWT_SECRET")
        if secret == "" {
            http.Error(w, "server jwt secret not configured", http.StatusInternalServerError)
            return
        }
        token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
            return []byte(secret), nil
        })
        if err != nil || !token.Valid {
            http.Error(w, "invalid token", http.StatusUnauthorized)
            return
        }
        c := Claims{}
        if mc, ok := token.Claims.(jwt.MapClaims); ok {
            for k, v := range mc { c[k] = v }
        } else {
            http.Error(w, "invalid claims", http.StatusUnauthorized)
            return
        }
        // role check (best-effort)
        if len(roles) > 0 {
            if v, ok := c["role"].(string); ok && v != "" {
                allowed := false
                for _, r := range roles { if r == v { allowed = true; break } }
                if !allowed {
                    http.Error(w, "forbidden", http.StatusForbidden)
                    return
                }
            }
        }
        ctx := context.WithValue(r.Context(), ClaimsKey, c)
        next.ServeHTTP(w, r.WithContext(ctx))
    }
}

// ParseJWT retrieves claims from context
func ParseJWT(r *http.Request) (Claims, error) {
    if v := r.Context().Value(ClaimsKey); v != nil {
        if c, ok := v.(Claims); ok { return c, nil }
    }
    return Claims{}, nil
}

// parseUnverifiedJWT decodes claims part without signature verification (dev-friendly)
func parseUnverifiedJWT(token string) (Claims, error) {
    parts := strings.Split(token, ".")
    if len(parts) < 2 { return Claims{}, http.ErrNoCookie }
    // decode claims (second part)
    b, err := base64.RawURLEncoding.DecodeString(parts[1])
    if err != nil { return Claims{}, err }
    var m map[string]interface{}
    if err := json.Unmarshal(b, &m); err != nil { return Claims{}, err }
    return m, nil
}
