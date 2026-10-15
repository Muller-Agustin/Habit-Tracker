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
const colorPicker = document.getElementById('color-picker');
const colorPickerToggle = document.getElementById('color-picker-toggle');
const selectedColorSwatch = document.getElementById('selected-color-swatch');
const viewSelector = document.getElementById('view-selector');
const themeToggle = document.getElementById('theme-toggle');
const helpToggle = document.getElementById('help-toggle');
const helpDialog = document.getElementById('help-dialog');
const helpClose = document.getElementById('help-close');

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

        if (editingId === habit.id) {
            habitElement.appendChild(renderHabitEditor(habit));
            habitList.appendChild(habitElement);
            return;
        }

        const habitHeader = document.createElement('div');
        habitHeader.className = 'habit-header';

        const habitName = document.createElement('span');
        habitName.className = 'habit-name';
        habitName.textContent = habit.emoji ? `${habit.emoji} ${habit.nombre}` : habit.nombre;
        habitName.style.color = habit.color;

        const isCompletedToday = Array.isArray(habit.fechasCumplidas)
            && habit.fechasCumplidas.includes(today);
        const checkButton = document.createElement('button');
        checkButton.className = isCompletedToday ? 'check-btn completed' : 'check-btn';
        checkButton.textContent = isCompletedToday ? 'Desmarcar hoy' : 'Completar hoy';
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
    editingId = id;
    renderHabits();
}

function renderHabitEditor(habit) {
    const editor = document.createElement('form');
    editor.className = 'habit-editor';

    const nameInput = document.createElement('input');
    nameInput.className = 'text-input';
    nameInput.name = 'name';
    nameInput.value = habit.nombre;
    nameInput.required = true;
    nameInput.setAttribute('aria-label', 'Nombre del hábito');

    const emojiSelect = document.createElement('select');
    emojiSelect.className = 'inline-emoji-select';
    emojiSelect.name = 'emoji';
    emojiSelect.setAttribute('aria-label', 'Emoji del hábito');

    const noEmojiOption = document.createElement('option');
    noEmojiOption.value = '';
    noEmojiOption.textContent = 'Sin emoji';
    emojiSelect.appendChild(noEmojiOption);

    PREDEFINED_EMOJIS.forEach(emoji => {
        const option = document.createElement('option');
        option.value = emoji;
        option.textContent = emoji;
        emojiSelect.appendChild(option);
    });
    emojiSelect.value = habit.emoji || '';

    const colors = ['#8A9A5B', '#6082B6', '#E2725B', '#DDA0DD'];
    const colorOptions = document.createElement('div');
    colorOptions.className = 'inline-color-options';

    colors.forEach(color => {
        const colorButton = document.createElement('button');
        colorButton.type = 'button';
        colorButton.className = 'inline-color-option';
        colorButton.dataset.color = color;
        colorButton.style.backgroundColor = color;
        colorButton.setAttribute('aria-label', `Elegir color ${color}`);
        colorButton.setAttribute('aria-pressed', String(color === habit.color));
        if (color === habit.color) {
            colorButton.classList.add('selected');
        }

        colorButton.addEventListener('click', () => {
            colorOptions.querySelectorAll('.inline-color-option').forEach(option => {
                option.classList.remove('selected');
                option.setAttribute('aria-pressed', 'false');
            });
            colorButton.classList.add('selected');
            colorButton.setAttribute('aria-pressed', 'true');
        });
        colorOptions.appendChild(colorButton);
    });

    const actions = document.createElement('div');
    actions.className = 'habit-editor-actions';

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className = 'edit-btn';
    saveButton.textContent = 'Guardar';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'delete-btn';
    cancelButton.textContent = 'Cancelar';
    cancelButton.addEventListener('click', () => {
        editingId = null;
        renderHabits();
    });

    actions.append(saveButton, cancelButton);
    editor.append(nameInput, emojiSelect, colorOptions, actions);
    nameInput.focus();
    editor.addEventListener('submit', event => {
        event.preventDefault();
        const name = nameInput.value.trim();
        if (name === '') {
            nameInput.value = '';
            nameInput.reportValidity();
            return;
        }

        const selectedColor = colorOptions.querySelector('.inline-color-option.selected');
        const habitToUpdate = habits.find(item => item.id === habit.id);
        if (!habitToUpdate || !selectedColor) return;

        habitToUpdate.nombre = name;
        habitToUpdate.emoji = emojiSelect.value;
        habitToUpdate.color = selectedColor.dataset.color;
        editingId = null;
        saveHabits();
        renderHabits();
    });

    return editor;
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
            emojiInput.setAttribute('aria-expanded', 'false');
        });
        emojiPanel.appendChild(option);
    });

    emojiInput.addEventListener('click', event => {
        emojiPanel.classList.toggle('hidden');
        emojiInput.setAttribute('aria-expanded', String(!emojiPanel.classList.contains('hidden')));
        colorPicker.classList.add('hidden');
        colorPickerToggle.setAttribute('aria-expanded', 'false');
        event.stopPropagation();
    });

    document.addEventListener('click', event => {
        if (!emojiInput.contains(event.target) && !emojiPanel.contains(event.target)) {
            emojiPanel.classList.add('hidden');
            emojiInput.setAttribute('aria-expanded', 'false');
        }
        if (!colorPickerToggle.contains(event.target) && !colorPicker.contains(event.target)) {
            colorPicker.classList.add('hidden');
            colorPickerToggle.setAttribute('aria-expanded', 'false');
        }
    });
}

function updateEmojiInputColor() {
    const selectedColor = document.querySelector('input[name="habit-color"]:checked').value;
    emojiInput.style.borderColor = selectedColor;
    emojiInput.style.boxShadow = `0 0 8px ${selectedColor}40`;
    selectedColorSwatch.style.backgroundColor = selectedColor;
}

function setDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Activar modo claro' : 'Activar modo oscuro');
    themeToggle.title = isDark ? 'Activar modo claro' : 'Activar modo oscuro';
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
}

colorPickerToggle.addEventListener('click', event => {
    colorPicker.classList.toggle('hidden');
    colorPickerToggle.setAttribute('aria-expanded', String(!colorPicker.classList.contains('hidden')));
    emojiPanel.classList.add('hidden');
    emojiInput.setAttribute('aria-expanded', 'false');
    event.stopPropagation();
});

viewSelector.addEventListener('change', event => {
    currentView = event.target.value;
    renderHabits();
});

themeToggle.addEventListener('click', () => {
    setDarkMode(!document.body.classList.contains('dark-mode'));
});

helpToggle.addEventListener('click', () => {
    helpDialog.showModal();
});

helpClose.addEventListener('click', () => {
    helpDialog.close();
});

helpDialog.addEventListener('click', event => {
    if (event.target === helpDialog) {
        helpDialog.close();
    }
});

colorRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        updateEmojiInputColor();
        colorPicker.classList.add('hidden');
        colorPickerToggle.setAttribute('aria-expanded', 'false');
    });
});

form.addEventListener('submit', event => {
    event.preventDefault();

    const habitName = input.value.trim();
    const habitEmoji = emojiInput.value.trim();
    const habitColor = document.querySelector('input[name="habit-color"]:checked').value;

    if (habitName !== '') {
        addHabit(habitName, habitEmoji, habitColor);
        input.value = '';
        emojiInput.value = '';
    }
});

initEmojiPicker();
updateEmojiInputColor();
setDarkMode(localStorage.getItem(THEME_STORAGE_KEY) === 'dark');
loadHabits();
