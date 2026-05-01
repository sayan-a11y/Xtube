import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'newest'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let where: any = {}

    if (category && category !== 'All') {
      where.category = category
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' }
    }

    let orderBy: any = { createdAt: 'desc' }
    if (sort === 'oldest') orderBy = { createdAt: 'asc' }
    if (sort === 'most_viewed') orderBy = { views: 'desc' }
    if (sort === 'most_liked') orderBy = { likes: 'desc' }
    if (sort === 'title') orderBy = { title: 'asc' }

    const videos = await db.video.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
    })

    const total = await db.video.count({ where })

    return NextResponse.json({ videos, total })
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
  }
}
