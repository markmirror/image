# @markmirror/image

The image extension of MarkMirror - a Markdown Editor based on CodeMirror 6.

## Usage

```js
import { MarkMirror } from "@markmirror/core"
import { image } from "@markmirror/commands"

const editor = new MarkMirror()
editor.use(image({
  upload,
  thumbnail,
  preview: true,
  paste: true,
  drop: true,
}))
```
