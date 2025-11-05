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

export interface StatementMetadata {
  statementDate?: string // data de fechamento
  dueDate?: string // data de vencimento
  periodStart?: string // início do período
  periodEnd?: string // fim do período
  totalAmount?: number // valor total da fatura
  minimumPayment?: number // pagamento mínimo
  previousBalance?: number // saldo anterior
  cardNumber?: string // últimos 4 dígitos
  cardHolder?: string // nome do titular
}

export interface ExtractionResult {
  transactions: ExtractedTransaction[]
  statement: StatementMetadata
}

/**
 * Extrai e estrutura transações de linhas CSV/XLSX brutas usando IA
 * A IA identifica automaticamente as colunas e formatos
 */
export async function extractTransactionsFromRows(
  rows: any[],
  file?: File
): Promise<ExtractionResult> {

  // Se for PDF, processar de forma diferente
  if (rows.length > 0 && rows[0]._isPDF && file) {
    return extractTransactionsFromPDF(file)
  }

  // Pegar primeiras linhas como amostra (max 100 transações por vez)
  const sample = rows.slice(0, 100)

  const prompt = `Você é um especialista em processar extratos de cartão de crédito.

Receba o seguinte conjunto de linhas CSV/XLSX e extraia:
1. Informações da FATURA (metadata)
2. Todas as TRANSAÇÕES individuais

**DADOS:**
${JSON.stringify(sample, null, 2)}

**INSTRUÇÕES PARTE 1 - METADATA DA FATURA:**
Procure por informações da fatura como:
- Data de fechamento (statement date, closing date)
- Data de vencimento (due date, payment date)
- Período da fatura (billing period, start/end dates)
- Valor total (total amount, balance due)
- Pagamento mínimo (minimum payment)
- Saldo anterior (previous balance)
- Número do cartão (últimos 4 dígitos)
- Nome do titular (cardholder name)

**INSTRUÇÕES PARTE 2 - TRANSAÇÕES:**
1. Identifique automaticamente quais colunas representam:
   - Data da transação
   - Nome do merchant/estabelecimento
   - Descrição da compra
   - Valor (sempre positivo, sem símbolo)
   - Moeda (USD, EUR, BRL, etc)

2. Para CADA linha válida de transação, extraia:
   - date: formato YYYY-MM-DD
   - merchant: nome do estabelecimento
   - description: descrição completa
   - amount: valor numérico positivo
   - currency: código da moeda (USD, EUR, BRL, etc)
   - category: categoria (food, transport, shopping, bills, entertainment, subscriptions, travel, health, education, financial, other)
   - confidence: confiança na classificação (0-1)
   - explanation: explicação da classificação

3. IGNORE:
   - Linhas de cabeçalho
   - Linhas de totais/resumos
   - Linhas vazias ou inválidas
   - Pagamentos/créditos (apenas débitos/compras)

4. RETORNE JSON no formato:

{
  "statement": {
    "statementDate": "2025-10-23",
    "dueDate": "2025-11-15",
    "periodStart": "2025-09-24",
    "periodEnd": "2025-10-23",
    "totalAmount": 4464.21,
    "minimumPayment": 223.21,
    "previousBalance": 0,
    "cardNumber": "1234",
    "cardHolder": "JOHN DOE"
  },
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

IMPORTANTE: Se não encontrar alguma informação da fatura, deixe o campo como null ou omita.
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

    return {
      transactions: result.transactions,
      statement: result.statement || {}
    }

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
async function extractTransactionsFromPDF(file: File): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  const prompt = `Você é um especialista em processar extratos de cartão de crédito em PDF.

Analise o PDF e extraia:
1. Informações da FATURA (metadata do cabeçalho/rodapé)
2. TODAS as transações/compras listadas

**INSTRUÇÕES PARTE 1 - METADATA DA FATURA:**
Procure no cabeçalho, rodapé e seções de resumo:
- Data de fechamento (statement date, closing date)
- Data de vencimento (due date, payment date)
- Período da fatura (billing period)
- Valor total (total amount, balance due, new balance)
- Pagamento mínimo (minimum payment)
- Saldo anterior (previous balance)
- Número do cartão (últimos 4 dígitos, ex: ending in 1234)
- Nome do titular (cardholder name)

**INSTRUÇÕES PARTE 2 - TRANSAÇÕES:**
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

**RETORNE JSON no formato:**
{
  "statement": {
    "statementDate": "2025-10-23",
    "dueDate": "2025-11-15",
    "periodStart": "2025-09-24",
    "periodEnd": "2025-10-23",
    "totalAmount": 4464.21,
    "minimumPayment": 223.21,
    "previousBalance": 0,
    "cardNumber": "1234",
    "cardHolder": "JOHN DOE"
  },
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

IMPORTANTE: Se não encontrar alguma informação da fatura, deixe o campo como null ou omita.
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

    return {
      transactions: result.transactions,
      statement: result.statement || {}
    }

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
): Promise<ExtractionResult> {
  // Se for PDF, processar de uma vez
  if (rows.length > 0 && rows[0]._isPDF && file) {
    console.log('📄 Processando PDF com IA Claude...')
    return extractTransactionsFromPDF(file)
  }

  // CSV/XLSX: processar em lotes
  const allTransactions: ExtractedTransaction[] = []
  let statementMetadata: StatementMetadata = {}

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    console.log(`🔄 Processando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(rows.length / batchSize)}`)

    try {
      const extracted = await extractTransactionsFromRows(batch, file)
      allTransactions.push(...extracted.transactions)

      // Mesclar metadata da fatura (priorizar dados mais completos)
      if (extracted.statement) {
        statementMetadata = {
          ...statementMetadata,
          ...extracted.statement
        }
      }

      console.log(`✅ Lote processado: ${extracted.transactions.length} transações extraídas`)
    } catch (error) {
      console.error(`❌ Erro no lote ${i}-${i + batchSize}:`, error)
    }
  }

  return {
    transactions: allTransactions,
    statement: statementMetadata
  }
}
