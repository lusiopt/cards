# Cards - Controle Inteligente de Despesas

Sistema de controle de despesas de cartões de crédito com classificação automática usando IA (Claude).

## 🎯 Características

- ✅ **Importação Inteligente**: CSV, XLSX e PDF
- ✅ **Classificação Automática**: Claude AI classifica e explica cada transação
- ✅ **Multi-moeda**: Suporta USD, EUR, BRL e outras moedas
- ✅ **Dashboard**: Visão geral de gastos
- ✅ **11 Categorias**: Alimentação, Transporte, Compras, etc

## 🚀 Stack Técnica

- **Next.js 16** + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui
- **Prisma** + SQLite
- **Anthropic Claude API** (classificação IA)
- **Vercel** (deploy)

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

## 📄 Licença

Uso pessoal - Euclides Gomes
