import { WidgetType } from '@codemirror/view'
import { ImageNode, RatioMap, thumbnailFunc } from './types'

const PROGRESS_HTML = '<div class="mm-gallery-upload-icon"><i class="icon-upload"></i></div><div class="mm-gallery-upload-progress"></div>'
const ERROR_HTML = '<div class="mm-gallery-failed-text"><span>Image failed to load</span></div>'

export class GalleryWidget extends WidgetType {
  private origin: GalleryWidget

  constructor (readonly images: ImageNode[][], public offset: number, readonly thumbnail: thumbnailFunc) {
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
    const thumbnail = this.thumbnail
    this.images.forEach(items => {
      const column = document.createElement('div')
      column.className = 'mm-gallery-column'
      const results = items.map(item => {
        const figure = document.createElement('figure')
        const img = new Image()
        img.referrerPolicy = 'no-referrer'
        img.alt = item.alt || ''
        img.title = item.title || ''

        const delButton = document.createElement('button')
        delButton.type = "button"
        delButton.title = "Delete this image"
        delButton.innerHTML = '<i class="icon-delete"></i>'
        delButton.addEventListener("click", e => {
          fireEvent(e, delButton, 'delete-image', item, this.offset)
        })
        figure.appendChild(delButton)

        if (/^blob:/.test(item.src)) {
          const statusDiv = document.createElement('div')
          statusDiv.className = "mm-gallery-upload"
          statusDiv.innerHTML = PROGRESS_HTML
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
          img.onerror = function () {
            resolve({ figure, ratio: 1 })
            figure.removeChild(img)
            const div = document.createElement('div')
            div.className = 'mm-gallery-failed'
            div.innerHTML = ERROR_HTML
            figure.appendChild(div)
          }
          img.src = thumbnail(item.src)
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
