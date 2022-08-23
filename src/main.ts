import { Extension, EditorState, EditorSelection, Range, RangeSet, StateField } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { ImageNode, Position } from './types'
import { GalleryWidget, galleryTheme } from './widgets'
import parseImage from './parseImage'


function decorate (state: EditorState, resolve: (url: string) => string): DecorationSet {
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

      if (type.name !== "Image") {
        canAdd = false
      }
      return false
    },
    leave ({ type, from, to }) {
      if (canAdd && type.name === 'Paragraph') {
        const text = state.doc.sliceString(from, to)
        const images: ImageNode[][] = parseImage(text, resolve)
        if (images.length) {
          const widget = new GalleryWidget(images, from)
          const deco = Decoration.widget({
            widget: widget,
            side: -1,
            block: true,
          })
          widgets.push(deco.range(from))
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
    const detail = event.detail as Position
    view.dispatch({ selection: EditorSelection.cursor(detail.to), scrollIntoView: true })
  },
  "select-image": (event, view: EditorView) => {
    const detail = event.detail as Position
    view.dispatch({ selection: EditorSelection.range(detail.from, detail.to), scrollIntoView: true })
  },
  "delete-image": (event, view: EditorView) => {
    const detail = event.detail as Position
    view.dispatch({
      selection: EditorSelection.cursor(detail.from),
      changes: [{ from: detail.from, to: detail.to }],
      scrollIntoView: true,
    })
    view.focus()
  },
})


export function previewGallery (resolve = (url: string) => url): (Extension | StateField<DecorationSet>)[] {
  const galleryField = StateField.define<DecorationSet> ({
    create (state) {
      return decorate(state, resolve)
    },
    update (widgets, tr) {
      if (tr.docChanged) {
        return decorate(tr.state, resolve)
      }
      return widgets.map(tr.changes)
    },
    provide (field) {
      return EditorView.decorations.from(field)
    },
  })
  return [ galleryField, galleryTheme, galleryEvents ]
}
