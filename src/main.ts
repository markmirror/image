import { EditorState, EditorSelection, Range, RangeSet, StateField } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { ImageNode } from './types'
import { GalleryWidget, galleryTheme } from './widgets'
import parseImage from './parseImage'


function decorate (state: EditorState, thumbnail: (url: string) => string): DecorationSet {
  const widgets: Range<Decoration>[] = []

  let canAdd = false
  syntaxTree(state).iterate({
    enter ({ type }) {
      if (type.name === "Paragraph") {
        canAdd = true
        return true
      }

      if (type.is("Block")) {
        return true
      }

      if (type.name === "Image") {
        // TODO: check if is uploading
      } else {
        canAdd = false
      }
      return false
    },
    leave ({ type, from, to }) {
      if (canAdd && type.name === 'Paragraph') {
        const text = state.doc.sliceString(from, to)
        const images: ImageNode[][] = parseImage(text, from, thumbnail)
        if (images.length) {
          const w = Decoration.widget({
            widget: new GalleryWidget(images),
            side: -1,
            block: true,
          })
          widgets.push(w.range(from))
        }
      }
    },
  })

  if (!widgets.length) {
    return Decoration.none
  }

  return RangeSet.of(widgets)
}


const galleryEvents = EditorView.domEventHandlers({
  "click-image": (event, view: EditorView) => {
    const detail = event.detail as { to: number }
    view.dispatch({ selection: EditorSelection.cursor(detail.to), scrollIntoView: true })
  },
  "select-image": (event, view: EditorView) => {
    const detail = event.detail as { from: number, to: number }
    view.dispatch({ selection: EditorSelection.range(detail.from, detail.to), scrollIntoView: true })
  },
  "delete-image": (event, view: EditorView) => {
    const detail = event.detail as { from: number, to: number }
    view.dispatch({
      selection: EditorSelection.cursor(detail.from),
      changes: [{ from: detail.from, to: detail.to }],
      scrollIntoView: true,
    })
    view.focus()
  },
})


export function previewImage (thumbnail = (url: string) => url) {
  const galleryField = StateField.define<DecorationSet> ({
    create (state) {
      return decorate(state, thumbnail)
    },
    update (widgets, tr) {
      if (tr.docChanged) {
        return decorate(tr.state, thumbnail)
      }
      return widgets.map(tr.changes)
    },
    provide (field) {
      return EditorView.decorations.from(field)
    },
  })
  return [ galleryField, galleryTheme, galleryEvents ]
}
