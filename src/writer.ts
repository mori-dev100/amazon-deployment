import { OperationResult, ChangeType, PropertyChangeType, Change, PropertyChange } from '@/types/whatif'
import { parseAzureResource } from '@/utils/azure'

type OrganizedOperationResult = {
  scopes: {
    id: string,
    changes: Change[],
  }[]
}

function signForChangeType(t: ChangeType | PropertyChangeType) {
  switch (t) {
    case 'Create': return '+'
    case 'Modify': return '~'
    case 'Array': return '~'
    case 'Delete': return '-'
    case 'NoChange': return '='
    case 'Ignore': return '*'
    case 'NoEffect': return 'x'
  }
}

export type Printer = {
  printLine(line?: string, level?: number, changeType?: ChangeType | PropertyChangeType | '' | null): void
}

const consolePrinter: Printer = {
  printLine: function (line: string = '', level: number = 0, changeType: ChangeType | PropertyChangeType | '' | null = null) {
    const indent = Array(level).fill('  ').join('')
    let sign: string
    switch (changeType) {
      case null:
        sign = ''
        break
      case '':
        sign = '  '
        break
      default:
        sign = `${signForChangeType(changeType)} `
    }
    // eslint-disable-next-line no-console
    console.log(`${indent}${sign}${line}`)
  },
}

export function printPretty(OperationResult: OperationResult, printer: Printer = consolePrinter) {
  const pretty = organizeResult(OperationResult)

  // print header
  printer.printLine('Note: The result may contain false positive predictions (noise).')
  printer.printLine('You can help us improve the accuracy of the result by opening an issue here: https://aka.ms/WhatIfIssues')
  printer.printLine('This result has been filtered using az-deployment-denoise: https://github.com/ottijp/az-deployment-denoise')

  for (const scope of pretty.scopes) {
    printer.printLine()
    printer.printLine(`Scope: ${scope.id}`)
    printer.printLine()
    for (const change of scope.changes) {
      const pathInScope = parseAzureResource(change.resourceId).pathInScope
      switch (change.changeType) {
        case 'Create':
          // FIME: clone object and delete property
          delete change.after['resourceGroup']
          printer.printLine(`${pathInScope} [${change.after['apiVersion']}]`, 1, change.changeType)
          printer.printLine()
          printObject(printer, 2, change.after)
          printer.printLine()
          break
        case 'Delete':
          printer.printLine(`${pathInScope}`, 1, change.changeType)
          printer.printLine()
          printObject(printer, 2, change.before)
          printer.printLine()
          break
        case 'Modify':
          printer.printLine(`${pathInScope} [${change.after['apiVersion']}]`, 1, change.changeType)
          printPropertyChange(printer, 2, change.delta)
          printer.printLine()
          break
        case 'NoChange':
          printer.printLine(`${pathInScope} [${change.after['apiVersion']}]`, 1, change.changeType)
          break
        case 'Ignore':
          printer.printLine(`${pathInScope}`, 1, change.changeType)
          break
      }
    }
  }

  // TODO: print footer
}


function stringifyPrimitiveValue(value: unknown) {
  switch (typeof value) {
    case 'string':
      return `"${value}"`
    case 'number':
    case 'boolean':
      return `${value}`
    default:
      throw Error(`invalid value type: JSON.stiringify(value)`)
  }
}

function printObject(printer: Printer, level: number, obj: object, path: string[] = []) {
  const flattenObj = flattenObject(obj)
  const maxKeyLength = Object.keys(flattenObj).reduce((acc, cur) => Math.max(acc, cur.length), 0) + 2

  for (const key in flattenObj) {
    const fullKey = path.length === 0 ? key : `${path.join('.')}.${key}`
    const fullKeyPadded = `${fullKey}: `.padEnd(maxKeyLength)
    const value: unknown = flattenObj[key]
    if (Array.isArray(value)) {
      printer.printLine(`${fullKey}: [`, level, '')
      value.forEach((elm: unknown, idx) => {
        if (typeof elm === 'object') {
          printer.printLine(`${idx}:`, level + 1, '')
          printer.printLine()
          printObject(printer, level + 2, elm, [])
          printer.printLine()
        }
        else {
          printer.printLine(`${idx}: ${JSON.stringify(elm)}`, level + 1, '')
        }
      })
      printer.printLine(']', level, '')
    }
    else if (typeof value === 'object') {
      printObject(printer, level, value, [...path, key])
    }
    else {
      printer.printLine(`${fullKeyPadded}${stringifyPrimitiveValue(value)}`, level, '')
    }
  }
}

function printPropertyChange(printer: Printer, level: number, deltas: PropertyChange[]) {
  const maxKeyLength = deltas.map(elm => elm.path).reduce((acc, cur) => Math.max(acc, cur.length), 0) + 2
  deltas.forEach(delta => {
    switch (delta.propertyChangeType) {
      case 'Create':
      case 'Delete':
      case 'NoEffect': {
        const valueToPrint = delta.propertyChangeType === 'Delete' ? delta.before : delta.after
        if (Array.isArray(valueToPrint)) {
          printer.printLine(`${delta.path}: [`, level, delta.propertyChangeType)
          valueToPrint.forEach((elm: unknown, idx) => {
            if (typeof elm === 'object') {
              printer.printLine(`${idx}:`, level + 1, '')
              printer.printLine()
              printObject(printer, level + 2, elm, [])
              printer.printLine()
            }
            else {
              printer.printLine(`${idx}: ${JSON.stringify(elm)}`, level + 1, '')
            }
          })
          printer.printLine(']', level, '')
        }
        else if (typeof valueToPrint === 'object') {
          printer.printLine(`${delta.path}:`, level, delta.propertyChangeType)
          printer.printLine()
          printObject(printer, level + 1, valueToPrint, [])
          printer.printLine()
        }
        else {
          const fullKeyPadded = `${delta.path}: `.padEnd(maxKeyLength)
          printer.printLine(`${fullKeyPadded}${stringifyPrimitiveValue(valueToPrint)}`, level, delta.propertyChangeType)
        }
        break
      }
      case 'Modify': {
        if (delta.children !== null) {
          printer.printLine(`${delta.path}:`, level, delta.propertyChangeType)
          printer.printLine()
          printPropertyChange(printer, level + 1, delta.children)
        }
        else {
          const fullKeyPadded = `${delta.path}: `.padEnd(maxKeyLength)
          printer.printLine(`${fullKeyPadded}${JSON.stringify(delta.before)} => ${JSON.stringify(delta.after)}`, level, delta.propertyChangeType)
        }
        break
      }
      case 'Array': {
        printer.printLine(`${delta.path}: [`, level, 'Array')
        const sortedChildren = delta.children.sort((lhs, rhs) => parseInt(lhs.path) - parseInt(rhs.path))
        printPropertyChange(printer, level + 1, sortedChildren)
        printer.printLine()
        printer.printLine(']', level, '')
        break
      }
    }
  })
}

/**
 * organize operation result
 * */
function organizeResult(result: OperationResult): OrganizedOperationResult {
  const changeTypeOrder = {
    Delete: 1,
    Create: 2,
    Modify: 3,
    'Array': 3,
    NoChange: 4,
    NoEffect: 4,
    Ignore: 5,
  }

  // create resource group set from resouces
  const resourceGroupIds = new Set<string>
  result.changes.forEach(elm => resourceGroupIds.add(parseAzureResource(elm.resourceId).resourceGroup.id))

  // categorize resources into each resource group
  return {
    scopes: Array.from(resourceGroupIds).map(rgid => ({
      id: rgid,
      changes: result.changes
      // select resources of this resource group
      .filter(elm => parseAzureResource(elm.resourceId).resourceGroup.id === rgid)
      // sort resources by change type
      .sort((lhs, rhs) => changeTypeOrder[lhs.changeType] - changeTypeOrder[rhs.changeType])
      // sort property by property change type
      .map(elm => {
        if (elm.delta) {
          elm.delta = elm.delta.sort((lhs, rhs) => changeTypeOrder[lhs.propertyChangeType] - changeTypeOrder[rhs.propertyChangeType])
        }
        return elm
      }),
    })),
  }
}

function flattenObject(obj: object, path: string[] = []): object {
  let ret = {}

  for (const key in obj) {
    const fullKey = path.length === 0 ? key : `${path.join('.')}.${key}`
    const value: unknown = obj[key]
    if (Array.isArray(value)) {
      ret[fullKey] = value.map((elm: unknown) => {
        if (typeof elm === 'object') {
          return flattenObject(elm, [])
        }
        else {
          return elm
        }
      })
    }
    else if (typeof value === 'object') {
      ret = Object.assign(ret, flattenObject(value, [...path, key]))
    }
    else {
      ret[fullKey] = value
    }
  }

  return ret
}

export const test = {
  printPretty,
  printObject,
  printPropertyChange,
  flattenObject,
  organizeResult,
}
