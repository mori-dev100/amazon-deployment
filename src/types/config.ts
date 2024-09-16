import * as t from 'io-ts'
import { PropertyChangeTypeT } from './whatif'

/** filtering rule for validation */
const RuleT = t.intersection([
  t.type({
  }),
  t.partial({
    resourceGroupName: t.string,
    providerNamespace: t.string,
    resourceType: t.string,
    resourceName: t.string,
    resourceNameRegex: t.string,
    propertyPath: t.string,
    propertyChangeType: PropertyChangeTypeT,
  }),
])

/** application configuration for validation */
export const ConfigT = t.type({
  rules: t.array(RuleT),
})

/** application configuration */
export type Config = t.TypeOf<typeof ConfigT>
/** filtering rule */
export type Rule = t.TypeOf<typeof RuleT>
