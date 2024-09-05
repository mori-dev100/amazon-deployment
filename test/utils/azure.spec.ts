import { assert } from 'chai'
import { parseAzureResource } from '@/utils/azure'

describe('azure', () => {
  describe('parseAzureResource', () => {
    it("valid resouce ID", () => {
      const result = parseAzureResource('/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/test-resource-group/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myIdentity')
      assert.deepEqual(result, {
        id: '/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/test-resource-group/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myIdentity',
        scope: 'resourceGroup',
        resourceGroup: {
          id: '/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/test-resource-group',
          name: 'test-resource-group',
        },
        providerNamespace: 'Microsoft.ManagedIdentity',
        subscriptionId: '00000000-0000-0000-0000-000000000001',
        type: 'userAssignedIdentities',
        name: 'myIdentity',
        pathInScope: `Microsoft.ManagedIdentity/userAssignedIdentities/myIdentity`,
      })
    })

    it("invalid format", () => {
      assert.throw(() => {
        parseAzureResource('/subscriptions/00000000-0000-0000-0000-000000000001/test-resource-group/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myIdentity')
      })
    })
  })
})
