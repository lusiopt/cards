import { NextRequest, NextResponse } from 'next/server'
import { parseFile } from '@/lib/parsers'
import { prisma } from '@/lib/db'
import { extractTransactionsInBatches } from '@/lib/ai/extractor'

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

    // Parse do arquivo (extrai linhas brutas)
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

    // Extrair e classificar transações com IA
    console.log('🤖 Extraindo transações com IA Claude...')
    const transactions = await extractTransactionsInBatches(rows, 50, file)
    console.log(`✅ IA extraiu ${transactions.length} transações`)

    // Salvar transações no banco
    let importedCount = 0
    let errorCount = 0
    const errors: string[] = []

    console.log(`💾 Salvando ${transactions.length} transações no banco...`)

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i]

      try {
        const date = new Date(transaction.date)

        if (isNaN(date.getTime())) {
          errorCount++
          errors.push(`Data inválida: ${transaction.date}`)
          console.log(`⚠️  Transação ${i + 1}/${transactions.length}: Data inválida`)
          continue
        }

        // Buscar categoria no banco
        const category = await prisma.category.findFirst({
          where: { slug: transaction.category || 'other' }
        })

        // Criar transação
        await prisma.transaction.create({
          data: {
            date,
            merchant: transaction.merchant,
            merchantClean: transaction.merchant,
            description: transaction.description,
            amount: transaction.amount,
            currency: transaction.currency,
            categoryId: category?.id,
            tags: transaction.category || 'other',
            aiConfidence: transaction.confidence || 0.5,
            aiExplanation: transaction.explanation || 'Classificado automaticamente',
            aiProcessed: true,
            cardId: card.id,
            importBatchId: importBatch.id,
            rawData: JSON.stringify(transaction)
          }
        })

        importedCount++

        if (i % 10 === 0) {
          console.log(`💾 Progresso: ${i + 1}/${transactions.length} transações salvas`)
        }
      } catch (error) {
        errorCount++
        errors.push(`Erro ao salvar transação ${i + 1}: ${error}`)
        console.error(`❌ Erro ao salvar transação ${i + 1}:`, error)
      }
    }

    console.log(`✅ Importação concluída: ${importedCount} salvas, ${errorCount} erros`)

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
