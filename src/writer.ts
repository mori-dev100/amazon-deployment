import { OperationResult, ChangeType, PropertyChangeType, Change, PropertyChange } from '@/types/whatif'
import { resourceGroupFromResouceId, stripResourceGroupFromResourceId } from '@/utils/azure'

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

  // TODO: print header

  for (const scope of pretty.scopes) {
    printer.printLine()
    printer.printLine(`Scope: ${scope.id}`)
    for (const change of scope.changes) {
      printer.printLine()
      const resourceId = stripResourceGroupFromResourceId(change.resourceId)
      switch (change.changeType) {
        case 'Create':
          // FIME: clone object and delete property
          delete change.after['resourceGroup']
          printer.printLine(`${resourceId} [${change.after['apiVersion']}]`, 1, change.changeType)
          printer.printLine()
          printObject(printer, 2, change.after)
          break
        case 'Delete':
          printer.printLine(`${resourceId}`, 1, change.changeType)
          printer.printLine()
          printObject(printer, 2, change.before)
          break
        case 'Modify':
          printer.printLine(`${resourceId} [${change.after['apiVersion']}]`, 1, change.changeType)
          printPropertyChange(printer, 2, change.delta)
          break
        case 'NoChange':
          printer.printLine(`${resourceId} [${change.after['apiVersion']}]`, 1, change.changeType)
          break
        case 'Ignore':
          printer.printLine(`${resourceId}`, 1, change.changeType)
          break
      }
    }
  }

  // TODO: print footer
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
      switch (typeof value) {
        case 'string':
        printer.printLine(`${fullKeyPadded}"${value}"`, level, '')
          break
        case 'number':
        case 'boolean':
        printer.printLine(`${fullKeyPadded}${value}`, level, '')
          break
      }
    }
  }
}

function printPropertyChange(printer: Printer, level: number, deltas: PropertyChange[]) {
  const maxKeyLength = deltas.map(elm => elm.path).reduce((acc, cur) => Math.max(acc, cur.length), 0) + 2
  deltas.forEach(delta => {
    switch (delta.propertyChangeType) {
      case 'Create':
      case 'Delete': {
        const valueToPrint = delta.propertyChangeType === 'Create' ? delta.after : delta.before
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
          printer.printLine(`${fullKeyPadded}${JSON.stringify(valueToPrint)}`, level, delta.propertyChangeType)
          // switch (typeof valueToPrint) {
          //   case 'string':
          //     printer.printLine(`${fullKeyPadded}"${valueToPrint}"`, level, delta.propertyChangeType)
          //     break
          //   case 'number':
          //   case 'boolean':
          //     printer.printLine(`${fullKeyPadded}${valueToPrint}`, level, delta.propertyChangeType)
          //     break
          // }
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
      case 'Array':
        printer.printLine(`${delta.path}: [`, level, 'Array')
        printPropertyChange(printer, level + 1, delta.children)
        printer.printLine()
        printer.printLine(']', level, '')
        break
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
  result.changes.forEach(elm => resourceGroupIds.add(resourceGroupFromResouceId(elm.resourceId).id))

  // categorize resources into each resource group
  return {
    scopes: Array.from(resourceGroupIds).map(rgid => ({
      id: rgid,
      changes: result.changes
      // select resources of this resource group
      .filter(elm => resourceGroupFromResouceId(elm.resourceId).id === rgid)
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
  printObject,
  printPropertyChange,
  flattenObject,
  organizeResult,
}
