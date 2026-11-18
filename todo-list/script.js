document.addEventListener('DOMContentLoaded', () => {
    const datePicker = document.getElementById('date-picker');
    const prevDayBtn = document.getElementById('prev-day-btn');
    const nextDayBtn = document.getElementById('next-day-btn');
    const todayBtn = document.getElementById('today-btn');
    const viewDateTitle = document.getElementById('view-date-title');
    const notifyPermBtn = document.getElementById('notify-perm-btn');

    const todoForm = document.getElementById('todo-form');
    const taskTextInput = document.getElementById('task-text');
    const taskTimeInput = document.getElementById('task-time');

    const dailyContainer = document.getElementById('daily-tasks-container');
    const backlogContainer = document.getElementById('backlog-container');
    const backlogCount = document.getElementById('backlog-count');

    // Data Structure: { "YYYY-MM-DD": [ { id, text, completed, reminderTime, notified } ] }
    let todoData = JSON.parse(localStorage.getItem('hubTodoLists')) || {};

    // Helper: Get local YYYY-MM-DD string safely
    function getLocalDateString(dateObj = new Date()) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Helper: Format YYYY-MM-DD into a readable label (e.g., "Wed, Nov 18, 2026")
    function formatReadableDate(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Helper: Format 24h "HH:MM" to 12h "h:MM AM/PM"
    function format12HourTime(timeStr) {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':').map(Number);
        const suffix = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
    }

    // Helper: Calculate Next Work Day (skips Saturday & Sunday)
    function getNextWorkDay(baseDateStr) {
        const [y, m, d] = baseDateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayOfWeek = dateObj.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat

        if (dayOfWeek === 5) {
            dateObj.setDate(dateObj.getDate() + 3); // Friday -> Monday
        } else if (dayOfWeek === 6) {
            dateObj.setDate(dateObj.getDate() + 2); // Saturday -> Monday
        } else {
            dateObj.setDate(dateObj.getDate() + 1); // Sun-Thu -> Next calendar day
        }
        return getLocalDateString(dateObj);
    }

    let currentViewDate = getLocalDateString();
    datePicker.value = currentViewDate;

    function saveData() {
        localStorage.setItem('hubTodoLists', JSON.stringify(todoData));
    }

    // --- 1. NOTIFICATION & REMINDER ENGINE ---
    function updateNotificationButton() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            notifyPermBtn.style.display = 'inline-block';
        } else {
            notifyPermBtn.style.display = 'none';
        }
    }

    notifyPermBtn.addEventListener('click', () => {
        Notification.requestPermission().then(() => updateNotificationButton());
    });

    // Built-in Web Audio chime so alerts are audible without external audio files
    function playAlertChime() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            // Audio context blocked until user interacts with page
        }
    }

    function checkDeadlines() {
        const now = new Date();
        const todayStr = getLocalDateString(now);
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const todaysTasks = todoData[todayStr] || [];
        let changed = false;

        todaysTasks.forEach(task => {
            if (!task.completed && task.reminderTime && !task.notified) {
                if (currentTimeStr >= task.reminderTime) {
                    task.notified = true;
                    changed = true;
                    triggerAlert(task);
                }
            }
        });

        if (changed) {
            saveData();
            renderAll();
        }
    }

    function triggerAlert(task) {
        playAlertChime();
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('To-Do Deadline Reminder', {
                body: `${task.text} (Due at ${format12HourTime(task.reminderTime)})`
            });
        }
    }

    // Check deadlines every 15 seconds
    setInterval(checkDeadlines, 15000);
    updateNotificationButton();

    // --- 2. DATE NAVIGATION ---
    function setViewDate(newDateStr) {
        currentViewDate = newDateStr;
        datePicker.value = currentViewDate;

        const todayStr = getLocalDateString();
        if (currentViewDate === todayStr) {
            viewDateTitle.textContent = "Today's List";
        } else {
            viewDateTitle.textContent = formatReadableDate(currentViewDate);
        }
        renderAll();
    }

    datePicker.addEventListener('change', (e) => {
        if (e.target.value) setViewDate(e.target.value);
    });

    prevDayBtn.addEventListener('click', () => {
        const [y, m, d] = currentViewDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d - 1);
        setViewDate(getLocalDateString(dateObj));
    });

    nextDayBtn.addEventListener('click', () => {
        const [y, m, d] = currentViewDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d + 1);
        setViewDate(getLocalDateString(dateObj));
    });

    todayBtn.addEventListener('click', () => {
        setViewDate(getLocalDateString());
    });

    // --- 3. TASK ACTIONS (CREATE, TOGGLE, PUSH, DELETE) ---
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = taskTextInput.value.trim();
        const reminderTime = taskTimeInput.value;
        if (!text) return;

        // Prompt for notification permission the first time a timed task is added
        if (reminderTime && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(() => updateNotificationButton());
        }

        if (!todoData[currentViewDate]) {
            todoData[currentViewDate] = [];
        }

        todoData[currentViewDate].push({
            id: Date.now(),
            text: text,
            completed: false,
            reminderTime: reminderTime || null,
            notified: false
        });

        saveData();
        taskTextInput.value = '';
        taskTimeInput.value = '';
        renderAll();
        checkDeadlines();
    });

    window.toggleTodoItem = function(dateStr, taskId) {
        const list = todoData[dateStr];
        if (!list) return;
        const task = list.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            saveData();
            renderAll();
        }
    };

    window.deleteTodoItem = function(dateStr, taskId) {
        if (!todoData[dateStr]) return;
        todoData[dateStr] = todoData[dateStr].filter(t => t.id !== taskId);
        if (todoData[dateStr].length === 0) {
            delete todoData[dateStr];
        }
        saveData();
        renderAll();
    };

    window.pushToNextWorkDay = function(sourceDateStr, taskId) {
        const list = todoData[sourceDateStr];
        if (!list) return;
        const taskIndex = list.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const [task] = list.splice(taskIndex, 1);
        if (list.length === 0) {
            delete todoData[sourceDateStr];
        }

        // If pushing an overdue item from the past, push it to the next work day relative to TODAY
        // If pushing an item from today or a future date, push it to the next work day after THAT date
        const todayStr = getLocalDateString();
        const baseForPush = sourceDateStr < todayStr ? todayStr : sourceDateStr;
        const targetDateStr = getNextWorkDay(baseForPush);

        // Reset notification trigger for the new day
        task.notified = false;

        if (!todoData[targetDateStr]) {
            todoData[targetDateStr] = [];
        }
        todoData[targetDateStr].push(task);

        saveData();
        renderAll();
    };

    // --- 4. UI RENDERING ---
    function createTaskCard(task, dateStr) {
        const card = document.createElement('div');
        card.style.backgroundColor = 'var(--bg-input)';
        card.style.padding = '0.75rem var(--spacing-md)';
        card.style.borderRadius = 'var(--radius)';
        card.style.border = '1px solid var(--border-color)';
        card.style.borderLeft = task.completed ? '4px solid #10b981' : '4px solid var(--brand-primary)';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.gap = '0.75rem';
        card.style.flexWrap = 'wrap';

        // Time badge
        let badgeHTML = '';
        if (task.reminderTime) {
            const isAlerted = task.notified && !task.completed;
            const badgeColor = isAlerted ? '#ef4444' : 'var(--text-secondary)';
            badgeHTML = `
                <span style="font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 12px; background: var(--bg-surface); border: 1px solid ${isAlerted ? '#ef4444' : 'var(--border-color)'}; color: ${badgeColor}; font-weight: ${isAlerted ? 'bold' : 'normal'};">
                    ⏰ ${format12HourTime(task.reminderTime)}${isAlerted ? ' (Due)' : ''}
                </span>
            `;
        }

        const todayStr = getLocalDateString();
        const nextWorkTarget = formatReadableDate(getNextWorkDay(dateStr < todayStr ? todayStr : dateStr));

        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 180px;">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                    onchange="toggleTodoItem('${dateStr}', ${task.id})"
                    style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--brand-primary); flex-shrink: 0;">
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <span style="color: var(--text-primary); font-size: 0.95rem; ${task.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                        ${task.text}
                    </span>
                    ${badgeHTML ? `<div>${badgeHTML}</div>` : ''}
                </div>
            </div>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
                ${!task.completed ? `
                    <button type="button" class="btn" onclick="pushToNextWorkDay('${dateStr}', ${task.id})" 
                        title="Move to Next Work Day (${nextWorkTarget})"
                        style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.78rem; background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color);">
                        ⏭️ Next Work Day
                    </button>
                ` : ''}
                <button type="button" class="btn" onclick="deleteTodoItem('${dateStr}', ${task.id})" 
                    title="Delete Task"
                    style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.78rem; background: transparent; color: #ef4444; border: 1px solid var(--border-color);">
                    ✕
                </button>
            </div>
        `;

        return card;
    }

    function renderDailyTasks() {
        dailyContainer.innerHTML = '';
        const list = todoData[currentViewDate] || [];

        if (list.length === 0) {
            dailyContainer.innerHTML = '<p style="text-align: center; margin: 1.5rem 0;">No tasks scheduled for this day.</p>';
            return;
        }

        // Sort: Uncompleted first, then by reminderTime if present
        const sorted = [...list].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.reminderTime && b.reminderTime) return a.reminderTime.localeCompare(b.reminderTime);
            if (a.reminderTime) return -1;
            if (b.reminderTime) return 1;
            return 0;
        });

        sorted.forEach(task => {
            dailyContainer.appendChild(createTaskCard(task, currentViewDate));
        });
    }

    function renderBacklog() {
        backlogContainer.innerHTML = '';
        const todayStr = getLocalDateString();

        // Find all past dates strictly before today that have uncompleted items
        const pastDates = Object.keys(todoData)
            .filter(dateStr => dateStr < todayStr)
            .sort((a, b) => b.localeCompare(a)); // Most recent missed days first

        let totalMissed = 0;

        pastDates.forEach(dateStr => {
            const uncompleted = (todoData[dateStr] || []).filter(t => !t.completed);
            if (uncompleted.length === 0) return;

            totalMissed += uncompleted.length;

            const dayGroup = document.createElement('div');
            dayGroup.style.display = 'flex';
            dayGroup.style.flexDirection = 'column';
            dayGroup.style.gap = '0.5rem';

            const headerRow = document.createElement('div');
            headerRow.style.display = 'flex';
            headerRow.style.justifyContent = 'space-between';
            headerRow.style.alignItems = 'center';
            headerRow.style.borderBottom = '1px solid var(--border-color)';
            headerRow.style.paddingBottom = '0.3rem';

            headerRow.innerHTML = `
                <strong style="font-size: 0.9rem; color: #ef4444;">${formatReadableDate(dateStr)}</strong>
                <button type="button" onclick="document.getElementById('date-picker').value='${dateStr}'; document.getElementById('date-picker').dispatchEvent(new Event('change'));" 
                    style="background: none; border: none; color: var(--brand-primary); cursor: pointer; font-size: 0.8rem; text-decoration: underline;">
                    View Full Day
                </button>
            `;
            dayGroup.appendChild(headerRow);

            uncompleted.forEach(task => {
                dayGroup.appendChild(createTaskCard(task, dateStr));
            });

            backlogContainer.appendChild(dayGroup);
        });

        backlogCount.textContent = totalMissed > 0 ? `${totalMissed} Pending` : 'All Clear!';

        if (totalMissed === 0) {
            backlogContainer.innerHTML = '<p style="text-align: center; margin: 1.5rem 0;">No uncompleted tasks from past days.</p>';
        }
    }

    function renderAll() {
        renderDailyTasks();
        renderBacklog();
    }

    // Initial render & deadline check
    renderAll();
    checkDeadlines();
});
