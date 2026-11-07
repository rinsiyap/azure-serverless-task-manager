# TaskFlow Deployment Guide

## 1. Source control

Repository: https://github.com/rinsiyap/azure-serverless-task-manager

The production frontend deployment is triggered by pushes to `main` through the configured GitHub Actions workflow.

Before committing:

```powershell
git status --short
git diff --check
node --check .\frontend\app.js
node --check .\api\src\functions\auth.js
node --check .\api\src\functions\TasksApi.js
node --check .\api\src\functions\AttachmentsApi.js
```

Review staged files and ensure local settings and secrets are excluded:

```powershell
git diff --cached --stat
git diff --cached --check
git ls-files | Select-String 'local.settings.json|\.env'
```

Commit and push only reviewed files:

```powershell
git add <reviewed-file-paths>
git commit -m "Describe the change"
git push origin main
```

## 2. Verify frontend deployment

1. Open the repository Actions tab: https://github.com/rinsiyap/azure-serverless-task-manager/actions
2. Open the workflow run for the latest commit.
3. Confirm the deployment job completed successfully.
4. Open the production site: https://zealous-flower-04d85e400.8.azurestaticapps.net
5. Test Google sign-in and a basic task operation.

## 3. API deployment

The Azure Functions API is hosted at:

`https://taskflow-api-378624.azurewebsites.net`

API code changes must be deployed to the Function App using the configured Functions deployment process. A successful Static Web Apps workflow alone should not be treated as proof that API code was deployed.

After API deployment, verify that the Function App is running and that its expected HTTP functions are loaded.

## 4. Production smoke tests

- Sign in with Google.
- Create a task and refresh the page to confirm persistence.
- Edit, complete, and delete a task.
- Upload an attachment smaller than 5 MB.
- Download and open the attachment.
- Delete the attachment.
- Confirm counters update correctly.
- Review Application Insights for failed requests.

## 5. Operational reminders

- Keep local settings and credentials out of Git.
- Check Azure budgets and actual consumption.
- Review alert configuration and notification recipients.
- Keep Firebase authorized domains and Function App CORS origins aligned with the deployed frontend.
- Review resource health and logs after deployments.
