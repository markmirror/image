import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'


interface UploadOption {
  paste?: boolean,
  drop?: boolean,
}

declare type DOMEventHandler = (event: Event, view: EditorView) => boolean | void

export function uploadEventHandlers (upload: (file: File) => Promise<string>, options: UploadOption = {}) {
  const events: { paste?: DOMEventHandler, drop?: DOMEventHandler } = {}

  const onPaste = (event: Event, view: EditorView) => {
    const { clipboardData } = event as ClipboardEvent
    const files = clipboardData?.files as FileList
    if (files && files.length) {
      return uploadImages(view, files, upload)
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
        view.dispatch({ selection: EditorSelection.cursor(pos) })
      }
      return uploadImages(view, files, upload)
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


export function prepareImageBlock (view: EditorView): boolean {
  const range = view.state.selection.ranges[0]
  const line = view.state.doc.lineAt(range.from)
  if (line.from) {
    let insert = ''
    if (!/^\s*$/.test(line.text)) {
      insert += '\n'
    }
    const prevLine = view.state.doc.line(line.number - 1)
    if (!/^\s*$/.test(prevLine.text)) {
      insert += '\n'
    }
    if (insert) {
      view.dispatch({
        selection: EditorSelection.cursor(line.to + insert.length),
        changes: [{ from: line.to, insert }]
      })
    }
    return true
  }
  return false
}

export function uploadImages(view: EditorView, files: FileList, upload: (file: File) => Promise<string>) {
  // filter, only upload images
  const images: File[] = []
  for (let i = 0; i < files.length; i++) {
    if (/^image\//.test(files[i].type)) {
      images.push(files[i])
    }
  }

  if (images.length) {
    // make sure previous line is blank line
    prepareImageBlock(view)
    for (let i = 0; i < images.length; i++) {
      handleUpload(view, images[i], i, images.length, upload)
    }
    return true
  }
  return false
}

async function handleUpload(view: EditorView, file: File, index: number, count: number, upload: (file: File) => Promise<string>) {
  const space = index ? ' ' : ''
  const previewURL = URL.createObjectURL(file)
  const placeholder = `![${file.name}](<${previewURL}>)`
  let replacement = space + placeholder
  if (index === count - 1) {
    replacement += '\n\n'
  }
  const transaction = view.state.replaceSelection(replacement)
  console.log(transaction)
  view.dispatch(transaction)

  const url = await upload(file)
  syntaxTree(view.state).iterate({
    enter: ({ type, from, to }) => {
      if (type.name === 'Image' && view.state.doc.sliceString(from, to) === placeholder) {
        const targetText = `![${file.name}](<${url}>)`
        const change = { from, to, insert: targetText }
        view.dispatch({ changes: change })
        URL.revokeObjectURL(previewURL)
      }
    }
  })
}
