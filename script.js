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
    
    // Éléments du modal
    const editModal = document.getElementById('edit-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const saveEditBtn = document.getElementById('save-edit');
    const modalInputBox = document.getElementById('modal-input-box');
    const modalTaskCategory = document.getElementById('modal-task-category');
    const modalTaskPriority = document.getElementById('modal-task-priority');
    const modalTaskDate = document.getElementById('modal-task-date');
    
    let currentFilter = 'all';
    let currentSort = 'default';
    let editingTaskId = null; // Pour suivre la tâche en cours d'édition
    
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
            let date = '';
            
            if (dateElement) {
                // Extraire la date en ignorant l'icône du calendrier
                const dateText = dateElement.textContent;
                date = dateText.includes('calendar') ? dateText.split(' ').pop() : dateText;
            }
            
            // Fill the modal form with task details
            modalInputBox.value = taskText;
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
            // Update the existing task
            updateExistingTask(taskElement);
            
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
        li.setAttribute('data-id', taskId);
        
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
    
    // Function to update task counter
    function updateTaskCounter() {
        const activeTasks = listContainer.querySelectorAll('li:not(.checked)').length;
        taskCounter.textContent = activeTasks;
    }
    
    // Function to apply current filter
    function applyFilter() {
        const tasks = listContainer.querySelectorAll('li');
        
        tasks.forEach(task => {
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
        }
    }
});