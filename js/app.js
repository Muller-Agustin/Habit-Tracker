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
    console.log("Estado actual de hábitos:", habits);
}

/**
 * Funcion para guardar los hábitos
 */
function saveHabits() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

// Referencias a los elementos del DOM
const form = document.getElementById('habit-form');
const input = document.getElementById('habit-input');

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
    console.log(`Hábito agregado vía UI: ${name}`);
    console.log("Estado actual:", habits);
    
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