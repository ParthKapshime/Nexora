const fs = require('node:fs/promises');
const { ApiError } = require('../utils/apiError');

const MAX_PAGES = 30;
const MAX_TEXT_LENGTH = 50000;
const PARSE_TIMEOUT_MS = 15000;
let pdfjsPromise;

function loadPdfjs() {
  pdfjsPromise ||= import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

function withTimeout(promise, milliseconds) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new ApiError(400, 'Resume PDF processing timed out. Try a smaller or simpler PDF.'));
    }, milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function normalizeText(value) {
  return value
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pageText(content) {
  if (!Array.isArray(content?.items)) return '';
  return content.items
    .filter((item) => typeof item?.str === 'string')
    .map((item) => `${item.str}${item.hasEOL ? '\n' : ' '}`)
    .join('');
}

function parseFailure(error) {
  if (error instanceof ApiError) return error;
  if (error?.name === 'PasswordException') {
    return new ApiError(400, 'Password-protected PDFs are not supported. Upload an unlocked PDF resume.');
  }
  return new ApiError(400, 'The PDF could not be read. Upload a valid PDF resume.');
}

async function extractPdfText(filePath) {
  const data = await fs.readFile(filePath).catch(() => {
    throw new ApiError(500, 'The resume file could not be processed');
  });
  const pdfjs = await loadPdfjs();
  let loadingTask;
  try {
    loadingTask = pdfjs.getDocument({
      data: new Uint8Array(data),
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
      verbosity: 0
    });
    return await withTimeout((async () => {
      const document = await loadingTask.promise;
      if (document.numPages > MAX_PAGES) {
        throw new ApiError(400, `Resume PDFs must have ${MAX_PAGES} pages or fewer`);
      }
      const pages = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        pages.push(pageText(await page.getTextContent()));
        page.cleanup?.();
      }
      const text = normalizeText(pages.join('\n\n')).slice(0, MAX_TEXT_LENGTH);
      return {
        text,
        pageCount: document.numPages,
        parseStatus: text ? 'processed' : 'no_text'
      };
    })(), PARSE_TIMEOUT_MS);
  } catch (error) {
    throw parseFailure(error);
  } finally {
    try { await loadingTask?.destroy(); } catch {}
  }
}

module.exports = { extractPdfText, MAX_PAGES, MAX_TEXT_LENGTH };
