import { MarkMirror } from '@markmirror/core'
import { Extension, EditorState, EditorSelection, Range, RangeSet, StateField } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { SyntaxNodeRef } from '@lezer/common'
import { PluginOption, thumbnailFunc, previewParse } from './types'
import { GalleryWidget } from './widget'
import { galleryEvents } from './gallery'
import parseImage from './parseImage'

declare type DOMEventHandler = (event: Event, view: EditorView) => boolean | void

export class ImagePlugin {
  static create (options: PluginOption = {}) {
    return (editor: MarkMirror) => {
      const plugin = new ImagePlugin(editor, options)
      return plugin.toExtensions()
    }
  }

  constructor (readonly editor: MarkMirror, readonly options: PluginOption = {}) {}

  uploadFiles (files: FileList, view?: EditorView) {
    // make sure there is a view
    if (view === undefined) {
      view = this.editor.view
    }
    if (view === undefined) {
      return
    }

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
        this.handleUpload(view, images[i], i, images.length)
      }
      return true
    }
    return false
  }

  private async handleUpload(view: EditorView, file: File, index: number, count: number) {
    const upload = this.options.upload
    if (upload === undefined) {
      return
    }

    const space = index ? ' ' : ''
    const previewURL = URL.createObjectURL(file)
    const placeholder = `![${file.name}](<${previewURL}>)`
    let replacement = space + placeholder
    if (index === count - 1) {
      replacement += '\n\n'
    }
    const transaction = view.state.replaceSelection(replacement)
    view.dispatch(transaction)

    const url = await upload(file, percent => {
      this.editor.trigger('uploading', {
        percent,
        file,
        blob: previewURL,
      })
    })
    if (this.options.thumbnail !== undefined) {
      await loadImage(this.options.thumbnail(url))
    } else {
      await loadImage(url)
    }
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

  private buildUploadExtensions () {
    const events: { paste?: DOMEventHandler, drop?: DOMEventHandler } = {}

    if (this.options.paste) {
      events.paste = (event: Event, view: EditorView) => {
        const { clipboardData } = event as ClipboardEvent
        const files = clipboardData?.files as FileList
        if (files && files.length) {
          return this.uploadFiles(files, view)
        }
        return false
      }
    }

    if (this.options.drop) {
      events.drop = (event: Event, view: EditorView) => {
        const { clientX, clientY, dataTransfer } = event as DragEvent
        const files = dataTransfer?.files as FileList
        if (files && files.length) {
          const pos = view.posAtCoords({x: clientX, y: clientY})
          if (pos !== null) {
            // update cursor position
            view.dispatch({ selection: EditorSelection.cursor(pos) })
          }
          return this.uploadFiles(files, view)
        }
        return false
      }
    }
    return EditorView.domEventHandlers(events)
  }

  private buildPreviewExtensions () {
    let thumbnail: thumbnailFunc
    if (this.options.thumbnail !== undefined) {
      thumbnail = this.options.thumbnail
    } else {
      thumbnail = (url: string) => url
    }
    const parsers: {[key: string]: previewParse}  = {
      'Paragraph': parseParagraphImages,
    }
    if (this.options.previewExtensions) {
      this.options.previewExtensions.forEach(ext => {
        parsers[ext.nodeType] = ext.parse
      })
    }

    this.editor.on('uploading', data => {
      if (this.editor.element !== undefined) {
        const img = this.editor.element.querySelector('img[src="' + data.blob + '"]')
        const el = img?.parentNode?.querySelector('.mm-gallery-upload-progress')
        el?.setAttribute('style', 'height:' + data.percent + '%')
      }
    })

    const decorate = (state: EditorState): DecorationSet => {
      const widgets: Range<Decoration>[] = []

      syntaxTree(state).iterate({
        enter ({ type }) {
          return type.is("Block")
        },
        leave (ref) {
          const parse = parsers[ref.type.name]
          if (parse !== undefined) {
            const text = state.doc.sliceString(ref.from, ref.to)
            const images = parse(text, ref)
            if (images.length) {
              const widget = new GalleryWidget(images, ref.from, thumbnail)
              const deco = Decoration.widget({
                widget: widget,
                side: -1,
                block: true,
              })
              widgets.push(deco.range(ref.from))
            }
          }
        },
      })

      if (!widgets.length) {
        return Decoration.none
      }

      return RangeSet.of(widgets)
    }

    const galleryField = StateField.define<DecorationSet> ({
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
    return [ galleryField, galleryEvents ]
  }

  toExtensions (): Extension {
    let extensions: Extension[] = []
    if (this.options.preview) {
      extensions = this.buildPreviewExtensions()
    }
    if (this.options.upload) {
      extensions.push(this.buildUploadExtensions())
    }
    return extensions
  }
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

function parseParagraphImages (text: string, ref: SyntaxNodeRef) {
  if (ref.node.firstChild?.name == 'Image') {
    return parseImage(text)
  } else {
    return []
  }
}


function loadImage (src: string) {
  const img = new Image()
  return new Promise((resolve, reject) => {
    img.src = src
    img.onload = function() {
      resolve(true)
    }
    img.onerror = function () {
      reject()
    }
  })
}
