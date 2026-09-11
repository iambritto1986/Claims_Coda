/**
 * ClaimCoda — Document Ingest
 *
 * Reads real, user-uploaded files (PDF today; TXT was already handled inline
 * in CaseView) so extraction runs against what the user actually uploaded —
 * never a canned stand-in. This is a direct requirement of the "Zero Invented
 * Facts Guarantee": if we can't read a file for real, we say so instead of
 * quietly feeding the extraction pipeline fabricated content.
 *
 * Uses pdf.js (pdfjs-dist) for client-side PDF text extraction. There is no
 * OCR step here — a scanned/flat-image PDF or a JPG/PNG has no embedded text
 * layer for pdf.js to read, so those are reported as non-extractable rather
 * than silently faked. Real OCR (e.g. Document AI) is a TRD-listed fallback
 * that requires a server component this app doesn't have yet.
 */
import * as pdfjsLib from 'pdfjs-dist';
// Vite's `?url` suffix resolves this to the built worker asset's URL so pdf.js
// can run parsing off the main thread, without needing a CDN or manual copy step.
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export class DocumentIngestError extends Error {}

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB
const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt'];

/** Basic client-side checks before any file is read or sent anywhere. */
export function validateUploadFile(file: File): void {
  if (file.size === 0) {
    throw new DocumentIngestError('That file is empty.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new DocumentIngestError(
      `That file is ${(file.size / (1024 * 1024)).toFixed(1)}MB — the limit is 20MB.`
    );
  }
  const nameLower = file.name.toLowerCase();
  const hasAcceptedExtension = ACCEPTED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
  if (!hasAcceptedExtension) {
    throw new DocumentIngestError('Unsupported file type. Please upload a PDF, PNG, JPG, or TXT file.');
  }
}

export interface PdfIngestResult {
  /** Combined text across all pages, with `[Page N]` markers so downstream
   *  extraction prompts and future page-accurate citation can key off them. */
  text: string;
  pageCount: number;
  /** False when the PDF has no meaningful embedded text layer (e.g. a flat
   *  scan). Callers must NOT fall back to fabricated content in that case. */
  hasExtractableText: boolean;
}

/** Extract real text from a PDF's embedded text layer. Throws DocumentIngestError
 *  on a corrupted/unreadable/password-protected file rather than faking a result. */
export async function extractPdfText(file: File): Promise<PdfIngestResult> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new DocumentIngestError('Could not read that file.');
  }

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  } catch (e: any) {
    if (e?.name === 'PasswordException') {
      throw new DocumentIngestError('That PDF is password-protected. Please remove the password and try again.');
    }
    throw new DocumentIngestError('That file could not be read as a PDF. It may be corrupted.');
  }

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pageTexts.push(`[Page ${pageNum}]\n${pageText}`);
  }

  const text = pageTexts.join('\n\n').trim();
  const textOnly = text.replace(/\[Page \d+\]/g, '').trim();

  // Heuristic, not a guess about content: a text-based PDF page yields far
  // more than a handful of characters. Near-empty output means this is a
  // scan with no embedded text layer, which this client-side reader cannot OCR.
  const hasExtractableText = textOnly.length > 20;

  return { text, pageCount: pdf.numPages, hasExtractableText };
}
