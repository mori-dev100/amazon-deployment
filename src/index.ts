import { parseCommand } from '@/command'
import { readOperationResult, readConfig } from '@/reader'
import { printPretty } from '@/writer'
import { denoiseOperationResult } from '@/rule-engine'

class App {
  async run() {
    const commandOption = await parseCommand()

    const config = await readConfig(commandOption.configFile)
    const result = await readOperationResult()
    const denoisedResult = denoiseOperationResult(result, config.rules)
    printPretty(denoisedResult)
  }
}

(async () => {
  try {
    await new App().run()
  }
  catch (e) {
    // eslint-disable-next-line no-console
    console.error((e as Error).message)
  }
})()
