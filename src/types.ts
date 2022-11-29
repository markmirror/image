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

export declare type uploadFunc = (file: File, onprogress?: (percent: number) => void) => Promise<string>

export interface PluginOption {
  preview?: boolean,
  paste?: boolean,
  drop?: boolean,
  upload?: uploadFunc,
  thumbnail?: (url: string) => string,
}
