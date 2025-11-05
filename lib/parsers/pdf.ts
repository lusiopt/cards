import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface PDFParseResult {
  rows: Array<{
    date?: string
    merchant?: string
    description?: string
    amount?: string
    currency?: string
  }>
  detectedIssuer?: string
  confidence: number
}

export async function parsePDF(fileBuffer: ArrayBuffer): Promise<PDFParseResult> {
  // Converter ArrayBuffer para base64
  const base64 = Buffer.from(fileBuffer).toString('base64')

  const prompt = `Você é um especialista em extrair dados de extratos de cartão de crédito em PDF.

Analise o PDF e extraia TODAS as transações/compras listadas.

IMPORTANTE:
- Procure por tabelas de transações, compras, débitos ou lançamentos
- Ignore linhas de totais, resumos e cabeçalhos
- Extraia APENAS transações individuais de compras/débitos

Para cada transação, identifique:
- date: data da transação (formato YYYY-MM-DD)
- merchant: nome do estabelecimento (geralmente em CAPS)
- description: descrição completa da linha
- amount: valor numérico positivo (sem símbolo, use ponto decimal)
- currency: código da moeda (USD, EUR, BRL, etc)

Retorne APENAS um JSON válido neste formato:
{
  "detectedIssuer": "nome do banco/emissor detectado",
  "confidence": 0.95,
  "rows": [
    {
      "date": "2025-10-24",
      "merchant": "STARBUCKS",
      "description": "STARBUCKS #12345 NEW YORK NY",
      "amount": "5.75",
      "currency": "USD"
    },
    {
      "date": "2025-10-23",
      "merchant": "AMAZON",
      "description": "AMAZON.COM AMZN.COM/BILL",
      "amount": "29.99",
      "currency": "USD"
    }
  ]
}

RETORNE APENAS O JSON, SEM TEXTO ADICIONAL ANTES OU DEPOIS.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
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

    // Extrair resposta
    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Resposta inválida da API')
    }

    // Limpar markdown code blocks se houver
    let jsonText = content.text.trim()

    // Remove ```json e ``` se existirem
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    const result = JSON.parse(jsonText.trim())

    return {
      rows: result.rows || [],
      detectedIssuer: result.detectedIssuer,
      confidence: result.confidence || 0.5
    }

  } catch (error) {
    console.error('Erro ao processar PDF:', error)
    throw new Error('Não foi possível processar o PDF. Tente CSV ou XLSX.')
  }
}
