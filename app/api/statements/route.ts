import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cardId = searchParams.get('cardId')
    const status = searchParams.get('status')

    const where: any = {}

    if (cardId) {
      where.cardId = cardId
    }

    if (status) {
      where.status = status
    }

    const statements = await prisma.statement.findMany({
      where,
      include: {
        card: {
          select: {
            id: true,
            name: true,
            issuer: true,
            color: true
          }
        }
      },
      orderBy: {
        statementDate: 'desc'
      }
    })

    return NextResponse.json({
      statements,
      total: statements.length
    })
  } catch (error) {
    console.error('Error fetching statements:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar faturas' },
      { status: 500 }
    )
  }
}
