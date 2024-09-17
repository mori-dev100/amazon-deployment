import * as fs from 'node:fs/promises'
import { Command } from 'commander'
import { readPackageInfo } from '@/reader'
import { CommandOption } from '@/types/command-option'

/**
 * Check if the file exists.
 * @param path - file path to check
 * @return true if the file exists
 */
async function fileExists(path: string) {
  try {
    await fs.stat(path)
    return true
  }
  catch {
    return false
  }
}

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
  program.option('-f, --config-file <file>', 'config file (JSON/YAML)')

  program.parse()
  const options = program.opts<CommandOption>()

  // specify config file
  const configJsonFile = './az-deployment-denoise.json'
  const configYamlFile = './az-deployment-denoise.yml'
  const configJsonExists = await fileExists(configJsonFile)
  const configYamlExists = await fileExists(configYamlFile)
  let configFile = options.configFile
  if (!configFile && configJsonExists) {
    configFile = configJsonFile
  }
  else if (!configFile && configYamlExists) {
    configFile = configYamlFile
  }

  // assemble and return command options
  return {
    configFile,
  }
}
