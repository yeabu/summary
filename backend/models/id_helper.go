package models

import (
	"backend/idgen"
)

func assignSnowflakeID(id *uint) error {
	if id == nil {
		return nil
	}
	if *id != 0 {
		return nil
	}
	val, err := idgen.NextIDUint()
	if err != nil {
		return err
	}
	*id = val
	return nil
}
