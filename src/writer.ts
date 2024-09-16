import { OperationResult, ChangeType, PropertyChangeType, Change, PropertyChange } from '@/types/whatif'
import { parseAzureResource } from '@/utils/azure'

/**
 * operation result grouped by scope
 */
type OrganizedOperationResult = {
  scopes: {
    id: string,
    changes: Change[],
  }[]
}

/**
 * abstract printer
 */
export type Printer = {
  /**
   * Print line to the media.
   * @param line - line to print
   * @param level - indentation level
   * @param changeType - type of property change. will be affected prefix sign. empty string for blank sign.
   */
  printLine(line?: string, level?: number, changeType?: ChangeType | PropertyChangeType | '' | null): void
}

/**
 * printer for console print
 */
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

/**
 * display order of change types
 */
const changeTypeOrder = {
  Delete: 1,
  Create: 2,
  Modify: 3,
  'Array': 3,
  NoChange: 4,
  NoEffect: 4,
  Ignore: 5,
}

/**
 * Prefix sign for change type.
 * @param t - change type or property change type
 * @returns prefix sign
 */
function signForChangeType(t: ChangeType | PropertyChangeType): string {
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

/**
 * Append property change types that exist in the property change into the set.
 * This is a recursive function.
 * @param propertyChange - property changes for processing
 * @param changeTypeSet - existing set for appending result
 */
function changeTypeSetOfPropertyChange(propertyChange: PropertyChange, changeTypeSet: Set<PropertyChangeType|ChangeType>) {
  changeTypeSet.add(propertyChange.propertyChangeType)
  if (propertyChange.children) {
    propertyChange.children.forEach(pc => {
      changeTypeSetOfPropertyChange(pc, changeTypeSet)
    })
  }
}

/**
 * Set of (property) change types that exist in operation result.
 * @param operationResult - operation result for processing
 * @returns set of change (property) types which exist in operation result
 */
function changeTypeSetOfOperationResult(operationResult: OperationResult): Set<PropertyChangeType|ChangeType> {
  const changeTypeSet = new Set<PropertyChangeType|ChangeType>()
  operationResult.changes.forEach(c => {
    changeTypeSet.add(c.changeType)
    // process children recursively
    if (c.changeType == 'Modify') {
      c.delta.forEach(pc => {
        changeTypeSetOfPropertyChange(pc, changeTypeSet)
      })
    }
  })
  return changeTypeSet
}

/**
 * Print operation result as pretty style.
 * @param operationResult - operation result to print
 * @param printer - printer for printing
 */
export function printPretty(operationResult: OperationResult, printer: Printer = consolePrinter) {
  // organize (group by scope)
  const pretty = organizeResult(operationResult)

  // print header
  printer.printLine('Note: The result may contain false positive predictions (noise).')
  printer.printLine('You can help us improve the accuracy of the result by opening an issue here: https://aka.ms/WhatIfIssues')
  printer.printLine('This result has been filtered using az-deployment-denoise: https://github.com/ottijp/az-deployment-denoise')
  printer.printLine()

  // print symbol legend
  printer.printLine('Resource and property changes are indicated with these symbols:')
  const changeTypes = Array.from(changeTypeSetOfOperationResult(operationResult))
    .sort((lhs, rhs) => changeTypeOrder[lhs] - changeTypeOrder[rhs])
  changeTypes.forEach(ctype => {
    let description: string
    switch (ctype) {
      case 'Create': description = 'Create'; break
      case 'Delete': description = 'Delete'; break
      case 'Modify': description = 'Modify'; break
      case 'NoChange': description = 'Nochange'; break
      case 'Ignore': description = 'Ignore'; break
      case 'Array':  description = 'Modify'; break
      case 'NoEffect': description = 'Noeffect'; break
    }
    printer.printLine(description, 1, ctype)
  })
  printer.printLine()

  // print general scope header
  printer.printLine('The deployment will update the following scope:')
  printer.printLine()

  // print each scope
  for (const scope of pretty.scopes) {
    // print scope header
    printer.printLine(`Scope: ${scope.id}`)
    printer.printLine()

    // print each change
    for (const change of scope.changes) {
      const pathInScope = parseAzureResource(change.resourceId).pathInScope
      switch (change.changeType) {
        case 'Create':
          // FIXME: clone object and delete property
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

  // summarize change types
  const allChangeTypes = pretty.scopes.map(s => s.changes).flatMap(c => c).map(c => c.changeType)
  const changeTypeSummary = allChangeTypes.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const changeTypeSummaryOrdered = Object.entries(changeTypeSummary)
    .map(([value, count]) => ({ value, count }))
    .sort((lhs, rhs) => changeTypeOrder[lhs.value] - changeTypeOrder[rhs.value])

  // print change summary
  const changeTypesDescription = changeTypeSummaryOrdered
    .filter(c => c.value != 'Ignore')
    .map(c => {
      switch (c.value) {
        case 'Create': return `${c.count} to create`
        case 'Delete': return `${c.count} to delete`
        case 'Modify': return `${c.count} to modify`
        case 'NoChange': return `${c.count} no change`
      }
    }).join(', ')
  printer.printLine()
  printer.printLine(`Resource changes: ${changeTypesDescription}.`)
}

/**
 * Stringify primitive value for printing.
 * This emulates output of `az deployment * what-if`.
 * @param value - value to print
 */
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

/**
 * Print object.
 * This emulates output of `az deployment * what-if`.
 * @param printer - printer for printing
 * @param level - indentation level
 * @param obj - object to pring
 * @param path - paths from root to parent
 */
function printObject(printer: Printer, level: number, obj: object, path: string[] = []) {
  // FIXME: too complex to read
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

/**
 * Print property changes
 * @param printer - printer for printing
 * @param level - indentation level
 * @param deltas - property changes to print
 */
function printPropertyChange(printer: Printer, level: number, deltas: PropertyChange[]) {
  // FIXME: too complex to read
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
 * Organize operation result.
 * This groups operation result by scope.
 * @param result - operation result
 */
function organizeResult(result: OperationResult): OrganizedOperationResult {
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

/**
 * Convert object structure from tree to flat.
 * This is a recursive function.
 * @param obj - target
 * @param path - paths from root to parent
 */
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
