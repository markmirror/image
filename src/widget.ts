import { EditorState, Range, RangeSet, StateField } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

interface ImageAttrs {
  src: string,
  alt?: string,
  title?: string,
}

class GalleryWidget extends WidgetType {
  constructor (readonly images: ImageAttrs[]) {
    super()
  }

  get id () {
    return this.images.map(img => img.src).join('|')
  }

  eq (other: GalleryWidget): boolean {
    return this.id === other.id
  }

  toDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'mm-gallery'
    const img = document.createElement('img')
    return img
  }
}

function parseImages (text: string): ImageAttrs[] {
  const re = /(!\[.*?\]())/
  return []
}

function decorate (state: EditorState): DecorationSet {
  const widgets: Range<Decoration>[] = []

  let canAdd = false
  syntaxTree(state).iterate({
    enter ({ type }) {
      if (type.name === 'Document') {
        return true
      } else if (type.name === 'Paragraph') {
        canAdd = true
        return true
      }

      if (type.name !== 'Image') {
        canAdd = false
      }
      return false
    },
    leave ({ type, from, to }) {
      if (canAdd && type.name === 'Paragraph') {
        const text = state.doc.sliceString(from, to)
        const images = parseImages(text)
        const w = Decoration.widget({
          widget: new GalleryWidget(images),
          side: -1,
          block: true,
        })
        widgets.push(w.range(from))
      }
    },
  })

  if (!widgets.length) {
    return Decoration.none
  }

  return RangeSet.of(widgets)
}


// TODO: thumbnail images


export const previewImage = StateField.define<DecorationSet> ({
  create (state) {
    return decorate(state)
  },
  update (widgets, tr) {
    if (tr.docChanged) {
      return decorate(tr.state)
    }
    return widgets.map(tr.changes)
  },
  provide (field) {
    return EditorView.decorations.from(field)
  },
})
