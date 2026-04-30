import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const totalVideos = await db.video.count()
    const totalCategories = await db.category.count()
    
    const viewsResult = await db.video.aggregate({
      _sum: { views: true },
    })
    const totalViews = viewsResult._sum.views || 0

    const likesResult = await db.video.aggregate({
      _sum: { likes: true },
    })
    const totalLikes = likesResult._sum.likes || 0

    // Calculate storage usage
    let storageUsed = 0
    try {
      const videosDir = join(process.cwd(), 'public', 'storage', 'videos')
      const files = readdirSync(videosDir)
      for (const file of files) {
        try {
          const stats = statSync(join(videosDir, file))
          storageUsed += stats.size
        } catch {}
      }
    } catch {}

    const recentVideos = await db.video.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const categoryStats = await db.video.groupBy({
      by: ['category'],
      _count: { category: true },
    })

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
