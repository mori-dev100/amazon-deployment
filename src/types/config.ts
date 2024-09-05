import * as t from 'io-ts'

const RuleT = t.type({
  resourceGroupName: t.union([t.string, t.undefined]),
})

export const ConfigT = t.type({
  rules: t.array(RuleT),
})

export type Config = t.TypeOf<typeof ConfigT>
export type Rule = t.TypeOf<typeof RuleT>
