import { useCallback, useEffect, useState } from "react"
import { MoonStar } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { call, getCurrentProperty } from "../lib/api"
import { listResource, serverError, type Row } from "../lib/resource"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { cur, moneyLocale } from "../lib/money"
import { useT } from "../lib/i18n"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card"

const inr = (n: unknown) =>
  Number(n ?? 0).toLocaleString(moneyLocale(), { maximumFractionDigits: 0 })

const fmtDate = (d: unknown) =>
  d
    ? new Date(String(d) + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-"
const fmtWhen = (d: unknown) =>
  d
    ? new Date(String(d).replace(" ", "T").slice(0, 19)).toLocaleString(
        "en-IN",
        { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" },
      )
    : ""

interface AuditResult {
  audit?: string
  already_ran?: boolean
  room_charges_posted?: number
  amount_posted?: number
  no_shows_flagged?: number
  folios_opened?: number
  late_arrivals_held?: number
  no_show_fees_waived?: number
  held_late_arrivals?: { reservation: string; guest_name?: string; eta?: string | null; reason: string }[]
}

export default function Billing() {
  const { t } = useT()
  const [folios, setFolios] = useState<Row[]>([])
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const [auditErr, setAuditErr] = useState<string | null>(null)
  const [auditRuns, setAuditRuns] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(() => {
    listResource("Folio", {
      fields: [
        "name", "guest_name", "reservation", "status", "invoice_number",
        "grand_total", "payments_total", "balance",
      ],
      filters: [["property", "=", getCurrentProperty()]],
      orderBy: "modified desc",
    }).then(setFolios)
    listResource("Night Audit Run", {
      fields: [
        "name", "business_date", "status", "room_charges_posted",
        "amount_posted", "no_shows_flagged", "folios_opened", "late_arrivals_held", "creation",
      ],
      filters: [["property", "=", getCurrentProperty()]],
      orderBy: "creation desc",
      limit: 8,
    })
      .then(setAuditRuns)
      .catch(() => setAuditRuns([]))
  }, [])

  useEffect(load, [load])

  async function runAudit() {
    setBusy(true)
    setAuditErr(null)
    setAudit(null)
    try {
      const res = await call<AuditResult>("kamra.api.run_night_audit", {
        property: getCurrentProperty(),
      })
      setAudit(res)
      load()
    } catch (e) {
      setAuditErr(serverError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("Night audit")}</CardTitle>
            <p className="mt-0.5 text-xs text-zinc-400">
              {t("Posts tonight's room charges for every in-house guest and flags no-shows. Runs automatically at 3 AM; run it manually anytime.")}
            </p>
          </div>
          <Button disabled={busy} onClick={runAudit}>
            <MoonStar className="size-4" aria-hidden />
            {busy ? t("Running…") : t("Run night audit")}
          </Button>
        </CardHeader>
        {auditErr && (
          <CardContent className="pt-0">
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {auditErr}
            </p>
          </CardContent>
        )}
        {audit && (
          <CardContent className="pt-0">
            {audit.already_ran ? (
              <p className="text-sm text-zinc-500">
                {t("Already ran for today ({audit}).", { audit: audit.audit ?? "" })}
              </p>
            ) : (
              <p className="text-sm text-zinc-600">
                <span className="font-medium">{audit.audit}</span> -{" "}
                {t("posted {n} room night{s} ({amount}), opened {folios} folio{s2}, flagged {noShows} no-show{s3}.", {
                  n: audit.room_charges_posted ?? 0,
                  s: audit.room_charges_posted === 1 ? "" : "s",
                  amount: `${cur()}${inr(audit.amount_posted)}`,
                  folios: audit.folios_opened ?? 0,
                  s2: audit.folios_opened === 1 ? "" : "s",
                  noShows: audit.no_shows_flagged ?? 0,
                  s3: audit.no_shows_flagged === 1 ? "" : "s",
                })}
                {(audit.no_show_fees_waived ?? 0) > 0 && (
                  <>
                    {" "}
                    {t("No-show fee waived on {n} OTA booking(s).", { n: audit.no_show_fees_waived ?? 0 })}
                  </>
                )}
              </p>
            )}
            {!audit.already_ran && (audit.held_late_arrivals?.length ?? 0) > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="text-xs font-medium uppercase tracking-wider text-amber-800">
                  {t("Held late arrivals")}
                </div>
                <p className="mt-0.5 text-xs text-amber-700">
                  {t("Still Due In. The next night audit marks them no-show if they have not checked in.")}
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-amber-900">
                  {audit.held_late_arrivals!.map((h) => (
                    <li key={h.reservation} className="flex flex-wrap gap-x-2">
                      <button
                        type="button"
                        className="font-medium hover:underline"
                        onClick={() => navigate(`/reservations?q=${encodeURIComponent(h.reservation)}`)}
                      >
                        {h.guest_name || h.reservation}
                      </button>
                      <span className="text-amber-700">· {h.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
        {auditRuns.length > 0 && (
          <CardContent className="pt-0">
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
              {t("Recent runs")}
            </div>
            <ul className="divide-y divide-zinc-100 text-sm">
              {auditRuns.map((r) => (
                <li
                  key={String(r.name)}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-1.5"
                >
                  <span className="w-28 font-medium">
                    {fmtDate(r.business_date)}
                  </span>
                  <span className="flex-1 text-zinc-500">
                    {t("{n} night{s} · {amount} · {folios} folio{s2} · {noShows} no-show{s3}", {
                      n: Number(r.room_charges_posted) || 0,
                      s: Number(r.room_charges_posted) === 1 ? "" : "s",
                      amount: `${cur()}${inr(r.amount_posted)}`,
                      folios: Number(r.folios_opened) || 0,
                      s2: Number(r.folios_opened) === 1 ? "" : "s",
                      noShows: Number(r.no_shows_flagged) || 0,
                      s3: Number(r.no_shows_flagged) === 1 ? "" : "s",
                    })}
                    {Number(r.late_arrivals_held) > 0 &&
                      ` · ${t("{n} late arrival(s) held", { n: Number(r.late_arrivals_held) })}`}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {t("ran {when}", { when: fmtWhen(r.creation) })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("Cashier till")}</CardTitle>
            <p className="mt-0.5 text-xs text-zinc-400">
              {t("Open your till, reconcile cash and close the session under Finance → Cashier. Collections live there now.")}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/cashier")}>
            {t("Open My Till")}
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Folios")}</CardTitle>
          <span className="text-xs text-zinc-400">
            {t("Click a folio to post charges, settle and print the GST invoice")}
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <th className="py-2 pr-4">{t("Folio")}</th>
                  <th className="py-2 pr-4">{t("Guest")}</th>
                  <th className="py-2 pr-4">{t("Status")}</th>
                  <th className="py-2 pr-4">{t("Invoice")}</th>
                  <th className="py-2 pr-4">{t("Total {cur}", { cur: cur() })}</th>
                  <th className="py-2 pr-4">{t("Paid {cur}", { cur: cur() })}</th>
                  <th className="py-2 pr-4">{t("Balance {cur}", { cur: cur() })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {folios.map((f) => (
                  <tr
                    key={f.name}
                    className="cursor-pointer hover:bg-zinc-50"
                    onClick={() => navigate(`/billing/${encodeURIComponent(f.name)}`)}
                  >
                    <td className="py-2.5 pr-4 font-medium">{f.name}</td>
                    <td className="py-2.5 pr-4">{String(f.guest_name ?? "-")}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={f.status === "Open" ? "amber" : "green"}>
                        {t(String(f.status))}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-zinc-500">
                      {String(f.invoice_number ?? "-")}
                    </td>
                    <td className="py-2.5 pr-4">{cur()}{inr(f.grand_total)}</td>
                    <td className="py-2.5 pr-4">{cur()}{inr(f.payments_total)}</td>
                    <td className="py-2.5 pr-4 font-medium">
                      {Number(f.balance) > 0 ? (
                        <span className="text-amber-600">{cur()}{inr(f.balance)}</span>
                      ) : (
                        <span className="text-emerald-600">{cur()}0</span>
                      )}
                    </td>
                  </tr>
                ))}
                {folios.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-zinc-400">
                      {t("No folios yet - they open automatically at check-in.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
