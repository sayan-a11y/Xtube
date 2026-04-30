import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params
    const filePath = join(process.cwd(), 'public', 'storage', 'hls', ...pathParts)
    const data = await readFile(filePath)

    const fileName = pathParts[pathParts.length - 1]
    const contentType = fileName.endsWith('.m3u8')
      ? 'application/vnd.apple.mpegurl'
      : 'video/mp2t'

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': fileName.endsWith('.m3u8') ? 'no-cache' : 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
