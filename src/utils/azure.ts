/** azure resource */
export type AzureResource = {
  id: string,
  scope: 'resourceGroup',
  subscriptionId: string,
  resourceGroup: {
    id: string,
    name: string,
  },
  providerNamespace: string,
  type: string,
  name: string,
  pathInScope: string,
}

/**
 * parse azure resource information from resouce ID
 * @param id - resource ID
 * @return parsed azure resource information
 * @throws invalid resource ID format
 */
export function parseAzureResource(id: string): AzureResource {
  const match = id.match(/\/subscriptions\/([^/]+)\/resourceGroups\/([^/]+)\/providers\/([^/]+)\/([^/]+)\/(.+)/)
  if (match == null) {
    throw Error(`invalid resource id format: ${id}`)
  }

  const subscriptionId = match[1]
  const resourceGroupName = match[2]
  const providerNamespace = match[3]
  const type = match[4]
  const name = match[5]

  return {
    id: id,
    scope: 'resourceGroup',
    subscriptionId,
    resourceGroup: {
      id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}`,
      name: resourceGroupName,
    },
    providerNamespace,
    type,
    name,
    pathInScope: `${providerNamespace}/${type}/${name}`,
  }
}
