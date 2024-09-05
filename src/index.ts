import { readOperationResult, readConfig } from '@/reader'
import { printPretty } from '@/writer'
import { denoiseOperationResult } from '@/rule-engine'

class App {
  async run() {
    const config = await readConfig('./az-deployment-denoise.json')
    const result = await readOperationResult()
    const denoisedResult = denoiseOperationResult(result, config.rules)
    printPretty(denoisedResult)
  }
}

(async () => {
  await new App().run()
})()
