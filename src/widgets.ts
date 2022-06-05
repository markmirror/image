import { WidgetType, EditorView } from '@codemirror/view'
import { ImageNode, RatioMap } from './types'

export const galleryTheme = EditorView.baseTheme({
  "@keyframes mm-uploading": {
    from: { top: "60%" },
    to: { top: "40%" },
  },
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
    top: "10px",
    right: "10px",
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.5)",
    border: "none",
    cursor: "pointer",
    opacity: 0.5,
  },
  ".mm-gallery-column button:hover": {
    opacity: 1,
  },
  ".mm-gallery-column svg": {
    verticalAlign: "middle",
  },
  ".mm-gallery-upload": {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "50px",
    height: "50px",
    marginTop: "-25px",
    marginLeft: "-25px",
    textAlign: "center",
    animation: "mm-uploading 2s ease infinite",
  },
  ".mm-gallery-upload svg": {
    width: "42px",
    height: "42px",
    fill: "white",
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
        delButton.title = "Delete this image"
        delButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="none" d="M0 0h24v24H0z"/><path d="M17 6h5v2h-2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8H2V6h5V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3zm1 2H6v12h12V8zm-9 3h2v6H9v-6zm4 0h2v6h-2v-6zM9 4v2h6V4H9z"/></svg>'
        delButton.addEventListener("click", e => {
          fireEvent(e, delButton, 'delete-image', item, this.offset)
        })
        figure.appendChild(delButton)

        if (/^blob:\/\//.test(item.src)) {
          const statusDiv = document.createElement('div')
          statusDiv.className = "mm-gallery-upload"
          statusDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"/><path d="M13 7.828V20h-2V7.828l-5.364 5.364-1.414-1.414L12 4l7.778 7.778-1.414 1.414L13 7.828z"/></svg>'
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
