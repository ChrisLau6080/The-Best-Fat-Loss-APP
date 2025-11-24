// --- Global Elements and Storage Keys ---
const calorieForm = document.getElementById('calorie-form');
const foodForm = document.getElementById('food-form');
const foodLogList = document.getElementById('food-log');
const resetButton = document.getElementById('reset-button');

// ... existing references ...
const dailyGoalSpan = document.getElementById('daily-goal');
const consumedCaloriesSpan = document.getElementById('consumed-calories');
const remainingCaloriesSpan = document.getElementById('remaining-calories');
const timelineOutput = document.getElementById('timeline-output');

// NEW MACRO ELEMENTS
const targetProteinSpan = document.getElementById('target-protein');
const targetCarbsSpan = document.getElementById('target-carbs');
const targetFatSpan = document.getElementById('target-fat');


const GOAL_KEY = 'dailyCalorieGoal';
const FOOD_LOG_KEY = 'foodLog';

// --- Core Constants ---
const CALORIES_PER_KG_FAT = 7700; 

// NEW MACRO CONSTANTS
const CAL_PER_GRAM_PROTEIN = 4;
const CAL_PER_GRAM_CARBS = 4;
const CAL_PER_GRAM_FAT = 9; 

// ... existing BMR and Exercise functions ...

// --- Core Functions ---

/**
 * Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor Equation.
 * @param {number} weight - Weight in kg.
 * @param {number} height - Height in cm.
 * @param {number} age - Age in years.
 * @param {string} sex - 'male' or 'female'.
 * @returns {number} The calculated BMR.
 */
function calculateBMR(weight, height, age, sex) {
    let bmr = 0;
    if (sex === 'male') {
        // BMR = 10W + 6.25H - 5A + 5
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else { // female
        // BMR = 10W + 6.25H - 5A - 161
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
    return Math.round(bmr);
}

/**
 * Calculates the calorie adjustment based on training time and experience level.
 * Formula: Training Time (min) * Multiplier (5, 8, or 10).
 * @param {number} time - Training time in minutes.
 * @param {number} multiplier - Multiplier based on experience level (5, 8, or 10).
 * @returns {number} The calculated exercise calorie adjustment.
 */
function calculateExerciseAdjustment(time, multiplier) {
    return Math.round(time * multiplier);
}


/**
 * Saves a value to Local Storage.
 * @param {string} key - The key to use in Local Storage.
 * @param {*} value - The value to store.
 */
function saveToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Retrieves a value from Local Storage.
 * @param {string} key - The key to retrieve.
 * @param {*} defaultValue - The default value if the key is not found.
 * @returns {*} The stored value or the default value.
 */
function getFromLocalStorage(key, defaultValue) {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
}


// --- UI and State Management ---

/**
 * Renders the food log list and updates the summary.
 * @param {Array<Object>} log - The current food log array.
 * @param {number} goal - The daily calorie goal.
 */
function renderLogAndSummary(log, goal) {
    foodLogList.innerHTML = '';
    let totalConsumed = 0;

    log.forEach((item, index) => {
        totalConsumed += item.calories;

        const li = document.createElement('li');
        li.innerHTML = `
            <span>${item.name}</span>
            <span>${item.calories} cal 
                <button class="delete-btn" data-index="${index}">[x]</button>
            </span>
        `;
        foodLogList.appendChild(li);
    });

    const remaining = goal - totalConsumed;

    consumedCaloriesSpan.textContent = totalConsumed;
    remainingCaloriesSpan.textContent = remaining;
    
    // Optional: Highlight remaining calories if over goal
    remainingCaloriesSpan.style.color = remaining < 0 ? '#dc3545' : '#007bff';
}


/**
 * Initializes the app by loading data from Local Storage.
 */
function initializeApp() {
    const dailyGoal = getFromLocalStorage(GOAL_KEY, 0);
    const foodLog = getFromLocalStorage(FOOD_LOG_KEY, []);
    
    dailyGoalSpan.textContent = dailyGoal;
    renderLogAndSummary(foodLog, dailyGoal);
}


// --- Event Handlers ---

/**
 * Handles the calculation and saving of the daily calorie goal.
 * Calculation: BMR + Exercise Adjustment (Maintenance Goal).
 * Also calculates the time needed to reach the target weight and the Macro breakdown.
 */
function handleCalorieGoal(e) {
    e.preventDefault();

    // 1. Get Metrics
    const age = parseInt(document.getElementById('age').value);
    const height = parseInt(document.getElementById('height').value);
    const currentWeight = parseInt(document.getElementById('weight').value);
    const sex = document.getElementById('sex').value;

    const trainingTime = parseInt(document.getElementById('training-time').value);
    const trainingMultiplier = parseInt(document.getElementById('training-level').value); 

    // Goal Timeline Metrics
    const goalWeight = parseInt(document.getElementById('goal-weight').value);
    const weeklyLossRate = parseFloat(document.getElementById('weekly-loss-rate').value);

    // 2. Calculate BMR & Exercise Adjustment
    const bmr = calculateBMR(currentWeight, height, age, sex);
    const exerciseAdjustment = calculateExerciseAdjustment(trainingTime, trainingMultiplier);

    // 3. Calculate Final Daily Goal (Maintenance Only)
    // Goal = BMR + Exercise
    const finalDailyGoal = bmr + exerciseAdjustment; 
    
    // --- START MACRO CALCULATION ---
    
    // 4. Calculate Calorie Allocation
    // 50% Carbs, 25% Fat, 25% Protein
    const calCarbs = finalDailyGoal * 0.50;
    const calProtein = finalDailyGoal * 0.25;
    const calFat = finalDailyGoal * 0.25;
    
    // 5. Calculate Grams (Calories / Calorie per Gram)
    // Constants CAL_PER_GRAM_... are defined globally in script.js (4, 4, 9)
    const gramsCarbs = Math.round(calCarbs / CAL_PER_GRAM_CARBS);
    const gramsProtein = Math.round(calProtein / CAL_PER_GRAM_PROTEIN);
    const gramsFat = Math.round(calFat / CAL_PER_GRAM_FAT);

    // --- END MACRO CALCULATION ---

    // 6. Calculate Time Needed for Weight Loss Goal (WEEKS ONLY)
    let timeMessage = "";
    const weightDifference = currentWeight - goalWeight;

    if (weightDifference <= 0) {
        timeMessage = `Goal weight (${goalWeight} kg) is already reached or is a weight gain goal.`;
    } else {
        const totalTimeWeeks = Math.ceil(weightDifference / weeklyLossRate);
        timeMessage = `Time to reach Goal = **${totalTimeWeeks} weeks**`;
    }

    // 7. Update UI and Storage
    dailyGoalSpan.textContent = finalDailyGoal;
    timelineOutput.innerHTML = timeMessage;
    saveToLocalStorage(GOAL_KEY, finalDailyGoal);

    // Update Macro Display (Table Cells)
    targetProteinSpan.textContent = gramsProtein;
    targetCarbsSpan.textContent = gramsCarbs;
    targetFatSpan.textContent = gramsFat;

    // 8. Re-render summary
    const foodLog = getFromLocalStorage(FOOD_LOG_KEY, []);
    renderLogAndSummary(foodLog, finalDailyGoal);
    
    // 9. Provide Feedback (Alert)
    let alertMessage = `
        Maintenance Goal Calculated: ${finalDailyGoal} calories.
        (BMR: ${bmr} + Exercise: ${exerciseAdjustment})
        
        --- Macro Targets ---
        Protein: ${gramsProtein}g | Carbs: ${gramsCarbs}g | Fat: ${gramsFat}g
    `;
    alertMessage += `\n\n--- Goal Timeline ---\n${timeMessage.replace(/\*\*/g, '').replace(/\n/g, ' ')}`;
    
    alert(alertMessage);
}

/**
 * Handles adding a new food entry to the log.
 */
function handleFoodLog(e) {
    e.preventDefault();

    const name = document.getElementById('food-name').value.trim();
    const calories = parseInt(document.getElementById('food-calories').value);

    if (name && calories > 0) {
        const foodLog = getFromLocalStorage(FOOD_LOG_KEY, []);
        
        // Add new item to the log
        foodLog.push({ name, calories });

        // Update Storage
        saveToLocalStorage(FOOD_LOG_KEY, foodLog);
        
        // Update UI
        const dailyGoal = getFromLocalStorage(GOAL_KEY, 0);
        renderLogAndSummary(foodLog, dailyGoal);

        // Reset form inputs
        document.getElementById('food-name').value = '';
        document.getElementById('food-calories').value = '';
    } else {
        alert('Please enter a valid food name and calorie amount.');
    }
}

/**
 * Handles deleting a food item from the log.
 */
function handleDeleteFood(e) {
    if (e.target.classList.contains('delete-btn')) {
        const indexToDelete = parseInt(e.target.dataset.index);
        
        let foodLog = getFromLocalStorage(FOOD_LOG_KEY, []);
        
        // Remove the item at the specified index
        foodLog.splice(indexToDelete, 1);

        // Update Storage
        saveToLocalStorage(FOOD_LOG_KEY, foodLog);
        
        // Update UI
        const dailyGoal = getFromLocalStorage(GOAL_KEY, 0);
        renderLogAndSummary(foodLog, dailyGoal);
    }
}

/**
 * Handles resetting the food log for the day.
 */
function handleResetDay() {
    if (confirm("Are you sure you want to reset today's food log? This action cannot be undone.")) {
        saveToLocalStorage(FOOD_LOG_KEY, []);
        const dailyGoal = getFromLocalStorage(GOAL_KEY, 0);
        renderLogAndSummary([], dailyGoal);
    }
}


// --- Event Listeners and Initialization ---

calorieForm.addEventListener('submit', handleCalorieGoal);
foodForm.addEventListener('submit', handleFoodLog);
foodLogList.addEventListener('click', handleDeleteFood);
resetButton.addEventListener('click', handleResetDay);

// Run on page load
initializeApp();