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
    const extracted = await extractTransactionsInBatches(rows, 50, file)
    const transactions = extracted.transactions
    const statementMetadata = extracted.statement
    console.log(`✅ IA extraiu ${transactions.length} transações`)
    console.log(`📊 Metadata da fatura:`, statementMetadata)

    // Usar dados extraídos pela IA ou calcular fallback
    const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()))

    const periodStart = statementMetadata.periodStart
      ? new Date(statementMetadata.periodStart)
      : (dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date())

    const periodEnd = statementMetadata.periodEnd
      ? new Date(statementMetadata.periodEnd)
      : (dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date())

    const statementDate = statementMetadata.statementDate
      ? new Date(statementMetadata.statementDate)
      : periodEnd

    const dueDate = statementMetadata.dueDate
      ? new Date(statementMetadata.dueDate)
      : (() => {
          const fallbackDue = new Date(statementDate)
          fallbackDue.setDate(fallbackDue.getDate() + 15)
          return fallbackDue
        })()

    // Atualizar card com informações extraídas (se disponíveis)
    if (statementMetadata.cardNumber || statementMetadata.cardHolder) {
      await prisma.card.update({
        where: { id: card.id },
        data: {
          ...(statementMetadata.cardNumber && { lastFour: statementMetadata.cardNumber }),
          ...(statementMetadata.cardHolder && { name: statementMetadata.cardHolder })
        }
      })
      console.log(`💳 Card atualizado com dados da fatura`)
    }

    // Verificar se já existe uma fatura para este cartão nesta data
    const existingStatement = await prisma.statement.findUnique({
      where: {
        cardId_statementDate: {
          cardId: card.id,
          statementDate: statementDate
        }
      }
    })

    if (existingStatement) {
      console.log(`⚠️  Fatura duplicada detectada! Já existe uma fatura para ${statementDate.toLocaleDateString()}`)

      // Atualizar batch como erro
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: 'error',
          errors: JSON.stringify(['Fatura duplicada: já existe uma fatura para esta data']),
          completedAt: new Date()
        }
      })

      return NextResponse.json({
        success: false,
        error: 'Fatura duplicada',
        message: `Já existe uma fatura para o cartão "${card.name}" na data ${statementDate.toLocaleDateString()}. Delete a fatura existente antes de importar novamente.`
      }, { status: 400 })
    }

    // Criar Statement (fatura) para este import
    const statement = await prisma.statement.create({
      data: {
        cardId: card.id,
        statementDate,
        dueDate,
        periodStart,
        periodEnd,
        importBatchId: importBatch.id,
        status: 'open'
      }
    })

    console.log(`📋 Fatura criada: ${periodStart.toLocaleDateString()} a ${periodEnd.toLocaleDateString()}`)

    // Salvar transações no banco
    let importedCount = 0
    let errorCount = 0
    const errors: string[] = []
    let totalAmount = 0

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

        // Criar transação vinculada à fatura
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
            statementId: statement.id,
            importBatchId: importBatch.id,
            rawData: JSON.stringify(transaction)
          }
        })

        importedCount++
        totalAmount += transaction.amount

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

    // Calcular breakdown por categoria
    const categoryBreakdown: Record<string, { count: number; total: number }> = {}

    for (const transaction of transactions) {
      const cat = transaction.category || 'other'
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { count: 0, total: 0 }
      }
      categoryBreakdown[cat].count++
      categoryBreakdown[cat].total += transaction.amount
    }

    // Atualizar Statement com totais
    await prisma.statement.update({
      where: { id: statement.id },
      data: {
        totalAmount,
        balance: totalAmount,
        transactionCount: importedCount,
        categoryBreakdown: JSON.stringify(categoryBreakdown)
      }
    })

    console.log(`📊 Fatura atualizada: Total $${totalAmount.toFixed(2)}, ${importedCount} transações`)

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
      statementId: statement.id,
      imported: importedCount,
      errors: errorCount,
      total: rows.length,
      statement: {
        period: `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
        totalAmount,
        transactionCount: importedCount,
        categoryBreakdown
      }
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
