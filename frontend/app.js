const API_URL = "https://taskflow-api-378624.azurewebsites.net/api/tasks";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const form = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const filter = document.getElementById("filter");
const fileInput = document.getElementById("taskFile");

let tasks = [];

document.getElementById("today").textContent =
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

// JSON API requests
async function apiRequest(url = API_URL, options = {}) {
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const error = await response.json();
      message = error.error || message;
    } catch {}

    throw new Error(message);
  }

  if (response.status === 204) return null;

  return response.json();
}

function showMessage(message, isError = false) {
  const element = document.getElementById("formMessage");
  element.textContent = message;
  element.style.color = isError ? "red" : "";
}

async function loadTasks() {
  try {
    tasks = await apiRequest();
    renderTasks();
  } catch (error) {
    console.error("Could not load tasks:", error);
    showMessage("Could not connect to the TaskFlow API.", true);
  }
}

function renderTasks() {
  taskList.replaceChildren();

  const visibleTasks = tasks.filter(task => {
    if (filter.value === "pending") return !task.completed;
    if (filter.value === "completed") return task.completed;
    return true;
  });

  document.getElementById("totalCount").textContent = tasks.length;

  document.getElementById("pendingCount").textContent =
    tasks.filter(task => !task.completed).length;

  document.getElementById("completedCount").textContent =
    tasks.filter(task => task.completed).length;

  document.getElementById("emptyMessage").hidden =
    visibleTasks.length !== 0;

  visibleTasks.forEach(task => {
    const card = document.createElement("article");
    card.className = `task ${task.completed ? "completed" : ""}`;

    const info = document.createElement("div");
    info.className = "task-info";

    const title = document.createElement("h3");
    title.textContent = task.title;

    const description = document.createElement("p");
    description.textContent = task.description || "No description";

    info.append(title, description);

    if (task.attachment) {
      const attachmentInfo = document.createElement("p");
      attachmentInfo.textContent =
        `?? ${task.attachment.fileName} (${(task.attachment.size / 1024).toFixed(1)} KB)`;

      const downloadButton = document.createElement("button");
      downloadButton.textContent = "Download file";

      downloadButton.addEventListener("click", async () => {
        try {
          const response = await fetch(
            `${API_URL}/${task.id}/attachment`
          );

          if (!response.ok) {
            throw new Error("Could not download attachment");
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");

          link.href = url;
          link.download = task.attachment.fileName;
          document.body.appendChild(link);
          link.click();
          link.remove();

          URL.revokeObjectURL(url);
          showMessage("Attachment downloaded successfully!");
        } catch (error) {
          showMessage(error.message, true);
        }
      });

      const removeAttachmentButton = document.createElement("button");
      removeAttachmentButton.textContent = "Remove attachment";
      removeAttachmentButton.className = "delete";

      removeAttachmentButton.addEventListener("click", async () => {
        try {
          await apiRequest(`${API_URL}/${task.id}/attachment`, {
            method: "DELETE"
          });

          await loadTasks();
          showMessage("Attachment deleted successfully!");
        } catch (error) {
          showMessage(error.message, true);
        }
      });

      info.append(
        attachmentInfo,
        downloadButton,
        removeAttachmentButton
      );
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const completeButton = document.createElement("button");
    completeButton.textContent = task.completed ? "Undo" : "Complete";

    completeButton.addEventListener("click", async () => {
      try {
        await apiRequest(`${API_URL}/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            completed: !task.completed
          })
        });

        await loadTasks();
        showMessage("Task updated successfully!");
      } catch (error) {
        showMessage(error.message, true);
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete";

    deleteButton.addEventListener("click", async () => {
      try {
        await apiRequest(`${API_URL}/${task.id}`, {
          method: "DELETE"
        });

        await loadTasks();
        showMessage("Task deleted successfully!");
      } catch (error) {
        showMessage(error.message, true);
      }
    });

    actions.append(completeButton, deleteButton);
    card.append(info, actions);
    taskList.append(card);
  });
}

// Create task and optionally upload an attachment
form.addEventListener("submit", async event => {
  event.preventDefault();

  const title = document.getElementById("taskTitle").value.trim();
  const description =
    document.getElementById("taskDescription").value.trim();

  const file = fileInput.files[0];

  if (!title) return;

  if (file && (file.size === 0 || file.size > MAX_FILE_SIZE)) {
    showMessage("Select a file between 1 byte and 5 MB.", true);
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const task = await apiRequest(API_URL, {
      method: "POST",
      body: JSON.stringify({ title, description })
    });

    if (file) {
      showMessage("Task created. Uploading attachment...");

      const formData = new FormData();
      formData.append("file", file);

      await apiRequest(`${API_URL}/${task.id}/attachment`, {
        method: "POST",
        body: formData
      });
    }

    form.reset();

    await loadTasks();
    showMessage(
      file
        ? "Task and attachment uploaded successfully!"
        : "Task added successfully!"
    );
  } catch (error) {
    await loadTasks();
    showMessage(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

filter.addEventListener("change", renderTasks);

loadTasks();
