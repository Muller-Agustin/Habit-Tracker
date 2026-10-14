const STORAGE_KEY = 'habits_data';

let habits = [];

/**
 * Funcion para cargar los hábitos
 */
function loadHabits() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        habits = JSON.parse(storedData);
    }
    renderHabits();
}

/**
 * Funcion para guardar los hábitos
 */
function saveHabits() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

const form = document.getElementById('habit-form');
const input = document.getElementById('habit-input');
const habitList = document.getElementById('habit-list');

/**
 * Dibuja los hábitos en la pantalla basándose en el array en memoria.
 */
function renderHabits() {
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
        habitName.textContent = habit.nombre;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteHabit(habit.id));

        habitHeader.append(habitName, deleteButton);
        habitElement.appendChild(habitHeader);
        habitList.appendChild(habitElement);
    });
}

/**
 * Elimina un hábito por su ID utilizando el método filter.
 */
function deleteHabit(id) {
    habits = habits.filter(habit => habit.id !== id);
    saveHabits();
    renderHabits();

    console.log(`Hábito con ID ${id} eliminado. Estado actualizado:`, habits);
}

/**
 * Función oficial para agregar un hábito desde la interfaz.
 */
function addHabit(name) {
    const newHabit = {
        id: Date.now(), 
        nombre: name,
        fechasCumplidas: []
    };
    
    habits.push(newHabit);
    saveHabits();
    renderHabits();
}

// Escuchador del evento 'submit' del formulario
form.addEventListener('submit', function(event) {
    event.preventDefault();
    const habitName = input.value.trim();
    
    if (habitName !== '') {
        addHabit(habitName);
        input.value = '';
    }
});

loadHabits();