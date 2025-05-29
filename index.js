// To-Do List App Logic
const tasksKey = 'todo-tasks-v1';
let tasks = [];
let editingTaskId = null;

// DOM Elements
const tasksList = document.getElementById('tasks-list');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskModal = document.getElementById('taskModal');
const modalOverlay = document.getElementById('modalOverlay');
const taskInput = document.getElementById('taskInput');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');
const modalTitle = document.getElementById('modalTitle');

// Utility: Get month/year string
function getMonthYear(date) {
  const d = new Date(date);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

// Utility: Group tasks by month/year
function groupTasks(tasks) {
  const groups = {};
  tasks.forEach(task => {
    const group = getMonthYear(task.createdAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(task);
  });
  // Sort groups by date descending
  return Object.entries(groups).sort((a, b) => new Date(b[1][0].createdAt) - new Date(a[1][0].createdAt));
}

// Render tasks
function renderTasks() {
  tasksList.innerHTML = '';
  if (!tasks.length) {
    tasksList.innerHTML = '<div style="color:#aaa;text-align:center;margin-top:2rem;">No tasks yet</div>';
    return;
  }
  const grouped = groupTasks(tasks);
  grouped.forEach(([group, groupTasks]) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'tasks-group';
    groupDiv.innerHTML = `<div class="tasks-group-title">${group}</div>`;
    groupTasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'task-card';      const isCompleted = task.completed ? 'task-completed' : '';
      card.innerHTML = `
        <div class="task-icon">📝</div>
        <div class="task-title ${isCompleted}">${task.title}</div>
        <button class="task-menu-btn" aria-label="Task menu" data-id="${task.id}">&#8942;</button>
      `;      // Menu button events
      card.querySelector('.task-menu-btn').onclick = (e) => {
        e.stopPropagation(); // Prevent card click when clicking menu
        openTaskMenu(e, task.id);
      };
      
      // Double click on card to toggle completed state
      const titleEl = card.querySelector('.task-title');
      card.addEventListener('dblclick', (e) => {
        if (!e.target.closest('.task-menu-btn')) { // Ignore if clicking menu button
          task.completed = !task.completed;
          titleEl.classList.toggle('task-completed');
          saveTasks();
        }
      });
      
      // Mobile double tap support
      let lastTap = 0;
      card.addEventListener('touchend', (e) => {
        if (e.target.closest('.task-menu-btn')) return; // Ignore if touching menu button
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
          e.preventDefault();
          task.completed = !task.completed;
          titleEl.classList.toggle('task-completed');
          saveTasks();
        }
        lastTap = currentTime;
      });

      groupDiv.appendChild(card);
    });
    tasksList.appendChild(groupDiv);
  });
}

// Open modal
function openModal(edit = false, task = null) {
  taskModal.classList.add('active');
  modalOverlay.style.display = 'block';
  if (edit && task) {
    modalTitle.textContent = 'Edit Task';
    taskInput.value = task.title;
    editingTaskId = task.id;
  } else {
    modalTitle.textContent = 'Add Task';
    taskInput.value = '';
    editingTaskId = null;
  }
  setTimeout(() => taskInput.focus(), 100);
}
// Close modal
function closeModal() {
  taskModal.classList.remove('active');
  modalOverlay.style.display = 'none';
  taskInput.value = '';
  editingTaskId = null;
}

// Add/Edit Task
saveTaskBtn.onclick = function(e) {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) {
    taskInput.classList.add('input-error');
    taskInput.focus();
    return;
  }
  taskInput.classList.remove('input-error');
  if (editingTaskId) {
    // Edit
    const idx = tasks.findIndex(t => t.id === editingTaskId);
    if (idx > -1) {
      tasks[idx].title = title;
      saveTasks();
    }  } else {
    // Add new task
    tasks.unshift({
      id: Date.now().toString(),
      title: title,
      completed: false,
      createdAt: new Date().toISOString()
    });
    saveTasks();
  }
  closeModal();
  renderTasks();
};

// Cancel modal
cancelTaskBtn.onclick = closeModal;
modalOverlay.onclick = closeModal;
addTaskBtn.onclick = () => openModal();

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Accessibility: allow Enter to submit in modal
if (taskInput) {
  taskInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      saveTaskBtn.click();
    }
  });
}

// Improved: Remove any old menus before opening a new one
function openTaskMenu(e, id) {
  document.querySelectorAll('.task-menu-popup').forEach(m => m.remove());
  const card = e.target.closest('.task-card');
  const menu = document.createElement('div');
  menu.className = 'task-menu-popup';
  menu.style.position = 'absolute';
  const rect = card.getBoundingClientRect();
  menu.style.top = (window.scrollY + rect.bottom - 10) + 'px';
  menu.style.left = (window.scrollX + rect.right - 120) + 'px';
  menu.style.background = '#fff';
  menu.style.boxShadow = '0 2px 12px rgba(0,0,0,0.13)';
  menu.style.borderRadius = '10px';
  menu.style.zIndex = 200;
  menu.style.padding = '0.5rem 0';
  menu.style.minWidth = '110px';
  menu.innerHTML = `
    <button class="task-menu-edit">Edit</button>
    <button class="task-menu-delete">Delete</button>
  `;
  document.body.appendChild(menu);
  // Remove menu on click elsewhere
  const removeMenu = () => { menu.remove(); document.removeEventListener('click', removeMenu, true); };
  setTimeout(() => document.addEventListener('click', removeMenu, true), 10);
  // Edit
  menu.querySelector('.task-menu-edit').onclick = (ev) => {
    ev.stopPropagation();
    removeMenu();
    const task = tasks.find(t => t.id === id);
    openModal(true, task);
  };
  // Delete
  menu.querySelector('.task-menu-delete').onclick = (ev) => {
    ev.stopPropagation();
    removeMenu();
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  };
}

// Save/load tasks from localStorage
function saveTasks() {
  localStorage.setItem(tasksKey, JSON.stringify(tasks));
}
function loadTasks() {
  const data = localStorage.getItem(tasksKey);
  tasks = data ? JSON.parse(data) : [];
}

// Initial load
loadTasks();
renderTasks();

// Ensure add button works by using addEventListener instead of onclick
addTaskBtn.removeEventListener('click', openModal); // Remove any existing listeners
addTaskBtn.addEventListener('click', () => openModal());

// Add subtle animation to task cards
function animateTaskCards() {
  document.querySelectorAll('.task-card').forEach((card, i) => {
    card.style.opacity = 0;
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'all 0.4s cubic-bezier(.4,2,.6,1)';
      card.style.opacity = 1;
      card.style.transform = 'translateY(0)';
    }, 60 * i);
  });
}
const origRenderTasks = renderTasks;
renderTasks = function() {
  origRenderTasks();
  animateTaskCards();
};

// Add a subtle highlight to the add button when modal is open
const observer = new MutationObserver(() => {
  if (taskModal.classList.contains('active')) {
    addTaskBtn.classList.add('add-btn-active');
  } else {
    addTaskBtn.classList.remove('add-btn-active');
  }
});
observer.observe(taskModal, { attributes: true, attributeFilter: ['class'] });