import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'


interface UploadOption {
  paste?: boolean,
  drop?: boolean,
}

declare type DOMEventHandler = (event: Event, view: EditorView) => boolean | void

export function uploadImage (upload: (file: File) => Promise<string>, options: UploadOption = {}) {
  const events: { paste?: DOMEventHandler, drop?: DOMEventHandler } = {}

  const onPaste = (event: Event, view: EditorView) => {
    const { clipboardData } = event as ClipboardEvent
    const files = clipboardData?.files as FileList
    if (files && files.length) {
      for (let i = 0; i < files.length; i++) {
        handleUpload(view, files[i], i, upload)
      }
      return true
    }
    return false
  }

  const onDrop = (event: Event, view: EditorView) => {
    const { clientX, clientY, dataTransfer } = event as DragEvent
    const files = dataTransfer?.files as FileList
    if (files && files.length) {
      const pos = view.posAtCoords({x: clientX, y: clientY})
      if (pos !== null) {
        // update cursor position
        view.dispatch({ selection: EditorSelection.cursor(pos + 1) })
      }
      for (let i = 0; i < files.length; i++) {
        handleUpload(view, files[i], i, upload)
      }
      return true
    }
    return false
  }

  if (options.paste !== false) {
    events.paste = onPaste
  }
  if (options.drop !== false) {
    events.drop = onDrop
  }
  return EditorView.domEventHandlers(events)
}


async function handleUpload(view: EditorView, file: File, index: number, upload: (file: File) => Promise<string>) {
  const space = index ? ' ' : '\n'
  const id = Math.random().toString().slice(2, 8)
  const placeholder = `![${file.name}](<uploading-${id}>)`
  const transaction = view.state.replaceSelection(space + placeholder)
  view.dispatch(transaction)

  const url = await upload(file)
  syntaxTree(view.state).iterate({
    enter: ({ type, from, to }) => {
      if (type.name === 'Image' && view.state.doc.sliceString(from, to) === placeholder) {
        const targetText = `![${file.name}](<${url}>)`
        const change = { from, to, insert: targetText }
        view.dispatch({ changes: change })
      }
    }
  })
}
