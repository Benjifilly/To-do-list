document.addEventListener('DOMContentLoaded', () => {
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
    const searchBox = document.getElementById('search-box'); // New search input
    
    // Éléments du modal
    const editModal = document.getElementById('edit-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const saveEditBtn = document.getElementById('save-edit');
    const modalInputBox = document.getElementById('modal-input-box');
    const modalTaskCategory = document.getElementById('modal-task-category');
    const modalTaskPriority = document.getElementById('modal-task-priority');
    const modalTaskDate = document.getElementById('modal-task-date');
    const modalTaskDescription = document.getElementById('modal-task-description');

    const viewModal       = document.getElementById('view-modal');
    const closeViewBtns   = [document.getElementById('close-view'), document.getElementById('close-view-btn')];
    const viewDescription = document.getElementById('view-description');
    
    let currentFilter = 'all';
    let currentSort = 'default';
    let editingTaskId = null; // Pour suivre la tâche en cours d'édition
    let draggedItem = null; // Pour le drag and drop
    let searchTimeout = null; // Pour la recherche
    let notificationPermission = false; // Pour les notifications
    
    // Request notification permission when the app loads
    requestNotificationPermission();
    
    // Initialize theme from localStorage
    initTheme();
    
    // Load tasks from localStorage
    loadTasks();
    updateTaskCounter();
    
    // Add task when clicking the add button
    addBtn.addEventListener('click', addTask);
    
    // Add task when pressing Enter key
    inputBox.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    // Search tasks on input
    if (searchBox) {
        searchBox.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchTasks(searchBox.value.toLowerCase());
            }, 300); // Debounce search for better performance
        });
    }
    
    // Toggle theme
    themeToggle.addEventListener('click', toggleTheme);
    
    // Sort tasks
    sortTasksBtn.addEventListener('click', toggleSort);
    
    // Event delegation for list container (check/uncheck)
    listContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI' || (e.target.parentElement && e.target.parentElement.tagName === 'LI')) {
            // Find the LI element
            const li = e.target.tagName === 'LI' ? e.target : e.target.closest('li');
            
            // If clicking on the task text or checkbox area (not buttons or metadata)
            if (!e.target.closest('.delete-btn') && !e.target.closest('.edit-btn') && !e.target.closest('.task-meta')) {
                li.classList.toggle('checked');
                saveData();
                updateTaskCounter();
                applyFilter();
            }
        }
    });
    
    // Setup drag and drop functionality
    setupDragAndDrop();
    
    // Separate event listeners for delete button
    listContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
            // Find the delete button
            const deleteBtn = e.target.classList.contains('delete-btn') ? e.target : e.target.closest('.delete-btn');
            // Remove the parent li element
            const li = deleteBtn.closest('li');
            li.remove();
            saveData();
            updateTaskCounter();
            applyFilter();
        }
    });
    
    // Événement pour ouvrir le modal d'édition
    listContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn') || e.target.closest('.edit-btn')) {
            // Find the edit button and parent li
            const editBtn = e.target.classList.contains('edit-btn') ? e.target : e.target.closest('.edit-btn');
            const li = editBtn.closest('li');
            
            // Store the task ID for later update
            editingTaskId = li.getAttribute('data-id');
            
            // If there's no ID yet, generate one for backwards compatibility
            if (!editingTaskId) {
                editingTaskId = 'task_' + Date.now();
                li.setAttribute('data-id', editingTaskId);
                saveData(); // Save to ensure the ID persists
            }
            
            // Get task text and details
            const taskText = li.querySelector('.task-text').textContent;
            const category = li.querySelector('.task-category')?.getAttribute('data-category') || '';
            const priority = li.querySelector('.task-priority')?.getAttribute('data-priority') || 'normal';
            const dateElement = li.querySelector('.task-date');
            const description = li.getAttribute('data-description') || '';
            let date = '';
            
            if (dateElement) {
                // Extraire la date en ignorant l'icône du calendrier
                const dateText = dateElement.textContent;
                date = dateText.includes('calendar') ? dateText.split(' ').pop() : dateText;
            }
            
            // Fill the modal form with task details
            modalInputBox.value = taskText;
            modalTaskDescription.value = description;
            modalTaskCategory.value = category;
            modalTaskPriority.value = priority;
            modalTaskDate.value = date;
            
            // Ouvrir le modal avec animation
            openModal();
        }
    });
    
    // Événements pour le modal
    closeModalBtn.addEventListener('click', closeModal);
    cancelEditBtn.addEventListener('click', closeModal);
    saveEditBtn.addEventListener('click', saveEditedTask);
    
    // Fermer le modal en cliquant à l'extérieur
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeModal();
        }
    });
    
    // Fermer le modal avec la touche Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editModal.classList.contains('active')) {
            closeModal();
        }
    });
    
    // Clear completed tasks
    clearCompletedBtn.addEventListener('click', () => {
        const completedTasks = document.querySelectorAll('.checked');
        completedTasks.forEach(task => task.remove());
        saveData();
        updateTaskCounter();
    });
    
    // Filter tasks
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active filter button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Apply filter
            currentFilter = btn.getAttribute('data-filter');
            applyFilter();
        });
    });
    
    // Function to add a task
    function addTask() {
        if (inputBox.value === '') {
            alert('You must write something!');
            return;
        }
        
        // Create a new task
        createNewTask();
        
        // Send notification for task creation
        sendNotification('Task Added', `New task created: ${inputBox.value}`);
        
        // Reset form
        inputBox.value = '';
        taskCategory.value = '';
        taskPriority.value = 'normal';
        taskDate.value = '';
        
        saveData();
        updateTaskCounter();
        applyFilter();
        
        // Sort if needed
        if (currentSort !== 'default') {
            sortTasks(currentSort);
        }
    }
    
    // Function to search tasks
    function searchTasks(query) {
        const tasks = listContainer.querySelectorAll('li');
        
        if (query === '') {
            // If search is cleared, simply reapply current filter
            applyFilter();
            return;
        }
        
        tasks.forEach(task => {
            const taskText = task.querySelector('.task-text').textContent.toLowerCase();
            const category = task.querySelector('.task-category')?.textContent.toLowerCase() || '';
            const priority = task.querySelector('.task-priority')?.textContent.toLowerCase() || '';
            
            if (taskText.includes(query) || category.includes(query) || priority.includes(query)) {
                // Show tasks that match search if they also match the current filter
                if (currentFilter === 'all' || 
                    (currentFilter === 'active' && !task.classList.contains('checked')) || 
                    (currentFilter === 'completed' && task.classList.contains('checked'))) {
                    task.style.display = 'flex';
                } else {
                    task.style.display = 'none';
                }
            } else {
                task.style.display = 'none';
            }
        });
    }
    
    // Function to open modal with animation
    function openModal() {
        editModal.classList.add('active');
        const modalContainer = editModal.querySelector('.modal-container');
        modalContainer.classList.add('animate-in');
        // Focus sur le champ de texte
        setTimeout(() => {
            modalInputBox.focus();
        }, 100);
    }
    
    // Function to close modal with animation
    function closeModal() {
        const modalContainer = editModal.querySelector('.modal-container');
        modalContainer.classList.remove('animate-in');
        modalContainer.classList.add('animate-out');
        
        setTimeout(() => {
            editModal.classList.remove('active');
            modalContainer.classList.remove('animate-out');
            // Reset editing state
            editingTaskId = null;
        }, 300);
    }
    
    // Function to save edited task
    function saveEditedTask() {
        if (modalInputBox.value === '') {
            alert('You must write something!');
            return;
        }
        
        // Find the task element being edited
        const taskElement = document.querySelector(`li[data-id="${editingTaskId}"]`);
        
        if (taskElement) {
            // Get the previous task text for notification
            const prevTaskText = taskElement.querySelector('.task-text').textContent;
            
            // Update the existing task
            updateExistingTask(taskElement);
            
            // Send notification for task update
            sendNotification('Task Updated', `Task updated: "${prevTaskText}" has been modified`);
            
            // Close modal
            closeModal();
            
            saveData();
            
            // Sort if needed
            if (currentSort !== 'default') {
                sortTasks(currentSort);
            }
        }
    }
    
    // Function to update an existing task
    function updateExistingTask(taskElement) {
        // Update task text
        const taskTextElement = taskElement.querySelector('.task-text');
        taskTextElement.textContent = modalInputBox.value;
        
        // Update or create task meta container if it doesn't exist
        let taskMeta = taskElement.querySelector('.task-meta');
        if (!taskMeta) {
            taskMeta = document.createElement('div');
            taskMeta.className = 'task-meta';
            taskElement.querySelector('.task-details').appendChild(taskMeta);
        } else {
            // Clear existing meta information
            taskMeta.innerHTML = '';
        }
        
        // Update category
        const category = modalTaskCategory.value || '';
        if (category) {
            const categorySpan = document.createElement('span');
            categorySpan.className = 'task-category';
            categorySpan.setAttribute('data-category', category);
            categorySpan.textContent = category;
            taskMeta.appendChild(categorySpan);
        }

        const newDesc = modalTaskDescription.value.trim();
        if (newDesc) {
            taskElement.setAttribute('data-description', newDesc);
        } else {
            taskElement.removeAttribute('data-description');
        }
        modalTaskDescription.value = '';
        
        // Update priority
        const priority = modalTaskPriority.value || 'normal';
        const prioritySpan = document.createElement('span');
        prioritySpan.className = 'task-priority';
        prioritySpan.setAttribute('data-priority', priority);
        prioritySpan.innerHTML = `<i class="fas fa-flag"></i> ${priority}`;
        taskMeta.appendChild(prioritySpan);
        
        // Update date
        if (modalTaskDate.value) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'task-date';
            dateSpan.innerHTML = `<i class="fas fa-calendar"></i> ${modalTaskDate.value}`;
            taskMeta.appendChild(dateSpan);
        }
        
        // Highlight the updated task briefly
        taskElement.classList.add('updated');
        setTimeout(() => {
            taskElement.classList.remove('updated');
        }, 1000);
    }
    
    // Function to create a new task
    function createNewTask() {
        const li = document.createElement('li');
        // Assign a unique ID to the task
        const taskId = 'task_' + Date.now();
        const description = document.getElementById('task-description').value.trim();
        if (description) li.setAttribute('data-description', description);
        document.getElementById('task-description').value = '';
        li.setAttribute('data-id', taskId);
        
        // Make it draggable for drag and drop
        li.draggable = true;
        
        // Create task details container
        const taskDetails = document.createElement('div');
        taskDetails.className = 'task-details';
        
        // Add task text
        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = inputBox.value;
        taskDetails.appendChild(taskText);
        
        // Add task metadata
        const taskMeta = document.createElement('div');
        taskMeta.className = 'task-meta';
        
        // Add category if selected
        const category = taskCategory.value || '';
        const categorySpan = document.createElement('span');
        categorySpan.className = 'task-category';
        categorySpan.setAttribute('data-category', category);
        categorySpan.textContent = category;
        if (category) taskMeta.appendChild(categorySpan);
        
        // Add priority
        const priority = taskPriority.value || 'normal';
        const prioritySpan = document.createElement('span');
        prioritySpan.className = 'task-priority';
        prioritySpan.setAttribute('data-priority', priority);
        prioritySpan.innerHTML = `<i class="fas fa-flag"></i> ${priority}`;
        taskMeta.appendChild(prioritySpan);
        
        // Add date if selected
        if (taskDate.value) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'task-date';
            dateSpan.innerHTML = `<i class="fas fa-calendar"></i> ${taskDate.value}`;
            taskMeta.appendChild(dateSpan);
            
            // Check if date is due today or tomorrow for notification
            checkDateForNotification(taskDate.value, inputBox.value);
        }
        
        taskDetails.appendChild(taskMeta);
        li.appendChild(taskDetails);
        
        // Add action buttons
        const actionBtns = document.createElement('div');
        actionBtns.className = 'task-actions';
        
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.className = 'edit-btn';
        actionBtns.appendChild(editBtn);
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.className = 'delete-btn';
        actionBtns.appendChild(deleteBtn);
        
        li.appendChild(actionBtns);
        
        // Add task to the list with animation
        li.style.opacity = '0';
        li.style.transform = 'translateY(10px)';
        listContainer.appendChild(li);
        
        // Trigger animation
        setTimeout(() => {
            li.style.opacity = '1';
            li.style.transform = 'translateY(0)';
        }, 10);
    }
    
    // Function to set up drag and drop
    function setupDragAndDrop() {
        // Add event listeners for drag and drop to the list container
        listContainer.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'LI') {
                draggedItem = e.target;
                draggedItem.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', draggedItem.innerHTML);
            }
        });
        
        listContainer.addEventListener('dragend', (e) => {
            if (e.target.tagName === 'LI') {
                e.target.classList.remove('dragging');
                saveData();
                draggedItem = null;
            }
        });
        
        listContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            return false;
        });
        
        listContainer.addEventListener('dragenter', (e) => {
            e.preventDefault();
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
            
            // Remove highlight from all items
            const items = listContainer.querySelectorAll('li');
            items.forEach(item => item.classList.remove('drag-over'));
            
            // If dropping on an LI element
            if (e.target.tagName === 'LI' && draggedItem && e.target !== draggedItem) {
                const targetPosition = [...items].indexOf(e.target);
                const draggedPosition = [...items].indexOf(draggedItem);
                
                // If dragging down, insert after the target
                if (draggedPosition < targetPosition) {
                    e.target.parentNode.insertBefore(draggedItem, e.target.nextSibling);
                } else {
                    // If dragging up, insert before the target
                    e.target.parentNode.insertBefore(draggedItem, e.target);
                }
                
                // Send notification about reordering
                sendNotification('Task Reordered', 'Tasks have been reordered');
                
                // Save the new order
                saveData();
            }
            
            return false;
        });
    }
    
    // Function to check for due dates and prepare notifications
    function checkDateForNotification(dateStr, taskTitle) {
        const taskDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // If the task is due today
        if (taskDate.getTime() === today.getTime()) {
            sendNotification('Task Due Today', `"${taskTitle}" is due today!`);
        }
        // If the task is due tomorrow
        else if (taskDate.getTime() === tomorrow.getTime()) {
            sendNotification('Task Due Tomorrow', `"${taskTitle}" is due tomorrow!`);
        }
    }
    
    // Function to request notification permission
    function requestNotificationPermission() {
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                notificationPermission = true;
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    notificationPermission = permission === "granted";
                });
            }
        }
    }
    
    // Function to send notifications
    function sendNotification(title, message) {
        if (notificationPermission && "Notification" in window) {
            const notification = new Notification(title, {
                body: message,
                icon: 'https://cdn.pixabay.com/photo/2016/03/31/14/47/check-mark-1292787_1280.png'
            });
            
            // Close the notification after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);
        }
    }
    
    // Function to update task counter
    function updateTaskCounter() {
        const activeTasks = listContainer.querySelectorAll('li:not(.checked)').length;
        taskCounter.textContent = activeTasks;
    }
    
    // Function to apply current filter
    function applyFilter() {
        const tasks = listContainer.querySelectorAll('li');
        const searchQuery = searchBox ? searchBox.value.toLowerCase() : '';
        
        tasks.forEach(task => {
            const taskText = task.querySelector('.task-text').textContent.toLowerCase();
            const category = task.querySelector('.task-category')?.textContent.toLowerCase() || '';
            const priority = task.querySelector('.task-priority')?.textContent.toLowerCase() || '';
            
            // Check if task matches search query
            const matchesSearch = searchQuery === '' || 
                                 taskText.includes(searchQuery) || 
                                 category.includes(searchQuery) || 
                                 priority.includes(searchQuery);
            
            // Apply filter + search
            if (matchesSearch) {
                switch(currentFilter) {
                    case 'all':
                        task.style.display = 'flex';
                        break;
                    case 'active':
                        task.style.display = task.classList.contains('checked') ? 'none' : 'flex';
                        break;
                    case 'completed':
                        task.style.display = task.classList.contains('checked') ? 'flex' : 'none';
                        break;
                }
            } else {
                task.style.display = 'none';
            }
        });
    }
    
    // Function to toggle theme
    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update theme toggle icon
        themeToggle.innerHTML = newTheme === 'light' ? 
            '<i class="fas fa-moon"></i>' : 
            '<i class="fas fa-sun"></i>';
    }
    
    // Function to initialize theme
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Set correct icon
        themeToggle.innerHTML = savedTheme === 'light' ? 
            '<i class="fas fa-moon"></i>' : 
            '<i class="fas fa-sun"></i>';
    }
    
    // Function to toggle sort
    function toggleSort() {
        // Cycle through sort options: default -> date -> priority
        switch(currentSort) {
            case 'default':
                currentSort = 'date';
                sortTasks('date');
                sortTasksBtn.innerHTML = '<i class="fas fa-calendar"></i> Date';
                break;
            case 'date':
                currentSort = 'priority';
                sortTasks('priority');
                sortTasksBtn.innerHTML = '<i class="fas fa-flag"></i> Priorité';
                break;
            case 'priority':
                currentSort = 'default';
                sortTasks('default');
                sortTasksBtn.innerHTML = '<i class="fas fa-sort"></i> Trier';
                break;
        }
    }
    
    // Function to sort tasks
    function sortTasks(sortBy) {
        const tasks = Array.from(listContainer.querySelectorAll('li'));
        
        if (sortBy === 'default') {
            // Restore original order from localStorage
            loadTasks();
            return;
        }
        
        tasks.sort((a, b) => {
            if (sortBy === 'date') {
                // Extraire la date en ignorant l'icône
                const dateTextA = a.querySelector('.task-date')?.textContent || '';
                const dateTextB = b.querySelector('.task-date')?.textContent || '';
                
                // Extraire seulement la partie date (après l'icône du calendrier)
                const dateA = dateTextA.includes('calendar') ? dateTextA.split(' ').pop() || '9999-99-99' : dateTextA || '9999-99-99';
                const dateB = dateTextB.includes('calendar') ? dateTextB.split(' ').pop() || '9999-99-99' : dateTextB || '9999-99-99';
                
                return dateA.localeCompare(dateB);
            } else if (sortBy === 'priority') {
                const priorityMap = { 'high': 0, 'normal': 1, 'low': 2 };
                // S'assurer que nous obtenons correctement l'attribut data-priority
                const priorityA = a.querySelector('.task-priority')?.getAttribute('data-priority') || 'normal';
                const priorityB = b.querySelector('.task-priority')?.getAttribute('data-priority') || 'normal';
                return priorityMap[priorityA] - priorityMap[priorityB];
            }
            return 0;
        });
        
        // Préserver les événements en réorganisant les éléments au lieu de manipuler innerHTML
        const fragment = document.createDocumentFragment();
        tasks.forEach(task => fragment.appendChild(task));
        listContainer.innerHTML = '';
        listContainer.appendChild(fragment);
        
        // Don't save to localStorage to preserve original order
        applyFilter();
    }
    
    // Function to save data to localStorage
    function saveData() {
        localStorage.setItem('todoData', listContainer.innerHTML);
    }
    
    // Function to load tasks from localStorage
    function loadTasks() {
        const savedTasks = localStorage.getItem('todoData');
        if (savedTasks) {
            listContainer.innerHTML = savedTasks;
            
            // Re-enable draggable attribute for all tasks
            const tasks = listContainer.querySelectorAll('li');
            tasks.forEach(task => {
                task.draggable = true;
            });
        }
    }
    
    // Check for due tasks when the app loads
    function checkDueTasks() {
        const tasks = listContainer.querySelectorAll('li:not(.checked)');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        tasks.forEach(task => {
            const dateElement = task.querySelector('.task-date');
            if (dateElement) {
                const dateText = dateElement.textContent;
                const dateStr = dateText.includes('calendar') ? dateText.split(' ').pop() : dateText;
                
                if (dateStr) {
                    const taskDate = new Date(dateStr);
                    const taskTitle = task.querySelector('.task-text').textContent;
                    
                    // If the task is due today or overdue
                    if (taskDate <= today) {
                        const status = taskDate.getTime() === today.getTime() ? 'due today' : 'overdue';
                        sendNotification(`Task ${status.charAt(0).toUpperCase() + status.slice(1)}`, 
                                        `"${taskTitle}" is ${status}!`);
                    }
                }
            }
        });
    }

    listContainer.addEventListener('click', e => {
        if (e.target.classList.contains('task-text')) {
            const li = e.target.closest('li');
            const desc = li.getAttribute('data-description') || 'Aucune description.';
            viewDescription.textContent = desc;
            viewModal.classList.add('active');
            viewModal.querySelector('.modal-container').classList.add('animate-in');
        }
    });
    
    closeViewBtns.forEach(btn => btn.addEventListener('click', () => {
        const modalC = viewModal.querySelector('.modal-container');
        modalC.classList.remove('animate-in');
        modalC.classList.add('animate-out');
        setTimeout(() => {
            viewModal.classList.remove('active');
            modalC.classList.remove('animate-out');
            viewDescription.textContent = '';
        }, 300);
    }));
    
    
    // Check for due tasks when the app loads (with a slight delay)
    setTimeout(checkDueTasks, 1000);
});

