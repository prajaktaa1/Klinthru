import { ReportRecord } from "../types/domain";
import {
  buildReportContextSection,
  buildReportInputSections,
  buildReportResultSection,
  DEMO_SCREENING_NOTICE,
  type ReportSnapshotSource,
  type SnapshotSection
} from "./reportSnapshot";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 44;
const FOOTER_HEIGHT = 28;
const CONTENT_TOP = PAGE_HEIGHT - PAGE_MARGIN;
const CONTENT_BOTTOM = PAGE_MARGIN + FOOTER_HEIGHT;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const LABEL_COLUMN_WIDTH = 170;
const VALUE_COLUMN_WIDTH = CONTENT_WIDTH - LABEL_COLUMN_WIDTH - 18;
const ROW_PADDING_Y = 8;
const BODY_FONT_SIZE = 10;
const SMALL_FONT_SIZE = 9;
const TITLE_FONT_SIZE = 21;
const SECTION_FONT_SIZE = 13;
const LINE_HEIGHT = 14;
const RULE_COLOR = "0.86 0.89 0.94";
const HEADER_BACKGROUND = "0.95 0.97 1";
const NOTICE_BACKGROUND = "0.99 0.96 0.87";
const NOTICE_BORDER = "0.93 0.82 0.47";
const TEXT_COLOR = "0.06 0.09 0.16";
const SUBTLE_TEXT_COLOR = "0.31 0.36 0.45";

type PageDrawContext = {
  commands: string[];
  y: number;
};

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function estimateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.52;
}

function wrapText(text: string, width: number, fontSize: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return ["Not provided"];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (estimateTextWidth(next, fontSize) <= width || !current) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function beginText(commands: string[], font: "F1" | "F2", fontSize: number, x: number, y: number, text: string) {
  commands.push("BT");
  commands.push(`${TEXT_COLOR} rg`);
  commands.push(`/${font} ${fontSize} Tf`);
  commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
  commands.push(`(${escapePdfText(text)}) Tj`);
  commands.push("ET");
}

function drawWrappedText(
  commands: string[],
  font: "F1" | "F2",
  fontSize: number,
  x: number,
  y: number,
  lines: string[],
  color = TEXT_COLOR
) {
  commands.push("BT");
  commands.push(`${color} rg`);
  commands.push(`/${font} ${fontSize} Tf`);
  commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
  commands.push(`${LINE_HEIGHT} TL`);
  lines.forEach((line, index) => {
    if (index > 0) {
      commands.push("T*");
    }
    commands.push(`(${escapePdfText(line)}) Tj`);
  });
  commands.push("ET");
}

function drawFilledRect(commands: string[], x: number, y: number, width: number, height: number, color: string) {
  commands.push(`${color} rg`);
  commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
}

function drawStrokedRect(commands: string[], x: number, y: number, width: number, height: number, color: string) {
  commands.push(`${color} RG`);
  commands.push("0.8 w");
  commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`);
}

function drawHorizontalRule(commands: string[], y: number) {
  commands.push(`${RULE_COLOR} RG`);
  commands.push("0.8 w");
  commands.push(`${PAGE_MARGIN.toFixed(2)} ${y.toFixed(2)} m ${(PAGE_WIDTH - PAGE_MARGIN).toFixed(2)} ${y.toFixed(2)} l S`);
}

function createPage() {
  return { commands: [] as string[], y: CONTENT_TOP };
}

function ensureSpace(pages: PageDrawContext[], requiredHeight: number) {
  let page = pages[pages.length - 1];
  if (page.y - requiredHeight < CONTENT_BOTTOM) {
    page = createPage();
    pages.push(page);
  }
  return page;
}

function drawTitle(page: PageDrawContext, report: ReportRecord) {
  beginText(page.commands, "F2", TITLE_FONT_SIZE, PAGE_MARGIN, page.y, "Klinthru Demo Snapshot");
  page.y -= 28;
  drawWrappedText(
    page.commands,
    "F1",
    SMALL_FONT_SIZE,
    PAGE_MARGIN,
    page.y,
    wrapText(report.pipelineName, CONTENT_WIDTH, SMALL_FONT_SIZE),
    SUBTLE_TEXT_COLOR
  );
  page.y -= 22;
}

function drawNotice(page: PageDrawContext) {
  const lines = wrapText(DEMO_SCREENING_NOTICE, CONTENT_WIDTH - 24, SMALL_FONT_SIZE);
  const height = lines.length * LINE_HEIGHT + 16;
  const boxY = page.y - height + 8;
  drawFilledRect(page.commands, PAGE_MARGIN, boxY, CONTENT_WIDTH, height, NOTICE_BACKGROUND);
  drawStrokedRect(page.commands, PAGE_MARGIN, boxY, CONTENT_WIDTH, height, NOTICE_BORDER);
  drawWrappedText(page.commands, "F2", SMALL_FONT_SIZE, PAGE_MARGIN + 12, page.y - 6, lines, TEXT_COLOR);
  page.y -= height + 12;
}

function drawSectionHeading(page: PageDrawContext, title: string) {
  const headerHeight = 28;
  const boxY = page.y - headerHeight + 8;
  drawFilledRect(page.commands, PAGE_MARGIN, boxY, CONTENT_WIDTH, headerHeight, HEADER_BACKGROUND);
  drawStrokedRect(page.commands, PAGE_MARGIN, boxY, CONTENT_WIDTH, headerHeight, RULE_COLOR);
  beginText(page.commands, "F2", SECTION_FONT_SIZE, PAGE_MARGIN + 12, page.y - 10, title);
  page.y -= headerHeight + 8;
}

function drawRows(pages: PageDrawContext[], section: SnapshotSection) {
  let page = ensureSpace(pages, 60);
  drawSectionHeading(page, section.title);

  for (const row of section.rows) {
    const labelLines = wrapText(row.label, LABEL_COLUMN_WIDTH, BODY_FONT_SIZE);
    const valueLines = wrapText(row.value, VALUE_COLUMN_WIDTH, BODY_FONT_SIZE);
    const lines = Math.max(labelLines.length, valueLines.length);
    const height = lines * LINE_HEIGHT + ROW_PADDING_Y * 2;
    page = ensureSpace(pages, height + 8);

    const top = page.y;
    drawHorizontalRule(page.commands, top);
    drawWrappedText(page.commands, "F2", BODY_FONT_SIZE, PAGE_MARGIN, top - 14, labelLines);
    drawWrappedText(
      page.commands,
      "F1",
      BODY_FONT_SIZE,
      PAGE_MARGIN + LABEL_COLUMN_WIDTH + 18,
      top - 14,
      valueLines
    );
    page.y -= height;
  }

  drawHorizontalRule(page.commands, page.y);
  page.y -= 18;
}

function buildSnapshotSections(source: ReportSnapshotSource) {
  return [
    buildReportContextSection(source),
    ...buildReportInputSections(source),
    buildReportResultSection(source)
  ];
}

function buildPages(source: ReportSnapshotSource) {
  const pages = [createPage()];
  drawTitle(pages[0], source.report);
  drawNotice(pages[0]);

  for (const section of buildSnapshotSections(source)) {
    drawRows(pages, section);
  }

  return pages;
}

function buildPdfContent(pages: PageDrawContext[]) {
  return pages.map((page, index) => {
    const pageNumber = `Page ${index + 1} of ${pages.length}`;
    beginText(page.commands, "F1", SMALL_FONT_SIZE, PAGE_MARGIN, PAGE_MARGIN - 4, pageNumber);
    return page.commands.join("\n");
  });
}

function buildPdfDocument(pageStreams: string[]) {
  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  const contentObjectNumbers: number[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  for (const stream of pageStreams) {
    const pageNumber = objects.length + 1;
    const contentNumber = pageNumber + 1;
    pageObjectNumbers.push(pageNumber);
    contentObjectNumbers.push(contentNumber);

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentNumber} 0 R /Resources << /Font << /F1 ${
        pageStreams.length * 2 + 3
      } 0 R /F2 ${pageStreams.length * 2 + 4} 0 R >> >> >>`
    );
    objects.push(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
  }

  objects.splice(1, 0, `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildWordSections(source: ReportSnapshotSource) {
  return buildSnapshotSections(source)
    .map(
      (section) => `<section>
  <h2>${escapeHtml(section.title)}</h2>
  <table>
    <tbody>
      ${section.rows
        .map(
          (row) => `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>
</section>`
    )
    .join("");
}

export function createReportPdf(source: ReportSnapshotSource) {
  return buildPdfDocument(buildPdfContent(buildPages(source)));
}

export function createReportWord(source: ReportSnapshotSource) {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(source.report.pipelineName)}</title>
    <style>
      @page { size: A4; margin: 20mm 15mm 18mm; }
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
      h1 { font-size: 24px; margin: 0 0 8px; }
      h2 { font-size: 18px; margin: 28px 0 12px; }
      p.notice { margin: 16px 0 22px; padding: 12px 14px; border: 1px solid #e9b94a; background: #fef3c7; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; page-break-inside: avoid; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { width: 34%; background: #f8fafc; }
      .meta { color: #475569; margin-bottom: 18px; }
    </style>
  </head>
  <body>
    <h1>Klinthru Demo Snapshot</h1>
    <p class="meta">${escapeHtml(source.report.pipelineName)}</p>
    <p class="notice">${escapeHtml(DEMO_SCREENING_NOTICE)}</p>
    ${buildWordSections(source)}
  </body>
</html>`;

  return Buffer.from(html, "utf8");
}
