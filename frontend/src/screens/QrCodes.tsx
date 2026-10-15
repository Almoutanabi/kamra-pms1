/*  Printable QR codes for the guest links that already exist: QR ordering
    per restaurant table (/menu/:outlet?table=) and in-room dining per room
    (the Room Service outlet's menu, ?room=). The links come from the server
    (pos.qr_targets); the codes are drawn here in the browser with the
    `qrcode` library - no QR web service ever sees a link. Download one code
    as PNG or SVG, or print an A4 sheet of cards: property name, table or
    room label, and the code. */

import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import QRCode from "qrcode"
import { Check, Copy, Download, Printer, QrCode } from "lucide-react"
import { call, getCurrentProperty } from "../lib/api"
import { serverError } from "../lib/resource"
import { Button } from "../components/ui/button"
import { cn } from "../lib/utils"
import { useT } from "../lib/i18n"

interface QrTargets {
  property_name: string
  outlets: {
    outlet: string
    outlet_name: string
    outlet_type: string
    menu_url: string
    tables: { table: string; seats: number | null; area: string | null; url: string }[]
  }[]
  room_service: { outlet: string; outlet_name: string } | null
  rooms: { room: string; room_number: string; room_type: string; floor: string | null; url: string | null }[]
}

interface Target {
  key: string
  title: string
  subtitle: string
  hint: string
  url: string
  file: string
}

type Tab = "tables" | "rooms"
const PER_PAGE = 12 // 3 x 4 cards on one A4 page

function useSvg(url: string) {
  const [svg, setSvg] = useState("")
  useEffect(() => {
    let live = true
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((s) => live && setSvg(s))
      .catch(() => live && setSvg(""))
    return () => {
      live = false
    }
  }, [url])
  return svg
}

/** The QR as inline SVG - generated locally from our own URL. */
function QrImage({ url, className }: { url: string; className?: string }) {
  const svg = useSvg(url)
  return (
    <div
      className={cn("aspect-square [&>svg]:size-full", className)}
      role="img"
      aria-label={url}
      // the markup is the qrcode library's output for a URL we built
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

function save(href: string, name: string) {
  const a = document.createElement("a")
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function downloadPng(t: Target) {
  const data = await QRCode.toDataURL(t.url, { width: 1024, margin: 2, errorCorrectionLevel: "M" })
  save(data, `${t.file}.png`)
}

async function downloadSvg(t: Target) {
  const svg = await QRCode.toString(t.url, { type: "svg", margin: 2, errorCorrectionLevel: "M" })
  const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
  save(href, `${t.file}.svg`)
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

const slug = (s: string) => s.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase()

export default function QrCodes() {
  const { t } = useT()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get("tab") === "rooms" ? "rooms" : "tables"
  const [data, setData] = useState<QrTargets | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [outlet, setOutlet] = useState("")
  const [floor, setFloor] = useState("All")
  const [copied, setCopied] = useState("")

  useEffect(() => {
    call<QrTargets>("kamra.pos.qr_targets", { property: getCurrentProperty() })
      .then((d) => {
        setData(d)
        setOutlet((o) => o || d.outlets.find((x) => x.tables.length)?.outlet || "")
      })
      .catch((e) => setError(serverError(e)))
  }, [])

  const targets: Target[] = useMemo(() => {
    if (!data) return []
    if (tab === "tables") {
      const o = data.outlets.find((x) => x.outlet === outlet)
      if (!o) return []
      return o.tables.map((tb) => ({
        key: `${o.outlet}|${tb.table}`,
        title: t("Table {n}", { n: tb.table }),
        subtitle: [o.outlet_name, tb.area].filter(Boolean).join(" · "),
        hint: t("Scan to see the menu and order"),
        url: tb.url,
        file: `qr-${slug(o.outlet_name)}-table-${slug(tb.table)}`,
      }))
    }
    return data.rooms
      .filter((r) => r.url && (floor === "All" || r.floor === floor))
      .map((r) => ({
        key: r.room,
        title: t("Room {n}", { n: r.room_number }),
        subtitle: data.room_service?.outlet_name ?? "",
        hint: t("Scan for in-room dining"),
        url: r.url as string,
        file: `qr-room-${slug(r.room_number)}`,
      }))
  }, [data, tab, outlet, floor, t])

  const pages = useMemo(() => {
    const out: Target[][] = []
    for (let i = 0; i < targets.length; i += PER_PAGE) out.push(targets.slice(i, i + PER_PAGE))
    return out
  }, [targets])

  if (error)
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
    )
  if (!data) return <p className="py-10 text-center text-zinc-400">{t("Loading…")}</p>

  const floors = Array.from(new Set(data.rooms.map((r) => r.floor).filter(Boolean))).sort() as string[]
  const tableOutlets = data.outlets.filter((o) => o.tables.length > 0)

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied(""), 1500)
    } catch {
      /* clipboard blocked - the link is shown on the card */
    }
  }

  return (
    <div className="space-y-4">
      <style>{"@media print { @page { size: A4; margin: 10mm } }"}</style>

      <div className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
              <QrCode className="size-5 text-zinc-400" aria-hidden />
              {t("QR codes")}
            </h1>
            <p className="text-sm text-zinc-500">
              {t("Table ordering and in-room dining codes for {property}. Drawn on this device - no outside QR service.", {
                property: data.property_name,
              })}
            </p>
          </div>
          <Button disabled={targets.length === 0} onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            {t("Print sheet")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-sm">
            {(["tables", "rooms"] as Tab[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setParams(k === "rooms" ? { tab: "rooms" } : {})}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium",
                  tab === k ? "bg-white text-brand-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700",
                )}
              >
                {k === "tables" ? t("Restaurant tables") : t("Rooms")}
              </button>
            ))}
          </div>
          {tab === "tables" && tableOutlets.length > 1 && (
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm"
              aria-label={t("Outlet")}
              value={outlet}
              onChange={(e) => setOutlet(e.target.value)}
            >
              {tableOutlets.map((o) => (
                <option key={o.outlet} value={o.outlet}>
                  {o.outlet_name}
                </option>
              ))}
            </select>
          )}
          {tab === "rooms" && floors.length > 1 && (
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm"
              aria-label={t("Floor")}
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            >
              <option value="All">{t("All Floors")}</option>
              {floors.map((f) => (
                <option key={f} value={f}>
                  {t("Floor {f}", { f })}
                </option>
              ))}
            </select>
          )}
          <span className="text-sm text-zinc-400">
            {t("{n} codes", { n: targets.length })}
            {pages.length > 1 ? ` · ${t("{n} A4 pages", { n: pages.length })}` : ""}
          </span>
        </div>

        {tab === "tables" && tableOutlets.length === 0 && (
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-500">
            {t("No outlet has tables yet. List them on the outlet (e.g. T1:4, T2) to get a code per table.")}{" "}
            <Link to="/outlets" className="font-medium text-brand-700 hover:underline">
              {t("Outlets")}
            </Link>
          </p>
        )}
        {tab === "rooms" && !data.room_service && (
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-500">
            {t("Add a Room Service outlet to give each room an in-room dining code.")}{" "}
            <Link to="/outlets" className="font-medium text-brand-700 hover:underline">
              {t("Outlets")}
            </Link>
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {targets.map((tg) => (
            <div key={tg.key} className="rounded-xl border border-zinc-200 bg-white p-3">
              <QrImage url={tg.url} className="mx-auto w-full max-w-40 rounded bg-white p-1" />
              <div className="mt-2 truncate text-sm font-semibold text-zinc-900">{tg.title}</div>
              <div className="truncate text-xs text-zinc-500">{tg.subtitle}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => downloadPng(tg)}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:border-brand-600 hover:text-brand-700"
                >
                  <Download className="size-3" aria-hidden /> PNG
                </button>
                <button
                  type="button"
                  onClick={() => downloadSvg(tg)}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:border-brand-600 hover:text-brand-700"
                >
                  <Download className="size-3" aria-hidden /> SVG
                </button>
                <button
                  type="button"
                  onClick={() => copy(tg.url)}
                  title={tg.url}
                  aria-label={t("Copy link")}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:border-brand-600 hover:text-brand-700"
                >
                  {copied === tg.url ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* the print sheet: A4 pages of 3 x 4 cards, cut along the borders */}
      <div className="hidden print:block">
        {pages.map((page, i) => (
          <div
            key={i}
            className="grid grid-cols-3 gap-[4mm]"
            style={{ breakAfter: i < pages.length - 1 ? "page" : "auto" }}
          >
            {page.map((tg) => (
              <div
                key={tg.key}
                className="flex h-[66mm] flex-col items-center justify-between rounded-lg border border-dashed border-zinc-400 p-[3mm] text-center text-black"
                style={{ breakInside: "avoid" }}
              >
                <div className="w-full truncate text-[9pt] font-medium text-zinc-600">{data.property_name}</div>
                <QrImage url={tg.url} className="w-[38mm]" />
                <div className="w-full">
                  <div className="truncate text-[13pt] font-bold">{tg.title}</div>
                  <div className="truncate text-[8pt] text-zinc-600">{tg.hint}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
