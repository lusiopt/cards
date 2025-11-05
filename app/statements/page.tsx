'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, Calendar, DollarSign, FileText, Trash2 } from 'lucide-react'

interface Statement {
  id: string
  card: {
    id: string
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
}

export default function StatementsPage() {
  const [statements, setStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadStatements()
  }, [])

  async function loadStatements() {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const res = await fetch(`${baseUrl}/api/statements`)
      const data = await res.json()
      setStatements(data.statements || [])
    } catch (error) {
      console.error('Erro ao carregar faturas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, cardName: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(`Tem certeza que deseja deletar a fatura do cartão "${cardName}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    setDeleting(id)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const res = await fetch(`${baseUrl}/api/statements/${id}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 404) {
          alert('Esta fatura já foi deletada ou não existe.')
        } else {
          alert(data.error || 'Erro ao deletar fatura. Tente novamente.')
        }
        // Recarregar lista mesmo em caso de erro 404
        await loadStatements()
        return
      }

      // Recarregar lista de faturas após sucesso
      await loadStatements()
    } catch (error) {
      console.error('Erro ao deletar fatura:', error)
      alert('Erro de conexão. Tente novamente.')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Carregando faturas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Faturas</h2>
        <p className="text-gray-600 mt-2">
          Visualize e gerencie suas faturas mensais por cartão
        </p>
      </div>

      {statements.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma fatura ainda</h3>
            <p className="text-gray-600 mb-4">
              Importe extratos de cartão para gerar faturas automaticamente
            </p>
            <Link
              href="/import"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Importar Extrato
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statements.map((statement) => {
            const breakdown = statement.categoryBreakdown
              ? JSON.parse(statement.categoryBreakdown)
              : {}
            const categories = Object.keys(breakdown)

            return (
              <Card key={statement.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: statement.card.color }}
                      />
                      <CardTitle className="text-lg">{statement.card.name}</CardTitle>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        statement.isPaid
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {statement.isPaid ? 'Paga' : 'Em aberto'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Período */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(statement.periodStart).toLocaleDateString('pt-BR')} -{' '}
                      {new Date(statement.periodEnd).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {/* Total */}
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span>Valor Total</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(statement.totalAmount)}
                    </div>
                  </div>

                  {/* Transações */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CreditCard className="w-4 h-4" />
                    <span>{statement.transactionCount} transações</span>
                  </div>

                  {/* Categorias principais */}
                  {categories.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-xs text-gray-500 mb-2">Top categorias:</div>
                      <div className="space-y-1">
                        {categories.slice(0, 3).map((cat) => (
                          <div key={cat} className="flex justify-between text-sm">
                            <span className="text-gray-600 capitalize">{cat}</span>
                            <span className="font-medium">
                              {formatCurrency(breakdown[cat].total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="flex gap-2">
                    <Link
                      href={`/statements/${statement.id}`}
                      className="flex-1 text-center px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Ver Detalhes
                    </Link>
                    <button
                      onClick={(e) => handleDelete(statement.id, statement.card.name, e)}
                      disabled={deleting === statement.id}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Deletar fatura"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
