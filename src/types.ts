export interface ImageNode {
  src: string,
  from: number,
  to: number,
  alt?: string,
  title?: string,
}

export interface RatioMap {
  figure: HTMLElement,
  ratio: number,
}

export interface Position {
  from: number,
  to: number,
}
