
const form = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const filter = document.getElementById("filter");

let tasks = JSON.parse(localStorage.getItem("taskflow-tasks") || "[]");

document.getElementById("today").textContent =
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

function saveTasks() {
  localStorage.setItem("taskflow-tasks", JSON.stringify(tasks));
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
    description.textContent =
      task.description || "No description";

    const attachment = document.createElement("p");
    attachment.textContent = task.fileName
      ? `📎 ${task.fileName}`
      : "";

    info.append(title, description, attachment);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const completeButton = document.createElement("button");
    completeButton.textContent =
      task.completed ? "Undo" : "Complete";

    completeButton.addEventListener("click", () => {
      task.completed = !task.completed;
      saveTasks();
      renderTasks();
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete";

    deleteButton.addEventListener("click", () => {
      tasks = tasks.filter(item => item.id !== task.id);
      saveTasks();
      renderTasks();
    });

    actions.append(completeButton, deleteButton);
    card.append(info, actions);
    taskList.append(card);
  });
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const title = document.getElementById("taskTitle").value.trim();
  const description =
    document.getElementById("taskDescription").value.trim();

  const file = document.getElementById("taskFile").files[0];

  if (!title) return;

  tasks.unshift({
    id: crypto.randomUUID(),
    title,
    description,
    completed: false,
    fileName: file ? file.name : ""
  });

  saveTasks();
  form.reset();
  document.getElementById("formMessage").textContent =
    "Task added successfully!";

  renderTasks();
});

filter.addEventListener("change", renderTasks);

renderTasks();
