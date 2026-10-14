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

function testCreateHabit(nombre) {
    const newHabit = {
        id: Date.now(), 
        nombre: nombre,
        fechasCumplidas: []
    };
    
    habits.push(newHabit);
    saveHabits();
    console.log(`Hábito "${nombre}" guardado con éxito. ID: ${newHabit.id}`);
}

loadHabits();