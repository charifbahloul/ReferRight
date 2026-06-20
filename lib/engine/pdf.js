// Dependency-free PDF generator that recreates the Women's College Hospital
// GASTROENTEROLOGY (GI) CLINIC Referral Form (Form F-5097), drawn with PDF
// primitives — bordered field cells, section bars, checkboxes, rules — so the
// demo download looks like the real hospital intake form. No external library
// or network call required.

const PAGE_W = 612; // 8.5in * 72
const PAGE_H = 792; // 11in * 72
const MARGIN = 42;
const USABLE_W = PAGE_W - MARGIN * 2;

// Palette (PDF colors are 0..1 floats).
const C = {
  ink: [0.11, 0.15, 0.21],
  sub: [0.42, 0.47, 0.54],
  label: [0.25, 0.3, 0.38],
  bar: [0.12, 0.16, 0.24],
  barText: [1, 1, 1],
  accent: [0.11, 0.3, 0.85], // brand blue
  border: [0.72, 0.76, 0.82],
  soft: [0.95, 0.96, 0.98],
  faint: [0.86, 0.88, 0.92],
};

// Map Unicode smart-punctuation to WinAnsi byte values so accented names
// (é, ç…) and typographic marks (—, ·, •, ’) render instead of garbling.
const WINANSI = {
  0x20ac: 0x80, 0x201a: 0x82, 0x192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x2c6: 0x88, 0x2030: 0x89, 0x160: 0x8a,
  0x2039: 0x8b, 0x152: 0x8c, 0x17d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x2dc: 0x98, 0x2122: 0x99, 0x161: 0x9a, 0x203a: 0x9b, 0x153: 0x9c,
  0x17e: 0x9e, 0x178: 0x9f,
};

function esc(s) {
  let out = "";
  for (const ch of String(s ?? "")) {
    const cp = ch.codePointAt(0);
    if (ch === "\\") out += "\\\\";
    else if (ch === "(") out += "\\(";
    else if (ch === ")") out += "\\)";
    else if (cp < 0x80) out += ch;
    else {
      const byte = WINANSI[cp] ?? (cp <= 0xff ? cp : 0x3f);
      out += "\\" + byte.toString(8).padStart(3, "0");
    }
  }
  return out;
}

// Approximate Helvetica text width (good enough for centering / right-align).
function textWidth(s, size, bold) {
  return String(s ?? "").length * size * (bold ? 0.55 : 0.5);
}

// Character-count word wrap.
function wrap(text, size, maxWidth, bold) {
  const per = bold ? 0.55 : 0.5;
  const charsPerLine = Math.max(6, Math.floor(maxWidth / (size * per)));
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

function ddmmyyyy(d) {
  const dt = d instanceof Date ? d : new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(dt.getDate())} / ${p(dt.getMonth() + 1)} / ${dt.getFullYear()}`;
}

/**
 * Render the Women's College GI Clinic Referral Form.
 *
 * data = {
 *   patient:    { postal_code, language_preference, accessibility_needs },
 *   parsed:     { specialty_intent, conditions[], urgency, red_flags[] },
 *   formValues: { reason_for_referral, red_flags, relevant_labs, medications,
 *                 prior_endoscopy, ... },
 *   provider:   { name, clinic },
 *   conditionLabel?: fn
 * }
 */
export function buildReferralPdf(data = {}) {
  const { patient = {}, parsed = {}, formValues = {}, provider = {} } = data;
  const cl = typeof data.conditionLabel === "function" ? data.conditionLabel : (x) => x;

  const ops = [];
  let y = PAGE_H - MARGIN;

  // --- drawing helpers -----------------------------------------------------
  const setFill = (c) => ops.push(`${c[0]} ${c[1]} ${c[2]} rg`);
  const setStroke = (c) => ops.push(`${c[0]} ${c[1]} ${c[2]} RG`);
  const rectFill = (x, yTop, w, h, c) => {
    setFill(c);
    ops.push(`${x.toFixed(1)} ${(yTop - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  };
  const rectStroke = (x, yTop, w, h, c, lw = 0.7) => {
    setStroke(c);
    ops.push(`${lw} w ${x.toFixed(1)} ${(yTop - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
  };
  const line = (x1, y1, x2, y2, c, lw = 0.7) => {
    setStroke(c);
    ops.push(`${lw} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
  };
  const draw = (s, x, baseline, { size = 9, bold = false, color = C.ink, align = "left", maxW = USABLE_W } = {}) => {
    const font = bold ? "F2" : "F1";
    let tx = x;
    if (align === "center") tx = x + (maxW - textWidth(s, size, bold)) / 2;
    else if (align === "right") tx = x + maxW - textWidth(s, size, bold);
    setFill(color);
    ops.push(`BT /${font} ${size} Tf 1 0 0 1 ${tx.toFixed(1)} ${baseline.toFixed(1)} Tm (${esc(s)}) Tj ET`);
  };

  // Section header bar.
  const sectionBar = (text) => {
    const h = 15;
    rectFill(MARGIN, y, USABLE_W, h, C.bar);
    draw(String(text).toUpperCase(), MARGIN + 7, y - 11, { size: 9, bold: true, color: C.barText });
    y -= h + 6;
  };

  // Inline labelled field with an underline rule. Returns nothing; advances y
  // only when called as a full row via row().
  const labelledField = (label, value, x, w, baseY) => {
    const ls = 8;
    draw(label, x, baseY, { size: ls, bold: true, color: C.label });
    const lw = textWidth(label, ls, true) + 6;
    const vx = x + lw;
    const vw = Math.max(20, w - lw);
    if (value) draw(String(value), vx, baseY, { size: 9, color: C.ink, maxW: vw });
    line(vx, baseY - 3, x + w, baseY - 3, C.border, 0.6);
  };

  // A horizontal row of one or two labelled fields.
  const row = (left, right) => {
    const baseY = y - 9;
    if (right) {
      const half = USABLE_W / 2;
      labelledField(left.label, left.value, MARGIN, half - 8, baseY);
      labelledField(right.label, right.value, MARGIN + half, half, baseY);
    } else {
      labelledField(left.label, left.value, MARGIN, USABLE_W, baseY);
    }
    y -= 18;
  };

  // Multi-line block: label then N ruled lines holding wrapped value text.
  const blockField = (label, value, lines = 2) => {
    draw(label, MARGIN, y - 9, { size: 8, bold: true, color: C.label });
    y -= 14;
    const valLines = value ? wrap(value, 9, USABLE_W - 4) : [];
    for (let i = 0; i < lines; i++) {
      if (valLines[i]) draw(valLines[i], MARGIN + 2, y - 8, { size: 9, color: C.ink });
      line(MARGIN, y - 11, PAGE_W - MARGIN, y - 11, C.border, 0.6);
      y -= 14;
    }
    y -= 1;
  };

  // Checkbox + caption. Returns the x just after the caption.
  const checkbox = (x, baseY, checked, caption, { size = 8.5, bold = false } = {}) => {
    rectStroke(x, baseY + 7.5, 8, 8, C.label, 0.8);
    if (checked) draw("X", x + 1.5, baseY, { size: 8, bold: true, color: C.ink });
    draw(caption, x + 11, baseY, { size, bold, color: C.ink });
    return x + 11 + textWidth(caption, size, bold) + 12;
  };

  // === HEADER ==============================================================
  rectFill(MARGIN, y, USABLE_W, 3, C.accent);
  y -= 3 + 14;
  draw("Women’s College Hospital", MARGIN, y - 12, { size: 14, bold: true, color: C.ink });
  draw("GASTROENTEROLOGY (GI) CLINIC", MARGIN, y - 12, {
    size: 11, bold: true, color: C.ink, align: "right",
  });
  y -= 16;
  draw("76 Grenville Street, Toronto, Ontario M5S 1B2", MARGIN, y - 10, { size: 8.5, color: C.sub });
  draw("REFERRAL FORM", MARGIN, y - 10, { size: 11, bold: true, color: C.accent, align: "right" });
  y -= 13;
  draw("Tel: 416-323-7543    Fax: 416-323-7549", MARGIN, y - 10, { size: 8.5, color: C.sub });
  y -= 16;
  line(MARGIN, y, PAGE_W - MARGIN, y, C.faint, 1);
  y -= 12;

  // === PATIENT INFORMATION =================================================
  sectionBar("Patient Information");
  draw("(Affix patient label / identification here)", MARGIN, y - 8, { size: 7.5, color: C.sub });
  y -= 16;
  row(
    { label: "Name:", value: data.patientName || "" },
    { label: "Date of Birth (DD/MM/YYYY):", value: "" }
  );
  row(
    { label: "Health Card:", value: "" },
    { label: "Version Code:", value: "" }
  );
  row({ label: "Address:", value: patient.postal_code ? `FSA ${patient.postal_code}, Ottawa ON` : "" });
  row(
    { label: "Telephone:", value: "" },
    { label: "Alternate:", value: "" }
  );

  // === ADDITIONAL PATIENT INFORMATION =====================================
  sectionBar("Additional Patient Information");
  row(
    { label: "Gender:", value: "" },
    { label: "Allergies:", value: "NKDA" }
  );
  {
    const baseY = y - 9;
    labelledField("Language spoken:", patient.language_preference || "", MARGIN, USABLE_W / 2 - 8, baseY);
    let cx = MARGIN + USABLE_W / 2;
    draw("Interpreter required:", cx, baseY, { size: 8, bold: true, color: C.label });
    cx += textWidth("Interpreter required:", 8, true) + 8;
    const needsInterp = !!(patient.language_preference && !/english/i.test(patient.language_preference));
    cx = checkbox(cx, baseY, needsInterp, "Yes");
    checkbox(cx, baseY, !needsInterp, "No");
    y -= 20;
  }
  row({ label: "Other insurance coverage (IFH, UHIP, other):", value: "Self-pay" });

  // === REFERRING PROVIDER INFORMATION =====================================
  sectionBar("Referring Provider Information");
  row(
    { label: "Name:", value: "Dr. A. Primary, MD CCFP" },
    { label: "Billing number:", value: "" }
  );
  row({ label: "Address:", value: "Ottawa Family Health Team" });
  row(
    { label: "Telephone:", value: "" },
    { label: "Fax:", value: "" }
  );
  row(
    { label: "Signature:", value: "" },
    { label: "Referral Date (DD/MM/YYYY):", value: ddmmyyyy(new Date()) }
  );
  {
    const baseY = y - 9;
    draw("Primary Care Provider:", MARGIN, baseY, { size: 8, bold: true, color: C.label });
    let cx = MARGIN + textWidth("Primary Care Provider:", 8, true) + 10;
    cx = checkbox(cx, baseY, true, "Same");
    checkbox(cx, baseY, false, "Other (name / contact information)");
    y -= 20;
  }

  // === REASON FOR REFERRAL =================================================
  sectionBar("Reason for Referral");
  {
    const baseY = y - 9;
    let cx = MARGIN;
    cx = checkbox(cx, baseY, (parsed.urgency || "") === "urgent", "Urgent", { bold: true });
    cx += 6;
    draw("Specific Physician?", cx, baseY, { size: 8, bold: true, color: C.label });
    cx += textWidth("Specific Physician?", 8, true) + 8;
    cx = checkbox(cx, baseY, false, "Dr. Stal");
    cx = checkbox(cx, baseY, false, "Dr. Zenlea");
    cx = checkbox(cx, baseY, false, "Dr. Bollegala");
    checkbox(cx, baseY, true, "No preference");
    y -= 20;
  }

  const history = [
    formValues.relevant_labs && `Labs: ${formValues.relevant_labs}`,
    formValues.medications && `Medications: ${formValues.medications}`,
    formValues.prior_endoscopy && `Prior endoscopy: ${formValues.prior_endoscopy}`,
    (parsed.conditions || []).length && `Conditions: ${(parsed.conditions || []).map(cl).join(", ")}`,
  ].filter(Boolean).join(". ");
  blockField("Past and current medical history (include cumulative patient profile, if available):", history, 2);

  {
    const baseY = y - 9;
    checkbox(MARGIN, baseY, false, "Screening / surveillance colonoscopy");
    y -= 18;
  }

  const symptoms = [
    formValues.reason_for_referral || patient.referral_reason || parsed.specialty_intent || "",
    (parsed.red_flags || []).length
      ? `Alarm features: ${(parsed.red_flags || []).map((r) => String(r).replace(/_/g, " ")).join(", ")}`
      : "",
  ].filter(Boolean).join(". ");
  blockField("Symptoms:", symptoms, 2);

  // FIT+/FOBT+ routing note.
  {
    const h = 26;
    rectFill(MARGIN, y, USABLE_W, h, C.soft);
    rectStroke(MARGIN, y, USABLE_W, h, C.border, 0.6);
    draw("Fecal Immunochemical Test (FIT +) or Fecal Occult Blood Test (FOBT +): fax referral to",
      MARGIN + 7, y - 11, { size: 7.5, color: C.ink });
    draw("(416) 586-4853 (MSH Colorectal Cancer Diagnostic Assessment Program).",
      MARGIN + 7, y - 20, { size: 7.5, color: C.ink });
    y -= h + 6;
  }
  draw("Note: 2nd opinion / transfer of care is expedited for Inflammatory Bowel Disease (IBD) only; wait times for non-IBD will be longer.",
    MARGIN, y - 8, { size: 7, color: C.sub });
  y -= 16;

  // === FOR ALL CONSULTATIONS PLEASE INCLUDE ===============================
  sectionBar("For All Consultations Please Include");
  for (const item of [
    "Medication list",
    "Prior GI office notes",
    "All prior scope & path reports; if not available, provide date / findings of outside endoscopies",
  ]) {
    const baseY = y - 9;
    checkbox(MARGIN, baseY, true, item);
    y -= 15;
  }

  // === FOOTER ==============================================================
  const fy = MARGIN + 18;
  line(MARGIN, fy + 30, PAGE_W - MARGIN, fy + 30, C.faint, 0.7);
  const disclaimer =
    "Fax Disclaimer: This fax transmission contains confidential information intended only for Women’s College Hospital Clinics. " +
    "If you are not the intended recipient, any disclosure, copying or distribution is strictly prohibited; please notify the referring practitioner.";
  wrap(disclaimer, 6.5, USABLE_W, false).forEach((ln, i) => {
    draw(ln, MARGIN, fy + 22 - i * 8, { size: 6.5, color: C.sub });
  });
  draw("PLEASE FAX COMPLETED REFERRAL TO 416-323-7549", MARGIN, fy, {
    size: 9, bold: true, color: C.accent, align: "center",
  });
  draw("Form number F-5097 (12-2019)", MARGIN, fy - 11, { size: 7, color: C.sub });
  draw("Page 1 of 1", MARGIN, fy - 11, { size: 7, color: C.sub, align: "right" });

  return assemble([ops]);
}

// Backward-compatible simple text-block API (kept for any other callers).
export function buildPdf() {
  return buildReferralPdf({});
}

function assemble(pages) {
  const objects = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>"); // 1
  const fontF1Num = 3;
  const fontF2Num = 4;
  let next = 5;
  const pageObjs = [];
  const kids = [];
  for (let i = 0; i < pages.length; i++) {
    const pageNum = next++;
    const contentNum = next++;
    pageObjs.push({ pageNum, contentNum, ops: pages[i] });
    kids.push(`${pageNum} 0 R`);
  }
  objects.push(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`); // 2
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); // 3
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"); // 4

  for (const po of pageObjs) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 ${fontF1Num} 0 R /F2 ${fontF2Num} 0 R >> >> ` +
        `/Contents ${po.contentNum} 0 R >>`
    );
    const stream = po.ops.join("\n");
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const off of offsets) pdf += String(off).padStart(10, "0") + " 00000 n \n";
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
