import { useCallback, useEffect, useState } from "react"
import { call, getCurrentProperty } from "../lib/api"
import { serverError } from "../lib/resource"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { moneyLocale } from "../lib/money"
import { useAuth } from "../lib/auth"
import CityLedgerPayment from "./CityLedgerPayment"

// recording a company's payment is a Finance action (the server gates it too)
const CAN_SETTLE = ["Finance", "Hotel Admin", "System Manager", "Administrator"]

const inr = (n: unknown) =>
  Number(n ?? 0).toLocaleString(moneyLocale(), {
    maximumFractionDigits: 2,
  })

type Ledger = {
  ledger: string
  debit: number
  credit: number
  balance: number
}

export default function Ledgers() {
  const [date, setDate] = useState("")
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [inBalance, setInBalance] = useState(true)
  const [totals, setTotals] = useState({ debit: 0, credit: 0 })
  const [journal, setJournal] = useState<
    { transaction_code: string; description: string; debit: number; credit: number; entries: number }[]
  >([])
  const [aging, setAging] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [paying, setPaying] = useState<string | null>(null)
  const { roles } = useAuth()
  const canSettle = roles.some((r) => CAN_SETTLE.includes(r))

  const load = useCallback(async () => {
    try {
      const bal = await call<{
        business_date: string
        ledgers: Ledger[]
        total_debit: number
        total_credit: number
        in_balance: boolean
      }>("kamra.ledger.ledger_balances", {
        property: getCurrentProperty(),
        business_date: date || undefined,
      })
      setLedgers(bal.ledgers)
      setInBalance(bal.in_balance)
      setTotals({ debit: bal.total_debit, credit: bal.total_credit })
      if (!date) setDate(bal.business_date)
      const j = await call<{ rows: typeof journal }>(
        "kamra.ledger.journal_by_transaction_code",
        {
          property: getCurrentProperty(),
          business_date: bal.business_date,
        },
      )
      setJournal(j.rows)
      const a = await call<{ accounts: Record<string, unknown>[] }>(
        "kamra.ledger.city_ledger_aging",
        { property: getCurrentProperty() },
      )
      setAging(a.accounts)
    } catch (e) {
      setErr(serverError(e))
    }
  }, [date])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Books
          </p>
          <h1 className="text-2xl font-semibold">Ledgers</h1>
          <p className="text-sm text-zinc-500">
            Guest · Deposit · AR · Package trial balance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>
      {err ? <p className="text-sm text-rose-600">{err}</p> : null}

      <div
        className={`rounded-lg border px-4 py-2 text-sm ${
          inBalance
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {inBalance
          ? "Trial balance is in balance."
          : `Out of balance — debit ${inr(totals.debit)} vs credit ${inr(totals.credit)}.`}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ledgers.map((l) => (
          <Card key={l.ledger}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">
                {l.ledger} ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {inr(l.balance)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Dr {inr(l.debit)} · Cr {inr(l.credit)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Journal by transaction code
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-400">
              <tr>
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Debit</th>
                <th className="py-2 pr-3">Credit</th>
                <th className="py-2">Entries</th>
              </tr>
            </thead>
            <tbody>
              {journal.map((r) => (
                <tr key={r.transaction_code} className="border-t border-zinc-100">
                  <td className="py-2 pr-3 font-mono text-xs">
                    {r.transaction_code}
                  </td>
                  <td className="py-2 pr-3">{r.description}</td>
                  <td className="py-2 pr-3 tabular-nums">{inr(r.debit)}</td>
                  <td className="py-2 pr-3 tabular-nums">{inr(r.credit)}</td>
                  <td className="py-2">{r.entries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">City ledger aging</CardTitle>
          <span className="text-xs text-zinc-400">
            By due date - invoice date + the company's credit days
          </span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-400">
              <tr>
                <th className="py-2 pr-3">Company</th>
                <th className="py-2 pr-3">Terms</th>
                <th className="py-2 pr-3">Balance</th>
                <th className="py-2 pr-3">Not due</th>
                <th className="py-2 pr-3">1–30</th>
                <th className="py-2 pr-3">31–60</th>
                <th className="py-2 pr-3">61–90</th>
                <th className="py-2 pr-3">90+</th>
                <th className="py-2 pr-3">Overdue</th>
                <th className="py-2 pr-3">Credit</th>
                {canSettle ? <th className="py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {aging.map((a) => {
                const overdue = Number(a.overdue || 0)
                const limit = Number(a.credit_limit || 0)
                const over = limit > 0 && Number(a.balance || 0) > limit
                return (
                  <tr key={String(a.name)} className="border-t border-zinc-100">
                    <td className="py-2 pr-3">
                      {String(a.company)}
                      {over ? (
                        <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                          Over limit
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-xs text-zinc-500">
                      {Number(a.credit_days ?? 0)} days
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{inr(a.balance)}</td>
                    <td className="py-2 pr-3 tabular-nums">{inr(a.not_due)}</td>
                    <td className="py-2 pr-3 tabular-nums">{inr(a.d1_30)}</td>
                    <td className="py-2 pr-3 tabular-nums">{inr(a.d31_60)}</td>
                    <td className="py-2 pr-3 tabular-nums">{inr(a.d61_90)}</td>
                    <td className="py-2 pr-3 tabular-nums">{inr(a.d90p)}</td>
                    <td
                      className={`py-2 pr-3 tabular-nums ${overdue ? "font-medium text-rose-700" : ""}`}
                    >
                      {overdue ? inr(overdue) : "—"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {Number(a.unapplied_credit || 0) ? inr(a.unapplied_credit) : "—"}
                    </td>
                    {canSettle ? (
                      <td className="py-2 text-right">
                        <Button variant="outline" onClick={() => setPaying(String(a.name))}>
                          Record payment
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
              {!aging.length ? (
                <tr>
                  <td colSpan={canSettle ? 11 : 10} className="py-6 text-center text-zinc-400">
                    No city ledger accounts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {paying ? (
        <CityLedgerPayment
          account={paying}
          onClose={() => setPaying(null)}
          onPosted={() => void load()}
        />
      ) : null}
    </div>
  )
}
