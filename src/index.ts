import { readOperationResult } from '@/reader'
import { printPretty } from '@/writer'

class App {
  async run() {
    const result = await readOperationResult()
    printPretty(result)
  }
}

(async () => {
  await new App().run()
})()
