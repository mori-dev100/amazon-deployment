import { Rule } from '@/types/config'
import { OperationResult, PropertyChange } from '@/types/whatif'
import { parseAzureResource } from '@/utils/azure'

function matchString(condition: string, value: string): boolean {
  return condition === undefined || condition === value
}

function matchStringRegex(condition: string, value: string): boolean {
  return condition === undefined || new RegExp(condition).test(value)
}

function filterPropertyChanges(propertyChange: PropertyChange[], resourceId: string, rules: Rule[], parentPath: string = '', isArray: boolean = false): PropertyChange[] {
  return propertyChange.map(pc => {
    let fullPath: string
    if (isArray) {
      fullPath = `${parentPath}[]`
    }
    else {
      fullPath = parentPath === '' ? pc.path : `${parentPath}.${pc.path}`
    }

    for (const rule of rules) {
      const resource = parseAzureResource(resourceId)
      const resourceGroupMatched = matchString(rule.resourceGroupName, resource.resourceGroup.name)
      const providerNamespaceMatched = matchString(rule.providerNamespace, resource.providerNamespace)
      const resourceTypeMatched = matchString(rule.resourceType, resource.type)
      const resourceNameMatched = matchString(rule.resourceName, resource.name)
      const resourceNameRegexMatched = matchStringRegex(rule.resourceNameRegex, resource.name)
      const pathMatched = matchString(rule.propertyPath, fullPath)
      if (
        resourceGroupMatched
        && providerNamespaceMatched
        && resourceTypeMatched
        && resourceNameMatched
        && resourceNameRegexMatched
        && pathMatched
      ) {
        return null
      }
    }
    if (pc.propertyChangeType === 'Modify' && pc.children !== null) {
      pc.children = filterPropertyChanges(pc.children, resourceId, rules, fullPath)
      if (pc.children.length == 0) {
        return null
      }
      return pc
    }
    else if (pc.propertyChangeType === 'Array' && pc.children !== null) {
      pc.children = filterPropertyChanges(pc.children, resourceId, rules, fullPath, true)
      if (pc.children.length == 0) {
        return null
      }
      return pc
    }
    return pc
  }).filter(pc => pc != null)
}

export function denoiseOperationResult(operationReuslt: OperationResult, rules: Rule[]): OperationResult {
  const filteredResult = structuredClone(operationReuslt)

  filteredResult.changes = filteredResult.changes.map(c => {
    // filter only Modify
    if (c.changeType !== 'Modify') {
      return c
    }

    c.delta = filterPropertyChanges(c.delta, c.resourceId, rules)
    if (c.delta.length == 0) {
      return null
    }

    return c
  }).filter(c => c != null)

  return filteredResult
}
