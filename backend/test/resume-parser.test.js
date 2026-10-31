const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { extractPdfText } = require('../services/resumeParser');

function buildPdf(streamContent = 'BT /F1 12 Tf 72 720 Td (Hello resume text) Tj ET') {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(streamContent)} >>\nstream\n${streamContent}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function withPdf(contents, callback) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nexora-pdf-test-'));
  const filePath = path.join(directory, 'resume.pdf');
  await fs.writeFile(filePath, contents);
  try {
    return await callback(filePath);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('pdfjs-dist extraction returns bounded text and page metadata', async () => {
  await withPdf(buildPdf(), async (filePath) => {
    const parsed = await extractPdfText(filePath);
    assert.equal(parsed.parseStatus, 'processed');
    assert.equal(parsed.pageCount, 1);
    assert.match(parsed.text, /Hello resume text/);
    assert.ok(parsed.text.length <= 50000);
  });
});

test('pdfjs-dist extraction reports PDFs without selectable text', async () => {
  await withPdf(buildPdf('q Q'), async (filePath) => {
    const parsed = await extractPdfText(filePath);
    assert.equal(parsed.parseStatus, 'no_text');
    assert.equal(parsed.pageCount, 1);
    assert.equal(parsed.text, '');
  });
});

test('pdfjs-dist extraction rejects unreadable PDFs with a safe error', async () => {
  await withPdf(Buffer.from('%PDF-1.7\nnot a real document\n%%EOF'), async (filePath) => {
    await assert.rejects(() => extractPdfText(filePath), (error) => {
      assert.equal(error.status, 400);
      assert.match(error.message, /could not be read/i);
      return true;
    });
  });
});
