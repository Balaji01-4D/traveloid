package utils

import (
	"encoding/json"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateAccessToken(userID, organisationID int64) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":             userID,
		"organisation_id": organisationID,
		"exp":             time.Now().Add(7 * 24 * time.Hour).Unix(),
	})

	return token.SignedString([]byte(os.Getenv("SECRET_KEY")))
}

func ParseToken(tokenString string) (int64, int64, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("SECRET_KEY")), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return int64(0), int64(0), err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Check expiration
		switch expVal := claims["exp"].(type) {
		case float64:
			if float64(time.Now().Unix()) > expVal {
				return int64(0), int64(0), jwt.ErrTokenExpired
			}
		case json.Number:
			expInt, err := expVal.Int64()
			if err != nil {
				return int64(0), int64(0), jwt.ErrTokenInvalidClaims
			}
			if time.Now().Unix() > expInt {
				return int64(0), int64(0), jwt.ErrTokenExpired
			}
		case string:
			expInt, err := strconv.ParseInt(expVal, 10, 64)
			if err != nil {
				return int64(0), int64(0), jwt.ErrTokenInvalidClaims
			}
			if time.Now().Unix() > expInt {
				return int64(0), int64(0), jwt.ErrTokenExpired
			}
		default:
			return int64(0), int64(0), jwt.ErrTokenInvalidClaims
		}

		// Extract organisation ID
		var organisationID int64
		if orgVal, ok := claims["organisation_id"]; ok {
			organisationID, err = parseInt64Claim(orgVal)
			if err != nil {
				return int64(0), int64(0), jwt.ErrTokenInvalidClaims
			}
		}

		// Extract user ID
		subVal, ok := claims["sub"]
		if !ok {
			return int64(0), int64(0), jwt.ErrTokenInvalidClaims
		}
		userID, err := parseInt64Claim(subVal)
		if err != nil {
			return int64(0), int64(0), jwt.ErrTokenInvalidClaims
		}

		return userID, organisationID, nil
	}

	return int64(0), int64(0), jwt.ErrTokenInvalidClaims
}

func parseInt64Claim(val interface{}) (int64, error) {
	switch v := val.(type) {
	case float64:
		return int64(v), nil
	case int64:
		return v, nil
	case int:
		return int64(v), nil
	case json.Number:
		return v.Int64()
	case string:
		return strconv.ParseInt(v, 10, 64)
	default:
		return 0, jwt.ErrTokenInvalidClaims
	}
}
