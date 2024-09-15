import { Command } from 'commander'
import { readPackageInfo } from '@/reader'
import { CommandOption } from '@/types/command-option'

export async function parseCommand(): Promise<CommandOption> {
  const program = new Command()
  const packageInfo = await readPackageInfo()

  // program meta information
  program.name(packageInfo.name)
  program.description(packageInfo.description)
  program.version(packageInfo.version)

  // options
  program.option('-f, --config-file <file>', 'config file')

  program.parse()

  const options = program.opts<CommandOption>()
  const configFile = options.configFile || './az-deployment-denoise.json'
  return {
    configFile,
  }
}
