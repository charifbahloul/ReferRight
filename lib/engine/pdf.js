// Minimal, dependency-free PDF generator.
//
// Produces a valid single- or multi-page PDF (Letter, Helvetica) from a simple
// block list and returns a Blob the browser can download. No external library
// or network call required — keeps the demo self-contained.

const PAGE_W = 612; // 8.5in * 72
const PAGE_H = 792; // 11in * 72
const MARGIN = 56;
const LINE = 16;

function esc(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Rough character-count wrap (Helvetica ~ 0.5em average at given size).
function wrap(text, size, maxWidth) {
  const charsPerLine = Math.max(8, Math.floor(maxWidth / (size * 0.5)));
  const words = String(text ?? "").split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > charsPerLine) {
      if (cur) lines.push(cur);
      cur = w.length > charsPerLine ? w.slice(0, charsPerLine) : w;
    } else {
      cur = (cur ? cur + " " : "") + w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/**
 * blocks: array of { text, size?, bold?, gap? } rendered top-to-bottom.
 * Returns a Blob (application/pdf).
 */
export function buildPdf(blocks) {
  const usableW = PAGE_W - MARGIN * 2;
  // Lay out into pages of text-show operations.
  const pages = [[]];
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    pages.push([]);
    y = PAGE_H - MARGIN;
  };

  for (const b of blocks) {
    const size = b.size || 11;
    const font = b.bold ? "F2" : "F1";
    const lines = wrap(b.text, size, usableW);
    for (const ln of lines) {
      if (y < MARGIN + LINE) newPage();
      pages[pages.length - 1].push(
        `BT /${font} ${size} Tf 1 0 0 1 ${MARGIN} ${y.toFixed(1)} Tm (${esc(ln)}) Tj ET`
      );
      y -= size + 5;
    }
    y -= b.gap || 4;
  }

  // Assemble PDF objects.
  const objects = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>"); // 1
  const kids = [];
  const contentObjNums = [];
  // We'll know page object numbers after fonts. Layout:
  // 1 catalog, 2 pages, 3 font F1, 4 font F2, then per page: page obj + content obj.
  const fontF1Num = 3;
  const fontF2Num = 4;
  let next = 5;
  const pageObjs = [];
  for (let i = 0; i < pages.length; i++) {
    const pageNum = next++;
    const contentNum = next++;
    pageObjs.push({ pageNum, contentNum, ops: pages[i] });
    kids.push(`${pageNum} 0 R`);
    contentObjNums.push(contentNum);
  }
  objects.push(
    `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`
  ); // 2
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); // 3
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"); // 4

  for (const po of pageObjs) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 ${fontF1Num} 0 R /F2 ${fontF2Num} 0 R >> >> ` +
        `/Contents ${po.contentNum} 0 R >>`
    );
    const stream = po.ops.join("\n");
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  // Serialize with xref.
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const off of offsets) {
    pdf += String(off).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
