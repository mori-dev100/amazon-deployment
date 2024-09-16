import { Rule } from '@/types/config'
import { OperationResult, PropertyChange } from '@/types/whatif'
import { parseAzureResource } from '@/utils/azure'

/**
 * Evaluate string matching.
 * @param condition - rule condition
 * @param value - value for evaluation
 * @returns true if `condition` matches `value`
 */
function matchString(condition: string, value: string): boolean {
  return condition === undefined || condition === value
}

/**
 * Evaluate string matching (Regex).
 * Unlike `matchString`, this functions recognize `condition` as regex string.
 * @param condition - rule condition
 * @param value - value for evaluation
 * @returns true if `condition` matches `value`
 */
function matchStringRegex(condition: string, value: string): boolean {
  return condition === undefined || new RegExp(condition).test(value)
}

/**
 * Filter out property changes (delta) which match rule conditions.
 * @param propertyChange - target list. this must be a value of `delta` key or `children` key.
 * @param resourceId - ID of resource which property belongs to
 * @param rules - filtering rules
 * @param parentPath - path of parent property
 * @param isArray - true if the type of parent property change is `Array`
 * @returns filtered list
 */
function filterPropertyChanges(propertyChange: PropertyChange[], resourceId: string, rules: Rule[], parentPath: string = '', isArray: boolean = false): PropertyChange[] {
  // filter property changes recursively and filter out itself if no children exist after filtering
  return propertyChange.map(pc => {
    // construct full path
    // full path is `.` joined property paths from root property
    // if type of parent property change is `Array`, `[]` appended before `.`
    //
    // e.g. `parentProp.childProp`
    // e.g. `rootProp.parentProp[].childProp`
    let fullPath: string
    if (isArray) {
      fullPath = `${parentPath}[]`
    }
    else {
      fullPath = parentPath === '' ? pc.path : `${parentPath}.${pc.path}`
    }

    // return null (filter out) this property change if at least one rule is matched
    for (const rule of rules) {
      const resource = parseAzureResource(resourceId)
      const resourceGroupMatched = matchString(rule.resourceGroupName, resource.resourceGroup.name)
      const providerNamespaceMatched = matchString(rule.providerNamespace, resource.providerNamespace)
      const resourceTypeMatched = matchString(rule.resourceType, resource.type)
      const resourceNameMatched = matchString(rule.resourceName, resource.name)
      const resourceNameRegexMatched = matchStringRegex(rule.resourceNameRegex, resource.name)
      const propertyChangeTypeMatched = matchString(rule.propertyChangeType, pc.propertyChangeType)
      const pathMatched = matchString(rule.propertyPath, fullPath)
      if (
        resourceGroupMatched
        && providerNamespaceMatched
        && resourceTypeMatched
        && resourceNameMatched
        && resourceNameRegexMatched
        && propertyChangeTypeMatched
        && pathMatched
      ) {
        return null
      }
    }
    // filter children recursively and filter out itself if no children exist after filtering
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

/**
 * Denoise operation result by filtering out property changes which match rules.
 * @param operationReuslt - original operation result
 * @param rules - rules to apply
 * @param filterd operation result
 */
export function denoiseOperationResult(operationReuslt: OperationResult, rules: Rule[]): OperationResult {
  const filteredResult = structuredClone(operationReuslt)

  filteredResult.changes = filteredResult.changes.map(c => {
    // process only changes which type is `Modify`
    if (c.changeType !== 'Modify') {
      return c
    }

    c.delta = filterPropertyChanges(c.delta, c.resourceId, rules)
    if (c.delta.length == 0) {
      c.changeType = 'NoChange'
    }

    return c
  }).filter(c => c != null)

  return filteredResult
}
