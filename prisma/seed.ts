import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultCategories = [
  {
    slug: 'food',
    name: 'Alimentação',
    nameEn: 'Food & Dining',
    color: '#ef4444',
    icon: 'utensils',
    description: 'Restaurantes, supermercados, delivery'
  },
  {
    slug: 'transport',
    name: 'Transporte',
    nameEn: 'Transportation',
    color: '#3b82f6',
    icon: 'car',
    description: 'Uber, táxi, combustível, estacionamento'
  },
  {
    slug: 'shopping',
    name: 'Compras',
    nameEn: 'Shopping',
    color: '#8b5cf6',
    icon: 'shopping-bag',
    description: 'Roupas, eletrônicos, diversos'
  },
  {
    slug: 'bills',
    name: 'Contas e Serviços',
    nameEn: 'Bills & Utilities',
    color: '#f59e0b',
    icon: 'file-text',
    description: 'Água, luz, internet, telefone'
  },
  {
    slug: 'entertainment',
    name: 'Entretenimento',
    nameEn: 'Entertainment',
    color: '#ec4899',
    icon: 'music',
    description: 'Cinema, shows, eventos, jogos'
  },
  {
    slug: 'subscriptions',
    name: 'Assinaturas',
    nameEn: 'Subscriptions',
    color: '#06b6d4',
    icon: 'repeat',
    description: 'Netflix, Spotify, serviços mensais'
  },
  {
    slug: 'travel',
    name: 'Viagens',
    nameEn: 'Travel',
    color: '#10b981',
    icon: 'plane',
    description: 'Hotéis, passagens, tours'
  },
  {
    slug: 'health',
    name: 'Saúde',
    nameEn: 'Healthcare',
    color: '#14b8a6',
    icon: 'heart-pulse',
    description: 'Médico, farmácia, plano de saúde'
  },
  {
    slug: 'education',
    name: 'Educação',
    nameEn: 'Education',
    color: '#6366f1',
    icon: 'book-open',
    description: 'Cursos, livros, mensalidades'
  },
  {
    slug: 'financial',
    name: 'Serviços Financeiros',
    nameEn: 'Financial Services',
    color: '#64748b',
    icon: 'landmark',
    description: 'Taxas bancárias, juros, investimentos'
  },
  {
    slug: 'other',
    name: 'Outros',
    nameEn: 'Other',
    color: '#94a3b8',
    icon: 'more-horizontal',
    description: 'Despesas não categorizadas'
  }
]

async function main() {
  console.log('Seeding database...')

  // Limpar dados existentes (opcional)
  await prisma.settings.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.importBatch.deleteMany()
  await prisma.category.deleteMany()
  await prisma.card.deleteMany()

  // Criar categorias padrão
  for (const category of defaultCategories) {
    await prisma.category.create({
      data: category
    })
    console.log(`✓ Categoria criada: ${category.name}`)
  }

  // Criar configurações padrão
  await prisma.settings.create({
    data: {
      defaultCurrency: 'USD',
      dateFormat: 'MM/dd/yyyy',
      language: 'pt-BR',
      aiAutoClassify: true,
      aiMinConfidence: 0.7,
      aiLearnFromEdits: true,
      showExplanations: true,
      groupDuplicates: true,
      highlightRecurring: true
    }
  })
  console.log('✓ Configurações padrão criadas')

  console.log('✅ Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao fazer seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
