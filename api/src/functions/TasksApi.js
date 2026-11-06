
const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const { randomUUID } = require("crypto");

// Local development uses the Cosmos DB key.
// Azure deployment uses the Function App's Managed Identity.
const endpoint = process.env.COSMOS_ENDPOINT;

if (!endpoint) {
    throw new Error("COSMOS_ENDPOINT is not configured.");
}

const credential = new DefaultAzureCredential();

const client = process.env.COSMOS_KEY
    ? new CosmosClient({
        endpoint,
        key: process.env.COSMOS_KEY
    })
    : new CosmosClient({
        endpoint,
        aadCredentials: credential
    });

const container = client
    .database(process.env.COSMOS_DATABASE)
    .container(process.env.COSMOS_CONTAINER);

// Blob Storage client for task attachments.
const blobContainerClient = process.env.STORAGE_ACCOUNT_URL &&
    process.env.STORAGE_CONTAINER
    ? new BlobServiceClient(
        process.env.STORAGE_ACCOUNT_URL,
        credential
    ).getContainerClient(process.env.STORAGE_CONTAINER)
    : null;

function isNotFound(error) {
    return error.code === 404 || error.statusCode === 404;
}

// GET /api/tasks
app.http("getTasks", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "tasks",
    handler: async () => {
        try {
            const { resources } = await container.items
                .query("SELECT * FROM c")
                .fetchAll();

            return {
                status: 200,
                jsonBody: resources
            };
        } catch (error) {
            console.error("Get tasks failed:", error);
            return {
                status: 500,
                jsonBody: { error: "Could not retrieve tasks" }
            };
        }
    }
});

// POST /api/tasks
app.http("createTask", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "tasks",
    handler: async (request) => {
        let body;

        try {
            body = await request.json();
        } catch {
            return {
                status: 400,
                jsonBody: { error: "Invalid JSON body" }
            };
        }

        if (
            !body.title ||
            typeof body.title !== "string" ||
            !body.title.trim()
        ) {
            return {
                status: 400,
                jsonBody: { error: "Task title is required" }
            };
        }

        const task = {
            id: randomUUID(),
            title: body.title.trim(),
            description: typeof body.description === "string"
                ? body.description.trim()
                : "",
            completed: false,
            createdAt: new Date().toISOString()
        };

        try {
            const { resource } = await container.items.create(task);

            return {
                status: 201,
                jsonBody: resource
            };
        } catch (error) {
            console.error("Create task failed:", error);
            return {
                status: 500,
                jsonBody: { error: "Could not create task" }
            };
        }
    }
});

// GET /api/tasks/{id}
app.http("getTask", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "tasks/{id}",
    handler: async (request) => {
        const id = request.params.id;

        try {
            const { resource } = await container.item(id, id).read();

            return resource
                ? { status: 200, jsonBody: resource }
                : { status: 404, jsonBody: { error: "Task not found" } };
        } catch (error) {
            if (isNotFound(error)) {
                return {
                    status: 404,
                    jsonBody: { error: "Task not found" }
                };
            }

            console.error("Get task failed:", error);
            return {
                status: 500,
                jsonBody: { error: "Could not retrieve task" }
            };
        }
    }
});

// PATCH /api/tasks/{id}
app.http("updateTask", {
    methods: ["PATCH"],
    authLevel: "anonymous",
    route: "tasks/{id}",
    handler: async (request) => {
        let body;

        try {
            body = await request.json();
        } catch {
            return {
                status: 400,
                jsonBody: { error: "Invalid JSON body" }
            };
        }

        const id = request.params.id;

        try {
            const { resource: task } = await container.item(id, id).read();

            if (!task) {
                return {
                    status: 404,
                    jsonBody: { error: "Task not found" }
                };
            }

            if (body.title !== undefined) {
                if (
                    typeof body.title !== "string" ||
                    !body.title.trim()
                ) {
                    return {
                        status: 400,
                        jsonBody: { error: "Task title cannot be empty" }
                    };
                }

                task.title = body.title.trim();
            }

            if (body.description !== undefined) {
                task.description = String(body.description);
            }

            if (body.completed !== undefined) {
                if (typeof body.completed !== "boolean") {
                    return {
                        status: 400,
                        jsonBody: {
                            error: "Completed must be true or false"
                        }
                    };
                }

                task.completed = body.completed;
            }

            const { resource: updatedTask } = await container
                .item(id, id)
                .replace(task);

            return {
                status: 200,
                jsonBody: updatedTask
            };
        } catch (error) {
            if (isNotFound(error)) {
                return {
                    status: 404,
                    jsonBody: { error: "Task not found" }
                };
            }

            console.error("Update task failed:", error);
            return {
                status: 500,
                jsonBody: { error: "Could not update task" }
            };
        }
    }
});

// DELETE /api/tasks/{id}
// Also deletes the task's attachment from Azure Blob Storage.
app.http("deleteTask", {
    methods: ["DELETE"],
    authLevel: "anonymous",
    route: "tasks/{id}",
    handler: async (request) => {
        const id = request.params.id;

        try {
            // Retrieve the task first.
            const { resource: task } = await container
                .item(id, id)
                .read();

            if (!task) {
                return {
                    status: 404,
                    jsonBody: { error: "Task not found" }
                };
            }

            // Delete the associated attachment, if one exists.
            if (task.attachment?.blobName) {
                if (!blobContainerClient) {
                    throw new Error("Blob Storage is not configured.");
                }

                const blobClient = blobContainerClient.getBlobClient(
                    task.attachment.blobName
                );

                await blobClient.deleteIfExists();
            }

            // Delete the task from Cosmos DB.
            await container.item(id, id).delete();

            return {
                status: 204
            };

        } catch (error) {
            if (isNotFound(error)) {
                return {
                    status: 404,
                    jsonBody: { error: "Task not found" }
                };
            }

            console.error("Delete task failed:", error);

            return {
                status: 500,
                jsonBody: { error: "Could not delete task" }
            };
        }
    }
});
