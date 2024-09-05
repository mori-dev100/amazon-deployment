import * as fs from 'node:fs'
import * as t from 'io-ts'
import { isLeft } from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { fold } from 'fp-ts/Either'

import { OperationResult, OperationResultT } from '@/types/whatif'
import { Config, ConfigT } from '@/types/config'

/**
 * read content from file or stdin
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
 * get validation error paths
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
 * read what-if operation result from file or stdin
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
 * read config file
 */
export async function readConfig(path: string): Promise<Config> {
  const content = await readFile(path)
  const decoded = ConfigT.decode(JSON.parse(content))
  if (isLeft(decoded)) {
    throw Error(`invalid config at [${getPaths(decoded).join(', ')}]`)
  }
  return decoded.right
}
