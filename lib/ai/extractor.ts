import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface ExtractedTransaction {
  date: string
  merchant: string
  description: string
  amount: number
  currency: string
  category?: string
  confidence?: number
  explanation?: string
}

/**
 * Extrai e estrutura transações de linhas CSV brutas usando IA
 * A IA identifica automaticamente as colunas e formatos
 */
export async function extractTransactionsFromRows(
  rows: any[]
): Promise<ExtractedTransaction[]> {

  // Pegar primeiras linhas como amostra (max 100 transações por vez)
  const sample = rows.slice(0, 100)

  const prompt = `Você é um especialista em processar extratos de cartão de crédito.

Receba o seguinte conjunto de linhas CSV e extraia as transações individuais.

**DADOS CSV:**
${JSON.stringify(sample, null, 2)}

**INSTRUÇÕES:**
1. Identifique automaticamente quais colunas representam:
   - Data da transação
   - Nome do merchant/estabelecimento
   - Descrição da compra
   - Valor (sempre positivo, sem símbolo)
   - Moeda (USD, EUR, BRL, etc)

2. Para CADA linha válida, extraia e retorne:
   - date: formato YYYY-MM-DD
   - merchant: nome do estabelecimento
   - description: descrição completa
   - amount: valor numérico positivo
   - currency: código da moeda (USD, EUR, BRL, etc)
   - category: categoria da transação (food, transport, shopping, bills, entertainment, subscriptions, travel, health, education, financial, other)
   - confidence: confiança na classificação (0-1)
   - explanation: explicação da classificação

3. IGNORE:
   - Linhas de cabeçalho
   - Linhas de totais/resumos
   - Linhas vazias ou inválidas
   - Pagamentos/créditos (apenas débitos/compras)

4. RETORNE um array JSON com TODAS as transações extraídas:

{
  "transactions": [
    {
      "date": "2025-10-24",
      "merchant": "STARBUCKS",
      "description": "STARBUCKS #12345 NEW YORK NY",
      "amount": 5.75,
      "currency": "USD",
      "category": "food",
      "confidence": 0.95,
      "explanation": "Compra em cafeteria"
    }
  ]
}

RETORNE APENAS O JSON, SEM TEXTO ADICIONAL.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    // Extrair resposta
    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Resposta inválida da API')
    }

    // Limpar markdown se houver
    let jsonText = content.text.trim()

    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    const result = JSON.parse(jsonText.trim())

    return result.transactions || []

  } catch (error) {
    console.error('Erro ao extrair transações com IA:', error)
    throw new Error('Não foi possível extrair transações do arquivo')
  }
}

/**
 * Processa grandes volumes de linhas em lotes
 */
export async function extractTransactionsInBatches(
  rows: any[],
  batchSize: number = 100
): Promise<ExtractedTransaction[]> {
  const results: ExtractedTransaction[] = []

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    console.log(`🔄 Processando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(rows.length / batchSize)}`)

    try {
      const extracted = await extractTransactionsFromRows(batch)
      results.push(...extracted)
      console.log(`✅ Lote processado: ${extracted.length} transações extraídas`)
    } catch (error) {
      console.error(`❌ Erro no lote ${i}-${i + batchSize}:`, error)
    }
  }

  return results
}
