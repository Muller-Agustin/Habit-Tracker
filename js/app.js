const STORAGE_KEY = 'habits_data';
const PREDEFINED_EMOJIS = ['📚', '💧', '🏃', '🧘', '🍎', '💤', '📝', '🌿', '🏋️', '🧹', '🎨', '💰'];

let habits = [];
let editingId = null;

const form = document.getElementById('habit-form');
const input = document.getElementById('habit-input');
const emojiInput = document.getElementById('habit-emoji');
const emojiPanel = document.getElementById('emoji-panel');
const habitList = document.getElementById('habit-list');
const colorRadios = document.querySelectorAll('input[name="habit-color"]');
const submitBtn = form.querySelector('button[type="submit"]');

// Persistencia
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

function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        days.push(`${year}-${month}-${day}`);
    }
    return days;
}

function toggleHabit(id, dateStr = getTodayString()) {
    const habit = habits.find(h => h.id === id);
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

function renderHabits() {
    const today = getTodayString();
    const last7Days = getLast7Days();
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
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => editHabit(habit.id));

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteHabit(habit.id));

        const habitActions = document.createElement('div');
        habitActions.className = 'habit-actions';
        habitActions.append(checkButton, editButton, deleteButton);

        habitHeader.append(habitName, habitActions);
        habitElement.appendChild(habitHeader);

        const heatmap = document.createElement('div');
        heatmap.className = 'heatmap-container';

        last7Days.forEach(dateStr => {
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

// Selector de emojis y color
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

// Eventos e inicialización
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
loadHabits();
