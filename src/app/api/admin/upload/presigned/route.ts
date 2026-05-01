import { getPresignedUrl } from '@/lib/r2'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { fileName, contentType } = await request.json()

    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 })
    }

    const videoId = randomUUID()
    const ext = fileName.split('.').pop() || 'mp4'
    const key = `videos/${videoId}.${ext}`

    const { uploadUrl, publicUrl } = await getPresignedUrl(key, contentType || 'video/mp4')

    return NextResponse.json({ 
      uploadUrl, 
      publicUrl, 
      videoId,
      key 
    })
  } catch (error) {
    console.error('Presigned URL error:', error)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}
