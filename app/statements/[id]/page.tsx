'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Calendar, DollarSign, CreditCard } from 'lucide-react'

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
  }
  statementDate: string
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
  const [statement, setStatement] = useState<Statement | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            statement.isPaid
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {statement.isPaid ? 'Paga' : 'Em aberto'}
        </span>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {new Date(statement.periodStart).toLocaleDateString('pt-BR')}
              <br />
              {new Date(statement.periodEnd).toLocaleDateString('pt-BR')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statement.totalAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statement.transactionCount}</div>
          </CardContent>
        </Card>
      </div>

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
