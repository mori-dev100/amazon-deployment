**UNDER DEVELOPMENT**

# az-deployment-denoise

az-deployment-denoise denoises false positive results of  `az deployment what-if` (ARM, Bicep).

## install

```
npm install -g az-deployment-denoise
# or
yarn global add az-deployment-denoise
```

## usage

use `--no-pretty-print` option of `az deployment` and input its output to `az-deployment-denoise`.

```
az deployment group what-if --resource-group YOUR_RESOURCE_GROUP --template-file YOUR_TEMPLATE_FILE --no-pretty-print | az-deployment-denoise -f az-deployment-denoise.json
```

`az-deployment-denoise.json` example:

```json
{
  "rules": [
    {
      "path": "tags.myNewTag"
    },
    {
      "type": "Microsoft.ManagedIdentity/userAssignedIdentities",
      "path": "tags.myNewTag"
    },
    {
      "type": "Microsoft.ManagedIdentity/userAssignedIdentities",
      "path": "tags.myNewTag",
      "before": "beforetag",
      "after": "beforetag"
    }
  ]
}
```

## TODO

* support `az deployment sub`
* support `az deployment mg`
* support `az deployment tenant`


## dev

### install dependencies

```
npm install
```

### build and run

```
npm run build
npm start

# for debugging
npm run debug
```

### lint

```
npm run lint

# lint and fix
npm run lint:fix
```

### test

```
npm run test

# for watching
npm run test:watch

# for debugging
npm run test:debug
```

### clean artifacts

```
npm run clean
```
