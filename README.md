**UNDER DEVELOPMENT**

# Azure deployment what-If denoiser

This tool helps reduce false positive predictions in the result of `az deployment what-if` (ARM, Bicep) by filtering out unnecessary changes.

## False positive predictions contained in the result of `az deployment what-if`

As indicated in the initial part of the result, the response from [Deployment - What-If API](https://learn.microsoft.com/ja-jp/rest/api/resources/deployments/what-if?view=rest-resources-2021-04-01&tabs=HTTP) may contain false positive predictions.

> Note: The result may contain false positive predictions (noise).
> You can help us improve the accuracy of the result by opening an issue here: https://aka.ms/WhatIfIssues

For instance, the what-if result with Bicep code below indicates changes every time, even when the resource has not changed.

```bicep
param location string = resourceGroup().location
param functionAppName string
param appServicePlanName string

resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'
  }
  kind: 'FunctionApp'
}

resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
      ]
    }
  }
}
```

The what-if execution is:

```bash
az deployment group what-if --template-file false-positive-example.bicep --name test-deployment --resource-group test-rg --parameters functionAppName=test-func-denoise appServicePlanName=test-plan
```

The result is:

```
Note: The result may contain false positive predictions (noise).
You can help us improve the accuracy of the result by opening an issue here: https://aka.ms/WhatIfIssues

Resource and property changes are indicated with these symbols:
  + Create
  ~ Modify
  = Nochange

The deployment will update the following scope:

Scope: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg

  ~ Microsoft.Web/sites/test-func-denoise [2022-09-01]
    + properties.siteConfig.localMySqlEnabled:   false
    + properties.siteConfig.netFrameworkVersion: "v4.6"

  = Microsoft.Web/serverfarms/test-plan [2022-09-01]

Resource changes: 1 to modify, 1 no change.
```

Changes (creation of `properties.siteConfig.localMySqlEnabled` and `properties.siteConfig.netFrameworkVersion`) are shown just after `az deployment create`.

## How to use

### Install from npm

```bash
npm install -g az-deployment-denoise
# or
yarn global add az-deployment-denoise
```

### Define filtering rule

Define rules in `az-deployment-denoise.json` for filtering changes.
You can use the following conditions.

 | Key               | Meaning                       | Example                                 |
 |:------------------|:------------------------------|:----------------------------------------|
 | resourceGroupName | resource group name           | test-rg                                 |
 | providerNamespace | provider namespace            | Microsoft.Web                           |
 | resourceType      | resource type                 | sites                                   |
 | resourceName      | resource name                 | test-func-denoise                       |
 | resourceNameRegex | resource name (regex)         | ^[^-]+-func-denoise$                    |
 | propertyPath      | propety path joined with `.`  | properties.siteConfig.localMySqlEnabled |

If you want to filter the resource `/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/Microsoft.Web/sites/test-func-denoise`, you can define a rule like below.

```json
{
  "rules": [
    {
      "resourceName": "test-func-denoise"
    }
  ]
}
```

Or, you can filter the creation of `properties.siteConfig.localMySqlEnabled` in any Azure Functions resource with a rule like below.

```json
{
  "rules": [
    {
      "providerNamespace": "Microsoft.Web",
      "resourceType": "sites",
      "propertyPath": "properties.siteConfig.localMySqlEnabled"
    }
  ]
}
```

### Usage

Execute `az deployment` with `--no-pretty-print` and input its output to `az-deployment-denoise`.

```bash
az deployment group what-if --resource-group YOUR_RESOURCE_GROUP --template-file YOUR_TEMPLATE_FILE --no-pretty-print | az-deployment-denoise
```

## Development

### Install dependencies

```
npm install
```

### Build and run

```
npm run build
npm start

# for debugging
npm run debug
```

### Lint

```
npm run lint

# lint and fix
npm run lint:fix
```

### Test

```
npm test

# for watching
npm run test:watch

# for debugging
npm run test:debug
```

### Clean artifacts

```
npm run clean
```
