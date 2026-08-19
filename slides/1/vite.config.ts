import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const slideDir = fileURLToPath(new URL('.', import.meta.url))

// Slidev v52 registers virtual slide modules at the filesystem root (/),
// so relative asset paths (./logo.png, ./robot.gif, ...) resolve to /logo.png
// instead of <slideDir>/logo.png. This plugin fixes the resolution.
export default defineConfig({
  plugins: [{
    name: 'slidev-asset-resolver',
    resolveId(id, importer) {
      if (
        importer?.match(/__slidev_\d+\.md$/) &&
        (id.startsWith('./') || id.startsWith('../'))
      ) {
        return resolve(slideDir, id)
      }
    }
  }]
})
