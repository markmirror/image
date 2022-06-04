import { WidgetType, EditorView } from '@codemirror/view'
import { ImageNode } from './types'


interface RatioMap {
  figure: HTMLElement,
  ratio: number,
}

export const galleryTheme = EditorView.baseTheme({
  ".mm-gallery img": {
    "max-width": "100%",
  },
  ".mm-gallery-column": {
    display: "flex",
    width: "100%",
    marginLeft: "-2px",
    marginRight: "-2px",
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
  constructor (readonly images: ImageNode[][]) {
    super()
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
    return this.id === other.id
  }

  ignoreEvent(event: Event): boolean {
    if (event.type === 'click-image' || event.type === 'delete-image') {
      return false
    }
    return true
  }

  toDOM (): HTMLElement {
    console.log('toDOM')
    const gallery = document.createElement('div')
    gallery.className = 'mm-gallery'
    this.images.forEach(items => {
      const column = document.createElement('div')
      column.className = 'mm-gallery-column'
      const results = items.map(item => {
        return new Promise<RatioMap>((resolve, reject) => {
          const figure = document.createElement('figure')
          const img = new Image()
          img.onload = function () {
            resolve({ figure, ratio: img.naturalWidth / img.naturalHeight })
          }
          img.onerror = function (e) {
            reject(e)
          }
          img.src = item.src
          img.alt = item.alt || ''
          img.title = item.title || ''
          const delButton = document.createElement('button')
          delButton.type = "button"
          delButton.ariaLabel = "Delete"
          delButton.addEventListener('click', e => {
            e.stopPropagation()
            e.preventDefault()
            const event = new CustomEvent('delete-image', { detail: item, bubbles: true })
            delButton.dispatchEvent(event)
          })
          figure.appendChild(img)
          figure.append(delButton)
          figure.addEventListener('click', e => {
            e.stopPropagation()
            e.preventDefault()
            const event = new CustomEvent('click-image', { detail: item, bubbles: true })
            figure.dispatchEvent(event)
          })
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
