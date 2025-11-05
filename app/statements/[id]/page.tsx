'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Calendar, DollarSign, CreditCard, User, Wallet, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Transaction {
  id: string
  date: string
  merchant: string
  description: string
  amount: number
  currency: string
  category: {
    name: string
    color: string
    icon: string
  } | null
}

interface Statement {
  id: string
  card: {
    name: string
    issuer: string
    color: string
    lastFour: string | null
    currency: string
  }
  statementDate: string
  dueDate: string | null
  periodStart: string
  periodEnd: string
  totalAmount: number
  paidAmount: number
  balance: number
  transactionCount: number
  categoryBreakdown: string | null
  status: string
  isPaid: boolean
  transactions: Transaction[]
}

export default function StatementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [statement, setStatement] = useState<Statement | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function loadStatement() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
        const res = await fetch(`${baseUrl}/api/statements/${params.id}`)
        const data = await res.json()
        setStatement(data)
      } catch (error) {
        console.error('Erro ao carregar fatura:', error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadStatement()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Carregando fatura...</div>
      </div>
    )
  }

  if (!statement) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Fatura não encontrada</div>
      </div>
    )
  }

  const breakdown = statement.categoryBreakdown
    ? JSON.parse(statement.categoryBreakdown)
    : {}

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja deletar esta fatura? Esta ação não pode ser desfeita.')) {
      return
    }

    setDeleting(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const res = await fetch(`${baseUrl}/api/statements/${params.id}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 404) {
          alert('Esta fatura já foi deletada ou não existe.')
          router.push('/statements')
        } else {
          alert(data.error || 'Erro ao deletar fatura. Tente novamente.')
          setDeleting(false)
        }
        return
      }

      router.push('/statements')
    } catch (error) {
      console.error('Erro ao deletar fatura:', error)
      alert('Erro de conexão. Tente novamente.')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/statements"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight">Detalhes da Fatura</h2>
            <p className="text-gray-600 mt-1">{statement.card.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                statement.isPaid
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {statement.isPaid ? 'Paga' : 'Em aberto'}
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deletando...' : 'Deletar Fatura'}
            </button>
          </div>
        </div>
      </div>

      {/* Card de Informações da Fatura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Informações da Fatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Coluna 1: Cartão */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Cartão
                </label>
                <div className="mt-1">
                  <div className="text-lg font-semibold">{statement.card.name}</div>
                  <div className="text-sm text-gray-600">{statement.card.issuer}</div>
                </div>
              </div>

              {statement.card.lastFour && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Número do Cartão
                  </label>
                  <div className="mt-1 text-lg font-mono">
                    •••• •••• •••• {statement.card.lastFour}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Moeda
                </label>
                <div className="mt-1 text-lg font-semibold">
                  {statement.card.currency}
                </div>
              </div>
            </div>

            {/* Coluna 2: Datas */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Fechamento
                </label>
                <div className="mt-1 text-lg font-semibold">
                  {new Date(statement.statementDate).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>

              {statement.dueDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Data de Vencimento
                  </label>
                  <div className="mt-1">
                    <div className="text-lg font-semibold text-red-600">
                      {new Date(statement.dueDate).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    {!statement.isPaid && new Date(statement.dueDate) < new Date() && (
                      <span className="text-xs text-red-600 font-medium">Vencida</span>
                    )}
                    {!statement.isPaid && new Date(statement.dueDate) >= new Date() && (
                      <span className="text-xs text-gray-600">
                        {Math.ceil((new Date(statement.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias restantes
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Período da Fatura
                </label>
                <div className="mt-1 text-sm">
                  {new Date(statement.periodStart).toLocaleDateString('pt-BR')} até{' '}
                  {new Date(statement.periodEnd).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </div>

          {/* Valores em destaque */}
          <div className="mt-6 pt-6 border-t grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Valor Total</label>
              <div className="mt-1 text-2xl font-bold">
                {formatCurrency(statement.totalAmount)}
              </div>
            </div>

            {statement.paidAmount > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Valor Pago</label>
                <div className="mt-1 text-2xl font-bold text-green-600">
                  {formatCurrency(statement.paidAmount)}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-500">Saldo Devedor</label>
              <div className="mt-1 text-2xl font-bold text-red-600">
                {formatCurrency(statement.balance)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown por Categoria */}
      {Object.keys(breakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(breakdown)
                .sort(([, a]: any, [, b]: any) => b.total - a.total)
                .map(([category, data]: any) => {
                  const percentage = (data.total / statement.totalAmount) * 100

                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium capitalize">{category}</span>
                        <span className="text-gray-600">
                          {formatCurrency(data.total)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {data.count} transações
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <CardTitle>Transações ({statement.transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {statement.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{transaction.merchant}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    {transaction.category && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100">
                        {transaction.category.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(transaction.amount)}
                  </div>
                  <div className="text-xs text-gray-500">{transaction.currency}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
