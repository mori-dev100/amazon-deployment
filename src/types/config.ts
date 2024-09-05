import * as t from 'io-ts'

const RuleT = t.intersection([
  t.type({
  }),
  t.partial({
    resourceGroupName: t.string,
    providerNamespace: t.string,
    resourceType: t.string,
    resourceName: t.string,
    resourceNameRegex: t.string,
  }),
])

export const ConfigT = t.type({
  rules: t.array(RuleT),
})

export type Config = t.TypeOf<typeof ConfigT>
export type Rule = t.TypeOf<typeof RuleT>
