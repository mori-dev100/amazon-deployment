import { Rule } from '@/types/config'
import { OperationResult, PropertyChange } from '@/types/whatif'
import { parseAzureResource } from '@/utils/azure'

function matchString(condition: string, value: string): boolean {
  return condition === undefined || condition === value
}

function matchStringRegex(condition: string, value: string): boolean {
  return condition === undefined || new RegExp(condition).test(value)
}

function filterPropertyChanges(propertyChange: PropertyChange[], resourceId: string, rules: Rule[]): PropertyChange[] {
  return propertyChange.map(pc => {
    for (const rule of rules) {
      const resource = parseAzureResource(resourceId)
      const resourceGroupMatched = matchString(rule.resourceGroupName, resource.resourceGroup.name)
      const providerNamespaceMatched = matchString(rule.providerNamespace, resource.providerNamespace)
      const resourceTypeMatched = matchString(rule.resourceType, resource.type)
      const resourceNameMatched = matchString(rule.resourceName, resource.name)
      const resourceNameRegexMatched = matchStringRegex(rule.resourceNameRegex, resource.name)
      if (
        resourceGroupMatched
        && providerNamespaceMatched
        && resourceTypeMatched
        && resourceNameMatched
        && resourceNameRegexMatched
      ) {
        return null
      }
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
