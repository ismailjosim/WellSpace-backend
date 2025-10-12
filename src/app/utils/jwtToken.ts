import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'

const generateToken = (
	payload: JwtPayload,
	secret: string,
	expiresIn: string,
) => {
	const tokenSign = jwt.sign(payload, secret, {
		algorithm: 'HS256',
		expiresIn,
	} as SignOptions)
	return tokenSign
}

const verifyToken = (token: string, secret: string) => {
	const verify = jwt.verify(token, secret)
	return verify
}

export const JWT = {
	generateToken,
	verifyToken,
}
