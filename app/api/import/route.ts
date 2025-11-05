import { NextRequest, NextResponse } from 'next/server'
import { parseFile } from '@/lib/parsers'
import { prisma } from '@/lib/db'
import { classifyTransaction } from '@/lib/ai/classifier'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const cardName = formData.get('cardName') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Parse do arquivo
    const rows = await parseFile(file)

    // Criar batch de importação
    const importBatch = await prisma.importBatch.create({
      data: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        rowCount: rows.length,
        status: 'processing'
      }
    })

    // Processar cada linha
    let importedCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const row of rows) {
      try {
        // Extrair dados da linha
        const date = new Date(row.date || row.Date || row.DATA || '')
        const merchant = row.merchant || row.Merchant || row.Description || row.DESCRICAO || ''
        const description = row.description || row.Description || merchant
        const amount = parseFloat(String(row.amount || row.Amount || row.VALOR || '0').replace(/[^0-9.-]/g, ''))
        const currency = row.currency || row.Currency || row.MOEDA || 'USD'

        if (!merchant || isNaN(amount)) {
          errorCount++
          errors.push(`Linha inválida: ${JSON.stringify(row)}`)
          continue
        }

        // Classificar com IA
        const classification = await classifyTransaction(
          merchant,
          description,
          amount,
          currency,
          date
        )

        // Buscar categoria no banco
        const category = await prisma.category.findFirst({
          where: { slug: classification.category }
        })

        // Criar transação
        await prisma.transaction.create({
          data: {
            date,
            merchant,
            merchantClean: classification.merchantClean || merchant,
            description,
            amount,
            currency,
            categoryId: category?.id,
            tags: classification.tags.join(','),
            aiConfidence: classification.confidence,
            aiExplanation: classification.explanation,
            aiProcessed: true,
            cardId: cardName, // Temporário - criar card depois
            importBatchId: importBatch.id,
            rawData: JSON.stringify(row)
          }
        })

        importedCount++
      } catch (error) {
        errorCount++
        errors.push(`Erro ao processar linha: ${error}`)
      }
    }

    // Atualizar batch
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: errorCount === rows.length ? 'error' : 'completed',
        importedCount,
        errorCount,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
        completedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      importBatchId: importBatch.id,
      imported: importedCount,
      errors: errorCount,
      total: rows.length
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import file', details: String(error) },
      { status: 500 }
    )
  }
}
