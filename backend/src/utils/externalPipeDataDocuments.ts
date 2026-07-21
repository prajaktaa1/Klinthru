import { AssessmentPipeDataRecord } from "../types/domain";

type Section = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

function prettyLabel(value: string) {
  return value
    .replace(/Id/g, "ID")
    .replace(/Ph/g, "pH")
    .replace(/Scc/g, "SCC")
    .replace(/Mic/g, "MIC")
    .replace(/Ac/g, "AC")
    .replace(/Cp/g, "CP")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase())
    .trim();
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return String(value);
}

function formatInputValue(key: string, input: Record<string, unknown>) {
  if (key === "pipeIdDiameter") {
    const displayValue =
      typeof input.pipeIdDiameterDisplayValue === "number" ? input.pipeIdDiameterDisplayValue : input[key];
    const unit = typeof input.pipeIdDiameterUnit === "string" ? input.pipeIdDiameterUnit : "mm";
    return `${formatValue(displayValue)} ${unit}`;
  }

  const unitMap: Record<string, string> = {
    pipeAge: "years",
    pipeLength: "km",
    wallThickness: "mm",
    soilMoisture: "%",
    soilResistivity: "ohm-m",
    soilTemperature: "deg C",
    chloride: "mg/kg",
    sulphate: "mg/kg",
    sulphideH2S: "mg/kg",
    soilCarbonateContent: "mg/kg",
    redoxPotential: "mV",
    dcCurrentDensity: "A/m^2",
    strayCurrentDensity: "A/m^2"
  };

  if (key === "cpInputValue") {
    const unit = input.cpInputType === "CP Polarized Potential" ? "V vs CSE" : "mV";
    return `${formatValue(input[key])} ${unit}`;
  }

  if (key === "acInputValue") {
    const unit =
      input.acInputType === "AC Voltage to Remote Earth" ||
      input.acInputType === "Pipe AC Voltage to Remote Earth"
        ? "V"
        : "A/m^2";
    return `${formatValue(input[key])} ${unit}`;
  }

  if (unitMap[key]) {
    return `${formatValue(input[key])} ${unitMap[key]}`;
  }

  return formatValue(input[key]);
}

function formatResultValue(key: string, result: Record<string, unknown>) {
  const unitMap: Record<string, string> = {
    corrosionRate: "mm/y",
    corrosionDepth: "mm",
    remainingLife: "years",
    strayCurrentCorrosionRate: "mm/y",
    riskScore: ""
  };

  const unit = unitMap[key];
  if (unit !== undefined) {
    return unit ? `${formatValue(result[key])} ${unit}` : formatValue(result[key]);
  }

  return formatValue(result[key]);
}

function buildSections(record: AssessmentPipeDataRecord): Section[] {
  const input = record.assessment.input as Record<string, unknown>;
  const result = record.assessment.result as Record<string, unknown>;
  const inputRows = Object.entries(input)
    .filter(([key]) => key !== "pipeIdDiameterUnit" && key !== "pipeIdDiameterDisplayValue")
    .map(([key]) => ({
      label: prettyLabel(key),
      value: formatInputValue(key, input)
    }));
  const resultRows = Object.entries(result).map(([key]) => ({
    label: prettyLabel(key),
    value: formatResultValue(key, result)
  }));

  return [
    {
      title: "Record Summary",
      rows: [
        { label: "Record ID", value: record.id },
        { label: "Assessment Type", value: record.assessmentType },
        { label: "Pipeline Name", value: record.pipelineName },
        { label: "Pipe ID", value: record.pipeId || "Not available" },
        { label: "Location ID", value: record.locationId || "Not available" },
        { label: "Saved At", value: new Date(record.savedAt).toLocaleString("en-US") },
        { label: "Saved By", value: `${record.savedByName}${record.savedByEmail ? ` (${record.savedByEmail})` : ""}` }
      ]
    },
    { title: "Input Data", rows: inputRows },
    { title: "Assessment Output", rows: resultRows }
  ];
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function createAssessmentPipeDataPdf(record: AssessmentPipeDataRecord) {
  const sections = buildSections(record);
  const lines = ["Klinthru Assessment Pipe Data"];

  for (const section of sections) {
    lines.push("");
    lines.push(section.title);
    for (const row of section.rows) {
      lines.push(`${row.label}: ${row.value}`);
    }
  }

  const contentLines: string[] = ["BT", "/F1 10 Tf", "40 800 Td", "14 TL"];
  lines.forEach((line, index) => {
    if (index === 0) {
      contentLines.push(`(${escapePdfText(line)}) Tj`);
      return;
    }

    contentLines.push("T*");
    contentLines.push(`(${escapePdfText(line)}) Tj`);
  });
  contentLines.push("ET");

  const stream = contentLines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];

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

export function createAssessmentPipeDataWord(record: AssessmentPipeDataRecord) {
  const sections = buildSections(record);
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(record.pipelineName)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
      h1 { font-size: 24px; margin-bottom: 8px; }
      h2 { font-size: 18px; margin-top: 28px; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #e2e8f0; width: 34%; }
    </style>
  </head>
  <body>
    <h1>Klinthru Assessment Pipe Data</h1>
    ${sections
      .map(
        (section) => `<h2>${escapeHtml(section.title)}</h2>
      <table>
        <tbody>
          ${section.rows
            .map(
              (row) => `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>`
      )
      .join("")}
  </body>
</html>`;

  return Buffer.from(html, "utf8");
}
