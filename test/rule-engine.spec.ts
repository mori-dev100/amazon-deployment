import { assert } from 'chai'
import { denoiseOperationResult} from '@/rule-engine'
import { OperationResult } from '@/types/whatif'

describe('rule-engine', () => {
  it("filter resource group", async () => {
    const input = await import ('./rule-engine-testdata-resourceid.json') as OperationResult

    const actual = denoiseOperationResult(input, [{
      resourceGroupName: 'test-rg1',
    }])
    assert.deepEqual(actual.changes.map(c => ({
      resourceId: c.resourceId,
      changeType: c.changeType,
    })), [
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg1/providers/Microsoft.Storage/storageAccounts/testmodified1',
        changeType: 'NoChange',
      },
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg2/providers/Microsoft.Storage/storageAccounts/testmodified2',
        changeType: 'Modify',
      },
    ])
  })

  it("filter resource type", async () => {
    const input = await import ('./rule-engine-testdata-resourcetype.json') as OperationResult

    const actual = denoiseOperationResult(input, [{
      resourceType: 'workspaces',
    }])
    assert.deepEqual(actual.changes.map(c => ({
      resourceId: c.resourceId,
      changeType: c.changeType,
    })), [
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg1/providers/Microsoft.Storage/storageAccounts/testmodify1',
        changeType: 'Modify',
      },
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg2/providers/Microsoft.OperationalInsights/workspaces/testmodify2',
        changeType: 'NoChange',
      },
    ])
  })

  it("filter provider namespace", async () => {
    const input = await import ('./rule-engine-testdata-providernamespace.json') as OperationResult

    const actual = denoiseOperationResult(input, [{
      providerNamespace: 'Microsoft.Storage',
    }])
    assert.deepEqual(actual.changes.map(c => ({
      resourceId: c.resourceId,
      changeType: c.changeType,
    })), [
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg1/providers/Microsoft.Storage/storageAccounts/testmodify1',
        changeType: 'NoChange',
      },
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg2/providers/Microsoft.OperationalInsights/workspaces/testmodify2',
        changeType: 'Modify',
      },
    ])
  })

  it("filter resource name", async () => {
    const input = await import ('./rule-engine-testdata-resourcename.json') as OperationResult

    const actual = denoiseOperationResult(input, [{
      resourceName: 'testmodify1',
    }])
    assert.deepEqual(actual.changes.map(c => ({
      resourceId: c.resourceId,
      changeType: c.changeType,
    })), [
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg1/providers/Microsoft.Storage/storageAccounts/testmodify1',
        changeType: 'NoChange',
      },
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg2/providers/Microsoft.OperationalInsights/workspaces/testmodify2',
        changeType: 'Modify',
      },
    ])
  })

  it("filter resource name (regex)", async () => {
    const input = await import ('./rule-engine-testdata-resourcename-regex.json') as OperationResult

    const actual = denoiseOperationResult(input, [{
      resourceNameRegex: '.*hoge.*',
    }])
    assert.deepEqual(actual.changes.map(c => ({
      resourceId: c.resourceId,
      changeType: c.changeType,
    })), [
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg1/providers/Microsoft.Storage/storageAccounts/testmodify1',
        changeType: 'Modify',
      },
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg2/providers/Microsoft.OperationalInsights/workspaces/testhogemodify2',
        changeType: 'NoChange',
      },
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg2/providers/Microsoft.OperationalInsights/workspaces/testhogemodify3',
        changeType: 'NoChange',
      },
    ])
  })

  it('filter type of property change', async () => {
    const input = await import ('./rule-engine-testdata-property-change-type.json') as OperationResult

    const actual = denoiseOperationResult(input, [{
      propertyChangeType: 'Delete',
    }])
    assert.deepEqual(actual.changes.map(c => ({
      resourceId: c.resourceId,
      changeType: c.changeType,
    })), [
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg1/providers/Microsoft.Storage/storageAccounts/testmodify1',
        changeType: 'Modify',
      },
      {
        resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg2/providers/Microsoft.OperationalInsights/workspaces/testmodify2',
        changeType: 'NoChange',
      },
    ])
  })

  describe('filter path of property change', () => {
    it("root", async () => {
      const input = await import ('./rule-engine-testdata-path-root.json') as OperationResult

      const actual = denoiseOperationResult(input, [{
        propertyPath: 'path2',
      }])
      assert.deepEqual(actual.changes.map(c => ({
        resourceId: c.resourceId,
        changeType: c.changeType,
      })), [
        {
          resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg1/providers/Microsoft.Storage/storageAccounts/testmodify1',
          changeType: 'Modify',
        },
        {
          resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg2/providers/Microsoft.OperationalInsights/workspaces/testmodify2',
          changeType: 'NoChange',
        },
      ])
    })

    it("child (object)", async () => {
      const input = await import ('./rule-engine-testdata-path-object-child.json') as OperationResult

      const actual = denoiseOperationResult(input, [{
        propertyPath: 'path2.path2-1',
      }])
      assert.deepEqual(actual.changes.map(c => ({
        resourceId: c.resourceId,
        changeType: c.changeType,
      })), [
        {
          resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg1/providers/Microsoft.Storage/storageAccounts/testmodify1',
          changeType: 'Modify',
        },
        {
          resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg2/providers/Microsoft.OperationalInsights/workspaces/testmodify2',
          changeType: 'NoChange',
        },
      ])
    })

    it("child (array)", async () => {
      const input = await import ('./rule-engine-testdata-path-array-child.json') as OperationResult

      const actual = denoiseOperationResult(input, [{
        propertyPath: 'path2[].path2-0-1',
      }])
      assert.deepEqual(actual.changes.map(c => ({
        resourceId: c.resourceId,
        changeType: c.changeType,
      })), [
        {
          resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg1/providers/Microsoft.Storage/storageAccounts/testmodify1',
          changeType: 'Modify',
        },
        {
          resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg2/providers/Microsoft.OperationalInsights/workspaces/testmodify2',
          changeType: 'NoChange',
        },
      ])
    })

    it("unfiltered changes remain", async () => {
      const input = await import ('./rule-engine-testdata-path-partial.json') as OperationResult

      const actual = denoiseOperationResult(input, [{
        propertyPath: 'path2[].path2-0-1',
      }])
      assert.deepEqual(actual.changes.map(c => ({
        resourceId: c.resourceId,
        delta: c.delta.map(d => ({
          path: d.path,
          children: d.children.map(c2 => ({
            path: c2.path,
            children: c2.children.map(c3 => ({
              path: c3.path,
            })),
          })),
        })),
      })), [
        {
          resourceId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg2/providers/Microsoft.OperationalInsights/workspaces/testmodify2',
          delta: [
            {
              path: 'path2',
              children: [
                {
                  path: '1',
                  children:
                  [
                    {
                      path: 'path2-1-1',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  // TODO: empty rule
  // TODO: mixed rule (AND)
  // TODO: multiple rule (OR)
})
