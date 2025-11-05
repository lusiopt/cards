# Análise de Documentos com IA - Cards App

## Visão Geral

O sistema de análise de documentos do Cards App utiliza a API do Claude (Anthropic) para extrair, classificar e organizar transações de cartão de crédito a partir de múltiplos formatos de arquivo.

## Arquitetura

```
┌─────────────────┐
│   Usuário       │
│  Upload File    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              Frontend (Next.js)                     │
│  app/import/page.tsx                                │
│  - Validação de arquivo                             │
│  - FormData com file + cardName                     │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│         API Route: /api/import                      │
│  app/api/import/route.ts                            │
│  1. Recebe arquivo                                  │
│  2. Cria/busca Card no banco                        │
│  3. Chama parser apropriado                         │
│  4. Chama extrator de IA                            │
│  5. Cria Statement (fatura)                         │
│  6. Salva transações                                │
│  7. Calcula estatísticas                            │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│           Parsers: lib/parsers/                     │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  CSV Parser (csv.ts)                        │  │
│  │  - PapaParse                                │  │
│  │  - Retorna array de objetos                │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  XLSX Parser (xlsx.ts)                      │  │
│  │  - biblioteca xlsx                          │  │
│  │  - sheet_to_json                            │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  PDF Parser (pdf.ts)                        │  │
│  │  - Marca como PDF (_isPDF: true)           │  │
│  │  - Passa buffer para extrator               │  │
│  └─────────────────────────────────────────────┘  │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│      AI Extractor: lib/ai/extractor.ts              │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  extractTransactionsInBatches()              │ │
│  │  - Detecta tipo de arquivo                   │ │
│  │  - Processa em lotes (default 50 rows)      │ │
│  │  - CSV/XLSX: extractTransactionsFromRows()  │ │
│  │  - PDF: extractTransactionsFromPDF()        │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  Claude API Integration                      │ │
│  │  - Model: claude-sonnet-4-20250514          │ │
│  │  - Max tokens: 8192                         │ │
│  │  - Prompt estruturado                       │ │
│  │  - Retorno: JSON com transactions           │ │
│  └───────────────────────────────────────────────┘ │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│            Database (PostgreSQL)                    │
│                                                     │
│  ImportBatch → Statement → Transactions             │
│                     ↓                               │
│                   Card                              │
│                     ↓                               │
│                 Category                            │
└─────────────────────────────────────────────────────┘
```

---

## Fluxo Detalhado de Análise

### 1. Recepção do Arquivo

**Arquivo:** `app/api/import/route.ts`

```typescript
const formData = await request.formData()
const file = formData.get('file') as File
const cardName = formData.get('cardName') as string || 'Default Card'
```

**Validações:**
- Arquivo presente
- Tipo de arquivo (CSV, XLSX, PDF)
- Tamanho máximo: 10MB

---

### 2. Parsing Inicial

**Arquivo:** `lib/parsers/index.ts`

**Objetivo:** Extrair dados brutos do arquivo, independente do formato.

#### CSV
```typescript
// lib/parsers/csv.ts
- Usa PapaParse
- Converte texto para array de objetos
- header: true (primeira linha = colunas)
- skipEmptyLines: true
```

#### XLSX
```typescript
// lib/parsers/xlsx.ts
- Usa biblioteca xlsx
- Lê primeira planilha
- sheet_to_json() retorna array
```

#### PDF
```typescript
// lib/parsers/pdf.ts
- NÃO extrai texto aqui
- Apenas marca como PDF
- Claude API faz OCR + extração
```

**Output:** Array de linhas brutas ou marker de PDF

---

### 3. Extração Inteligente com IA

**Arquivo:** `lib/ai/extractor.ts`

### 3.1. Processamento em Lotes

```typescript
extractTransactionsInBatches(rows, batchSize = 50, file?)
```

**Por que lotes?**
- Limite de tokens da API do Claude
- Melhor performance
- Logs progressivos

**Fluxo:**
```
if (PDF) {
  → extractTransactionsFromPDF(file)
} else {
  → Para cada lote de 50 linhas:
    → extractTransactionsFromRows(batch)
}
```

---

### 3.2. Extração de CSV/XLSX

**Função:** `extractTransactionsFromRows(rows, file?)`

**Prompt para Claude:**

```
Você é um especialista em processar extratos de cartão de crédito.

Receba o seguinte conjunto de linhas CSV/XLSX e extraia as transações individuais.

**DADOS:**
[JSON com até 100 linhas]

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
   - currency: código da moeda
   - category: categoria da transação
   - confidence: confiança na classificação (0-1)
   - explanation: explicação da classificação

3. IGNORE:
   - Linhas de cabeçalho
   - Linhas de totais/resumos
   - Linhas vazias ou inválidas
   - Pagamentos/créditos (apenas débitos/compras)

4. RETORNE um array JSON com TODAS as transações extraídas
```

**Categorias disponíveis:**
- `food` - Alimentação
- `transport` - Transporte
- `shopping` - Compras
- `bills` - Contas e Serviços
- `entertainment` - Entretenimento
- `subscriptions` - Assinaturas
- `travel` - Viagens
- `health` - Saúde
- `education` - Educação
- `financial` - Serviços Financeiros
- `other` - Outros

**Resposta esperada:**
```json
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
```

---

### 3.3. Extração de PDF

**Função:** `extractTransactionsFromPDF(file)`

**Diferença:** Claude recebe o PDF diretamente via Document API

```typescript
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
```

**Prompt para PDF:**

```
Você é um especialista em processar extratos de cartão de crédito em PDF.

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
- category: categoria da transação
- confidence: confiança na classificação (0-1)
- explanation: explicação da classificação
```

**Vantagens do Claude para PDF:**
- OCR integrado
- Entende layout de tabelas
- Detecta colunas automaticamente
- Ignora elementos visuais irrelevantes

---

### 4. Validação e Limpeza

**Arquivo:** `app/api/import/route.ts`

**Após receber do Claude:**

```typescript
// 1. Remove markdown code blocks se houver
if (jsonText.startsWith('```json')) {
  jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '')
}

// 2. Detecta HTML (erro)
if (jsonText.startsWith('<') || jsonText.includes('<html')) {
  throw new Error('Resposta inválida da IA')
}

// 3. Parse JSON
const result = JSON.parse(jsonText.trim())

// 4. Valida estrutura
if (!result.transactions || !Array.isArray(result.transactions)) {
  throw new Error('Resposta não contém transações válidas')
}
```

---

### 5. Criação da Statement (Fatura)

```typescript
// Identifica período baseado nas transações
const dates = transactions.map(t => new Date(t.date))
const periodStart = new Date(Math.min(...dates.map(d => d.getTime())))
const periodEnd = new Date(Math.max(...dates.map(d => d.getTime())))
const statementDate = periodEnd

// Cria Statement
const statement = await prisma.statement.create({
  data: {
    cardId: card.id,
    statementDate,
    periodStart,
    periodEnd,
    importBatchId: importBatch.id,
    status: 'open'
  }
})
```

---

### 6. Salvamento das Transações

```typescript
for (const transaction of transactions) {
  // Valida data
  const date = new Date(transaction.date)
  if (isNaN(date.getTime())) continue

  // Busca categoria no banco
  const category = await prisma.category.findFirst({
    where: { slug: transaction.category || 'other' }
  })

  // Cria transação vinculada à fatura
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
      aiExplanation: transaction.explanation,
      aiProcessed: true,
      cardId: card.id,
      statementId: statement.id,
      importBatchId: importBatch.id,
      rawData: JSON.stringify(transaction)
    }
  })

  totalAmount += transaction.amount
}
```

---

### 7. Cálculo de Estatísticas

```typescript
// Breakdown por categoria
const categoryBreakdown: Record<string, { count: number; total: number }> = {}

for (const transaction of transactions) {
  const cat = transaction.category || 'other'
  if (!categoryBreakdown[cat]) {
    categoryBreakdown[cat] = { count: 0, total: 0 }
  }
  categoryBreakdown[cat].count++
  categoryBreakdown[cat].total += transaction.amount
}

// Atualiza Statement
await prisma.statement.update({
  where: { id: statement.id },
  data: {
    totalAmount,
    balance: totalAmount,
    transactionCount: importedCount,
    categoryBreakdown: JSON.stringify(categoryBreakdown)
  }
})
```

---

## Tratamento de Erros

### Erros do Claude API

```typescript
try {
  const message = await anthropic.messages.create(...)
} catch (error) {
  // Log detalhado
  console.error('Erro ao extrair transações com IA:', error)

  // Propaga erro específico
  if (error instanceof Error) {
    throw error
  }

  throw new Error('Não foi possível extrair transações do arquivo')
}
```

### Erros de Validação

```typescript
// Data inválida
if (isNaN(date.getTime())) {
  errorCount++
  errors.push(`Data inválida: ${transaction.date}`)
  continue
}

// Erro ao salvar
try {
  await prisma.transaction.create(...)
  importedCount++
} catch (error) {
  errorCount++
  errors.push(`Erro ao salvar transação ${i + 1}: ${error}`)
}
```

---

## Logs e Monitoramento

### Console Logs Estruturados

```typescript
console.log('📥 Import request received')
console.log('📄 File info:', { name, type, size })
console.log('🔍 Parsing file...')
console.log(`✅ Parsed ${rows.length} rows`)
console.log('🤖 Extraindo transações com IA Claude...')
console.log(`✅ IA extraiu ${transactions.length} transações`)
console.log(`📋 Fatura criada: ${periodStart} a ${periodEnd}`)
console.log(`💾 Salvando ${transactions.length} transações no banco...`)
console.log(`💾 Progresso: ${i + 1}/${transactions.length} transações salvas`)
console.log(`✅ Importação concluída: ${importedCount} salvas, ${errorCount} erros`)
console.log(`📊 Fatura atualizada: Total $${totalAmount}, ${importedCount} transações`)
```

---

## Configuração da API

### Variáveis de Ambiente

```env
# .env
ANTHROPIC_API_KEY="sk-ant-api03-..."
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Modelo e Limites

```typescript
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Configuração da chamada
{
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8192,
  messages: [...]
}
```

**Limites:**
- Tamanho do arquivo: 10MB
- Linhas por lote: 50 (CSV/XLSX)
- Max tokens: 8192
- Timeout: 2 minutos (Next.js default)

---

## Performance

### Otimizações

1. **Processamento em Lotes**
   - 50 linhas por chamada à API
   - Paralelismo não é usado (sequencial)
   - Trade-off: velocidade vs custo

2. **Logs Progressivos**
   - Feedback a cada 10 transações salvas
   - Usuário vê progresso em tempo real

3. **Validações Rápidas**
   - Data inválida: skip imediato
   - Categoria: busca única no banco
   - Raw data: JSON.stringify sem pretty-print

### Custos Estimados

**Claude Sonnet 4:**
- Input: ~$3/million tokens
- Output: ~$15/million tokens

**Estimativa por arquivo:**
- 100 transações em CSV: ~2k tokens input + 1k output = ~$0.02
- PDF de 10 páginas: ~5k tokens input + 2k output = ~$0.05

---

## Casos de Uso Suportados

### ✅ Formatos Funcionando

1. **CSV Genérico**
   - Qualquer ordem de colunas
   - Cabeçalho obrigatório
   - Datas em vários formatos

2. **Excel/XLSX**
   - Primeira planilha
   - Colunas nomeadas
   - Valores numéricos

3. **PDF de Extrato**
   - Tabelas com transações
   - OCR automático
   - Layout variado

### Exemplos Testados

**Chase Bank CSV:**
```csv
Transaction Date,Post Date,Description,Category,Type,Amount
10/24/2025,10/25/2025,STARBUCKS #12345,Food & Dining,Sale,5.75
```

**Amex PDF:**
- Tabela visual com colunas
- Data, Estabelecimento, Valor
- IA detecta automaticamente

**Generic XLSX:**
```
Data | Descrição | Valor | Moeda
10/24/2025 | Amazon Prime | 14.99 | USD
```

---

## Próximas Melhorias

### Planejado

1. **Detecção de Duplicatas**
   - Hash de transação (date + merchant + amount)
   - Flag `isDuplicate`

2. **Aprendizado de Padrões**
   - Armazenar correções do usuário
   - Melhorar classificação futura

3. **Suporte Multi-idioma**
   - Detectar idioma do arquivo
   - Adaptar prompt do Claude

4. **Export de Faturas**
   - PDF formatado
   - Excel com breakdown

5. **Processamento Assíncrono**
   - Queue de jobs
   - Upload sem espera
   - Notificação ao concluir

---

## Troubleshooting

### Erro: "Unexpected token '<'"

**Causa:** Claude retornou HTML ao invés de JSON

**Solução:**
```typescript
if (jsonText.startsWith('<') || jsonText.includes('<html')) {
  throw new Error('Resposta inválida da IA')
}
```

### Erro: "The table Statement does not exist"

**Causa:** Banco não sincronizado com schema

**Solução:**
```bash
npx prisma db push
npx prisma generate
```

### Transações não aparecem

**Causa:** Data inválida ou categoria não encontrada

**Debug:**
```typescript
console.log('Transação:', { date, merchant, amount, category })
```

---

## Referências

- [Claude API Docs](https://docs.anthropic.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [PapaParse](https://www.papaparse.com/)

---

**Última Atualização:** 05 Novembro 2025
**Versão:** 1.0.0
