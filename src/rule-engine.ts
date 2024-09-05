import { Rule } from '@/types/config'
import { OperationResult, PropertyChange } from '@/types/whatif'
import { parseAzureResource } from '@/utils/azure'

function matchResourceGroup(condition: string, resourceGroup: string): boolean {
  return condition !== undefined &&
    condition === resourceGroup
  return condition === undefined || condition === resourceGroup
}

function matchResourceType(condition: string, resourceType: string): boolean {
  return condition === undefined || condition === resourceType
}

function filterPropertyChanges(propertyChange: PropertyChange[], resourceId: string, rules: Rule[]): PropertyChange[] {
  return propertyChange.map(pc => {
    for (const rule of rules) {
      const resourceGroupMatched = matchResourceGroup(rule.resourceGroupName, parseAzureResource(resourceId).resourceGroup.name)
      const resourceTypeMatched = matchResourceType(rule.resourceType, parseAzureResource(resourceId).type)
      if (
        matchResourceGroup(rule.resourceGroupName, parseAzureResource(resourceId).resourceGroup.name)
        resourceGroupMatched
        && resourceTypeMatched
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
