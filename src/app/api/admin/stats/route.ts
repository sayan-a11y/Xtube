import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [
      totalVideos,
      totalCategories,
      viewsResult,
      likesResult,
      sizeResult,
      recentVideos,
      categoryStats
    ] = await Promise.all([
      db.video.count(),
      db.category.count(),
      db.video.aggregate({ _sum: { views: true } }),
      db.video.aggregate({ _sum: { likes: true } }),
      db.video.aggregate({ _sum: { size: true } }),
      db.video.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      db.video.groupBy({ by: ['category'], _count: { category: true } }),
    ])

    const totalViews = viewsResult._sum.views || 0
    const totalLikes = likesResult._sum.likes || 0
    const storageUsed = sizeResult._sum.size || 0

    return NextResponse.json({
      totalVideos,
      totalCategories,
      totalViews,
      totalLikes,
      storageUsed,
      recentVideos,
      categoryStats: categoryStats.map(c => ({
        category: c.category,
        count: c._count.category,
      })),
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
