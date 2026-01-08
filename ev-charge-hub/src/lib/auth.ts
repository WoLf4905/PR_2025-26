import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'ev-charging-secret-key'
)

export interface UserSession {
    id: string
    email: string
    name: string
}

export async function createSession(user: UserSession): Promise<string> {
    const token = await new SignJWT({
        id: user.id,
        email: user.email,
        name: user.name
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET)

    return token
}

export async function verifySession(token: string): Promise<UserSession | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        return {
            id: payload.id as string,
            email: payload.email as string,
            name: payload.name as string,
        }
    } catch {
        return null
    }
}

export async function getSession(): Promise<UserSession | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value

    if (!token) return null

    return verifySession(token)
}

export async function getCurrentUser() {
    const session = await getSession()

    if (!session) return null

    const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            createdAt: true,
        }
    })

    return user
}

export async function requireAuth() {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    return user
}
