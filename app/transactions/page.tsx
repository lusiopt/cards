'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, formatConfidence } from '@/lib/utils'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    fetch(`${baseUrl}/api/transactions?limit=100`)
      .then(res => res.json())
      .then(data => {
        setTransactions(data.transactions || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Nenhuma transação encontrada</p>
        <a
          href="/import"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Importar Extrato
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Transações</h2>
        <p className="text-gray-600 mt-2">{transactions.length} transações</p>
      </div>

      <div className="space-y-2">
        {transactions.map((t: any) => (
          <Card key={t.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{t.merchantClean || t.merchant}</h3>
                  {t.category && (
                    <Badge
                      style={{ backgroundColor: t.category.color }}
                      className="text-white"
                    >
                      {t.category.name}
                    </Badge>
                  )}
                  {t.aiConfidence && (
                    <span className="text-xs text-gray-500">
                      {formatConfidence(t.aiConfidence)} confiança
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{t.description}</p>
                {t.aiExplanation && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    💡 {t.aiExplanation}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(new Date(t.date))}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">
                  {formatCurrency(t.amount, t.currency)}
                </div>
                <div className="text-xs text-gray-500">{t.currency}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
