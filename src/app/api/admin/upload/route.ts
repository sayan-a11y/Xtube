import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { randomUUID } from 'crypto'

const execAsync = promisify(exec)

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('video') as File | null
    const title = formData.get('title') as string
    const description = (formData.get('description') as string) || ''
    const category = (formData.get('category') as string) || 'Uncategorized'

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const videoId = randomUUID()
    const ext = file.name.split('.').pop() || 'mp4'
    const fileName = `${videoId}.${ext}`

    // Save video file
    const videosDir = join(process.cwd(), 'public', 'storage', 'videos')
    await mkdir(videosDir, { recursive: true })
    const videoPath = join(videosDir, fileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(videoPath, buffer)

    const thumbnailsDir = join(process.cwd(), 'public', 'storage', 'thumbnails')
    await mkdir(thumbnailsDir, { recursive: true })
    const thumbnailPath = join(thumbnailsDir, `${videoId}.jpg`)
    const thumbnailUrl = `/api/storage/thumbnails/${videoId}.jpg`

    // Generate thumbnail with ffmpeg
    let duration = '0:00'
    try {
      const { stdout: durOut } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      )
      const durSec = parseFloat(durOut.trim())
      if (!isNaN(durSec)) {
        const mins = Math.floor(durSec / 60)
        const secs = Math.floor(durSec % 60)
        duration = `${mins}:${secs.toString().padStart(2, '0')}`
      }

      // Seek to 10% of duration for better thumbnail
      const seekTime = Math.max(2, durSec * 0.1)
      await execAsync(
        `ffmpeg -y -ss ${seekTime} -i "${videoPath}" -vframes 1 -q:v 2 -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2" "${thumbnailPath}"`
      )
    } catch (err) {
      console.error('Thumbnail/duration generation failed:', err)
      // Create a simple placeholder
      try {
        await execAsync(
          `ffmpeg -y -i "${videoPath}" -vframes 1 -q:v 2 -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2" "${thumbnailPath}"`
        )
      } catch (e) {
        console.error('Fallback thumbnail failed:', e)
      }
    }

    // Generate HLS stream
    const hlsDir = join(process.cwd(), 'public', 'storage', 'hls', videoId)
    let hlsUrl = ''
    try {
      await mkdir(hlsDir, { recursive: true })
      await execAsync(
        `ffmpeg -y -i "${videoPath}" -codec:v libx264 -codec:a aac -start_number 0 -hls_time 10 -hls_list_size 0 -f hls -vf "scale=-2:720" "${join(hlsDir, 'index.m3u8')}"`
      )
      hlsUrl = `/api/storage/hls/${videoId}/index.m3u8`
    } catch (err) {
      console.error('HLS conversion failed:', err)
    }

    // Save to database
    const video = await db.video.create({
      data: {
        id: videoId,
        title,
        description,
        category,
        filePath: `/api/storage/videos/${fileName}`,
        thumbnail: thumbnailUrl,
        hlsPath: hlsUrl,
        duration,
        size: buffer.length,
      },
    })

    return NextResponse.json({ success: true, video })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
