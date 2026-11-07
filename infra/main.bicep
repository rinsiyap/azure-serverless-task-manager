@description('Existing Cosmos DB account')
param cosmosAccountName string = 'rin71604928'

@description('Existing database')
param databaseName string = 'taskflowdb'

@description('Existing container')
param containerName string = 'tasks'

@description('Existing Storage account')
param storageAccountName string = 'taskflow607496'

@description('Existing Function App')
param functionAppName string = 'taskflow-api-378624'

@description('Existing Key Vault')
param keyVaultName string = 'kv-taskflow-495926'

@description('Existing Log Analytics workspace')
param workspaceName string = 'law-taskflow-495926'

@description('Existing Application Insights component')
param appInsightsName string = 'ai-taskflow-495926'

@description('Existing Static Web App')
param staticWebAppName string = 'taskflow-web-rinsiya'

@description('Existing Monitor Action Group')
param actionGroupName string = 'ag-taskflow-alerts'

@description('Existing HTTP 5xx alert')
param alertRuleName string = 'taskflow-http5xx-alert'

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' existing = {
  name: cosmosAccountName
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' existing = {
  parent: cosmos
  name: databaseName
}

resource container 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' existing = {
  parent: database
  name: containerName
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' existing = {
  name: functionAppName
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource workspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' existing = {
  name: workspaceName
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' existing = {
  name: staticWebAppName
}

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' existing = {
  name: actionGroupName
}

resource alertRule 'Microsoft.Insights/scheduledQueryRules@2023-12-01' existing = {
  name: alertRuleName
}

output cosmosEndpoint string = cosmos.properties.documentEndpoint
output cosmosResourceId string = cosmos.id
output databaseResourceId string = database.id
output containerResourceId string = container.id

output storageBlobEndpoint string = storage.properties.primaryEndpoints.blob
output storageResourceId string = storage.id

output functionAppHostname string = functionApp.properties.defaultHostName
output functionAppResourceId string = functionApp.id

output keyVaultUri string = keyVault.properties.vaultUri
output keyVaultResourceId string = keyVault.id

output logAnalyticsWorkspaceId string = workspace.id
output appInsightsAppId string = appInsights.properties.AppId

output staticWebAppHostname string = staticWebApp.properties.defaultHostname
output staticWebAppResourceId string = staticWebApp.id

output actionGroupResourceId string = actionGroup.id
output alertRuleResourceId string = alertRule.id
