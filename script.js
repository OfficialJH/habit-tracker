window.addEventListener('load', () => {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log("Service Worker Registered"))
    .catch((err) => console.log("Service Worker Failed", err));
});


let habits = JSON.parse(localStorage.getItem('habits')) || [];
let viewDate = new Date();
let selectedDateStr = getLocalDateString();

const habitList = document.getElementById('habitList');
const mainCalendarGrid = document.getElementById('mainCalendarGrid');
const calendarLabel = document.getElementById('calendarLabel');

const modalTitle = document.getElementById('modalTitle');
const editHabitId = document.getElementById('editHabitId');
const habitName = document.getElementById('habitName');
const habitFreq = document.getElementById('habitFreq');
const habitGoal = document.getElementById('habitGoal');
const habitColor = document.getElementById('habitColor');
const deleteBtn = document.getElementById('deleteBtn');

// Initialize state
document.addEventListener('DOMContentLoaded', () => {
    refreshUI();

    if (window.innerWidth < 900) showPanel('habits');

    let wasMobile = window.innerWidth < 900;
    window.addEventListener('resize', () => {
        const isMobile = window.innerWidth < 900;
        if (isMobile && !wasMobile) showPanel('habits');
        wasMobile = isMobile;
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            Modal.closeAll();
        }
    });

    habitFreq.addEventListener('change', updateGoalVisibility);
});

function showPanel(panel) {
    const habitsPanel = document.querySelector('.habits-panel');
    const calendarPanel = document.querySelector('.calendar-panel');

    const navHabits = document.getElementById('navHabits');
    const navCalendar = document.getElementById('navCalendar');

    if (panel === 'habits') {
        habitsPanel.classList.add('active');
        calendarPanel.classList.remove('active');

        navHabits.classList.add('active');
        navCalendar.classList.remove('active');
    } else {
        calendarPanel.classList.add('active');
        habitsPanel.classList.remove('active');

        navCalendar.classList.add('active');
        navHabits.classList.remove('active');
    }
}

function getContrastYIQ(hexcolor) {
    if (!hexcolor) return 'white';
    hexcolor = hexcolor.replace("#", "");
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}

function getCSSVar(name) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
}

function refreshUI() {
    renderCalendar();
    renderHabitList();
    openDayDetail(selectedDateStr);
}

function jumpToToday() {
    viewDate = new Date();
    selectedDateStr = getLocalDateString();
    refreshUI();
}

function changePeriod(delta) {
    viewDate.setMonth(viewDate.getMonth() + delta);
    refreshUI();
}

function updateGoalVisibility() {
    if (habitFreq.value === 'daily') {
        habitGoal.classList.add('hidden');
        habitGoal.value = 1;
    } else {
        habitGoal.classList.remove('hidden');
    }
}

const Modal = {
    open(id, setup) {
        const el = document.getElementById(id);
        if (!el) return;
        if (setup) setup(el);
        el.style.display = 'flex';

        // Close on ESC key
        const closeOnEsc = (e) => {
            if (e.key === 'Escape') {
                this.close(id);
                window.removeEventListener('keydown', closeOnEsc);
            }
        };
        window.addEventListener('keydown', closeOnEsc);
    },
    close(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    },
    closeAll() {
        document.querySelectorAll('.modal').forEach(m => {
            m.style.display = 'none';
        });
    }
};

function showAddModal() {
    Modal.open('habitModal', () => {
        modalTitle.innerText = "Create New Habit";
        editHabitId.value = "";
        habitName.value = "";
        habitFreq.value = "daily";
        habitGoal.value = "1";
        habitColor.value = getCSSVar('--accent');
        deleteBtn.style.display = "none";
    });

    updateGoalVisibility();
}

function showEditModal(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    Modal.open('habitModal', () => {
        modalTitle.innerText = "Edit Habit";
        editHabitId.value = habit.id;
        habitName.value = habit.name;
        habitFreq.value = habit.freq;
        habitGoal.value = habit.goal;
        habitColor.value = habit.color || getCSSVar('--accent');
        deleteBtn.style.display = "block";
    });

    updateGoalVisibility();
}

function showSettingsModal() {
    Modal.open('settingsModal');
}

function showDataModal() {
    Modal.open('dataModal');
}

function showHelpModal() {
    Modal.open('helpModal');
}

function showAboutModal() {
    Modal.open('aboutModal');
}

function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function openDayDetail(dateStr) {
    const title = document.getElementById('dayDetailTitle');
    const listContainer = document.getElementById('dayHabitList');

    const localDate = parseLocalDate(dateStr);
    const displayDate = localDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
    });

    title.textContent = `Habits for ${displayDate}`;
    listContainer.innerHTML = '';

    if (habits.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = "No habits found.";
        listContainer.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();

    habits.forEach(habit => {
        const isDoneToday = habit.history && habit.history.includes(dateStr);
        const habitColor = habit.color || getCSSVar('--accent');
        const textColor = getContrastYIQ(habitColor);

        const card = document.createElement('div');
        card.className = 'habit-card';
        card.style.borderLeftColor = habitColor;

        const info = document.createElement('div');
        info.className = 'habit-info';

        const name = document.createElement('h3');
        name.textContent = habit.name;

        info.appendChild(name);

        const button = document.createElement('button');
        button.className = 'toggle-btn';
        button.textContent = isDoneToday ? '✓' : '+';
        button.style.background = isDoneToday ? habitColor : 'var(--button)';
        button.style.color = isDoneToday ? textColor : 'var(--text)';
        button.style.borderRadius = '999px';
        button.onclick = (e) => {
            e.stopPropagation(); // Prevents accidental card clicks
            toggleDate(habit.id, dateStr);
        };

        card.appendChild(info);
        card.appendChild(button);
        fragment.appendChild(card);
    });

    listContainer.appendChild(fragment);
}

function handleSaveHabit() {
    const id = document.getElementById('editHabitId').value;
    const name = document.getElementById('habitName').value;
    const freq = document.getElementById('habitFreq').value;
    const goal = parseInt(document.getElementById('habitGoal').value);
    const color = document.getElementById('habitColor').value;

    if (!name) return;

    if (id) {
        const index = habits.findIndex(h => h.id === id);
        if (index !== -1) {
            habits[index] = {...habits[index],
                name,
                freq,
                goal,
                color
            };
        }
    } else {
        habits.push({
            id: Date.now().toString(),
            name,
            freq,
            goal,
            color: color || getCSSVar('--accent'),
            history: [],
            createdAt: new Date().toISOString()
        });
    }

    syncData();
    Modal.close('habitModal');
    refreshUI();
}

function confirmDelete() {
    Modal.open('confirmModal');
}

function handleDeleteHabit() {
    const idToDelete = document.getElementById('editHabitId').value;
    if (!idToDelete) return;
    habits = habits.filter(h => h.id !== idToDelete);
    syncData();
    Modal.closeAll();
    refreshUI();
}

function toggleDate(habitId, dateStr) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    if (!habit.history) habit.history = [];
    const index = habit.history.indexOf(dateStr);
    if (index > -1) {
        habit.history.splice(index, 1);
    } else {
        habit.history.push(dateStr);
    }
    syncData();
    refreshUI();
}

function syncData() {
    localStorage.setItem('habits', JSON.stringify(habits));
}

function calculateStreak(habit) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const history = (habit.history || [])
        .map(parseLocalDate)
        .filter(d => d <= today); // ignore future dates

    if (!history.length) return 0;

    const freq = habit.freq || 'daily';
    const goal = habit.goal || 1;

    // Sort history descending (newest first)
    history.sort((a, b) => b - a);

    let streak = 0;

    let cursor = new Date(today);
    let historyIndex = 0; // pointer to current date in history

    while (historyIndex < history.length) {
        let periodStart, periodEnd;

        if (freq === 'daily') {
            periodStart = new Date(cursor);
            periodEnd = new Date(cursor);
        } else if (freq === 'weekly') {
            const day = cursor.getDay();
            periodStart = new Date(cursor);
            periodStart.setDate(cursor.getDate() - day);
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodStart.getDate() + 6);
        } else if (freq === 'monthly') {
            periodStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
            periodEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        }

        let completions = 0;
        // Count all history dates within this period efficiently
        while (
            historyIndex < history.length &&
            history[historyIndex] >= periodStart &&
            history[historyIndex] <= periodEnd
        ) {
            completions++;
            historyIndex++;
        }

        const isCurrentPeriod = today >= periodStart && today <= periodEnd;

        if (completions >= goal) {
            streak++;
        } else if (isCurrentPeriod) {
            // current period not finished yet
        } else {
            break; // streak broken
        }

        // Move cursor to previous period
        if (freq === 'daily') {
            cursor.setDate(cursor.getDate() - 1);
        } else if (freq === 'weekly') {
            cursor.setDate(periodStart.getDate() - 1);
        } else if (freq === 'monthly') {
            cursor = new Date(periodStart);
            cursor.setDate(0);
        }

        if (streak > 3650) break; // 10-year safety
    }

    return streak;
}

function getLocalDateString(date = new Date()) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

function renderCalendar() {
    mainCalendarGrid.innerHTML = '';

    const today = new Date();
    const todayStr = getLocalDateString(today);

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    dayNames.forEach(d => {
        const cell = document.createElement('div');
        cell.className = 'calendar-day header';
        cell.innerText = d;
        mainCalendarGrid.appendChild(cell);
    });

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    calendarLabel.innerText = viewDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day other-month';
        mainCalendarGrid.appendChild(cell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        createDayCell(d, todayStr);
    }

    const totalCells = firstDay + daysInMonth;
    const remainder = totalCells % 7;

    if (remainder !== 0) {
        const trailingDays = 7 - remainder;
        for (let i = 0; i < trailingDays; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day other-month';
            mainCalendarGrid.appendChild(cell);
        }
    }
}

function createDayCell(date, todayStr) {
    const dateStr = getLocalDateString(date);
    const isSelected = dateStr === selectedDateStr;
    const isToday = dateStr === todayStr;
    
    // Build dots HTML first
    const dotsHtml = habits
        .filter(h => h.history?.includes(dateStr))
        .map(h => `<div class="habit-dot" style="background-color: ${h.color || 'var(--accent)'}"></div>`)
        .join('');

    const cell = document.createElement('div');
    cell.className = `calendar-day ${isSelected ? 'selected' : ''}`;
    if (isToday) cell.style.border = "2px solid var(--accent)";
    
    cell.innerHTML = `
        <span style="font-weight:bold">${date.getDate()}</span>
        <div class="habit-dots">${dotsHtml}</div>
    `;

    cell.onclick = () => {
        selectedDateStr = dateStr;
        refreshUI();
    };

    mainCalendarGrid.appendChild(cell);
}

function renderHabitList() {
    habitList.innerHTML = '';
    const todayStr = getLocalDateString();

    if (habits.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No habits created yet. Click the "+ New" button in the top-right corner to get started.';
        habitList.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();

    habits.forEach(habit => {
        const isDoneToday = habit.history && habit.history.includes(todayStr);
        const streak = calculateStreak(habit);
        const habitColor = habit.color || getCSSVar('--accent');
        const textColor = getContrastYIQ(habitColor);

        const card = document.createElement('div');
        card.className = 'habit-card';
        card.style.borderLeftColor = habitColor;

        const info = document.createElement('div');
        info.className = 'habit-info';

        const name = document.createElement('h3');
        name.textContent = habit.name;

        const meta = document.createElement('div');
        meta.className = 'habit-meta';
        let metaText = `Streak: ${streak} | ${habit.freq}`;
        if (habit.freq !== 'daily') {
            metaText += ` (${habit.goal})`;
        }
        meta.textContent = metaText;

        info.append(name, meta);

        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '6px';

        const editBtn = document.createElement('button');
        editBtn.className = 'toggle-btn';
        editBtn.textContent = '✎';
        editBtn.onclick = () => showEditModal(habit.id);

        const checkBtn = document.createElement('button');
        checkBtn.className = 'toggle-btn';
        checkBtn.textContent = isDoneToday ? '✓' : '+';
        checkBtn.style.background = isDoneToday ? habitColor : 'var(--button)';
        checkBtn.style.color = isDoneToday ? textColor : 'var(--text)';
        checkBtn.onclick = (e) => {
            e.stopPropagation(); // Prevents accidental card clicks
            toggleDate(habit.id, todayStr);
        };

        btnGroup.append(editBtn, checkBtn);
        card.append(info, btnGroup);
        fragment.append(card);
    });

    habitList.append(fragment);
}

function normalizeDateStr(str) {
    return str.trim().replace(/\r/g, '');
}

function exportCSV() {
    let csv = "HabitName,Frequency,Goal,Color,DatesCompleted\n";
    habits.forEach(h => {
        csv += `"${h.name}","${h.freq}",${h.goal},"${h.color || getCSSVar('--accent')}","${(h.history || []).join(';')}"\n`;
    });
    const blob = new Blob([csv], {
        type: 'text/csv'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = getLocalDateString();
    a.download = `habits-backup-${today}.csv`;
    a.click();
}

function exportJSON() {
    const blob = new Blob(
        [JSON.stringify(habits, null, 2)], {
            type: 'application/json'
        }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = getLocalDateString();

    a.href = url;
    a.download = `habits-backup-${today}.json`;
    a.click();
}

function triggerFileImport(type) {
    const input = document.getElementById('fileInput');
    input.accept = type === 'csv' ? '.csv' : '.json';
    input.onchange = (e) => handleFileImport(e, type);
    input.click();
}

let pendingImportData = null;

function handleFileImport(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            let imported = [];

            if (type === 'json') {
                imported = JSON.parse(e.target.result);

                imported.forEach(h => {
                    if (Array.isArray(h.history)) {
                        h.history = h.history.map(normalizeDateStr);
                    }
                });

                if (!Array.isArray(imported)) throw new Error("Invalid JSON format");
            }

            if (type === 'csv') {
                const lines = e.target.result.split(/\r\n|\n|\r/).slice(1);

                imported = lines
                    .filter(line => line.trim())
                    .map(line => {
                        const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
                        if (cols.length < 3) return null;

                        return {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            name: cols[0].replace(/"/g, '').trim(),
                            freq: cols[1].replace(/"/g, '').trim(),
                            goal: parseInt(cols[2]) || 1,
                            color: cols[3] ? cols[3].replace(/"/g, '').trim() : getCSSVar('--accent'),
                            history: cols[4] ?
                                cols[4]
                                .replace(/"/g, '')
                                .split(';')
                                .map(normalizeDateStr)
                                .filter(Boolean) :
                                [],
                            createdAt: new Date().toISOString()
                        };
                    })
                    .filter(Boolean);
            }

            if (!imported.length) throw new Error("No valid data found in file.");

            pendingImportData = imported;
            Modal.open('importConfirmModal');

        } catch (err) {
            alert("Import failed: " + err.message);
        }

        event.target.value = "";
    };

    reader.readAsText(file);
}

function confirmImportReplace() {
    if (!pendingImportData) return;

    habits = pendingImportData;
    pendingImportData = null;

    syncData();
    refreshUI();

    Modal.closeAll();
}