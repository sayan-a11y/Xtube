import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params
    const filePath = join(process.cwd(), 'public', 'storage', 'thumbnails', ...pathParts)
    const data = await readFile(filePath)

    return new NextResponse(data, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
