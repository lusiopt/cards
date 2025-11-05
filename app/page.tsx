'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpRight, ArrowDownRight, CreditCard, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DashboardStats {
  totalTransactions: number
  totalAmount: number
  categoriesCount: number
  lastImport?: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    totalAmount: 0,
    categoriesCount: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
        // Buscar estatísticas apenas de faturas ativas
        const [statementsRes, categoriesRes] = await Promise.all([
          fetch(`${baseUrl}/api/statements`),
          fetch(`${baseUrl}/api/categories`)
        ])

        const statementsData = await statementsRes.json()
        const categoriesData = await categoriesRes.json()

        // Calcular totais baseado nas faturas
        const totalTransactions = statementsData.statements.reduce(
          (sum: number, s: any) => sum + (s.transactionCount || 0),
          0
        )

        const totalAmount = statementsData.statements.reduce(
          (sum: number, s: any) => sum + (s.totalAmount || 0),
          0
        )

        setStats({
          totalTransactions,
          totalAmount,
          categoriesCount: categoriesData.categories.length
        })
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
        <p className="text-gray-700 mt-2">
          Visão geral das suas despesas de cartões de crédito
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total de Transações
            </CardTitle>
            <CreditCard className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</div>
            <p className="text-xs text-gray-600 mt-1">
              Todas as transações importadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Valor Total
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.totalAmount)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Soma de todas as despesas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Categorias
            </CardTitle>
            <ArrowUpRight className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.categoriesCount}</div>
            <p className="text-xs text-gray-600 mt-1">
              Categorias disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Média por Transação
            </CardTitle>
            <ArrowDownRight className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(
                stats.totalTransactions > 0
                  ? stats.totalAmount / stats.totalTransactions
                  : 0
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Valor médio gasto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Começar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.totalTransactions === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma transação ainda
              </h3>
              <p className="text-gray-700 mb-4">
                Comece importando um extrato de cartão em CSV, XLSX ou PDF
              </p>
              <Link
                href="/import"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Importar Extrato
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Link
                href="/import"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-blue-600 hover:bg-blue-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">Importar Extrato</div>
                  <div className="text-sm text-gray-600">
                    Adicionar novas transações
                  </div>
                </div>
              </Link>

              <Link
                href="/statements"
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-blue-600 hover:bg-blue-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">Ver Faturas</div>
                  <div className="text-sm text-gray-600">
                    Gerenciar suas faturas
                  </div>
                </div>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
