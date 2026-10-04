/**
 * Incremental decoder for one string field of a JSON object, fed the object's
 * text as it arrives. JSON escape sequences can be split across chunks; the
 * decoder holds an incomplete escape until the next chunk finishes it.
 */
export class JsonTextFieldDecoder {
  private readonly raw: string[] = [];
  private pos = 0;
  private length = 0;
  private phase: 'scan' | 'string' | 'done' = 'scan';
  private depth = 0;
  private inString = false;
  private escaped = false;
  private unicodeLeft = 0;
  private unicode = '';
  private capturingKey = false;
  private key = '';
  private afterKey = false;
  private valueEscaped = false;
  private valueUnicodeLeft = 0;
  private valueUnicode = '';
  private pendingHigh: number | null = null;
  private decoded = '';

  constructor(private readonly field: string) {}

  push(chunk: string): string {
    if (chunk.length === 0 || this.phase === 'done') return '';
    this.raw.push(chunk);
    this.length += chunk.length;
    const before = this.decoded.length;
    this.consume();
    return this.decoded.slice(before);
  }

  text(): string {
    return this.decoded;
  }

  done(): boolean {
    return this.phase === 'done';
  }

  private charAt(index: number): string {
    let offset = index;
    for (const chunk of this.raw) {
      if (offset < chunk.length) return chunk[offset]!;
      offset -= chunk.length;
    }
    return '';
  }

  private consume(): void {
    while (this.pos < this.length && this.phase !== 'done') {
      if (this.phase === 'string') {
        if (!this.readValue()) return;
      } else if (!this.scan()) return;
    }
  }

  private scan(): boolean {
    if (this.inString) return this.scanString();
    const ch = this.charAt(this.pos);
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      this.pos += 1;
      return true;
    }
    if (ch === '{') {
      this.depth += 1;
      this.pos += 1;
      return true;
    }
    if (ch === '}') {
      this.depth = Math.max(0, this.depth - 1);
      this.afterKey = false;
      this.pos += 1;
      return true;
    }
    if (ch === '[') {
      this.depth += 1;
      this.afterKey = false;
      this.pos += 1;
      return true;
    }
    if (ch === ']') {
      this.depth = Math.max(0, this.depth - 1);
      this.pos += 1;
      return true;
    }
    if (ch === ',') {
      this.afterKey = false;
      this.pos += 1;
      return true;
    }
    if (ch === ':') {
      this.pos += 1;
      return true;
    }
    if (ch === '"') {
      if (this.afterKey && this.depth === 1) {
        this.phase = 'string';
        this.pos += 1;
        return true;
      }
      this.inString = true;
      this.capturingKey = this.depth === 1;
      this.key = '';
      this.escaped = false;
      this.unicodeLeft = 0;
      this.unicode = '';
      this.pos += 1;
      return true;
    }
    this.afterKey = false;
    this.pos += 1;
    return true;
  }

  private scanString(): boolean {
    const ch = this.charAt(this.pos);
    if (this.unicodeLeft > 0) {
      this.unicode += ch;
      this.unicodeLeft -= 1;
      this.pos += 1;
      if (this.unicodeLeft === 0) {
        const code = Number.parseInt(this.unicode, 16);
        this.unicode = '';
        if (this.capturingKey && Number.isFinite(code)) this.key += String.fromCharCode(code);
      }
      return true;
    }
    if (this.escaped) {
      this.escaped = false;
      if (ch === 'u') {
        this.unicodeLeft = 4;
        this.unicode = '';
        this.pos += 1;
        return true;
      }
      if (this.capturingKey) this.key += ch === 'n' ? '\n' : ch === 'r' ? '\r' : ch === 't' ? '\t' : ch;
      this.pos += 1;
      return true;
    }
    if (ch === '\\') {
      if (this.pos + 1 >= this.length) return false;
      this.escaped = true;
      this.pos += 1;
      return true;
    }
    if (ch === '"') {
      this.inString = false;
      if (this.capturingKey && this.key === this.field) this.afterKey = true;
      this.capturingKey = false;
      this.pos += 1;
      return true;
    }
    if (this.capturingKey) this.key += ch;
    this.pos += 1;
    return true;
  }

  private readValue(): boolean {
    const ch = this.charAt(this.pos);
    if (this.valueUnicodeLeft > 0) {
      this.valueUnicode += ch;
      this.valueUnicodeLeft -= 1;
      this.pos += 1;
      if (this.valueUnicodeLeft === 0) {
        this.emitCode(Number.parseInt(this.valueUnicode, 16));
        this.valueUnicode = '';
      }
      return true;
    }
    if (this.valueEscaped) {
      this.valueEscaped = false;
      if (ch === 'u') {
        this.valueUnicodeLeft = 4;
        this.valueUnicode = '';
        this.pos += 1;
        return true;
      }
      this.emitChar(this.escapedChar(ch));
      this.pos += 1;
      return true;
    }
    if (ch === '\\') {
      if (this.pos + 1 >= this.length) return false;
      this.valueEscaped = true;
      this.pos += 1;
      return true;
    }
    if (ch === '"') {
      if (this.pendingHigh !== null) {
        this.decoded += String.fromCharCode(this.pendingHigh);
        this.pendingHigh = null;
      }
      this.phase = 'done';
      this.pos += 1;
      return true;
    }
    this.emitChar(ch);
    this.pos += 1;
    return true;
  }

  private escapedChar(ch: string): string {
    if (ch === 'n') return '\n';
    if (ch === 'r') return '\r';
    if (ch === 't') return '\t';
    if (ch === 'b') return '\b';
    if (ch === 'f') return '\f';
    return ch;
  }

  private emitChar(ch: string): void {
    if (this.pendingHigh !== null) {
      this.decoded += String.fromCharCode(this.pendingHigh);
      this.pendingHigh = null;
    }
    this.decoded += ch;
  }

  private emitCode(code: number): void {
    if (!Number.isFinite(code)) return;
    if (this.pendingHigh !== null) {
      const high = this.pendingHigh;
      this.pendingHigh = null;
      if (code >= 0xdc00 && code <= 0xdfff) {
        this.decoded += String.fromCodePoint(0x10000 + ((high - 0xd800) << 10) + (code - 0xdc00));
        return;
      }
      this.decoded += String.fromCharCode(high);
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      this.pendingHigh = code;
      return;
    }
    this.decoded += String.fromCharCode(code);
  }
}
