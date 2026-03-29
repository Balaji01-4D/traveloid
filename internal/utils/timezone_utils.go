package utils

import (
	"sync"
	"time"
)

var (
	istLocation *time.Location
	istOnce     sync.Once
)

func ISTLocation() *time.Location {
	istOnce.Do(func() {
		location, err := time.LoadLocation("Asia/Kolkata")
		if err != nil {
			// Fixed offset fallback to avoid startup failures in minimal containers.
			istLocation = time.FixedZone("IST", 5*60*60+30*60)
			return
		}
		istLocation = location
	})

	return istLocation
}

func NowIST() time.Time {
	return time.Now().In(ISTLocation())
}

func InIST(value time.Time) time.Time {
	return value.In(ISTLocation())
}
