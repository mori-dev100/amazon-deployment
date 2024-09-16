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
/** resource change type for validation */
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
/** property change type for validation */
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
/** property change for validation */
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
 * resouce change for validation
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
 * operation result for validation
 * https://learn.microsoft.com/en-us/rest/api/resources/deployments/what-if?view=rest-resources-2021-04-01&tabs=HTTP#whatifoperationresult
 */
export const OperationResultT = t.type({
  status: t.string,
  changes: t.array(ChangeT),
})

/** operation result */
export type OperationResult = t.TypeOf<typeof OperationResultT>
/** resource change type */
export type ChangeType = t.TypeOf<typeof ChangeTypeT>
/** property change type */
export type PropertyChangeType = t.TypeOf<typeof PropertyChangeTypeT>
/** resource change */
export type Change = t.TypeOf<typeof ChangeT>
