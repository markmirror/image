import { EditorSelection } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { ImageNode } from './types'

export const galleryEvents = EditorView.domEventHandlers({
  "click-image": (event, view: EditorView) => {
    const detail = event.detail as ImageNode
    view.dispatch({ selection: EditorSelection.cursor(detail.to), scrollIntoView: true })
  },
  "select-image": (event, view: EditorView) => {
    const detail = event.detail as ImageNode
    view.dispatch({ selection: EditorSelection.range(detail.from, detail.to), scrollIntoView: true })
  },
  "delete-image": (event, view: EditorView) => {
    const detail = event.detail as ImageNode
    view.dispatch({
      selection: EditorSelection.cursor(detail.from),
      changes: [{ from: detail.from, to: detail.to }],
      scrollIntoView: true,
    })
    view.focus()

    if (/^blob:/.test(detail.src)) {
      URL.revokeObjectURL(detail.src)
    }
  },
})
