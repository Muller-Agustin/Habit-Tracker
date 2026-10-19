const STORAGE_KEY = 'habits_data';
const THEME_STORAGE_KEY = 'habit_tracker_theme';
const DEFAULT_COLOR = '#8A9A5B';
const PALETTE = [
    { hex: '#8A9A5B', label: 'Verde' },
    { hex: '#6082B6', label: 'Azul' },
    { hex: '#E2725B', label: 'Coral' },
    { hex: '#DDA0DD', label: 'Lila' }
];
const PALETTE_COLORS = PALETTE.map(option => option.hex);
const PREDEFINED_EMOJIS = ['📚', '💧', '🏃', '🧘', '🍎', '💤', '📝', '🌿', '🏋️', '🧹', '🎨', '💰'];
const FLAME_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2s5 4.5 5 9.5a5 5 0 0 1-10 0C7 9 9 7 9 7s.5 2 2 2c1.2 0 1.5-1 1.5-2C12.5 5.5 12 3.5 12 2Z"></path></svg>';
const EDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>';
const DELETE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';

const chromeStorage = globalThis.chrome?.storage?.local;

let habits = [];
let editingId = null;
let currentView = 'weekly';
let viewDatesCache = { key: '', dates: [] };
let writeChain = Promise.resolve();

const form = document.getElementById('habit-form');
const input = document.getElementById('habit-input');
const emojiInput = document.getElementById('habit-emoji');
const emojiPanel = document.getElementById('emoji-panel');
const habitList = document.getElementById('habit-list');
const colorPicker = document.getElementById('color-picker');
const colorPickerToggle = document.getElementById('color-picker-toggle');
const selectedColorSwatch = document.getElementById('selected-color-swatch');
const customColorSwatch = document.getElementById('custom-color-swatch');
const customColorInput = document.getElementById('custom-color-input');
const customColorRadio = document.getElementById('custom-color-radio');
const viewSelector = document.getElementById('view-selector');
const themeToggle = document.getElementById('theme-toggle');
const helpToggle = document.getElementById('help-toggle');
const helpDialog = document.getElementById('help-dialog');
const helpClose = document.getElementById('help-close');

function parseJSON(raw, fallback) {
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function readLocalStorageValue(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

function storageGet(key) {
    if (!chromeStorage) {
        return Promise.resolve(readLocalStorageValue(key));
    }

    return new Promise(resolve => {
        try {
            chromeStorage.get(key, result => {
                if (globalThis.chrome?.runtime?.lastError) {
                    resolve(undefined);
                    return;
                }
                resolve(result ? result[key] : undefined);
            });
        } catch {
            resolve(undefined);
        }
    });
}

function storageSet(values) {
    if (!chromeStorage) {
        Object.entries(values).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
        });
        return Promise.resolve();
    }

    return new Promise(resolve => {
        try {
            chromeStorage.set(values, () => {
                void globalThis.chrome?.runtime?.lastError;
                resolve();
            });
        } catch {
            resolve();
        }
    });
}

async function migrateLegacyStorage() {
    if (!chromeStorage) return;

    const legacyHabits = localStorage.getItem(STORAGE_KEY);
    const legacyTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (legacyHabits === null && legacyTheme === null) return;

    const updates = {};

    if (legacyHabits !== null && (await storageGet(STORAGE_KEY)) === undefined) {
        const parsed = parseJSON(legacyHabits, null);
        if (parsed !== null) updates[STORAGE_KEY] = parsed;
    }

    if (legacyTheme !== null && (await storageGet(THEME_STORAGE_KEY)) === undefined) {
        updates[THEME_STORAGE_KEY] = legacyTheme;
    }

    if (Object.keys(updates).length === 0) return;

    await storageSet(updates);
    if (updates[STORAGE_KEY] !== undefined) localStorage.removeItem(STORAGE_KEY);
    if (updates[THEME_STORAGE_KEY] !== undefined) localStorage.removeItem(THEME_STORAGE_KEY);
}

function createId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeHabits(data) {
    if (!Array.isArray(data)) return [];

    const seenIds = new Set();
    const sanitized = [];

    data.forEach(habit => {
        if (!habit || typeof habit !== 'object' || typeof habit.nombre !== 'string') return;

        let id = habit.id;
        if ((typeof id !== 'number' && typeof id !== 'string') || seenIds.has(id)) {
            id = createId();
        }
        seenIds.add(id);

        const dates = Array.isArray(habit.fechasCumplidas)
            ? [...new Set(habit.fechasCumplidas.filter(date => typeof date === 'string'))].sort()
            : [];

        sanitized.push({
            id,
            nombre: habit.nombre,
            emoji: typeof habit.emoji === 'string' ? habit.emoji : '',
            color: typeof habit.color === 'string' ? habit.color : DEFAULT_COLOR,
            fechasCumplidas: dates
        });
    });

    return sanitized;
}

function persistHabits() {
    const snapshot = habits.map(habit => ({
        ...habit,
        fechasCumplidas: [...habit.fechasCumplidas]
    }));

    writeChain = writeChain
        .then(() => storageSet({ [STORAGE_KEY]: snapshot }))
        .catch(() => {});
}

function persistTheme(isDark) {
    const theme = isDark ? 'dark' : 'light';
    writeChain = writeChain
        .then(() => storageSet({ [THEME_STORAGE_KEY]: theme }))
        .catch(() => {});
}

function formatDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function getTodayString() {
    return formatDate(new Date());
}

function getLastNDays(n) {
    const days = [];
    const base = new Date();

    for (let offset = n - 1; offset >= 0; offset--) {
        const date = new Date(base);
        date.setDate(base.getDate() - offset);
        days.push(formatDate(date));
    }

    return days;
}

function getViewDates() {
    const today = getTodayString();
    const cacheKey = `${currentView}:${today}`;
    if (viewDatesCache.key === cacheKey) return viewDatesCache.dates;

    const daysToRender = currentView === 'yearly' ? 365 : currentView === 'monthly' ? 30 : 7;
    const dates = getLastNDays(daysToRender);
    viewDatesCache = { key: cacheKey, dates };
    return dates;
}

function calculateStreak(completed, today) {
    const cursor = parseDate(today);
    if (!completed.has(today)) {
        cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (completed.has(formatDate(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function renderHabits() {
    if (habits.length === 0) {
        const emptyState = document.createElement('p');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No hay hábitos aun, prueba añadir uno!';
        habitList.replaceChildren(emptyState);
        return;
    }

    const today = getTodayString();
    const dates = getViewDates();
    const fragment = document.createDocumentFragment();

    habits.forEach(habit => {
        fragment.appendChild(createHabitCard(habit, dates, today));
    });

    habitList.replaceChildren(fragment);
}

function createHabitCard(habit, dates, today) {
    const card = document.createElement('div');
    card.className = 'habit-card';
    card.dataset.habitId = habit.id;
    card.style.setProperty('--habit-color', habit.color);

    if (editingId === habit.id) {
        card.appendChild(renderHabitEditor(habit));
        return card;
    }

    const completed = new Set(habit.fechasCumplidas);
    const isCompletedToday = completed.has(today);

    const habitHeader = document.createElement('div');
    habitHeader.className = 'habit-header';

    const habitInfo = document.createElement('div');
    habitInfo.className = 'habit-info';

    const habitName = document.createElement('span');
    habitName.className = 'habit-name';
    habitName.textContent = habit.emoji ? `${habit.emoji} ${habit.nombre}` : habit.nombre;
    habitInfo.appendChild(habitName);

    const streak = calculateStreak(completed, today);
    if (streak > 0) {
        const streakBadge = document.createElement('span');
        streakBadge.className = 'streak-badge';
        streakBadge.title = `${streak} ${streak === 1 ? 'día seguido' : 'días seguidos'}`;
        streakBadge.innerHTML = FLAME_ICON;
        const streakCount = document.createElement('span');
        streakCount.textContent = streak;
        streakBadge.appendChild(streakCount);
        habitInfo.appendChild(streakBadge);
    }

    const checkButton = document.createElement('button');
    checkButton.type = 'button';
    checkButton.className = isCompletedToday ? 'check-btn completed' : 'check-btn';
    checkButton.textContent = isCompletedToday ? 'Desmarcar hoy' : 'Completar hoy';
    checkButton.dataset.action = 'toggle-today';
    checkButton.dataset.habitId = habit.id;
    checkButton.setAttribute('aria-pressed', String(isCompletedToday));

    const editButton = createIconButton({
        className: 'habit-icon-btn edit-icon-btn',
        title: 'Editar',
        ariaLabel: 'Editar hábito',
        icon: EDIT_ICON,
        action: 'edit',
        habitId: habit.id
    });

    const deleteButton = createIconButton({
        className: 'habit-icon-btn delete-icon-btn',
        title: 'Eliminar',
        ariaLabel: 'Eliminar hábito',
        icon: DELETE_ICON,
        action: 'delete',
        habitId: habit.id
    });

    const habitActions = document.createElement('div');
    habitActions.className = 'habit-actions';
    habitActions.append(checkButton, editButton, deleteButton);

    habitHeader.append(habitInfo, habitActions);
    card.appendChild(habitHeader);

    const heatmap = document.createElement('div');
    heatmap.className = currentView === 'yearly' ? 'heatmap-container view-yearly' : 'heatmap-container';

    const heatmapFragment = document.createDocumentFragment();
    dates.forEach(dateStr => {
        const cell = document.createElement('div');
        cell.className = completed.has(dateStr) ? 'heatmap-cell completed' : 'heatmap-cell';
        cell.title = dateStr;
        cell.dataset.action = 'toggle-date';
        cell.dataset.habitId = habit.id;
        cell.dataset.date = dateStr;
        heatmapFragment.appendChild(cell);
    });

    heatmap.appendChild(heatmapFragment);
    card.appendChild(heatmap);

    return card;
}

function createIconButton({ className, title, ariaLabel, icon, action, habitId }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.title = title;
    button.setAttribute('aria-label', ariaLabel);
    button.innerHTML = icon;
    button.dataset.action = action;
    button.dataset.habitId = habitId;
    return button;
}

function updateHabitCard(habit) {
    if (editingId === habit.id) return;

    const currentCard = habitList.querySelector(`[data-habit-id="${habit.id}"]`);
    if (!currentCard) {
        renderHabits();
        return;
    }

    currentCard.replaceWith(createHabitCard(habit, getViewDates(), getTodayString()));
}

function addHabit(name, emoji, color) {
    const habit = {
        id: createId(),
        nombre: name,
        emoji,
        color,
        fechasCumplidas: []
    };

    habits.push(habit);
    persistHabits();

    if (habits.length === 1) {
        renderHabits();
        return;
    }

    habitList.appendChild(createHabitCard(habit, getViewDates(), getTodayString()));
}

function deleteHabit(id) {
    habits = habits.filter(habit => habit.id !== id);
    if (editingId === id) editingId = null;
    persistHabits();
    renderHabits();
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

    const colorOptions = document.createElement('div');
    colorOptions.className = 'inline-color-options';

    PALETTE_COLORS.forEach(color => {
        const colorButton = document.createElement('button');
        colorButton.type = 'button';
        colorButton.className = 'inline-color-option';
        colorButton.dataset.color = color;
        colorButton.style.setProperty('--swatch-color', color);
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

    const customColorField = document.createElement('input');
    customColorField.type = 'color';
    customColorField.className = 'custom-color-input';
    customColorField.value = PALETTE_COLORS.includes(habit.color) ? '#000000' : habit.color;
    customColorField.setAttribute('aria-label', 'Elegir color personalizado');

    const customColorOption = document.createElement('label');
    customColorOption.className = 'inline-color-option custom-color-option';
    customColorOption.title = 'Color personalizado';

    const customPlus = document.createElement('span');
    customPlus.className = 'custom-color-plus';
    customPlus.setAttribute('aria-hidden', 'true');
    customPlus.textContent = '+';

    customColorOption.append(customPlus, customColorField);

    if (!PALETTE_COLORS.includes(habit.color)) {
        customColorOption.classList.add('selected', 'has-custom-color');
        customColorOption.style.setProperty('--swatch-color', habit.color);
        customColorOption.dataset.color = habit.color;
    }

    customColorField.addEventListener('input', () => {
        colorOptions.querySelectorAll('.inline-color-option').forEach(option => {
            option.classList.remove('selected');
            option.setAttribute('aria-pressed', 'false');
        });
        customColorOption.classList.add('selected', 'has-custom-color');
        customColorOption.style.setProperty('--swatch-color', customColorField.value);
        customColorOption.dataset.color = customColorField.value;
    });

    colorOptions.appendChild(customColorOption);

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
        persistHabits();
        renderHabits();
    });

    return editor;
}

function toggleHabit(id, dateStr) {
    const habit = habits.find(item => item.id === id);
    if (!habit) return;

    const completed = new Set(habit.fechasCumplidas);
    if (completed.has(dateStr)) {
        completed.delete(dateStr);
    } else {
        completed.add(dateStr);
    }

    habit.fechasCumplidas = [...completed].sort();
    persistHabits();
    updateHabitCard(habit);
}

function initEmojiPicker() {
    const fragment = document.createDocumentFragment();

    PREDEFINED_EMOJIS.forEach(emoji => {
        const option = document.createElement('span');
        option.className = 'emoji-option';
        option.textContent = emoji;
        option.addEventListener('click', () => {
            emojiInput.value = emoji;
            closeEmojiPanel();
        });
        fragment.appendChild(option);
    });

    emojiPanel.appendChild(fragment);

    emojiInput.addEventListener('click', event => {
        const willOpen = emojiPanel.classList.contains('hidden');
        closeColorPicker();
        emojiPanel.classList.toggle('hidden', !willOpen);
        emojiInput.setAttribute('aria-expanded', String(willOpen));
        event.stopPropagation();
    });

    document.addEventListener('click', event => {
        if (!emojiInput.contains(event.target) && !emojiPanel.contains(event.target)) {
            closeEmojiPanel();
        }
        if (!colorPickerToggle.contains(event.target) && !colorPicker.contains(event.target)) {
            closeColorPicker();
        }
    });
}

function initColorOptions() {
    PALETTE.forEach(({ hex, label }) => {
        const swatch = document.createElement('label');
        swatch.className = 'color-swatch';
        swatch.style.setProperty('--swatch-color', hex);

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'habit-color';
        radio.value = hex;
        radio.checked = hex === DEFAULT_COLOR;
        radio.setAttribute('aria-label', label);

        swatch.appendChild(radio);
        colorPicker.insertBefore(swatch, customColorSwatch);
    });

    updateEmojiInputColor();
}

function closeEmojiPanel() {
    emojiPanel.classList.add('hidden');
    emojiInput.setAttribute('aria-expanded', 'false');
}

function closeColorPicker() {
    colorPicker.classList.add('hidden');
    colorPickerToggle.setAttribute('aria-expanded', 'false');
}

function getSelectedColor() {
    const checked = colorPicker.querySelector('input[name="habit-color"]:checked');
    return checked ? checked.value : DEFAULT_COLOR;
}

function updateEmojiInputColor() {
    const selectedColor = getSelectedColor();
    emojiInput.style.borderColor = selectedColor;
    emojiInput.style.boxShadow = `0 0 8px ${selectedColor}40`;
    selectedColorSwatch.style.setProperty('--swatch-color', selectedColor);
}

function setDarkMode(isDark, persist = true) {
    document.body.classList.toggle('dark-mode', isDark);
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Activar modo claro' : 'Activar modo oscuro');
    themeToggle.title = isDark ? 'Activar modo claro' : 'Activar modo oscuro';
    if (persist) persistTheme(isDark);
}

function handleHabitListClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const habit = habits.find(item => String(item.id) === target.dataset.habitId);
    if (!habit) return;

    const action = target.dataset.action;

    if (action === 'toggle-today') {
        toggleHabit(habit.id, getTodayString());
    } else if (action === 'toggle-date') {
        toggleHabit(habit.id, target.dataset.date);
    } else if (action === 'edit') {
        editHabit(habit.id);
    } else if (action === 'delete') {
        deleteHabit(habit.id);
    }
}

function bindEvents() {
    form.addEventListener('submit', event => {
        event.preventDefault();

        const habitName = input.value.trim();
        if (habitName === '') return;

        addHabit(habitName, emojiInput.value.trim(), getSelectedColor());
        input.value = '';
        emojiInput.value = '';
    });

    colorPickerToggle.addEventListener('click', event => {
        const willOpen = colorPicker.classList.contains('hidden');
        closeEmojiPanel();
        colorPicker.classList.toggle('hidden', !willOpen);
        colorPickerToggle.setAttribute('aria-expanded', String(willOpen));
        event.stopPropagation();
    });

    customColorInput.addEventListener('input', () => {
        const color = customColorInput.value;
        customColorRadio.value = color;
        customColorRadio.checked = true;
        customColorSwatch.style.setProperty('--swatch-color', color);
        customColorSwatch.classList.add('has-custom-color');
        updateEmojiInputColor();
        closeColorPicker();
    });

    colorPicker.addEventListener('change', event => {
        if (!event.target.matches('input[name="habit-color"][type="radio"]')) return;
        updateEmojiInputColor();
        closeColorPicker();
    });

    viewSelector.addEventListener('change', event => {
        currentView = event.target.value;
        renderHabits();
    });

    themeToggle.addEventListener('click', () => {
        setDarkMode(!document.body.classList.contains('dark-mode'));
    });

    helpToggle.addEventListener('click', () => helpDialog.showModal());
    helpClose.addEventListener('click', () => helpDialog.close());
    helpDialog.addEventListener('click', event => {
        if (event.target === helpDialog) helpDialog.close();
    });

    habitList.addEventListener('click', handleHabitListClick);
}

async function init() {
    initEmojiPicker();
    initColorOptions();
    bindEvents();

    try {
        await migrateLegacyStorage();
        const [storedHabits, storedTheme] = await Promise.all([
            storageGet(STORAGE_KEY),
            storageGet(THEME_STORAGE_KEY)
        ]);
        habits = sanitizeHabits(storedHabits);
        setDarkMode(storedTheme === 'dark', false);
    } catch (error) {
        console.error('No se pudieron cargar los datos guardados.', error);
        setDarkMode(false, false);
    }

    renderHabits();
}

init();
