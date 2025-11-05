import { NextRequest, NextResponse } from 'next/server'
import { parseFile } from '@/lib/parsers'
import { prisma } from '@/lib/db'
import { classifyTransaction } from '@/lib/ai/classifier'

// Aumentar limite de body size
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export async function POST(request: NextRequest) {
  console.log('📥 Import request received')
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const cardName = (formData.get('cardName') as string) || 'Default Card'

    console.log('📄 File info:', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    })

    if (!file) {
      console.error('❌ No file provided')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Criar ou buscar card padrão
    let card = await prisma.card.findFirst({
      where: { name: cardName }
    })

    if (!card) {
      card = await prisma.card.create({
        data: {
          name: cardName,
          issuer: 'Unknown',
          currency: 'USD'
        }
      })
    }

    // Parse do arquivo
    console.log('🔍 Parsing file...')
    const rows = await parseFile(file)
    console.log(`✅ Parsed ${rows.length} rows`)

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
            cardId: card.id,
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao importar arquivo',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
