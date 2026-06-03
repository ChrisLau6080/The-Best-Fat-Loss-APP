// --- Global Elements and Storage Keys (Progress Page) ---
const weightLogForm = document.getElementById('weight-log-form');
const weightHistoryList = document.getElementById('weight-history');
const weightChartCanvas = document.getElementById('weightLineChart'); 
const photoWall = document.getElementById('photo-wall'); 
const noPhotoMessage = document.getElementById('no-photo-message'); 
const toggleMeasurementsBtn = document.getElementById('toggle-measurements-btn');
const measurementFields = document.getElementById('measurement-fields');

// --- Storage Keys ---
const WEIGHT_HISTORY_KEY = 'weightHistory';
const CAL_PER_GRAM_CARBS = 4; // Needed for advice calculation

// Global variable to hold the chart instance
let weightChartInstance = null; 

// --- Core Functions (Reused) ---

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

/**
 * Saves a value to Local Storage.
 * @param {string} key - The key to use in Local Storage.
 * @param {*} value - The value to store.
 */
function saveToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// --- UI and State Management ---

/**
 * Renders the weight history list, including measurements.
 */
function renderWeightHistory(history) {
    weightHistoryList.innerHTML = '';
    
    // Sort history by date to find the correct original index for deletion later
    const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Display in reverse order (most recent first)
    [...sortedHistory].reverse().forEach((log) => {
        
        // Find the index of the log entry in the *sorted* array
        const indexToDelete = sortedHistory.findIndex(item => 
            item.date === log.date && item.weight === log.weight
        );
        
        const li = document.createElement('li');
        // Format date as DD/MM/YYYY
        const date = new Date(log.date).toLocaleDateString('en-GB'); 
        
        let measurementDetails = '';
        if (log.bust || log.waist || log.hips) {
            measurementDetails = `
                (B:${log.bust || '-'} | W:${log.waist || '-'} | H:${log.hips || '-'} cm)
            `;
        }

        li.innerHTML = `
            <span>
                **${date}:** **${log.weight} kg** ${measurementDetails}
            </span>
            <button class="delete-weight-btn" data-index="${indexToDelete}">[x]</button>
        `;
        weightHistoryList.appendChild(li);
    });
}

/**
 * Renders the photo wall using saved photo notes.
 */
function renderPhotoWall(history) {
    photoWall.innerHTML = '';
    let hasPhotos = false;

    // Filter logs that have a photo note and sort them chronologically
    const photoLogs = history
        .filter(log => log.photoNote)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (photoLogs.length > 0) {
        hasPhotos = true;
        photoLogs.forEach(log => {
            const div = document.createElement('div');
            div.className = 'photo-card';
            
            const date = new Date(log.date).toLocaleDateString('en-GB'); 

            let imageHtml = '';
            // Simple check: if it looks like a URL, treat it as such; otherwise, just show text.
            if (log.photoNote.startsWith('http')) {
                imageHtml = `<img src="${log.photoNote}" alt="Progress Photo ${date}">`;
            } else {
                imageHtml = `<p class="photo-note-text">${log.photoNote}</p>`;
            }

            div.innerHTML = `
                <p class="photo-date">${date}</p>
                ${imageHtml}
            `;
            photoWall.appendChild(div);
        });
    }

    if (!hasPhotos) {
        photoWall.appendChild(noPhotoMessage);
    }
}

/**
 * Renders the weight history line chart.
 * @param {Array<Object>} history - The weight history array.
 */
function renderWeightChart(history) {
    if (weightChartInstance) {
        weightChartInstance.destroy(); // Destroy previous chart instance if it exists
    }

    // Sort history chronologically for correct chart plotting
    const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Extract labels (dates) and data (weights)
    const labels = sortedHistory.map(log => new Date(log.date).toLocaleDateString('en-GB'));
    const data = sortedHistory.map(log => log.weight);
    
    const ctx = weightChartCanvas.getContext('2d');

    weightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weight (kg)',
                data: data,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1, 
                fill: false,
                pointRadius: 5 
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Weight (kg)'
                    },
                    beginAtZero: false 
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Weight Progress Over Time'
                }
            }
        }
    });
}


/**
 * Checks weekly progress against the desired loss rate and advises user.
 */
function checkWeeklyProgress(history) {
    // Requires at least 2 logs for a comparison
    if (history.length < 2) return;

    // Use the *sorted* history to check progress chronologically
    const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Get the two most recent logs
    const lastLog = sortedHistory[sortedHistory.length - 1];
    const secondLastLog = sortedHistory[sortedHistory.length - 2];
    
    // Check if the two logs are roughly one week apart
    const dayDifference = (new Date(lastLog.date) - new Date(secondLastLog.date)) / (1000 * 60 * 60 * 24);

    if (dayDifference < 5 || dayDifference > 9) {
        return; // Not a good time span for a weekly check
    }

    // Get the target loss rate (kg/week)
    const weeklyLossRate = parseFloat(localStorage.getItem('lastWeeklyLossRate')) || 0.5;

    // Calculate actual loss
    const actualLoss = secondLastLog.weight - lastLog.weight;

    // Define acceptable range (e.g., target +/- 0.1 kg)
    const lowerBound = weeklyLossRate - 0.1;
    const upperBound = weeklyLossRate + 0.1;

    let advice = '';

    if (actualLoss < lowerBound) {
        const carbCutGrams = Math.floor(Math.random() * (20 - 15 + 1)) + 15;
        advice = `
            ⚠️ **PROGRESS CHECK ALERT!** ⚠️
            Your actual loss this week (${actualLoss.toFixed(2)} kg) is lower than your target (${weeklyLossRate} kg/week).
            
            **Advice:** Maintain your current Protein and Fat targets, and **reduce your daily Carbohydrate intake by ${carbCutGrams}g**.
        `;
    } else if (actualLoss > upperBound) {
        advice = `
            ✅ **GREAT PROGRESS!** ✅
            Your actual loss this week (${actualLoss.toFixed(2)} kg) exceeds your target (${weeklyLossRate} kg/week)!
            
            **Advice:** Continue following your current macro targets (Protein, Carbs, Fat) as the plan is working effectively.
        `;
    } else {
        advice = `
            👍 **ON TRACK!** 👍
            Your actual loss this week (${actualLoss.toFixed(2)} kg) is within the optimal range of your target (${weeklyLossRate} kg/week).
            
            **Advice:** Keep following your current macro targets (Protein, Carbs, Fat). Consistency is key!
        `;
    }

    alert(advice.trim());
}

/**
 * Handles logging the current weight, measurements, and photo notes.
 */
function handleWeightLog(e) {
    e.preventDefault();

    const loggedWeight = parseFloat(document.getElementById('log-weight').value);
    // NEW MEASUREMENT/PHOTO LOGGING
    const loggedBust = parseFloat(document.getElementById('log-bust').value) || undefined;
    const loggedWaist = parseFloat(document.getElementById('log-waist').value) || undefined;
    const loggedHips = parseFloat(document.getElementById('log-hips').value) || undefined;
    const photoNote = document.getElementById('log-photo-note').value.trim() || undefined;
    
    if (loggedWeight > 0) {
        const weightHistory = getFromLocalStorage(WEIGHT_HISTORY_KEY, []);
        
        // Add new log entry with all details
        weightHistory.push({ 
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            weight: loggedWeight,
            bust: loggedBust,
            waist: loggedWaist,
            hips: loggedHips,
            photoNote: photoNote
        });

        // Update Storage
        saveToLocalStorage(WEIGHT_HISTORY_KEY, weightHistory);
        
        // Update UI
        renderWeightHistory(weightHistory);
        renderWeightChart(weightHistory);
        renderPhotoWall(weightHistory); // NEW RENDERING

        // Check for weekly progress
        checkWeeklyProgress(weightHistory);

        // Reset form inputs
        document.getElementById('log-weight').value = '';
        document.getElementById('log-bust').value = '';
        document.getElementById('log-waist').value = '';
        document.getElementById('log-hips').value = '';
        document.getElementById('log-photo-note').value = '';
        
    } else {
        alert('Please enter a valid weight amount.');
    }
}

/**
 * Handles deleting a weight entry from the log.
 */
function handleDeleteWeight(e) {
    if (e.target.classList.contains('delete-weight-btn')) {
        const indexToDelete = parseInt(e.target.dataset.index);
        
        let weightHistory = getFromLocalStorage(WEIGHT_HISTORY_KEY, []);
        
        if (confirm("Are you sure you want to delete this progress entry (weight, measurements, photo note)?")) {
            // NOTE: We rely on the sorted history to find the item to delete
            const sortedHistory = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Remove the item at the specified index from the sorted list
            sortedHistory.splice(indexToDelete, 1);
            
            // Update Storage with the modified list
            saveToLocalStorage(WEIGHT_HISTORY_KEY, sortedHistory);
            
            // Update UI
            renderWeightHistory(sortedHistory);
            renderWeightChart(sortedHistory);
            renderPhotoWall(sortedHistory); // Re-render photo wall
            
            alert("Progress entry deleted successfully.");
        }
    }
}

/**
 * Initializes the progress page by loading weight history.
 */
function initializeProgressApp() {
    const weightHistory = getFromLocalStorage(WEIGHT_HISTORY_KEY, []);
    renderWeightHistory(weightHistory);
    renderWeightChart(weightHistory);
    renderPhotoWall(weightHistory); // NEW INITIALIZATION
}

/**
 * Toggles the visibility of the measurement input fields.
 */
function handleToggleMeasurements() {
    const isHidden = measurementFields.style.display === 'none';
    
    if (isHidden) {
        measurementFields.style.display = 'block';
        toggleMeasurementsBtn.textContent = '➖ Hide Measurements';
        toggleMeasurementsBtn.style.backgroundColor = '#dc3545'; // Change color when open
    } else {
        measurementFields.style.display = 'none';
        toggleMeasurementsBtn.textContent = '➕ Add Measurements';
        toggleMeasurementsBtn.style.backgroundColor = '#6c757d'; // Default color
    }
}


// --- Event Listeners and Initialization ---
weightLogForm.addEventListener('submit', handleWeightLog);
weightHistoryList.addEventListener('click', handleDeleteWeight);
toggleMeasurementsBtn.addEventListener('click', handleToggleMeasurements);

// Run on page load
initializeProgressApp();