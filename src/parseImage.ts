export default function parse(src: string) {
  const rv = []
  src = src.trim()
  let pos = 0
  const posMax = src.length

  while (pos < posMax) {
  }
}


function parseLinkText (src: string, pos: number) {
  const re = /(?<!\\)(?:\\\\)*[\[\]]/g

  let level = 0, found = false, start = pos

  const posMax = src.length

  while (pos < posMax) {
    const match = re.exec(src)
    if (!match) {
      break
    }
    pos = match.index + 1
    const marker = src[match.index]
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

  if (found) {
    return {
      text: src.slice(start, pos - 1),
      end: pos + 1,
    }
  }
}


function parseLinkHref (src: string, pos: number) {
  const bracketRe = /<([^<>\n\\\x00]*)>/
  const rest = src.slice(pos)
  const m1 = rest.match(bracketRe)
  if (m1 && m1.index === 0) {
    return {
      href: m1[1],
      end: pos + m1[0].length + 1,
    }
  }
  const hrefEndRe = /\S*(?:\s|\))/
  const m2 = rest.match(hrefEndRe)
  if (m2) {
    const endPos = m2.index
    const href = src.slice(pos, endPos).trim()
    return {
      href,
      end: endPos,
    }
  }
}

const titleRe = /\s+("(?:\\"|[^"])*"|'(?:\\'|[^'])*')/

function parseLinkTitle(src: string, pos: number) {
  const rest = src.slice(pos)
  const m = rest.match(titleRe)
  if (m && m.index === 0) {
    return {
      title: m[1],
      end: pos + m[0].length + 1,
    }
  }
}
