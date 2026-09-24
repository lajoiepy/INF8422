import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const slideDir = fileURLToPath(new URL('.', import.meta.url))

// Slidev v52 registers virtual slide modules at the filesystem root (/),
// so relative asset paths (./logo.png, ./robot.gif, ...) resolve to /logo.png
// instead of <slideDir>/logo.png. Imported sections use ../images/.
// The matching preloader is disabled in slides.md because it ignores source directories.
export default defineConfig({
  plugins: [{
    name: 'slidev-asset-resolver',
    resolveId(id, importer) {
      if (
        importer?.match(/__slidev_\d+\.md$/) &&
        (id.startsWith('./') || id.startsWith('../'))
      ) {
        return id.startsWith('../images/')
          ? resolve(slideDir, 'images', id.slice('../images/'.length))
          : resolve(slideDir, id)
      }
    }
  }]
})
