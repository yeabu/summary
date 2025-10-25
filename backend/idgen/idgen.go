package idgen

import (
    "errors"
    "os"
    "strconv"
    "sync"
    "time"
)

const (
    timeBits  = 42
    nodeBits  = 5
    stepBits  = 5

    nodeMax   = -1 ^ (-1 << nodeBits)
    stepMask  = -1 ^ (-1 << stepBits)

    epochMilli = int64(1704067200000) // 2024-01-01 00:00:00 UTC in ms
)

type generator struct {
    mu            sync.Mutex
    lastTimestamp int64
    sequence      int64
    node          int64
}

var defaultGen *generator

// Init configures the global generator with the provided node ID.
func Init(nodeID int64) error {
    if nodeID < 0 || nodeID > nodeMax {
        return errors.New("snowflake node id out of range")
    }
    defaultGen = &generator{node: nodeID}
    return nil
}

// MustInitFromEnv initialises the generator using SNOWFLAKE_NODE_ID (defaults to 0).
func MustInitFromEnv() {
    nodeID := int64(0)
    if v := os.Getenv("SNOWFLAKE_NODE_ID"); v != "" {
        if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
            nodeID = parsed
        }
    }
    if err := Init(nodeID); err != nil {
        panic(err)
    }
}

// NextID returns the next snowflake ID as uint64.
func NextID() (uint64, error) {
    if defaultGen == nil {
        return 0, errors.New("id generator not initialised")
    }
    return defaultGen.next()
}

// NextIDUint returns the next ID as uint (useful when structs still use uint fields).
func NextIDUint() (uint, error) {
    id, err := NextID()
    if err != nil {
        return 0, err
    }
    return uint(id), nil
}

func (g *generator) next() (uint64, error) {
    g.mu.Lock()
    defer g.mu.Unlock()

    now := currentMilli()
    if now < g.lastTimestamp {
        // clock moved backwards, wait until we catch up
        diff := g.lastTimestamp - now
        time.Sleep(time.Duration(diff) * time.Millisecond)
        now = currentMilli()
        if now < g.lastTimestamp {
            return 0, errors.New("system clock moved backwards")
        }
    }

    if now == g.lastTimestamp {
        g.sequence = (g.sequence + 1) & stepMask
        if g.sequence == 0 {
            for now <= g.lastTimestamp {
                time.Sleep(time.Millisecond)
                now = currentMilli()
            }
        }
    } else {
        g.sequence = 0
    }

    g.lastTimestamp = now

    elapsed := now - epochMilli
    if elapsed < 0 {
        elapsed = 0
    }

    id := (elapsed << (nodeBits + stepBits)) | (g.node << stepBits) | g.sequence
    return uint64(id), nil
}

func currentMilli() int64 {
    return time.Now().UnixMilli()
}
