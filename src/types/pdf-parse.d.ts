declare module 'pdf-parse' {
  interface TextResult {
    text: string
    total: number
  }

  class PDFParse {
    constructor(options: { data: Buffer | Uint8Array })
    load(): Promise<unknown>
    getText(): Promise<TextResult>
    destroy(): void
  }
}
