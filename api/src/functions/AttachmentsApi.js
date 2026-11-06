const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");
const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const { randomUUID } = require("crypto");

const credential = new DefaultAzureCredential();

const cosmosClient = process.env.COSMOS_KEY
    ? new CosmosClient({
        endpoint: process.env.COSMOS_ENDPOINT,
        key: process.env.COSMOS_KEY
    })
    : new CosmosClient({
        endpoint: process.env.COSMOS_ENDPOINT,
        aadCredentials: credential
    });

const tasks = cosmosClient
    .database(process.env.COSMOS_DATABASE)
    .container(process.env.COSMOS_CONTAINER);

const blobService = new BlobServiceClient(
    process.env.STORAGE_ACCOUNT_URL,
    credential
);

const attachments = blobService.getContainerClient(
    process.env.STORAGE_CONTAINER
);

// POST /api/tasks/{id}/attachment
app.http("uploadAttachment", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "tasks/{id}/attachment",
    handler: async (request) => {
        const id = request.params.id;

        try {
            const { resource: task } = await tasks.item(id, id).read();

            if (!task) {
                return {
                    status: 404,
                    jsonBody: { error: "Task not found" }
                };
            }

            const form = await request.formData();
            const file = form.get("file");

            if (!file || typeof file.arrayBuffer !== "function") {
                return {
                    status: 400,
                    jsonBody: { error: "Please select a file" }
                };
            }

            const maxSize = 5 * 1024 * 1024;

            if (file.size <= 0 || file.size > maxSize) {
                return {
                    status: 400,
                    jsonBody: { error: "File must be between 1 byte and 5 MB" }
                };
            }

            const originalName = file.name.replace(/[\\\/]/g, "_");
            const blobName = `${id}/${randomUUID()}-${originalName}`;

            const blob = attachments.getBlockBlobClient(blobName);

            await blob.uploadData(
                Buffer.from(await file.arrayBuffer()),
                {
                    blobHTTPHeaders: {
                        blobContentType: file.type || "application/octet-stream"
                    }
                }
            );

            task.attachment = {
                blobName,
                fileName: originalName,
                contentType: file.type || "application/octet-stream",
                size: file.size,
                uploadedAt: new Date().toISOString()
            };

            await tasks.item(id, id).replace(task);

            return {
                status: 201,
                jsonBody: {
                    message: "Attachment uploaded successfully",
                    attachment: task.attachment
                }
            };
        } catch (error) {
            if (error.code === 404 || error.statusCode === 404) {
                return {
                    status: 404,
                    jsonBody: { error: "Task not found" }
                };
            }

            console.error("Attachment upload failed:", error);

            return {
                status: 500,
                jsonBody: { error: "Could not upload attachment" }
            };
        }
    }
});

// GET /api/tasks/{id}/attachment
app.http("downloadAttachment", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "tasks/{id}/attachment",
    handler: async (request) => {
        const id = request.params.id;

        try {
            const { resource: task } = await tasks.item(id, id).read();

            if (!task) {
                return {
                    status: 404,
                    jsonBody: { error: "Task not found" }
                };
            }

            if (!task.attachment?.blobName) {
                return {
                    status: 404,
                    jsonBody: { error: "No attachment found" }
                };
            }

            const blob = attachments.getBlobClient(task.attachment.blobName);
            const download = await blob.download();

            return {
                status: 200,
                headers: {
                    "Content-Type": task.attachment.contentType,
                    "Content-Disposition": `attachment; filename="${task.attachment.fileName.replace(/["\r\n]/g, "_")}"`,
                    "Cache-Control": "no-store"
                },
                body: download.readableStreamBody
            };
        } catch (error) {
            if (error.code === 404 || error.statusCode === 404) {
                return {
                    status: 404,
                    jsonBody: { error: "Task or attachment not found" }
                };
            }

            console.error("Attachment download failed:", error);

            return {
                status: 500,
                jsonBody: { error: "Could not download attachment" }
            };
        }
    }
});

// DELETE /api/tasks/{id}/attachment
app.http("deleteAttachment", {
    methods: ["DELETE"],
    authLevel: "anonymous",
    route: "tasks/{id}/attachment",
    handler: async (request) => {
        const id = request.params.id;

        try {
            const { resource: task } = await tasks.item(id, id).read();

            if (!task) {
                return {
                    status: 404,
                    jsonBody: { error: "Task not found" }
                };
            }

            if (!task.attachment?.blobName) {
                return {
                    status: 404,
                    jsonBody: { error: "No attachment found" }
                };
            }

            const blob = attachments.getBlobClient(task.attachment.blobName);

            await blob.deleteIfExists();

            delete task.attachment;

            await tasks.item(id, id).replace(task);

            return {
                status: 200,
                jsonBody: { message: "Attachment deleted successfully" }
            };
        } catch (error) {
            if (error.code === 404 || error.statusCode === 404) {
                return {
                    status: 404,
                    jsonBody: { error: "Task or attachment not found" }
                };
            }

            console.error("Attachment deletion failed:", error);

            return {
                status: 500,
                jsonBody: { error: "Could not delete attachment" }
            };
        }
    }
});
