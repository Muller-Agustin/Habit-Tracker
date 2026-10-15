const STORAGE_KEY = 'habits_data';
const THEME_STORAGE_KEY = 'habit_tracker_theme';
const PREDEFINED_EMOJIS = ['📚', '💧', '🏃', '🧘', '🍎', '💤', '📝', '🌿', '🏋️', '🧹', '🎨', '💰'];

let habits = [];
let editingId = null;
let currentView = 'weekly';

const form = document.getElementById('habit-form');
const input = document.getElementById('habit-input');
const emojiInput = document.getElementById('habit-emoji');
const emojiPanel = document.getElementById('emoji-panel');
const habitList = document.getElementById('habit-list');
const colorRadios = document.querySelectorAll('input[name="habit-color"]');
const submitBtn = form.querySelector('button[type="submit"]');
const viewSelector = document.getElementById('view-selector');
const themeToggle = document.getElementById('theme-toggle');

function loadHabits() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        habits = JSON.parse(storedData);
    }
    renderHabits();
}

function saveHabits() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function getTodayString() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
}

function getLastNDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        days.push(`${year}-${month}-${day}`);
    }
    return days;
}

function renderHabits() {
    const today = getTodayString();
    let daysToRender = 7;
    let extraClass = '';

    if (currentView === 'monthly') {
        daysToRender = 30;
    } else if (currentView === 'yearly') {
        daysToRender = 365;
        extraClass = ' view-yearly';
    }

    const datesToShow = getLastNDays(daysToRender);
    habitList.innerHTML = '';

    if (habits.length === 0) {
        habitList.innerHTML = '<p class="empty-state">No hay hábitos aun, prueba añadir uno!</p>';
        return;
    }

    habits.forEach(habit => {
        const habitElement = document.createElement('div');
        habitElement.className = 'habit-card';

        const habitHeader = document.createElement('div');
        habitHeader.className = 'habit-header';

        const habitName = document.createElement('span');
        habitName.className = 'habit-name';
        habitName.textContent = `${habit.emoji} ${habit.nombre}`;
        habitName.style.color = habit.color;

        const isCompletedToday = Array.isArray(habit.fechasCumplidas)
            && habit.fechasCumplidas.includes(today);
        const checkButton = document.createElement('button');
        checkButton.className = isCompletedToday ? 'check-btn completed' : 'check-btn';
        checkButton.textContent = isCompletedToday ? '✓ Listo' : 'Marcar hoy';
        if (isCompletedToday) {
            checkButton.style.backgroundColor = habit.color;
        }
        checkButton.addEventListener('click', () => toggleHabit(habit.id));

        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', () => editHabit(habit.id));

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.textContent = 'Eliminar';
        deleteButton.addEventListener('click', () => deleteHabit(habit.id));

        const habitActions = document.createElement('div');
        habitActions.className = 'habit-actions';
        habitActions.append(checkButton, editButton, deleteButton);

        habitHeader.append(habitName, habitActions);
        habitElement.appendChild(habitHeader);

        const heatmap = document.createElement('div');
        heatmap.className = `heatmap-container${extraClass}`;

        datesToShow.forEach(dateStr => {
            const isCompleted = Array.isArray(habit.fechasCumplidas)
                && habit.fechasCumplidas.includes(dateStr);
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.title = dateStr;

            if (isCompleted) {
                cell.style.backgroundColor = habit.color;
            }

            cell.addEventListener('click', () => toggleHabit(habit.id, dateStr));
            heatmap.appendChild(cell);
        });

        habitElement.appendChild(heatmap);
        habitList.appendChild(habitElement);
    });
}

function addHabit(name, emoji, color) {
    habits.push({
        id: Date.now(),
        nombre: name,
        emoji,
        color,
        fechasCumplidas: []
    });

    saveHabits();
    renderHabits();
}

function deleteHabit(id) {
    habits = habits.filter(habit => habit.id !== id);
    saveHabits();
    renderHabits();
    console.log(`Hábito con ID ${id} eliminado. Estado actualizado:`, habits);
}

function editHabit(id) {
    const habitToEdit = habits.find(habit => habit.id === id);
    if (!habitToEdit) return;

    input.value = habitToEdit.nombre;
    emojiInput.value = habitToEdit.emoji;

    const colorRadio = document.querySelector(`input[name="habit-color"][value="${habitToEdit.color}"]`);
    if (colorRadio) {
        colorRadio.checked = true;
    }

    updateEmojiInputColor();
    editingId = id;
    submitBtn.textContent = 'Actualizar';
    input.focus();
}

function toggleHabit(id, dateStr = getTodayString()) {
    const habit = habits.find(habit => habit.id === id);
    if (!habit) return;

    if (!Array.isArray(habit.fechasCumplidas)) {
        habit.fechasCumplidas = [];
    }

    const hasCompleted = habit.fechasCumplidas.includes(dateStr);
    if (hasCompleted) {
        habit.fechasCumplidas = habit.fechasCumplidas.filter(date => date !== dateStr);
    } else {
        habit.fechasCumplidas.push(dateStr);
    }

    saveHabits();
    renderHabits();
}

function initEmojiPicker() {
    PREDEFINED_EMOJIS.forEach(emoji => {
        const option = document.createElement('span');
        option.className = 'emoji-option';
        option.textContent = emoji;
        option.addEventListener('click', () => {
            emojiInput.value = emoji;
            emojiPanel.classList.add('hidden');
        });
        emojiPanel.appendChild(option);
    });

    emojiInput.addEventListener('click', event => {
        emojiPanel.classList.toggle('hidden');
        event.stopPropagation();
    });

    document.addEventListener('click', event => {
        if (!emojiInput.contains(event.target) && !emojiPanel.contains(event.target)) {
            emojiPanel.classList.add('hidden');
        }
    });
}

function updateEmojiInputColor() {
    const selectedColor = document.querySelector('input[name="habit-color"]:checked').value;
    emojiInput.style.borderColor = selectedColor;
    emojiInput.style.boxShadow = `0 0 8px ${selectedColor}40`;
}

function setDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Activar modo claro' : 'Activar modo oscuro');
    themeToggle.title = isDark ? 'Activar modo claro' : 'Activar modo oscuro';
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
}

viewSelector.addEventListener('change', event => {
    currentView = event.target.value;
    renderHabits();
});

themeToggle.addEventListener('click', () => {
    setDarkMode(!document.body.classList.contains('dark-mode'));
});

colorRadios.forEach(radio => {
    radio.addEventListener('change', updateEmojiInputColor);
});

form.addEventListener('submit', event => {
    event.preventDefault();

    const habitName = input.value.trim();
    const habitEmoji = emojiInput.value.trim();
    const habitColor = document.querySelector('input[name="habit-color"]:checked').value;

    if (habitName !== '' && habitEmoji !== '' && habitEmoji !== '+') {
        if (editingId !== null) {
            const index = habits.findIndex(habit => habit.id === editingId);
            if (index !== -1) {
                habits[index].nombre = habitName;
                habits[index].emoji = habitEmoji;
                habits[index].color = habitColor;
            }

            editingId = null;
            submitBtn.textContent = 'Agregar';
            saveHabits();
            renderHabits();
        } else {
            addHabit(habitName, habitEmoji, habitColor);
        }

        input.value = '';
        emojiInput.value = '';
    }
});

initEmojiPicker();
updateEmojiInputColor();
setDarkMode(localStorage.getItem(THEME_STORAGE_KEY) === 'dark');
loadHabits();
