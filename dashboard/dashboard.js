/*******************************
 * GLOBAL STATE
 *******************************/
let selectedDate = new Date();

function changeWeek(offset) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + offset);

    // Future Block: Don't allow navigating past the current actual week
    const now = new Date();
    // Normalize to the start of the week for comparison
    if (offset > 0 && newDate > now) return;

    selectedDate = newDate;
    updateWeekUI();
    renderHabits(); // Re-render the table with the new dates
}

function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

// Initial call in your DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    updateWeekUI();
});

function updateWeekUI() {
    const monday = getMonday(selectedDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // Format for display (e.g., Dec 22 - Dec 28)
    const options = { month: 'short', day: 'numeric' };
    const rangeText = `${monday.toLocaleDateString(undefined, options)} - ${sunday.toLocaleDateString(undefined, options)}`;
    
    document.getElementById("weekRangeDisplay").innerText = rangeText;

    // Disable Right Arrow if the viewing week is the current week
    const today = new Date();
    const currentMonday = getMonday(today);
    const isCurrentWeek = monday.getTime() === currentMonday.getTime();
    
    document.getElementById("nextWeekBtn").disabled = isCurrentWeek;
}


// Load Habit List
let habitList = JSON.parse(localStorage.getItem("myHabits")) || [
    "Wakeup 5:00 AM",
    "DSA Solving",
    "ML Algorithm"
];

// Load Progress Data
let progressData = JSON.parse(localStorage.getItem("progressData")) || {};

let myChart;
let circle, circumference;

/*******************************
 * DATE HELPERS
 *******************************/
function formatDate(date) {
    return date.toISOString().split("T")[0];
}

function getWeekDates(baseDate) {
    const dates = [];
    const tempDate = new Date(baseDate);
    const day = tempDate.getDay(); 
    // Adjust to Monday
    const diff = tempDate.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(tempDate.setDate(diff));

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(formatDate(d));
    }
    return dates;
}

/*******************************
 * DOM READY
 *******************************/
document.addEventListener("DOMContentLoaded", () => {
    checkMonthChange();
    const habitInput = document.getElementById("habitInput");
    const addHabitBtn = document.getElementById("addHabitBtn");
    if (typeof clearGhostData === "function") clearGhostData();
    // Initialize Progress Circle
    circle = document.getElementById("progressCircle");
    const radius = circle.r.baseVal.value;
    circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    // Initial UI Render
    refreshUI();
    checkNewWeek();

    // Event: Add Habit
    addHabitBtn.addEventListener("click", () => {
    const habit = habitInput.value.trim();
    if (!habit) return;

    habitList.push(habit);
    localStorage.setItem("myHabits", JSON.stringify(habitList));
    habitInput.value = "";
    refreshUI();

    // >>> ADD THIS LINE HERE TO PUSH TO MONGODB <<<
    syncToCloud(); 
});
});

// Central function to update all UI components
function refreshUI() {
    renderHabits();
    updateMetaInfo();
    updateDailyProgress();
    updateMonthlyRanking();
    updateGraph();
    updateStreakUI();
}

/*******************************
 * RENDER HABITS
 *******************************/
function renderHabits() {
    const tbody = document.getElementById("habitBody");
    tbody.innerHTML = "";
    const weekDates = getWeekDates(selectedDate);

    // Get Today's Date in YYYY-MM-DD format for comparison
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    habitList.forEach(habit => {
        const row = document.createElement("tr");
        let dotsHTML = "";
        
        weekDates.forEach(date => {
            const isActive = (progressData[date] && progressData[date][habit]) ? "active" : "";
            
            // 1. Check if the date is NOT today
            const isLocked = (date !== todayKey) ? "locked" : "";

            dotsHTML += `
                <td>
                    <span class="dot ${isActive} ${isLocked}" 
                          data-date="${date}" 
                          data-habit="${habit}" 
                          onclick="${isLocked ? '' : 'toggleHabit(this)'}">
                    </span>
                </td>`;
        });

        row.innerHTML = `
            <td class="habit-name swipe-container">
                <div class="swipe-wrapper">
                    <div class="swipe-front">${habit}</div>
                    <div class="swipe-back" onclick="deleteHabit('${habit}')">
                        ✖ Remove
                    </div>
                </div>
            </td>
            ${dotsHTML}
        `;
        tbody.appendChild(row);
        enableSwipe(row.querySelector(".swipe-wrapper"));
    });
}

/*******************************
 * TOGGLE HABIT
 *******************************/
function toggleHabit(habitName, dateKey) {
    // 1. Get today's date in YYYY-MM-DD format
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 2. The Lock Check
    if (dateKey !== todayKey) {
        // Optional: Show a nice message to the user
        alert("🔒 Access Locked: You can only update habits for today's date.");
        return; // Exit the function so no data is changed
    }

    // 3. Original Logic continues below...
    // if (!progressData[dateKey]) progressData[dateKey] = {};
    // progressData[dateKey][habitName] = !progressData[dateKey][habitName];
    // ... rest of your code
}

function toggleHabit(dot) {
    const dateKey = dot.dataset.date;
    const habit = dot.dataset.habit;

    if (!progressData[dateKey]) progressData[dateKey] = {};
    progressData[dateKey][habit] = !progressData[dateKey][habit];

    localStorage.setItem("progressData", JSON.stringify(progressData));
    
    // Immediate UI feedback
    dot.classList.toggle("active");
    updateDailyProgress();
    updateMonthlyRanking();
    updateGraph();
    updateStreakUI();
    syncToCloud();
}

/*******************************
 * DELETE HABIT
 *******************************/
function deleteHabit(habit) {
    if (!confirm(`Remove habit "${habit}"?`)) return;

    habitList = habitList.filter(h => h !== habit);
    localStorage.setItem("myHabits", JSON.stringify(habitList));

    Object.keys(progressData).forEach(date => {
        if (progressData[date]) delete progressData[date][habit];
    });

    localStorage.setItem("progressData", JSON.stringify(progressData));
    refreshUI();
}

/*******************************
 * DAILY PROGRESS (RING)
 *******************************/
function updateDailyProgress() {
    const today = formatDate(new Date());
    const totalHabits = habitList.length;
    const completedToday = progressData[today] 
        ? Object.values(progressData[today]).filter(Boolean).length 
        : 0;

    const percent = totalHabits ? (completedToday / totalHabits) * 100 : 0;
    const offset = circumference - (percent / 100) * circumference;

    circle.style.strokeDashoffset = offset;
    document.getElementById("progressPercent").innerText = `${Math.round(percent)}%`;
    document.getElementById("progressCount").innerText = `${completedToday}/${totalHabits}`;
}

/*******************************
 * STREAK LOGIC
 *******************************/
function calculateStreak() {
    const todayStr = formatDate(new Date());
    const entries = Object.keys(progressData)
        .filter(d => Object.values(progressData[d]).some(v => v === true))
        .sort();

    if (entries.length === 0) return { current: 0, max: 0 };

    // Max Streak Calculation
    let max = 0, temp = 0, lastDate = null;
    entries.forEach(d => {
        const cur = new Date(d);
        if (lastDate && (cur - lastDate) / 86400000 === 1) temp++;
        else temp = 1;
        if (temp > max) max = temp;
        lastDate = cur;
    });

    // Current Streak Calculation
    let current = 0;
    let checkDate = new Date();
    while (true) {
        const key = formatDate(checkDate);
        if (progressData[key] && Object.values(progressData[key]).some(v => v === true)) {
            current++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            // Allow streak to stay alive if today isn't finished yet but yesterday was
            if (key === todayStr) {
                checkDate.setDate(checkDate.getDate() - 1);
                continue;
            }
            break;
        }
    }

    return { current, max };
}

function updateStreakUI() {
    const streak = calculateStreak();
    document.getElementById("currentStreak").innerText = streak.current;
    document.getElementById("maxStreak").innerText = streak.max;
}

/*******************************
 * RANKING & META
 *******************************/
function getDaysInMonth(year, month) {
    // Setting day to 0 of the next month returns the last day of the desired month
    return new Date(year, month + 1, 0).getDate();
}
/*******************************
 * STANDARDIZED MONTHLY RANKING
 *******************************/
function updateMonthlyRanking() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dec

    // Requirement: Dynamic Month Length (28, 29, 30, or 31)
    const totalDaysInMonth = getDaysInMonth(currentYear, currentMonth);

    const scores = habitList.map(habit => {
        let completionsThisMonth = 0;

        // Requirement: Count every "checked" instance in current month data
        Object.keys(progressData).forEach(dateKey => {
            const dateObj = new Date(dateKey);
            
            // Validate the date belongs to the current month/year
            if (dateObj.getFullYear() === currentYear && 
                dateObj.getMonth() === currentMonth) {
                
                // If habit is marked true (completed)
                if (progressData[dateKey][habit] === true) {
                    completionsThisMonth++;
                }
            }
        });

        // Requirement: Standardized Formula
        // (Total Completions / Total Days in Month) * 100
        const percentage = (completionsThisMonth / totalDaysInMonth) * 100;

        return { 
            habit, 
            score: percentage.toFixed(1), // Keep 1 decimal for precision
            count: completionsThisMonth 
        };
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Update UI
    renderRankingTable(scores, totalDaysInMonth);
}

function renderRankingTable(scores, totalDaysInMonth) {
    const tbody = document.getElementById("rankingBody");
    if (!tbody) return;

    tbody.innerHTML = scores.map((h, i) => `
        <tr>
            <td>#${i + 1}</td>
            <td>${h.habit}</td>
            <td>
                <span class="badge">${h.score}%</span>
                <small style="display: block; color: #64748b; font-size: 0.7rem;">
                    ${h.count} / ${totalDaysInMonth} days
                </small>
            </td>
        </tr>
    `).join("");
}


function updateMetaInfo() {
    const d = new Date();
    document.getElementById("meta-info").innerHTML = `
        <span>Year: <b>${d.getFullYear()}</b></span>
        <span>Month: <b>${d.getMonth() + 1}</b></span>
        <span>Day: <b>${d.getDate()}</b></span>
    `;
}

/*******************************
 * CHART.JS GRAPH
 *******************************/
function updateGraph() {
    const canvas = document.getElementById("activityChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const year = viewingDate.getFullYear();
    const month = viewingDate.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    const now = new Date();
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    let sourceData;
    if (isCurrentMonth) {
        sourceData = progressData;
    } else {
        const history = JSON.parse(localStorage.getItem("habitHistory")) || {};
        sourceData = history[monthKey]?.data || {};
    }

    const dataPoints = labels.map(d => {
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (progressData[dateKey]) {
            return Object.values(progressData[dateKey]).filter(v => v === true).length;
        }

        const historyDayData = history[monthKey]?.data?.[dateKey] || {};
        return Object.values(historyDayData).filter(v => v === true).length || 0;
        return sourceData[dateKey] ? Object.values(sourceData[dateKey]).filter(v => v === true).length : 0;
    });

   

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                // The label here is used for the tooltip, but the legend box is hidden below
                label: "Completed", 
                data: dataPoints,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.1)",
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                // REMOVES THE BLACK BORDER/BOX (LEGEND)
                legend: {
                    display: false 
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    // Dynamic height based on your habit count
                    suggestedMax: habitList.length > 0 ? habitList.length : 5,
                    ticks: { 
                        stepSize: 1,
                        font: { size: 10 }
                    },
                    grid: {
                        drawBorder: false, // Removes the outer black line of the Y axis
                        color: "rgba(0, 0, 0, 0.05)"
                    }
                },
                x: {
                    grid: {
                        display: false // Keeps the X-axis area clean
                    },
                    ticks: {
                        font: { size: 9 },
                        maxRotation: 0,
                        autoSkip: false // Ensures every number (1-31) aligns with a tick
                    }
                }
            },
            layout: {
                padding: {
                    left: 1,
                    right: 15,
                    top: 10,
                    bottom: 45
                }
            }
        }
    });
}


function clearGhostData() {
    let storageChanged = false;
    
    Object.keys(progressData).forEach(dateKey => {
        const dayData = progressData[dateKey];
        
        // Remove any habits that are NOT true
        Object.keys(dayData).forEach(habit => {
            if (dayData[habit] !== true) {
                delete dayData[habit];
                storageChanged = true;
            }
        });

        // If the day is now empty, delete the date entry entirely
        if (Object.keys(dayData).length === 0) {
            delete progressData[dateKey];
            storageChanged = true;
        }
    });

    if (storageChanged) {
        localStorage.setItem("progressData", JSON.stringify(progressData));
    }
}

/*******************************
 * SWIPE & UTILS
 *******************************/
function enableSwipe(element) {
    let startX = 0;
    const handleStart = (e) => { startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX; };
    const handleEnd = (e) => {
        const endX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
        if (startX - endX > 50) element.classList.add("show-delete");
        else if (endX - startX > 50) element.classList.remove("show-delete");
    };
    element.addEventListener("touchstart", handleStart);
    element.addEventListener("touchend", handleEnd);
    element.addEventListener("mousedown", handleStart);
    element.addEventListener("mouseup", handleEnd);
}

function checkNewWeek() {
    const today = new Date();
    const monday = getWeekDates(today)[0];
    const storedMonday = localStorage.getItem("activeWeekMonday");
    if (storedMonday !== monday) localStorage.setItem("activeWeekMonday", monday);
}


function checkMonthChange() {
    const now = new Date();
    // Format: 2025-12
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const storedMonth = localStorage.getItem("activeMonthKey");

    if (!storedMonth) {
        localStorage.setItem("activeMonthKey", currentMonthKey);
        return;
    }

    // If the month in storage (2025-11) is different from now (2025-12)
    if (storedMonth !== currentMonthKey) {
        archiveMonthlyData(storedMonth);
        
        // 1. Clear current progress
        progressData = {}; 
        localStorage.setItem("progressData", JSON.stringify(progressData));
        
        // 2. IMPORTANT: Update the key so this IF block doesn't run again until January
        localStorage.setItem("activeMonthKey", currentMonthKey);
        
        console.log("Month transitioned successfully to " + currentMonthKey);
        location.reload(); // Reload once to clean the UI state
    }
}

function archiveMonthlyData(monthKey) {
    const archive = JSON.parse(localStorage.getItem("habitHistory")) || {};
    
    // Calculate final stats for the month before archiving
    const totalHabits = habitList.length;
    const daysInMonth = new Date(
        parseInt(monthKey.split('-')[0]), 
        parseInt(monthKey.split('-')[1]), 
        0
    ).getDate();
    
    // Store the data snapshot
    archive[monthKey] = {
        data: { ...progressData },
        habits: [...habitList],
        summary: calculateMonthSummary(progressData, habitList, daysInMonth)
    };

    localStorage.setItem("habitHistory", JSON.stringify(archive));
}

function calculateMonthSummary(data, habits, totalDays) {
    let totalCompletions = 0;
    Object.values(data).forEach(day => {
        totalCompletions += Object.values(day).filter(val => val === true).length;
    });
    
    const possibleCompletions = habits.length * totalDays;
    return {
        totalCompletions,
        successRate: possibleCompletions > 0 
            ? ((totalCompletions / possibleCompletions) * 100).toFixed(1) 
            : 0
    };
}


let viewingDate = new Date(); // Tracks the month currently displayed in the graph

function updateMonthDisplay() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    const displayElement = document.getElementById("currentMonthDisplay");
    if (displayElement) {
        displayElement.innerText = `${monthNames[viewingDate.getMonth()]} ${viewingDate.getFullYear()}`;
    }

    // Disable Right Arrow if it's the current month
    const now = new Date();
    const isCurrentMonth = viewingDate.getMonth() === now.getMonth() && 
                          viewingDate.getFullYear() === now.getFullYear();
    
    document.getElementById("nextMonthBtn").disabled = isCurrentMonth;
}

function prevMonth() {
    viewingDate.setMonth(viewingDate.getMonth() - 1);
    updateMonthDisplay();
    updateGraph(); // This will now need to fetch historical data
}

function nextMonth() {
    const now = new Date();
    // Prevent navigating into the future
    if (viewingDate < new Date(now.getFullYear(), now.getMonth(), 1)) {
        viewingDate.setMonth(viewingDate.getMonth() + 1);
        updateMonthDisplay();
        updateGraph();
    }
}

function displayUserHeader() {
    const userElement = document.getElementById("user-display");
    if (!userElement) return;

    // Fetch names from localStorage
    const firstName = localStorage.getItem("firstName");
    const lastName = localStorage.getItem("lastName");

    let formattedUsername = "";

    if (firstName && lastName) {
        // Format: First_Last
        formattedUsername = `${firstName.trim()}_${lastName.trim()}`;
    } else {
        // Fallback if data is missing
        formattedUsername = "Guest_User";
    }

    // Update the UI
    userElement.innerText = `User: ${formattedUsername}`;
}

// Call on load
document.addEventListener("DOMContentLoaded", () => {
    displayUserHeader();
    // ... your other existing init functions
});

let saveTimeout;

// 1. Initialize Notes on Page Load
document.addEventListener("DOMContentLoaded", () => {
    loadDailyNote();
    
    const noteArea = document.getElementById("dailyNoteInput");
    noteArea.addEventListener("input", () => {
        handleNoteInput();
    });
});

// 2. Fetch today's date key (matching your existing format)
function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 3. Load Note from LocalStorage
function loadDailyNote() {
    const dateKey = getTodayKey();
    const notesData = JSON.parse(localStorage.getItem("dailyNotes")) || {};
    const noteArea = document.getElementById("dailyNoteInput");
    
    noteArea.value = notesData[dateKey] || "";
    
    // Update the visual date label
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("notesDateLabel").innerText = new Date().toLocaleDateString(undefined, options);
}

// 4. Handle Typing with Debounce
function handleNoteInput() {
    const status = document.getElementById("saveStatus");
    status.innerText = "Saving...";
    
    // Clear the previous timer
    clearTimeout(saveTimeout);
    
    // Start a new timer for 500ms
    saveTimeout = setTimeout(() => {
        saveNote();
    }, 500);
}

// 5. Save to LocalStorage
function saveNote() {
    const dateKey = getTodayKey();
    const noteText = document.getElementById("dailyNoteInput").value;
    
    const notesData = JSON.parse(localStorage.getItem("dailyNotes")) || {};
    notesData[dateKey] = noteText;
    
    localStorage.setItem("dailyNotes", JSON.stringify(notesData));
    
    document.getElementById("saveStatus").innerText = "All changes saved";
    syncToCloud();
}

async function syncToCloud() {
    // 1. Get the email (Must be stored in LocalStorage during Login)
    let email = localStorage.getItem("userEmail");
    
    if (!email) {
        console.error("Sync Cancelled: No user email found in localStorage.");
        return;
    }

    // 2. Identify the sync icon/button to show progress
    const syncBtn = document.getElementById("syncIcon"); 
    if (syncBtn) syncBtn.classList.add("spinning");

    // 3. Package the Data exactly as the Python API expects
    const payload = {
        email: email,
        habits: JSON.parse(localStorage.getItem("myHabits")) || [],
        progressData: JSON.parse(localStorage.getItem("progressData")) || {},
        dailyNotes: JSON.parse(localStorage.getItem("dailyNotes")) || {},
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    try {
        // 4. Send to your Flask Backend
        const response = await fetch("http://127.0.0.1:5000/api/migrate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("Migration Successful: Habits stored in user_data collection.");
            if (syncBtn) {
                syncBtn.classList.remove("spinning");
                syncBtn.style.color = "#10b981"; // Green for success
                syncBtn.title = "All data synced to cloud";
            }
        } else {
            const errorData = await response.json();
            console.error("Server refused sync:", errorData.message);
        }
    } catch (err) {
        console.error("Network error - Is your Flask server running?", err);
    }
}