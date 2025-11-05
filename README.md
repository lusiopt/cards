# Cards - Sistema Inteligente de Controle de Despesas

Sistema de gestão de despesas de cartões de crédito com análise automática por IA (Claude Anthropic).

## 🚀 Features

### ✅ Importação Inteligente
- **Múltiplos formatos:** CSV, XLSX, PDF
- **Análise automática:** Claude AI detecta colunas e extrai transações
- **Classificação automática:** 11 categorias pré-definidas
- **OCR integrado:** PDFs são lidos diretamente

### ✅ Organização por Faturas
- **Agrupamento automático:** Transações organizadas por período
- **Estatísticas completas:** Total, quantidade, breakdown por categoria
- **Status de pagamento:** Paga ou em aberto
- **Visualização por cartão:** Múltiplos cartões suportados

### ✅ Análise Detalhada
- **Breakdown por categoria:** Gráficos e percentuais
- **Timeline de transações:** Ordenadas por data
- **Filtros e busca:** Por categoria, cartão, período
- **Dashboard visual:** Resumo geral de gastos

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19 + Tailwind CSS 4 + shadcn/ui
- **Database:** PostgreSQL + Prisma ORM
- **IA:** Claude Sonnet 4 (Anthropic)
- **Deploy:** VPS com PM2 + Nginx

## 📦 Instalação

```bash
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

## 🔑 Configuração

Crie `.env`:

```env
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="sua-api-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 🏃 Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

## 📤 Deploy Vercel

```bash
vercel
```

## 📝 Uso

1. **Importar**: Upload CSV/XLSX/PDF do extrato
2. **IA Classifica**: Claude analisa e categoriza automaticamente
3. **Visualizar**: Dashboard com totais e lista de transações

## 🎨 Categorias Padrão

- 🍔 Alimentação
- 🚗 Transporte
- 🛒 Compras
- 💳 Contas e Serviços
- 🎮 Entretenimento
- 📱 Assinaturas
- ✈️ Viagens
- 💊 Saúde
- 📚 Educação
- 🏢 Serviços Financeiros
- 🔧 Outros

## 🏗️ Arquitetura

### Database Schema

```prisma
Card (Cartão)
├── id, name, issuer, lastFourDigits
├── color, logo, isActive
└── ↓ hasMany

Statement (Fatura Mensal)
├── id, cardId
├── statementDate, dueDate
├── periodStart, periodEnd
├── totalAmount, paidAmount, balance
├── transactionCount, categoryBreakdown
├── status, isPaid
└── ↓ hasMany

Transaction (Transação)
├── id, statementId, cardId, categoryId
├── date, merchant, description
├── amount, currency, originalAmount
├── type, status
└── metadata
```

### Fluxo de Importação

```
Upload Arquivo (CSV/XLSX/PDF)
    ↓
Processar com Multer
    ↓
Enviar para Claude Sonnet 4
    ↓
Análise Inteligente
├── Detectar colunas
├── Extrair transações
├── Categorizar automaticamente
└── Validar dados
    ↓
Criar Statement (Fatura)
├── Identificar período
├── Calcular totais
└── Gerar breakdown por categoria
    ↓
Salvar Transações
└── Vincular ao Statement

Ver documentação completa: docs/AI-DOCUMENT-ANALYSIS.md
```

## 📡 API Endpoints

### Importação

**POST /api/import**
- Upload de arquivo (CSV/XLSX/PDF)
- Headers: `multipart/form-data`
- Response:
```json
{
  "success": true,
  "card": { "id": "...", "name": "..." },
  "statement": { "id": "...", "totalAmount": 1234.56 },
  "imported": 71,
  "skipped": 0,
  "errors": []
}
```

### Faturas

**GET /api/statements**
- Query params: `cardId`, `status`
- Response: Lista de faturas com totais

**GET /api/statements/[id]**
- Response: Detalhes da fatura + transações

### Transações

**GET /api/transactions**
- Query params: `cardId`, `categoryId`, `startDate`, `endDate`
- Response: Lista de transações

### Configurações

**GET /api/cards**
- Response: Lista de cartões cadastrados

**GET /api/categories**
- Response: Lista de categorias disponíveis

## 📂 Estrutura de Arquivos

```
cards/
├── app/
│   ├── page.tsx                    # Dashboard principal
│   ├── import/page.tsx             # Página de importação
│   ├── statements/
│   │   ├── page.tsx                # Lista de faturas
│   │   └── [id]/page.tsx           # Detalhes da fatura
│   ├── transactions/page.tsx       # Lista de transações
│   ├── settings/page.tsx           # Configurações
│   └── api/
│       ├── import/route.ts         # Upload e processamento
│       ├── statements/
│       │   ├── route.ts            # Listar faturas
│       │   └── [id]/route.ts       # Detalhe fatura
│       ├── transactions/route.ts   # Listar transações
│       ├── cards/route.ts          # Gerenciar cartões
│       └── categories/route.ts     # Listar categorias
├── components/
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── db.ts                       # Prisma client
│   ├── anthropic.ts                # Claude AI integration
│   └── utils.ts                    # Helpers
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── seed.ts                     # Seed categories
├── docs/
│   └── AI-DOCUMENT-ANALYSIS.md     # Documentação detalhada IA
└── uploads/                        # Arquivos temporários
```

## 🚀 Deploy

### Desenvolvimento Local

```bash
npm run dev
# http://localhost:3000
```

### Produção (VPS)

```bash
# Build
npm run build

# PM2
pm2 start npm --name "cards" -- start
pm2 save

# Nginx (proxying to port 3000)
location /cards {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}
```

### Deploy Vercel (Alternativa)

```bash
vercel --prod
```

## 🧪 Performance

- **Importação CSV/XLSX:** ~2-5s para 50-100 transações
- **Importação PDF:** ~5-10s (inclui OCR)
- **Custo Claude API:** ~$0.10-0.30 por arquivo
- **Database:** SQLite (dev) / PostgreSQL (prod)

## 📚 Documentação Completa

- **[AI Document Analysis](docs/AI-DOCUMENT-ANALYSIS.md)** - Lógica completa de análise de documentos
- **[Prisma Schema](prisma/schema.prisma)** - Estrutura do banco de dados
- **[API Routes](app/api/)** - Endpoints disponíveis

## 🔧 Troubleshooting

### Erro: "Unexpected token '<', "<html>..." is not valid JSON
- **Causa:** Backend retornou erro HTML
- **Solução:** Verificar logs do servidor e tabelas do banco

### Erro: "Table does not exist"
- **Causa:** Schema não sincronizado
- **Solução:**
```bash
npx prisma db push --force-reset
npx prisma db seed
```

### Import não funciona
- **Verificar:** API key do Anthropic configurada em .env
- **Verificar:** Formato do arquivo (CSV com headers, XLSX primeira sheet, PDF com texto)
- **Logs:** Ver resposta da API em Network tab do browser

## 📌 VERSÕES ESTÁVEIS E ROLLBACK

### 🏷️ v1.0-stable (Atual)

**Tag:** `cards-v1.0-stable`
**Data:** 05 Novembro 2025
**Commit:** `6401965`

**Status:** ✅ Produção em dev.lusio.market/cards

**Features:**
- ✅ Sistema completo de importação (CSV/XLSX/PDF)
- ✅ Análise com IA (Claude Sonnet 4)
- ✅ Dashboard com estatísticas
- ✅ Sistema de faturas mensais
- ✅ UI shadcn/ui com contraste otimizado
- ✅ Design responsivo e acessível

**Rollback para esta versão:**
```bash
# Local
git checkout cards-v1.0-stable
git push origin dev --force

# VPS
ssh root@72.61.165.88 'cd /var/www/dev/cards && \
  git fetch --tags && \
  git reset --hard cards-v1.0-stable && \
  npm install && \
  npm run build && \
  pm2 restart cards-dev'
```

**Ver todas as tags:**
```bash
git tag -l "cards-v*" -n9
```

---

## 📄 Licença

Uso pessoal - Euclides Gomes
