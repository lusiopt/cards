import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const statement = await prisma.statement.findUnique({
      where: {
        id: params.id
      },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            issuer: true,
            color: true
          }
        },
        transactions: {
          include: {
            category: {
              select: {
                name: true,
                color: true,
                icon: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        }
      }
    })

    if (!statement) {
      return NextResponse.json(
        { error: 'Fatura não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(statement)
  } catch (error) {
    console.error('Error fetching statement:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar fatura' },
      { status: 500 }
    )
  }
}
