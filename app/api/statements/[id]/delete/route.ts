import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Deletar fatura (cascade vai deletar transações e importBatch automaticamente)
    await prisma.statement.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Fatura deletada com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar fatura:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao deletar fatura'
      },
      { status: 500 }
    )
  }
}
