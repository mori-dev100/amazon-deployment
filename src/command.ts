import { Command } from 'commander'
import { readPackageInfo } from '@/reader'
import { CommandOption } from '@/types/command-option'

/**
 * Parse CLI command line arguments.
 * @returns command option
 */
export async function parseCommand(): Promise<CommandOption> {
  const program = new Command()
  const packageInfo = await readPackageInfo()

  // set program meta information
  program.name(packageInfo.name)
  program.description(packageInfo.description)
  program.version(packageInfo.version)

  // set options
  program.option('-f, --config-file <file>', 'config file')

  program.parse()

  // assemble and return command options
  const options = program.opts<CommandOption>()
  const configFile = options.configFile || './az-deployment-denoise.json'
  return {
    configFile,
  }
}
