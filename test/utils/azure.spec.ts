import { assert } from 'chai'
import { resourceGroupFromResouceId, stripResourceGroupFromResourceId } from '@/utils/azure'

describe('azure', () => {
  describe('resoureGroupFromResouceId', () => {
    it("valid resource ID", () => {
      const result = resourceGroupFromResouceId('/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/my-resource-group/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myExistingIdentity')
      assert.equal(result.id, '/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/my-resource-group')
      assert.equal(result.name, 'my-resource-group')
    })

    it("invalid resource ID: invalid format", () => {
      const result = resourceGroupFromResouceId('https://example.com/this/is/resource/group/my-resource-group/a/resource')
      assert.equal(result, null)
    })

    it("invalid resource ID: no resource", () => {
      const result = resourceGroupFromResouceId('/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/my-resource-group')
      assert.equal(result, null)
    })
  })

  describe('stripResouceGroupFromResouceId', () => {
    it("valid resource ID", () => {
      const result = stripResourceGroupFromResourceId('/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/my-resource-group/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myExistingIdentity')
      assert.equal(result, 'Microsoft.ManagedIdentity/userAssignedIdentities/myExistingIdentity')
    })

    it("invalid resource ID: invalid format", () => {
      const result = stripResourceGroupFromResourceId('https://example.com/this/is/resource/group/my-resource-group/a/resource')
      assert.equal(result, null)
    })

    it("invalid resource ID: no resource", () => {
      const result = stripResourceGroupFromResourceId('/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/my-resource-group')
      assert.equal(result, null)
    })
  })
})
