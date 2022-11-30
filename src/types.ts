import { SyntaxNodeRef } from '@lezer/common'

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

export declare type thumbnailFunc = (url: string) => string

export declare type uploadFunc = (file: File, onprogress?: (percent: number) => void) => Promise<string>

export declare type previewParse = (text: string, ref: SyntaxNodeRef) => ImageNode[][]
export interface PreviewExtension {
  nodeType: string,
  parse: previewParse,
}

export interface PluginOption {
  preview?: boolean,
  paste?: boolean,
  drop?: boolean,
  upload?: uploadFunc,
  thumbnail?: thumbnailFunc,
  previewExtensions?: PreviewExtension[],
}
