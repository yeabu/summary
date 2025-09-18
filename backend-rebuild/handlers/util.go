package handlers

import (
    "summary/backend-rebuild/models"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/middleware"
    "gorm.io/gorm"
)

// baseIDsFromClaims resolves base names from claims to base IDs
func baseIDsFromClaims(claims middleware.Claims) []uint {
    // Accept either "base": string or "bases": []string
    var names []string
    if v, ok := claims["base"].(string); ok && v != "" {
        names = append(names, v)
    }
    if vs, ok := claims["bases"].([]interface{}); ok {
        for _, x := range vs {
            if s, ok := x.(string); ok && s != "" { names = append(names, s) }
        }
    }
    if len(names) == 0 { return nil }
    var ids []uint
    var rows []models.Base
    db.DB.Where("name IN ?", names).Find(&rows)
    for _, b := range rows { ids = append(ids, b.ID) }
    return ids
}

// ScopeByRole applies base scoping for base_agent
func ScopeByRole(q *gorm.DB, claims middleware.Claims) *gorm.DB {
    role, _ := claims["role"].(string)
    if role != "base_agent" { return q }
    ids := baseIDsFromClaims(claims)
    if len(ids) == 0 { return q }
    return q.Where("base_id IN ?", ids)
}

