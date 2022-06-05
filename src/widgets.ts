import { WidgetType, EditorView } from '@codemirror/view'
import { ImageNode, RatioMap } from './types'

export const galleryTheme = EditorView.baseTheme({
  ".mm-gallery img": {
    maxWidth: "100%",
    verticalAlign: "middle",
  },
  ".mm-gallery-column": {
    display: "flex",
    width: "100%",
  },
  ".mm-gallery-column figure": {
    position: "relative",
    margin: 0,
    padding: "2px",
  },
  ".mm-gallery-column button": {
    position: "absolute",
    padding: "0",
    top: "8px",
    right: "8px",
    width: "1em",
    height: "1em",
  },
})

export class GalleryWidget extends WidgetType {
  private origin: GalleryWidget

  constructor (readonly images: ImageNode[][], public offset: number) {
    super()
    this.origin = this
  }

  get id () {
    return this.images.map(items => {
      return items.map(item => item.src).join('|')
    }).join('$')
  }

  get columns () {
    return this.images.map(items => items.length).join('|')
  }

  eq (other: GalleryWidget): boolean {
    if (this.images.length !== other.images.length) {
      return false
    }
    if (this.columns !== other.columns) {
      return false
    }
    if (this.id === other.id) {
      // chain origin for updating offset
      other.origin = this.origin
      this.origin.offset = other.offset
      return true
    }
    return false
  }

  ignoreEvent(event: Event): boolean {
    return !/^(click|select|delete)-image$/.test(event.type)
  }

  toDOM (): HTMLElement {
    const gallery = document.createElement('div')
    gallery.className = 'mm-gallery'
    this.images.forEach(items => {
      const column = document.createElement('div')
      column.className = 'mm-gallery-column'
      const results = items.map(item => {
        const figure = document.createElement('figure')
        const img = new Image()
        img.alt = item.alt || ''
        img.title = item.title || ''

        const delButton = document.createElement('button')
        delButton.type = "button"
        delButton.ariaLabel = "Delete"
        const delIcon = document.createElement('i')
        delIcon.className = "icon-delete"
        delButton.appendChild(delIcon)
        delButton.addEventListener("click", e => {
          fireEvent(e, delButton, 'delete-image', item, this.offset)
        })
        figure.appendChild(delButton)
        // add uploading status
        if (/^blob:\/\//.test(item.src)) {
          const statusDiv = document.createElement('div')
          statusDiv.className = "mm-gallery-uploading"
          const statusIcon = document.createElement('i')
          statusIcon.className = "icon-upload"
          statusDiv.appendChild(statusIcon)
          figure.appendChild(statusDiv)
        }

        figure.addEventListener("click", e => {
          fireEvent(e, figure, 'click-image', item, this.offset)
        })
        figure.addEventListener("dblclick", e => {
          fireEvent(e, figure, 'select-image', item, this.offset)
        })
        return new Promise<RatioMap>((resolve, reject) => {
          img.onload = function () {
            resolve({ figure, ratio: img.naturalWidth / img.naturalHeight })
          }
          img.onerror = function (e) {
            reject(e)
          }
          img.src = item.src
          figure.appendChild(img)
          column.appendChild(figure)
        })
      })
      Promise.all(results).then((items) => {
        const maxRatio = Math.max(...items.map(item => item.ratio))
        items.forEach(item => {
          const flex = item.ratio / maxRatio
          item.figure.setAttribute('style', `flex: ${flex}`)
        })
      })
      gallery.appendChild(column)
    })
    return gallery
  }
}

function fireEvent (event: Event, element: HTMLElement, eventName: string, image: ImageNode, offset: number) {
  event.stopPropagation()
  event.preventDefault()
  const detail = { ...image , from: offset + image.from, to: offset + image.to }
  const _ev = new CustomEvent(eventName, { detail, bubbles: true })
  element.dispatchEvent(_ev)
}
