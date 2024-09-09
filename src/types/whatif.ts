import * as t from 'io-ts'

/**
 * resource change type
 * cf. https://learn.microsoft.com/en-us/rest/api/resources/deployments/what-if?view=rest-resources-2021-04-01&tabs=HTTP#changetype
 */
export const ChangeTypeList = {
  Create: 'Create',
  Delete: 'Delete',
  Deploy: 'Deploy',
  Ignore: 'Ignore',
  Modify: 'Modify',
  NoChange: 'NoChange',
}
const ChangeTypeT = t.keyof(ChangeTypeList)

/**
 * property(delta) change type
 * cf. https://learn.microsoft.com/en-us/rest/api/resources/deployments/what-if?view=rest-resources-2021-04-01&tabs=HTTP#propertychangetype
 */
const PropertyChangeTypeList = {
  'Array': 'Array',
  Create: 'Create',
  Delete: 'Delete',
  Modify: 'Modify',
  NoEffect: 'NoEffect',
}
export const PropertyChangeTypeT = t.keyof(PropertyChangeTypeList)

/**
 * property change
 * cf. https://learn.microsoft.com/en-us/rest/api/resources/deployments/what-if?view=rest-resources-2021-04-01&tabs=HTTP#whatifpropertychange
 */
export type PropertyChange = {
  path: string,
  propertyChangeType: PropertyChangeType,
  before?: unknown,
  after?: unknown,
  children?: PropertyChange[]
}
const PropertyChangeT: t.Type<PropertyChange> = t.recursion('PropertyChange', () => {
  return t.type({
    path: t.string,
    propertyChangeType: PropertyChangeTypeT,
    before: t.union([t.unknown, t.null]),
    after: t.union([t.unknown, t.null]),
    children: t.union([t.array(PropertyChangeT), t.null]),
  })
})

/**
 * change
 * cf. https://learn.microsoft.com/en-us/rest/api/resources/deployments/what-if?view=rest-resources-2021-04-01&tabs=HTTP#whatifchange
 */
const ChangeT = t.type({
  resourceId: t.string,
  changeType: ChangeTypeT,
  before: t.union([t.object, t.null]),
  after: t.union([t.object, t.null]),
  delta: t.union([t.array(PropertyChangeT), t.null]),
})

/**
 * operation result
 * https://learn.microsoft.com/en-us/rest/api/resources/deployments/what-if?view=rest-resources-2021-04-01&tabs=HTTP#whatifoperationresult
 */
export const OperationResultT = t.type({
  status: t.string,
  changes: t.array(ChangeT),
})

export type OperationResult = t.TypeOf<typeof OperationResultT>
export type ChangeType = t.TypeOf<typeof ChangeTypeT>
export type PropertyChangeType = t.TypeOf<typeof PropertyChangeTypeT>
export type Change = t.TypeOf<typeof ChangeT>
