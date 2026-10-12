import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND: [number, number, number] = [255, 87, 34];
const INK: [number, number, number] = [28, 27, 26];
const MUTED: [number, number, number] = [110, 104, 98];
const LINE: [number, number, number] = [232, 224, 218];
const WASH: [number, number, number] = [255, 246, 243];
const MARGIN = 40;

export type PdfColumn = { key: string; label: string };
export type PdfKpi = { label: string; value: string };

export type PdfExportInput = {
  title: string;
  description?: string;
  filename: string;
  columns: PdfColumn[];
  rows: Record<string, unknown>[];
  meta?: string[];
  kpis?: PdfKpi[];
};

function plainCell(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const parts = value.map((item) => plainCell(item)).filter((part) => part && part !== "—");
    return parts.length ? parts.join(", ") : "—";
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string" && record.name.trim()) return record.name.trim();
    if (typeof record.label === "string" && record.label.trim()) return record.label.trim();
    return "—";
  }
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return "—";
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

function drawFirstHeader(doc: jsPDF, input: PdfExportInput) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND);
  doc.text("ScopsK", MARGIN, 32);
  const markWidth = doc.getTextWidth("ScopsK");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Admin", MARGIN + markWidth + 6, 32);

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Restaurant and supplier marketplace", MARGIN, 46);

  const when = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  doc.setFontSize(9);
  doc.text("Exported", pageWidth - MARGIN, 28, { align: "right" });
  doc.setTextColor(...INK);
  doc.text(when, pageWidth - MARGIN, 42, { align: "right" });

  let y = 72;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(input.title, pageWidth - MARGIN * 2) as string[];
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 18 + 2;

  if (input.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    const description = (doc.splitTextToSize(input.description, pageWidth - MARGIN * 2) as string[]).slice(0, 3);
    doc.text(description, MARGIN, y);
    y += description.length * 13 + 4;
  }

  if (input.meta?.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    const meta = (doc.splitTextToSize(input.meta.join("   ·   "), pageWidth - MARGIN * 2) as string[]).slice(0, 2);
    doc.text(meta, MARGIN, y);
    y += meta.length * 12 + 2;
  }

  if (input.kpis?.length) {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const summary = input.kpis.map((kpi) => `${kpi.label}: ${kpi.value}`).join("     ");
    const lines = (doc.splitTextToSize(summary, pageWidth - MARGIN * 2) as string[]).slice(0, 2);
    doc.text(lines, MARGIN, y);
    y += lines.length * 12;
  }

  y += 6;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.7);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  return y + 14;
}

function drawContinuationHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND);
  doc.text("ScopsK", MARGIN, 24);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  const rest = doc.splitTextToSize(`Admin  ·  ${title}`, pageWidth - MARGIN - 90) as string[];
  doc.text(rest[0] ?? "", MARGIN + 52, 24);
}

function drawFooters(doc: jsPDF, title: string) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("ScopsK Admin  ·  Restaurant and supplier marketplace", MARGIN, pageHeight - 22);
    doc.text(`${title}  ·  ${page} / ${pages}`, pageWidth - MARGIN, pageHeight - 22, { align: "right" });
  }
}

/** Download the current page table as a simple branded PDF. */
export function downloadTablePdf(input: PdfExportInput) {
  const columns = input.columns.filter((column) => column.key && column.label);
  if (!columns.length) throw new Error("Nothing to export");

  const doc = new jsPDF({
    orientation: columns.length > 6 ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });
  const startY = drawFirstHeader(doc, input);
  const fontSize = columns.length > 8 ? 7.5 : 9;
  const body = input.rows.length
    ? input.rows.map((row) => columns.map((column) => plainCell(row[column.key])))
    : [[
        {
          content: "No rows to export",
          colSpan: columns.length,
          styles: { halign: "center" as const, textColor: MUTED },
        },
      ]];

  autoTable(doc, {
    startY,
    margin: { top: 40, right: MARGIN, bottom: 36, left: MARGIN },
    head: [columns.map((column) => column.label)],
    body,
    theme: "plain",
    showHead: "everyPage",
    styles: {
      font: "helvetica",
      fontSize,
      textColor: INK,
      cellPadding: 5,
      overflow: "linebreak",
      valign: "middle",
      lineColor: LINE,
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: BRAND,
      textColor: 255,
      fontStyle: "bold",
      fontSize,
    },
    alternateRowStyles: { fillColor: WASH },
    willDrawPage: (data) => {
      if (data.pageNumber > 1) drawContinuationHeader(doc, input.title);
    },
  });

  drawFooters(doc, input.title);
  const filename = input.filename.toLowerCase().endsWith(".pdf") ? input.filename : `${input.filename}.pdf`;
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
