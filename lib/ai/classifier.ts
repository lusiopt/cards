import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface ClassificationResult {
  category: string
  tags: string[]
  confidence: number
  explanation: string
  merchantClean?: string
}

export async function classifyTransaction(
  merchant: string,
  description: string,
  amount: number,
  currency: string,
  date: Date
): Promise<ClassificationResult> {

  const prompt = `Você é um assistente especializado em classificar transações de cartão de crédito.

Analise a seguinte transação e retorne APENAS um JSON válido com a classificação:

**Transação:**
- Merchant: ${merchant}
- Descrição: ${description}
- Valor: ${amount} ${currency}
- Data: ${date.toISOString()}

**Categorias disponíveis:**
- food (Alimentação)
- transport (Transporte)
- shopping (Compras)
- bills (Contas e Serviços)
- entertainment (Entretenimento)
- subscriptions (Assinaturas)
- travel (Viagens)
- health (Saúde)
- education (Educação)
- financial (Serviços Financeiros)
- other (Outros)

**Retorne JSON neste formato exato:**
{
  "category": "slug-da-categoria",
  "tags": ["tag1", "tag2"],
  "confidence": 0.95,
  "explanation": "Explicação clara de por que foi categorizado assim",
  "merchantClean": "Nome limpo e normalizado do merchant"
}

**Regras:**
- confidence deve ser entre 0 e 1
- tags devem ser palavras-chave relevantes em português
- explanation deve explicar o raciocínio
- merchantClean deve remover códigos, números e caracteres especiais

RETORNE APENAS O JSON, SEM TEXTO ADICIONAL.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    // Extrair o texto da resposta
    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Resposta inválida da API')
    }

    // Parse do JSON
    const result = JSON.parse(content.text)

    return {
      category: result.category || 'other',
      tags: result.tags || [],
      confidence: result.confidence || 0.5,
      explanation: result.explanation || 'Classificação automática',
      merchantClean: result.merchantClean || merchant
    }

  } catch (error) {
    console.error('Erro ao classificar transação:', error)

    // Fallback: classificação básica por palavras-chave
    return fallbackClassification(merchant, description)
  }
}

// Classificação simples de fallback
function fallbackClassification(merchant: string, description: string): ClassificationResult {
  const text = `${merchant} ${description}`.toLowerCase()

  // Regras simples
  if (text.includes('uber') || text.includes('taxi') || text.includes('gas') || text.includes('parking')) {
    return {
      category: 'transport',
      tags: ['transporte'],
      confidence: 0.6,
      explanation: 'Classificado por palavra-chave (fallback)',
      merchantClean: merchant
    }
  }

  if (text.includes('restaurant') || text.includes('food') || text.includes('mcdonalds') || text.includes('starbucks')) {
    return {
      category: 'food',
      tags: ['alimentação'],
      confidence: 0.6,
      explanation: 'Classificado por palavra-chave (fallback)',
      merchantClean: merchant
    }
  }

  if (text.includes('netflix') || text.includes('spotify') || text.includes('subscription')) {
    return {
      category: 'subscriptions',
      tags: ['assinatura'],
      confidence: 0.6,
      explanation: 'Classificado por palavra-chave (fallback)',
      merchantClean: merchant
    }
  }

  if (text.includes('amazon') || text.includes('shopping') || text.includes('store')) {
    return {
      category: 'shopping',
      tags: ['compras'],
      confidence: 0.6,
      explanation: 'Classificado por palavra-chave (fallback)',
      merchantClean: merchant
    }
  }

  // Default
  return {
    category: 'other',
    tags: [],
    confidence: 0.3,
    explanation: 'Não foi possível classificar automaticamente',
    merchantClean: merchant
  }
}

// Batch classification para múltiplas transações
export async function classifyBatch(
  transactions: Array<{
    merchant: string
    description: string
    amount: number
    currency: string
    date: Date
  }>
): Promise<ClassificationResult[]> {
  const results: ClassificationResult[] = []

  // Processar em lotes de 5 por vez para não sobrecarregar a API
  const batchSize = 5
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)
    const promises = batch.map(t =>
      classifyTransaction(t.merchant, t.description, t.amount, t.currency, t.date)
    )
    const batchResults = await Promise.all(promises)
    results.push(...batchResults)
  }

  return results
}
