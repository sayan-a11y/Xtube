import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = 'xtube2024'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true, token: 'xtube-admin-token-2024' })
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 })
  }
}
