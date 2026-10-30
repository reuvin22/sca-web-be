// Checks that a file's first bytes match its extension ("magic bytes"), so a harmful file
// renamed to e.g. ".pdf" is rejected. The extension alone is never trusted.

const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  buffer.length >= offset + bytes.length && bytes.every((byte, index) => buffer[offset + index] === byte);
const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

const PDF = (b: Buffer) => startsWith(b, ascii("%PDF-"));
const PNG = (b: Buffer) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = (b: Buffer) => startsWith(b, [0xff, 0xd8, 0xff]);
const WEBP = (b: Buffer) => startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8);
const GIF = (b: Buffer) => startsWith(b, ascii("GIF87a")) || startsWith(b, ascii("GIF89a"));
const ZIP = (b: Buffer) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]); // xlsx, pptx (Office Open XML)
const OLE = (b: Buffer) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // xls, ppt
const MP4 = (b: Buffer) => startsWith(b, ascii("ftyp"), 4); // mp4 and mov
const WEBM = (b: Buffer) => startsWith(b, [0x1a, 0x45, 0xdf, 0xa3]);

// CSV is plain text: valid UTF-8 without null bytes
function CSV(buffer: Buffer) {
  if (buffer.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

const SIGNATURES: Record<string, (buffer: Buffer) => boolean> = {
  ".pdf": PDF,
  ".png": PNG,
  ".jpg": JPEG,
  ".jpeg": JPEG,
  ".webp": WEBP,
  ".gif": GIF,
  ".xlsx": ZIP,
  ".pptx": ZIP,
  ".xls": OLE,
  ".ppt": OLE,
  ".csv": CSV,
  ".mp4": MP4,
  ".mov": MP4,
  ".webm": WEBM,
};

// True when the content matches the extension. Unknown extensions never match.
export const matchesSignature = (extension: string, buffer: Buffer) => SIGNATURES[extension]?.(buffer) ?? false;
