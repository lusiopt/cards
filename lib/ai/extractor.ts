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
 * Extrai e estrutura transações de linhas CSV/XLSX brutas usando IA
 * A IA identifica automaticamente as colunas e formatos
 */
export async function extractTransactionsFromRows(
  rows: any[],
  file?: File
): Promise<ExtractedTransaction[]> {

  // Se for PDF, processar de forma diferente
  if (rows.length > 0 && rows[0]._isPDF && file) {
    return extractTransactionsFromPDF(file)
  }

  // Pegar primeiras linhas como amostra (max 100 transações por vez)
  const sample = rows.slice(0, 100)

  const prompt = `Você é um especialista em processar extratos de cartão de crédito.

Receba o seguinte conjunto de linhas CSV/XLSX e extraia as transações individuais.

**DADOS:**
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

    // Verificar se retornou HTML
    if (jsonText.startsWith('<') || jsonText.includes('<html')) {
      console.error('❌ IA retornou HTML ao invés de JSON')
      console.error('Resposta:', jsonText.substring(0, 500))
      throw new Error('Erro ao processar arquivo - resposta inválida da IA')
    }

    // Parsear JSON
    let result
    try {
      result = JSON.parse(jsonText.trim())
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON')
      console.error('Resposta:', jsonText.substring(0, 500))
      throw new Error('Resposta da IA não é um JSON válido')
    }

    if (!result.transactions || !Array.isArray(result.transactions)) {
      console.error('❌ Resposta não contém transactions')
      console.error('Estrutura:', Object.keys(result))
      throw new Error('Resposta não contém lista de transações')
    }

    return result.transactions

  } catch (error) {
    console.error('Erro ao extrair transações com IA:', error)

    if (error instanceof Error) {
      throw error
    }

    throw new Error('Não foi possível extrair transações do arquivo')
  }
}

/**
 * Extrai transações diretamente de um PDF
 */
async function extractTransactionsFromPDF(file: File): Promise<ExtractedTransaction[]> {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  const prompt = `Você é um especialista em processar extratos de cartão de crédito em PDF.

Analise o PDF e extraia TODAS as transações/compras listadas.

**INSTRUÇÕES:**
1. Procure por tabelas de transações, compras, débitos ou lançamentos
2. Ignore linhas de totais, resumos, cabeçalhos e pagamentos/créditos
3. Extraia APENAS transações individuais de compras/débitos

Para CADA transação válida, retorne:
- date: formato YYYY-MM-DD
- merchant: nome do estabelecimento
- description: descrição completa
- amount: valor numérico positivo
- currency: código da moeda (USD, EUR, BRL, etc)
- category: categoria (food, transport, shopping, bills, entertainment, subscriptions, travel, health, education, financial, other)
- confidence: confiança na classificação (0-1)
- explanation: explicação da classificação

**RETORNE um JSON:**
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
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }]
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Resposta inválida da API')
    }

    let jsonText = content.text.trim()

    // Remover markdown code blocks
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    // Verificar se retornou HTML ao invés de JSON
    if (jsonText.startsWith('<') || jsonText.includes('<html')) {
      console.error('❌ IA retornou HTML ao invés de JSON')
      console.error('Resposta:', jsonText.substring(0, 500))
      throw new Error('O PDF pode estar em um formato não suportado ou muito complexo')
    }

    // Tentar parsear JSON
    let result
    try {
      result = JSON.parse(jsonText.trim())
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON da resposta da IA')
      console.error('Resposta recebida:', jsonText.substring(0, 500))
      throw new Error('Resposta da IA não está em formato JSON válido')
    }

    if (!result.transactions || !Array.isArray(result.transactions)) {
      console.error('❌ Resposta não contém array de transactions')
      console.error('Estrutura recebida:', Object.keys(result))
      throw new Error('Resposta da IA não contém transações válidas')
    }

    return result.transactions

  } catch (error) {
    console.error('Erro ao extrair transações de PDF:', error)

    if (error instanceof Error) {
      throw error
    }

    throw new Error('Não foi possível processar o PDF')
  }
}

/**
 * Processa grandes volumes de linhas em lotes
 */
export async function extractTransactionsInBatches(
  rows: any[],
  batchSize: number = 100,
  file?: File
): Promise<ExtractedTransaction[]> {
  // Se for PDF, processar de uma vez
  if (rows.length > 0 && rows[0]._isPDF && file) {
    console.log('📄 Processando PDF com IA Claude...')
    return extractTransactionsFromPDF(file)
  }

  // CSV/XLSX: processar em lotes
  const results: ExtractedTransaction[] = []

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    console.log(`🔄 Processando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(rows.length / batchSize)}`)

    try {
      const extracted = await extractTransactionsFromRows(batch, file)
      results.push(...extracted)
      console.log(`✅ Lote processado: ${extracted.length} transações extraídas`)
    } catch (error) {
      console.error(`❌ Erro no lote ${i}-${i + batchSize}:`, error)
    }
  }

  return results
}
