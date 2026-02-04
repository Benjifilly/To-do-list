document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputBox = document.getElementById('input-box');
    const addBtn = document.getElementById('add-btn');
    const listContainer = document.getElementById('list-container');
    const taskCounter = document.getElementById('task-counter');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const taskCategory = document.getElementById('task-category');
    const taskPriority = document.getElementById('task-priority');
    const taskDate = document.getElementById('task-date');
    const sortTasksBtn = document.getElementById('sort-tasks');
    const searchBox = document.getElementById('search-box');

    // Edit Modal Elements
    const editModal = document.getElementById('edit-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const saveEditBtn = document.getElementById('save-edit');
    const modalInputBox = document.getElementById('modal-input-box');
    const modalTaskCategory = document.getElementById('modal-task-category');
    const modalTaskPriority = document.getElementById('modal-task-priority');
    const modalTaskDate = document.getElementById('modal-task-date');
    const modalTaskDescription = document.getElementById('modal-task-description');

    // View Modal Elements
    const viewModal = document.getElementById('view-modal');
    const closeViewBtns = [document.getElementById('close-view'), document.getElementById('close-view-btn')];
    const viewDescription = document.getElementById('view-description');

    // Settings Modal Elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const closeSettingsBtnFooter = document.getElementById('close-settings-btn');
    const settingsCategoriesList = document.getElementById('settings-categories-list');
    const newCategoryName = document.getElementById('new-category-name');
    const newCategoryColor = document.getElementById('new-category-color');
    const addCategoryBtn = document.getElementById('add-category-btn');

    // State
    let currentFilter = 'all';
    let currentSort = 'default';
    let editingTaskId = null;
    let draggedItem = null;
    let searchTimeout = null;
    let notificationPermission = false;

    // Categories Data
    const defaultCategories = [
        { id: 'work', name: 'Travail', color: '#3b82f6' },
        { id: 'personal', name: 'Personnel', color: '#10b981' },
        { id: 'shopping', name: 'Courses', color: '#f59e0b' },
        { id: 'health', name: 'Santé', color: '#ef4444' }
    ];

    let categories = JSON.parse(localStorage.getItem('todoCategories')) || defaultCategories;

    // Initialization
    requestNotificationPermission();
    initTheme();
    loadCategories();
    loadTasks();
    updateTaskCounter();
    addToggleInputButton();

    // --- Event Listeners ---

    // Add Task
    addBtn.addEventListener('click', addTask);
    inputBox.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Search
    if (searchBox) {
        searchBox.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchTasks(searchBox.value.toLowerCase());
            }, 300);
        });
    }

    // Theme & Sort
    themeToggle.addEventListener('click', toggleTheme);
    sortTasksBtn.addEventListener('click', toggleSort);

    // List Interactions (Delegation)
    listContainer.addEventListener('click', handleListClick);

    // Drag and Drop
    setupDragAndDrop();

    // Settings Modal
    settingsBtn.addEventListener('click', () => openModal(settingsModal));
    closeSettingsBtn.addEventListener('click', () => closeModal(settingsModal));
    closeSettingsBtnFooter.addEventListener('click', () => closeModal(settingsModal));
    addCategoryBtn.addEventListener('click', addNewCategory);

    // Edit Modal
    closeModalBtn.addEventListener('click', () => closeModal(editModal));
    cancelEditBtn.addEventListener('click', () => closeModal(editModal));
    saveEditBtn.addEventListener('click', saveEditedTask);

    // View Modal
    closeViewBtns.forEach(btn => btn.addEventListener('click', () => closeModal(viewModal)));

    // Close Modals on Outside Click / Escape
    [editModal, settingsModal, viewModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            [editModal, settingsModal, viewModal].forEach(modal => {
                if (modal.classList.contains('active')) closeModal(modal);
            });
        }
    });

    // Filter & Clear
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            applyFilter();
        });
    });

    // --- Category Management ---

    function loadCategories() {
        renderCategoryOptions();
        renderSettingsCategories();
    }

    function saveCategories() {
        localStorage.setItem('todoCategories', JSON.stringify(categories));
        loadCategories();
    }

    function renderCategoryOptions() {
        const selects = [taskCategory, modalTaskCategory];
        selects.forEach(select => {
            // Keep the first option (placeholder)
            const placeholder = select.options[0];
            select.innerHTML = '';
            select.appendChild(placeholder);

            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.name; // Using name as value for backward compatibility/simplicity
                option.textContent = cat.name;
                option.setAttribute('data-color', cat.color);
                select.appendChild(option);
            });
        });
    }

    function renderSettingsCategories() {
        settingsCategoriesList.innerHTML = '';
        categories.forEach((cat, index) => {
            const item = document.createElement('div');
            item.className = 'settings-item';

            const badge = document.createElement('span');
            badge.className = 'category-badge';
            badge.style.backgroundColor = cat.color;
            badge.textContent = cat.name;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';

            // Add click listener immediately to avoid delegation issues or re-querying
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Supprimer la catégorie "${cat.name}" ?`)) {
                    categories.splice(index, 1);
                    saveCategories();
                }
            });

            item.appendChild(badge);
            item.appendChild(deleteBtn);

            settingsCategoriesList.appendChild(item);
        });
    }

    function addNewCategory() {
        const name = newCategoryName.value.trim();
        const color = newCategoryColor.value;

        if (!name) {
            alert('Veuillez entrer un nom de catégorie.');
            return;
        }

        categories.push({
            id: 'cat_' + Date.now(),
            name: name,
            color: color
        });

        newCategoryName.value = '';
        saveCategories();
    }

    function getCategoryColor(categoryName) {
        const cat = categories.find(c => c.name === categoryName);
        return cat ? cat.color : '#64748b'; // Default gray
    }

    // --- Task Management Functions ---

    function addTask() {
        if (inputBox.value === '') {
            alert('Vous devez écrire quelque chose !');
            return;
        }
        createNewTask();
        sendNotification('Task Added', `New task created: ${inputBox.value}`);

        inputBox.value = '';
        taskCategory.value = '';
        taskPriority.value = 'normal';
        taskDate.value = '';

        saveData();
        updateTaskCounter();
        applyFilter();
        if (currentSort !== 'default') sortTasks(currentSort);
    }

    function createNewTask() {
        const li = document.createElement('li');
        const taskId = 'task_' + Date.now();
        const description = document.getElementById('task-description').value.trim();

        if (description) li.setAttribute('data-description', description);
        document.getElementById('task-description').value = '';
        li.setAttribute('data-id', taskId);
        li.draggable = true;

        const taskDetails = document.createElement('div');
        taskDetails.className = 'task-details';

        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = inputBox.value;
        taskDetails.appendChild(taskText);

        const taskMeta = document.createElement('div');
        taskMeta.className = 'task-meta';

        const categoryName = taskCategory.value || '';
        if (categoryName) {
            const categorySpan = document.createElement('span');
            categorySpan.className = 'task-category';
            categorySpan.setAttribute('data-category', categoryName);
            categorySpan.textContent = categoryName;
            categorySpan.style.backgroundColor = getCategoryColor(categoryName); // Apply color
            categorySpan.style.color = 'white';
            taskMeta.appendChild(categorySpan);
        }

        const priority = taskPriority.value || 'normal';
        const prioritySpan = document.createElement('span');
        prioritySpan.className = 'task-priority';
        prioritySpan.setAttribute('data-priority', priority);
        prioritySpan.innerHTML = `<i class="fas fa-flag"></i> ${priority}`;
        taskMeta.appendChild(prioritySpan);

        if (taskDate.value) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'task-date';
            dateSpan.innerHTML = `<i class="fas fa-calendar"></i> ${taskDate.value}`;
            taskMeta.appendChild(dateSpan);
            checkDateForNotification(taskDate.value, inputBox.value);
        }

        taskDetails.appendChild(taskMeta);
        li.appendChild(taskDetails);

        const actionBtns = document.createElement('div');
        actionBtns.className = 'task-actions';

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.className = 'edit-btn';
        actionBtns.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.className = 'delete-btn';
        actionBtns.appendChild(deleteBtn);

        li.appendChild(actionBtns);

        li.style.opacity = '0';
        li.style.transform = 'translateY(10px)';
        listContainer.appendChild(li);

        setTimeout(() => {
            li.style.opacity = '1';
            li.style.transform = 'translateY(0)';
        }, 10);
    }

    function handleListClick(e) {
        const target = e.target;
        const li = target.closest('li');

        if (!li) return;

        // Check/Uncheck
        if (!target.closest('.delete-btn') && !target.closest('.edit-btn') && !target.closest('.task-meta') && !target.classList.contains('task-text')) {
             // Avoid checking when clicking specific areas like text (which opens view modal) is handled separately?
             // Actually original code allowed clicking LI anywhere except buttons.
             // But we want clicking text to show description.
             // Let's keep original logic for checking but exclude task-text if we want it to open modal only.
             // However, original code:
             /*
            if (!e.target.closest('.delete-btn') && !e.target.closest('.edit-btn') && !e.target.closest('.task-meta')) {
                li.classList.toggle('checked');
             */
             // And separate listener for view modal:
             /*
             if (e.target.classList.contains('task-text')) { ... }
             */
             // If I click task-text, it will toggle checked AND open modal. That might be annoying.
             // I will make it so clicking the text opens modal, clicking elsewhere toggles check.

            if (!target.classList.contains('task-text')) {
                toggleTaskCheck(li);
            }
        }

        // Open View Modal
        if (target.classList.contains('task-text')) {
            const desc = li.getAttribute('data-description') || 'Aucune description.';
            viewDescription.textContent = desc;
            openModal(viewModal);
        }

        // Delete
        if (target.closest('.delete-btn')) {
            deleteTask(li);
        }

        // Edit
        if (target.closest('.edit-btn')) {
            openEditModal(li);
        }
    }

    function toggleTaskCheck(li) {
        li.classList.toggle('checked');
        if (li.classList.contains('checked')) {
            triggerConfetti();
        }
        saveData();
        updateTaskCounter();
        applyFilter();
    }

    function deleteTask(li) {
        li.style.transform = 'translateX(20px)';
        li.style.opacity = '0';
        setTimeout(() => {
            li.remove();
            saveData();
            updateTaskCounter();
            applyFilter();
        }, 300);
    }

    function openEditModal(li) {
        editingTaskId = li.getAttribute('data-id');
        if (!editingTaskId) {
            editingTaskId = 'task_' + Date.now();
            li.setAttribute('data-id', editingTaskId);
            saveData();
        }

        const taskText = li.querySelector('.task-text').textContent;
        const category = li.querySelector('.task-category')?.getAttribute('data-category') || '';
        const priority = li.querySelector('.task-priority')?.getAttribute('data-priority') || 'normal';
        const dateElement = li.querySelector('.task-date');
        const description = li.getAttribute('data-description') || '';
        let date = '';

        if (dateElement) {
            const dateText = dateElement.textContent;
            date = dateText.includes('calendar') ? dateText.split(' ').pop() : dateText;
        }

        modalInputBox.value = taskText;
        modalTaskDescription.value = description;
        modalTaskCategory.value = category;
        modalTaskPriority.value = priority;
        modalTaskDate.value = date;

        openModal(editModal);
    }

    function saveEditedTask() {
        if (modalInputBox.value === '') {
            alert('Vous devez écrire quelque chose !');
            return;
        }

        const taskElement = document.querySelector(`li[data-id="${editingTaskId}"]`);
        if (taskElement) {
            updateExistingTask(taskElement);
            sendNotification('Task Updated', `Task updated`);
            closeModal(editModal);
            saveData();
            if (currentSort !== 'default') sortTasks(currentSort);
        }
    }

    function updateExistingTask(taskElement) {
        const taskTextElement = taskElement.querySelector('.task-text');
        taskTextElement.textContent = modalInputBox.value;

        let taskMeta = taskElement.querySelector('.task-meta');
        if (!taskMeta) {
            taskMeta = document.createElement('div');
            taskMeta.className = 'task-meta';
            taskElement.querySelector('.task-details').appendChild(taskMeta);
        } else {
            taskMeta.innerHTML = '';
        }

        const categoryName = modalTaskCategory.value || '';
        if (categoryName) {
            const categorySpan = document.createElement('span');
            categorySpan.className = 'task-category';
            categorySpan.setAttribute('data-category', categoryName);
            categorySpan.textContent = categoryName;
            categorySpan.style.backgroundColor = getCategoryColor(categoryName);
            categorySpan.style.color = 'white';
            taskMeta.appendChild(categorySpan);
        }

        const newDesc = modalTaskDescription.value.trim();
        if (newDesc) taskElement.setAttribute('data-description', newDesc);
        else taskElement.removeAttribute('data-description');
        modalTaskDescription.value = '';

        const priority = modalTaskPriority.value || 'normal';
        const prioritySpan = document.createElement('span');
        prioritySpan.className = 'task-priority';
        prioritySpan.setAttribute('data-priority', priority);
        prioritySpan.innerHTML = `<i class="fas fa-flag"></i> ${priority}`;
        taskMeta.appendChild(prioritySpan);

        if (modalTaskDate.value) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'task-date';
            dateSpan.innerHTML = `<i class="fas fa-calendar"></i> ${modalTaskDate.value}`;
            taskMeta.appendChild(dateSpan);
        }

        taskElement.classList.add('updated');
        setTimeout(() => taskElement.classList.remove('updated'), 1000);
    }

    function clearCompletedTasks() {
        const completedTasks = document.querySelectorAll('.checked');
        completedTasks.forEach(task => {
            task.style.opacity = '0';
            setTimeout(() => task.remove(), 300);
        });
        setTimeout(() => {
            saveData();
            updateTaskCounter();
        }, 300);
    }

    // --- Helper Functions ---

    function openModal(modal) {
        modal.classList.add('active');
        const container = modal.querySelector('.modal-container');
        container.classList.add('animate-in');
        container.classList.remove('animate-out');
    }

    function closeModal(modal) {
        const container = modal.querySelector('.modal-container');
        container.classList.remove('animate-in');
        container.classList.add('animate-out');
        setTimeout(() => {
            modal.classList.remove('active');
            container.classList.remove('animate-out');
            if (modal === editModal) editingTaskId = null;
        }, 300);
    }

    function sendNotification(title, message) {
        if (notificationPermission && "Notification" in window) {
            const notification = new Notification(title, {
                body: message,
                icon: 'Icon.png'
            });
            setTimeout(() => notification.close(), 5000);
        }
    }

    function requestNotificationPermission() {
        if ("Notification" in window && Notification.permission !== "denied" && Notification.permission !== "granted") {
            Notification.requestPermission().then(permission => {
                notificationPermission = permission === "granted";
            });
        } else if (Notification.permission === "granted") {
            notificationPermission = true;
        }
    }

    function checkDateForNotification(dateStr, taskTitle) {
        const taskDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (taskDate.getTime() === today.getTime()) {
            sendNotification('Task Due Today', `"${taskTitle}" is due today!`);
        } else if (taskDate.getTime() === tomorrow.getTime()) {
            sendNotification('Task Due Tomorrow', `"${taskTitle}" is due tomorrow!`);
        }
    }

    function updateTaskCounter() {
        taskCounter.textContent = listContainer.querySelectorAll('li:not(.checked)').length;
    }

    function applyFilter() {
        const tasks = listContainer.querySelectorAll('li');
        const searchQuery = searchBox ? searchBox.value.toLowerCase() : '';

        tasks.forEach(task => {
            const taskText = task.querySelector('.task-text').textContent.toLowerCase();
            const category = task.querySelector('.task-category')?.textContent.toLowerCase() || '';
            const priority = task.querySelector('.task-priority')?.textContent.toLowerCase() || '';

            const matchesSearch = !searchQuery ||
                                 taskText.includes(searchQuery) ||
                                 category.includes(searchQuery) ||
                                 priority.includes(searchQuery);

            let matchesFilter = true;
            if (currentFilter === 'active') matchesFilter = !task.classList.contains('checked');
            else if (currentFilter === 'completed') matchesFilter = task.classList.contains('checked');

            task.style.display = (matchesSearch && matchesFilter) ? 'flex' : 'none';
        });
    }

    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.innerHTML = newTheme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.innerHTML = savedTheme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    }

    function toggleSort() {
        if (currentSort === 'default') {
            currentSort = 'date';
            sortTasks('date');
            sortTasksBtn.innerHTML = '<i class="fas fa-calendar"></i> Date';
        } else if (currentSort === 'date') {
            currentSort = 'priority';
            sortTasks('priority');
            sortTasksBtn.innerHTML = '<i class="fas fa-flag"></i> Priorité';
        } else {
            currentSort = 'default';
            sortTasks('default');
            sortTasksBtn.innerHTML = '<i class="fas fa-sort"></i> Trier';
        }
    }

    function sortTasks(sortBy) {
        const tasks = Array.from(listContainer.querySelectorAll('li'));
        if (sortBy === 'default') {
            loadTasks();
            return;
        }

        tasks.sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = getDateFromTask(a) || '9999-99-99';
                const dateB = getDateFromTask(b) || '9999-99-99';
                return dateA.localeCompare(dateB);
            } else if (sortBy === 'priority') {
                const map = { 'high': 0, 'normal': 1, 'low': 2 };
                const pA = a.querySelector('.task-priority')?.getAttribute('data-priority') || 'normal';
                const pB = b.querySelector('.task-priority')?.getAttribute('data-priority') || 'normal';
                return map[pA] - map[pB];
            }
            return 0;
        });

        const fragment = document.createDocumentFragment();
        tasks.forEach(task => fragment.appendChild(task));
        listContainer.innerHTML = '';
        listContainer.appendChild(fragment);
        applyFilter();
    }

    function getDateFromTask(taskLi) {
        const dateText = taskLi.querySelector('.task-date')?.textContent || '';
        return dateText.includes('calendar') ? dateText.split(' ').pop() : dateText;
    }

    function saveData() {
        // We need to save the innerHTML but also make sure we clean up any temporary states
        listContainer.querySelectorAll('li').forEach(task => {
            task.style.display = '';
            task.style.opacity = '';
            task.style.transform = '';
            task.classList.remove('dragging', 'drag-over');
        });
        localStorage.setItem('todoData', listContainer.innerHTML);
    }

    function loadTasks() {
        const savedTasks = localStorage.getItem('todoData');
        if (savedTasks) {
            listContainer.innerHTML = savedTasks;

            // Re-attach events and fix styles
            listContainer.querySelectorAll('li').forEach(task => {
                task.draggable = true;

                // Re-apply correct background color for categories based on current settings
                const catSpan = task.querySelector('.task-category');
                if (catSpan) {
                    const catName = catSpan.getAttribute('data-category');
                    catSpan.style.backgroundColor = getCategoryColor(catName);
                }
            });
        }
    }

    function setupDragAndDrop() {
        listContainer.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'LI') {
                draggedItem = e.target;
                draggedItem.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        listContainer.addEventListener('dragend', (e) => {
            if (e.target.tagName === 'LI') {
                e.target.classList.remove('dragging');
                saveData();
                draggedItem = null;
            }
        });

        listContainer.addEventListener('dragover', (e) => e.preventDefault());

        listContainer.addEventListener('dragenter', (e) => {
            if (e.target.tagName === 'LI' && e.target !== draggedItem) {
                e.target.classList.add('drag-over');
            }
        });

        listContainer.addEventListener('dragleave', (e) => {
            if (e.target.tagName === 'LI') {
                e.target.classList.remove('drag-over');
            }
        });

        listContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            listContainer.querySelectorAll('li').forEach(item => item.classList.remove('drag-over'));

            if (e.target.tagName === 'LI' && draggedItem && e.target !== draggedItem) {
                const allItems = [...listContainer.querySelectorAll('li')];
                const targetPos = allItems.indexOf(e.target);
                const draggedPos = allItems.indexOf(draggedItem);

                if (draggedPos < targetPos) e.target.parentNode.insertBefore(draggedItem, e.target.nextSibling);
                else e.target.parentNode.insertBefore(draggedItem, e.target);

                saveData();
            }
        });
    }

    function addToggleInputButton() {
        if (document.getElementById('toggle-input')) return; // Already exists

        const toggleButton = document.createElement('button');
        toggleButton.id = 'toggle-input';
        toggleButton.className = 'toggle-input-btn';
        toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
        toggleButton.title = 'Cacher la section d\'entrée';

        const appHeader = document.querySelector('.app-header');
        const inputSection = document.querySelector('.row');
        appHeader.parentNode.insertBefore(toggleButton, inputSection);

        let inputVisible = true;

        toggleButton.addEventListener('click', function() {
            inputVisible = !inputVisible;
            if (inputVisible) {
                inputSection.classList.remove('hidden');
                inputSection.classList.add('animate-in');
                inputSection.classList.remove('animate-out');
                setTimeout(() => inputSection.style.display = 'flex', 10);
                toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
            } else {
                inputSection.classList.add('animate-out');
                inputSection.classList.remove('animate-in');
                inputSection.classList.add('hidden');
                toggleButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
                setTimeout(() => {
                    if (!inputVisible) inputSection.style.display = 'none';
                }, 300);
            }
        });

        const style = document.createElement('style');
        style.textContent = `
          .toggle-input-btn {
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            margin: -15px auto 10px;
            z-index: 10;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            transition: all 0.3s;
          }
          .toggle-input-btn:hover { transform: translateY(-2px); }
          .row.hidden { max-height: 0; opacity: 0; margin: 0; padding: 0; }
          .row { transition: max-height 0.3s ease, opacity 0.3s ease; overflow: hidden; max-height: 500px; }
        `;
        document.head.appendChild(style);
    }

    function triggerConfetti() {
        const count = 100;
        const defaults = {
            origin: { y: 0.7 },
            zIndex: 1500
        };

        // Simple JS Confetti implementation
        for (let i = 0; i < count; i++) {
            createParticle();
        }
    }

    function createParticle() {
        const particle = document.createElement('div');
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        particle.style.position = 'fixed';
        particle.style.width = '8px';
        particle.style.height = '8px';
        particle.style.backgroundColor = color;
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = '-10px';
        particle.style.zIndex = '1500';
        particle.style.pointerEvents = 'none';
        particle.style.borderRadius = '50%';

        document.body.appendChild(particle);

        // Animation
        const destinationX = (Math.random() - 0.5) * 200;
        const destinationY = window.innerHeight + 20;
        const rotation = Math.random() * 360;
        const duration = Math.random() * 1000 + 1500;

        const animation = particle.animate([
            { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
            { transform: `translate(${destinationX}px, ${destinationY}px) rotate(${rotation}deg)`, opacity: 0 }
        ], {
            duration: duration,
            easing: 'cubic-bezier(0, .9, .57, 1)',
            delay: Math.random() * 200
        });

        animation.onfinish = () => particle.remove();
    }
});
