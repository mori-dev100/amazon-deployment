import * as path from 'node:path'
import * as fs from 'node:fs'
import * as t from 'io-ts'
import { isLeft } from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { fold } from 'fp-ts/Either'
import { OperationResult, OperationResultT } from '@/types/whatif'
import { Config, ConfigT } from '@/types/config'
import { PackageInfo } from '@/types/package-info'

/**
 * Read content from file or stdin.
 * @param path - file path
 * @returns utf8 decoded file content
 */
export async function readFile(path?: string): Promise<string> {
  const stream = path ? fs.createReadStream(path) : process.stdin
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * Get validation error paths.
 * cf. https://github.com/gcanti/io-ts/blob/master/index.md#error-reporters
 * @param v - io-ts decoded result
 * @returns paths that caused errors
 */
const getPaths = <A>(v: t.Validation<A>): Array<string> => {
  return pipe(
    v,
    fold(
      (errors) => errors.map((error) => error.context.map(({ key }) => key).join('.')),
      () => ['no errors'],
    ),
  )
}

/**
 * Read what-if operation result from file or stdin.
 * @param path - file path. null for stdin.
 * @returns operation result
 */
export async function readOperationResult(path?: string): Promise<OperationResult> {
  const content = await readFile(path)
  const decoded = OperationResultT.decode(JSON.parse(content))
  if (isLeft(decoded)) {
    throw Error(`invalid what-if operation result at [${getPaths(decoded).join(', ')}]`)
  }
  return decoded.right
}

/**
 * Read config file.
 * @param path - config file path
 * @returns config
 */
export async function readConfig(path: string): Promise<Config> {
  const content = await readFile(path)
  const decoded = ConfigT.decode(JSON.parse(content))
  if (isLeft(decoded)) {
    throw Error(`invalid config at [${getPaths(decoded).join(', ')}]`)
  }
  return decoded.right
}
/**
 * Read package.json
 * @returns package info
 */
export async function readPackageInfo(): Promise<PackageInfo> {
  const packageJsonPath = path.join(__dirname, '..', 'package.json')
  const content = await readFile(packageJsonPath)
  return JSON.parse(content) as PackageInfo
}
