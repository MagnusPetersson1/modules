import { toPng, toJpeg, toSvg } from 'html-to-image'
import { jsPDF } from 'jspdf'

export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'gif' | 'pdf'
export type ExportBackground = 'white' | 'transparent'

export interface ExportOptions {
  format: ExportFormat
  background: ExportBackground
  filename?: string
}

/** Strips the dot-grid background from the DOM capture */
function filterBackground(node: Element): boolean {
  return !(node instanceof Element && node.classList.contains('react-flow__background'))
}

function getFlowElement(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.react-flow')
  if (!el) throw new Error('ReactFlow container not found')
  return el
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

// ── PNG ────────────────────────────────────────────────────────────────────────
async function exportPng(el: HTMLElement, bg: ExportBackground, filename: string) {
  const dataUrl = await toPng(el, {
    filter: filterBackground,
    backgroundColor: bg === 'white' ? '#ffffff' : undefined,
    pixelRatio: 2,
  })
  triggerDownload(dataUrl, filename)
}

// ── JPEG ───────────────────────────────────────────────────────────────────────
async function exportJpeg(el: HTMLElement, filename: string) {
  const dataUrl = await toJpeg(el, {
    filter: filterBackground,
    backgroundColor: '#ffffff',
    quality: 0.95,
    pixelRatio: 2,
  })
  triggerDownload(dataUrl, filename)
}

// ── SVG ────────────────────────────────────────────────────────────────────────
async function exportSvg(el: HTMLElement, bg: ExportBackground, filename: string) {
  const dataUrl = await toSvg(el, {
    filter: filterBackground,
    backgroundColor: bg === 'white' ? '#ffffff' : undefined,
  })
  triggerDownload(dataUrl, filename)
}

// ── PDF ────────────────────────────────────────────────────────────────────────
async function exportPdf(el: HTMLElement, filename: string) {
  const dataUrl = await toPng(el, {
    filter: filterBackground,
    backgroundColor: '#ffffff',
    pixelRatio: 2,
  })
  const img = new Image()
  img.src = dataUrl
  await new Promise<void>(resolve => { img.onload = () => resolve() })

  const { naturalWidth: w, naturalHeight: h } = img
  const orientation = w > h ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] })
  pdf.addImage(dataUrl, 'PNG', 0, 0, w, h)
  pdf.save(filename)
}

// ── GIF (inline single-frame encoder, no extra dependency) ────────────────────
// Handles up to 256 unique colours — sufficient for all architectural diagrams.
async function exportGif(el: HTMLElement, bg: ExportBackground, filename: string) {
  const dataUrl = await toPng(el, {
    filter: filterBackground,
    backgroundColor: bg === 'white' ? '#ffffff' : undefined,
    pixelRatio: 1,
  })

  const img = new Image()
  img.src = dataUrl
  await new Promise<void>(resolve => { img.onload = () => resolve() })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  if (bg === 'white') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0)

  const { width, height } = canvas
  const rgba = ctx.getImageData(0, 0, width, height).data

  // Build palette (up to 256 unique colours)
  const colorMap = new Map<number, number>()
  const palette: number[] = []

  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], a = rgba[i + 3]
    const rf = bg === 'white' ? Math.round(r + (255 - r) * (1 - a / 255)) : r
    const gf = bg === 'white' ? Math.round(g + (255 - g) * (1 - a / 255)) : g
    const bf = bg === 'white' ? Math.round(b + (255 - b) * (1 - a / 255)) : b
    const key = (rf << 16) | (gf << 8) | bf
    if (!colorMap.has(key) && palette.length < 256) {
      colorMap.set(key, palette.length)
      palette.push(key)
    }
  }

  // Pad to next power of 2
  let palSize = 2
  while (palSize < palette.length) palSize <<= 1
  while (palette.length < palSize) palette.push(0)
  const colorDepth = Math.max(2, Math.ceil(Math.log2(palSize)))

  // Map pixels to palette indices
  const indices = new Uint8Array(width * height)
  for (let i = 0; i < indices.length; i++) {
    const b = i * 4
    const r = rgba[b], g = rgba[b + 1], bl = rgba[b + 2], a = rgba[b + 3]
    const rf = bg === 'white' ? Math.round(r + (255 - r) * (1 - a / 255)) : r
    const gf = bg === 'white' ? Math.round(g + (255 - g) * (1 - a / 255)) : g
    const bf = bg === 'white' ? Math.round(bl + (255 - bl) * (1 - a / 255)) : bl
    const key = (rf << 16) | (gf << 8) | bf
    indices[i] = colorMap.get(key) ?? 0
  }

  // LZW encode
  function lzwEncode(pixels: Uint8Array, minCode: number): Uint8Array {
    const clear = 1 << minCode
    const eof = clear + 1
    const table = new Map<string, number>()
    for (let i = 0; i < clear; i++) table.set(String(i), i)
    let codeSize = minCode + 1
    let nextCode = eof + 1
    const out: number[] = []
    let buf = 0, bits = 0

    function emit(code: number) {
      buf |= code << bits; bits += codeSize
      while (bits >= 8) { out.push(buf & 0xff); buf >>= 8; bits -= 8 }
    }
    function resetTable() {
      table.clear()
      for (let j = 0; j < clear; j++) table.set(String(j), j)
      codeSize = minCode + 1; nextCode = eof + 1
    }

    emit(clear)
    let prefix = String(pixels[0])
    for (let i = 1; i < pixels.length; i++) {
      const cur = String(pixels[i])
      const combined = prefix + ',' + cur
      if (table.has(combined)) {
        prefix = combined
      } else {
        emit(table.get(prefix)!)
        if (nextCode < 4096) {
          table.set(combined, nextCode++)
          if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++
        } else {
          emit(clear); resetTable()
        }
        prefix = cur
      }
    }
    emit(table.get(prefix)!)
    emit(eof)
    if (bits > 0) out.push(buf & 0xff)
    return new Uint8Array(out)
  }

  function subBlocks(data: Uint8Array): Uint8Array {
    const blocks: number[] = []
    for (let i = 0; i < data.length;) {
      const len = Math.min(255, data.length - i)
      blocks.push(len)
      for (let j = 0; j < len; j++) blocks.push(data[i++])
    }
    blocks.push(0)
    return new Uint8Array(blocks)
  }

  const lzwData = lzwEncode(indices, colorDepth)
  const gifBytes: number[] = []

  // Header
  for (const c of 'GIF89a') gifBytes.push(c.charCodeAt(0))
  // Logical Screen Descriptor
  gifBytes.push(width & 0xff, (width >> 8) & 0xff)
  gifBytes.push(height & 0xff, (height >> 8) & 0xff)
  gifBytes.push(0x80 | ((colorDepth - 1) & 0x07), 0, 0)
  // Global Color Table
  for (const color of palette) {
    gifBytes.push((color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff)
  }
  // Image Descriptor
  gifBytes.push(0x2c)
  gifBytes.push(0, 0, 0, 0)
  gifBytes.push(width & 0xff, (width >> 8) & 0xff)
  gifBytes.push(height & 0xff, (height >> 8) & 0xff)
  gifBytes.push(0x00)
  // Image data
  gifBytes.push(colorDepth)
  for (const b of subBlocks(lzwData)) gifBytes.push(b)
  // Trailer
  gifBytes.push(0x3b)

  const blob = new Blob([new Uint8Array(gifBytes)], { type: 'image/gif' })
  triggerDownload(URL.createObjectURL(blob), filename)
}

// ── Public entry point ─────────────────────────────────────────────────────────
export async function exportDiagram(options: ExportOptions): Promise<void> {
  const { format, background, filename = 'diagram' } = options
  const el = getFlowElement()

  switch (format) {
    case 'png':  return exportPng(el, background, `${filename}.png`)
    case 'jpeg': return exportJpeg(el, `${filename}.jpg`)
    case 'svg':  return exportSvg(el, background, `${filename}.svg`)
    case 'gif':  return exportGif(el, background, `${filename}.gif`)
    case 'pdf':  return exportPdf(el, `${filename}.pdf`)
  }
}
