import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, FileText, Sheet, Table } from 'lucide-react'
import { format, parseISO } from 'date-fns'

function formatRows(results) {
  return results.map((r) => ({
    ID: r.id,
    Timestamp: format(parseISO(r.timestamp), 'yyyy-MM-dd HH:mm:ss'),
    'Download (Mbps)': r.download_mbps,
    'Upload (Mbps)': r.upload_mbps,
    'Ping (ms)': r.ping_ms,
    Server: r.server_name,
    Sponsor: r.server_sponsor,
    Location: r.server_location,
    ISP: r.isp,
    'IP Address': r.ip_address,
    'Triggered By': r.triggered_by,
  }))
}

function exportCSV(results) {
  const rows = formatRows(results)
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
  download('pulsenet-results.csv', 'text/csv', csv)
}

async function exportXLSX(results) {
  const { utils, writeFile } = await import('xlsx')
  const ws = utils.json_to_sheet(formatRows(results))
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Results')
  writeFile(wb, 'pulsenet-results.xlsx')
}

async function exportPDF(results) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  doc.setFontSize(16)
  doc.setTextColor(0, 212, 245)
  doc.text('PulseNet — Speed Test Results', 40, 40)
  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)
  doc.text(`Exported ${format(new Date(), 'yyyy-MM-dd HH:mm')} · ${results.length} records`, 40, 58)

  autoTable(doc, {
    startY: 72,
    head: [['#', 'Timestamp', 'Download', 'Upload', 'Ping', 'Server', 'ISP', 'Triggered']],
    body: results.map((r) => [
      r.id,
      format(parseISO(r.timestamp), 'yyyy-MM-dd HH:mm'),
      `${r.download_mbps} Mbps`,
      `${r.upload_mbps} Mbps`,
      `${r.ping_ms} ms`,
      r.server_sponsor || r.server_name || '—',
      r.isp || '—',
      r.triggered_by,
    ]),
    styles: { fontSize: 9, cellPadding: 5, textColor: [220, 230, 240], fillColor: [11, 18, 32] },
    headStyles: { fillColor: [0, 212, 245], textColor: [5, 9, 17], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [15, 25, 41] },
    theme: 'grid',
  })

  doc.save('pulsenet-results.pdf')
}

function download(filename, mime, content) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const OPTIONS = [
  { id: 'csv',  label: 'Export as CSV',  icon: FileText, fn: exportCSV },
  { id: 'xlsx', label: 'Export as XLSX', icon: Sheet,    fn: exportXLSX },
  { id: 'pdf',  label: 'Export as PDF',  icon: Table,    fn: exportPDF },
]

export default function ExportMenu({ results }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const run = async (opt) => {
    setOpen(false)
    setBusy(opt.id)
    try { await opt.fn(results) } catch (e) { console.error(e) } finally { setBusy(null) }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary"
        onClick={() => setOpen((v) => !v)}
        disabled={!results.length}
        style={{ fontSize: 13, padding: '8px 14px' }}
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} style={{ marginLeft: -2, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          minWidth: 180,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 50,
          overflow: 'hidden',
          animation: 'fade-in-fast 0.15s ease',
        }}>
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => run(opt)}
              disabled={busy === opt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'left',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <opt.icon size={14} color="var(--accent-cyan)" />
              {busy === opt.id ? 'Exporting…' : opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
