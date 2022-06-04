import { ImageNode } from "./types"


export default function parse(src: string, thumbnail: (url: string) => string): ImageNode[][] {
  const startRe = /\s*!\[/g
  let m = startRe.exec(src)
  if (!m || m.index !== 0) {
    return []
  }

  let pos = 0
  const rv: ImageNode[][] = []

  let column: ImageNode[] = []
  while (m) {
    if (/\n/.test(m[0]) && column.length) {
      rv.push(column)
      column = []
    }
    const node: ImageNode = { src: "", from: m.index, to: 0 }
    const found1 = parseLinkText(src, startRe.lastIndex)
    if (!found1) {
      return []
    }
    node.alt = found1.text

    const found2 = parseLinkHref(src, found1.end)
    if (!found2) {
      return []
    }
    // only preview online image
    if (!/https?:\/\//.test(found2.href)) {
      return []
    }
    node.src = thumbnail(found2.href)
    pos = found2.end

    const found3 = parseLinkTitle(src, pos)
    if (found3) {
      node.title = found3.title
      pos = found3.end
    }
    const end = parseParenEnd(src, pos)
    if (!end) {
      return []
    }
    node.to = end
    column.push(node)

    pos = end
    startRe.lastIndex = end
    m = startRe.exec(src)
  }
  if (src.slice(pos).trim()) {
    return []
  }
  if (column.length) {
    rv.push(column)
  }
  return rv
}


function parseLinkText (src: string, pos: number) {
  const reg = /(?<!\\)(?:\\\\)*[\[\]]/g
  reg.lastIndex = pos

  let level = 1, found = false, start = pos

  const posMax = src.length

  while (pos < posMax) {
    const match = reg.exec(src)
    if (!match) {
      break
    }
    pos = reg.lastIndex
    const marker = src[pos - 1]
    if (marker === ']') {
      level--
      if (level === 0) {
        found = true
        break
      }
    } else {
      level++
    }
  }

  if (found && src[pos] === '(') {
    return {
      text: src.slice(start, pos - 1),
      end: pos + 1,
    }
  }
  return null
}


function parseLinkHref (src: string, pos: number) {
  const bracketRe = /\s*<([^<>\n\\\x00]*)>/g
  bracketRe.lastIndex = pos
  const m1 = bracketRe.exec(src)
  if (m1 && m1.index === pos) {
    return {
      href: m1[1],
      end: pos + m1[0].length
    }
  }
  const hrefEndRe = /\S(?:\s|\))/g
  hrefEndRe.lastIndex = pos
  const m2 = hrefEndRe.exec(src)
  if (m2) {
    const href = src.slice(pos, m2.index + 1).trim()
    return {
      href,
      end: m2.index + 1,
    }
  }
  return null
}

function parseLinkTitle(src: string, pos: number) {
  const titleRe = /\s+("(?:\\"|[^"])*"|'(?:\\'|[^'])*')/g
  titleRe.lastIndex = pos
  const m = titleRe.exec(src)
  if (m && m.index === pos) {
    return {
      title: m[1].slice(1, -1),
      end: pos + m[0].length
    }
  }
  return null
}

function parseParenEnd(src: string, pos: number) {
  const parenEndRe = /\s*\)/g
  parenEndRe.lastIndex = pos
  const m = parenEndRe.exec(src)
  if (m && m.index === pos) {
    return pos + m[0].length
  }
  return null
}
