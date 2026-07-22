import { NextResponse, NextRequest } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    let refreshToken = req.cookies.get("refreshToken")?.value

    try {
        const text = await req.text()
        if (text) {
            const body = JSON.parse(text)
            refreshToken = body.refreshToken || refreshToken
        }
    } catch {
        // Ignore JSON parse error, fallback to cookie
    }

    if (!refreshToken) {
        return NextResponse.json({ message: "OK" })
    }

    const tokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex")

    await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() }
    })

    const response = NextResponse.json({ message: "Logged out" })

    response.cookies.delete("accessToken")
    response.cookies.delete("refreshToken")

    return response
}
