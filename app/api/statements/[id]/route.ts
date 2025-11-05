import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const statement = await prisma.statement.findUnique({
      where: {
        id
      },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            issuer: true,
            color: true,
            lastFour: true,
            currency: true
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se fatura existe antes de deletar
    const statement = await prisma.statement.findUnique({
      where: { id }
    })

    if (!statement) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fatura não encontrada'
        },
        { status: 404 }
      )
    }

    // Deletar fatura (cascade vai deletar transações e importBatch automaticamente)
    await prisma.statement.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Fatura deletada com sucesso'
    })

  } catch (error: any) {
    console.error('Erro ao deletar fatura:', error)

    // Tratar erro específico do Prisma quando registro não existe
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: 'Fatura não encontrada ou já foi deletada'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao deletar fatura'
      },
      { status: 500 }
    )
  }
}
