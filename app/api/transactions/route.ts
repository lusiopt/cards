import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')

    const where: any = {}

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (search) {
      where.OR = [
        { merchant: { contains: search, mode: 'insensitive' } },
        { merchantClean: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true
        },
        orderBy: {
          date: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.transaction.count({ where })
    ])

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, categoryId, tags } = body

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        categoryId,
        tags: tags ? tags.join(',') : undefined
      },
      include: {
        category: true
      }
    })

    return NextResponse.json({ transaction: updated })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}
