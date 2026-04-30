import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Get old category name
    const oldCat = await db.category.findUnique({ where: { id } })
    if (!oldCat) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Update category
    const category = await db.category.update({
      where: { id },
      data: { name },
    })

    // Update all videos with this category
    await db.video.updateMany({
      where: { category: oldCat.name },
      data: { category: name },
    })

    return NextResponse.json({ success: true, category })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await db.category.findUnique({ where: { id } })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Move videos to Uncategorized
    await db.video.updateMany({
      where: { category: category.name },
      data: { category: 'Uncategorized' },
    })

    // Delete category
    await db.category.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
