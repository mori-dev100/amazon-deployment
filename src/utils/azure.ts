/**
 * specify resource group from resource ID
 */
export function resourceGroupFromResouceId(resourceId: string): {id: string, name: string} | null {
  const match = resourceId.match(/(\/subscriptions\/[^/]+\/resourceGroups\/)([^/]+)\//)
  if (match == null) {
    return null
  }

  return {
    name: match[2],
    id: `${match[1]}${match[2]}`,
  }
}

/**
 * strip resource group from resource ID
 */
export function stripResourceGroupFromResourceId(resourceId: string): string | null {
  const match = resourceId.match(/\/subscriptions\/[^/]+\/resourceGroups\/[^/]+\/providers\/(.+)/)
  if (match == null) {
    return null
  }

  return match[1]
}
