import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params
    const filePath = join(process.cwd(), 'public', 'storage', 'videos', ...pathParts)

    const fileStat = await stat(filePath)
    const data = await readFile(filePath)

    const range = request.headers.get('range')
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileStat.size - 1
      const chunkSize = end - start + 1
      const chunk = data.subarray(start, end + 1)

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    }

    return new NextResponse(data, {
      headers: {
        'Content-Length': fileStat.size.toString(),
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
