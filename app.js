// MTH101 CBT Mock Exam - Application Logic

// ============================================
// GLOBAL STATE
// ============================================

let currentUser = null;
let currentStage = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let flaggedQuestions = new Set();
let timer = null;
let timeRemaining = 0;
let questionsDatabase = null;

// Stage configuration
const STAGE_CONFIG = {
    1: {
        difficulty: 'easy',
        questions: 70,
        time: 40 * 60, // 40 minutes in seconds
        passPercentage: 71.42,
        passMarks: 50,
        title: 'Stage 1: Foundation Level'
    },
    2: {
        difficulty: 'medium',
        questions: 70,
        time: 30 * 60, // 30 minutes in seconds
        passPercentage: 64.29,
        passMarks: 45,
        title: 'Stage 2: Intermediate Level'
    },
    3: {
        difficulty: 'hard',
        questions: 70,
        time: 30 * 60, // 30 minutes in seconds
        passPercentage: 57.14,
        passMarks: 40,
        title: 'Stage 3: Advanced Level'
    }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Load questions database
    await loadQuestionsDatabase();
    
    // Load user session
    loadUserSession();
    
    // Load progress
    loadProgress();
});

// ============================================
// QUESTION DATABASE LOADING
// ============================================

async function loadQuestionsDatabase() {
    try {
        const response = await fetch('questions.json');
        questionsDatabase = await response.json();
        console.log('Questions loaded:', {
            easy: questionsDatabase.easy.length,
            medium: questionsDatabase.medium.length,
            hard: questionsDatabase.hard.length
        });
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Error loading questions database. Please refresh the page.');
    }
}

// ============================================
// USER MANAGEMENT
// ============================================

function login() {
    const name = document.getElementById('studentName').value.trim();
    const dept = document.getElementById('studentDept').value.trim();
    
    if (!name || !dept) {
        alert('Please enter both name and department');
        return;
    }
    
    // Track user with IP (simulated - in production, backend would handle this)
    currentUser = {
        name: name,
        department: dept,
        loginTime: new Date().toISOString(),
        ip: 'tracked' // In production, get from backend
    };
    
    // Save to localStorage
    localStorage.setItem('mth101User', JSON.stringify(currentUser));
    
    // Show stage selection
    showPage('stagePage');
    updateWelcomeInfo();
    updateStageCards();
}

function logout() {
    if (confirm('Are you sure you want to logout? Your progress is saved.')) {
        showPage('loginPage');
    }
}

function loadUserSession() {
    const savedUser = localStorage.getItem('mth101User');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showPage('stagePage');
        updateWelcomeInfo();
        updateStageCards();
    }
}

function updateWelcomeInfo() {
    if (currentUser) {
        document.getElementById('welcomeName').textContent = currentUser.name;
        document.getElementById('welcomeDept').textContent = currentUser.department;
    }
}

// ============================================
// PROGRESS MANAGEMENT
// ============================================

function saveProgress() {
    const progress = {
        stage1: getStageProgress(1),
        stage2: getStageProgress(2),
        stage3: getStageProgress(3)
    };
    
    localStorage.setItem(`mth101Progress_${currentUser.name}`, JSON.stringify(progress));
}

function loadProgress() {
    if (!currentUser) return;
    
    const saved = localStorage.getItem(`mth101Progress_${currentUser.name}`);
    if (saved) {
        const progress = JSON.parse(saved);
        // Update stage cards based on saved progress
        updateStageCardsFromProgress(progress);
    }
}

function getStageProgress(stageNum) {
    const key = `stage${stageNum}Result`;
    const saved = localStorage.getItem(`${currentUser.name}_${key}`);
    return saved ? JSON.parse(saved) : null;
}

function saveStageResult(stageNum, result) {
    const key = `stage${stageNum}Result`;
    localStorage.setItem(`${currentUser.name}_${key}`, JSON.stringify(result));
    saveProgress();
}

function updateStageCards() {
    // Update Stage 1
    const stage1Result = getStageProgress(1);
    if (stage1Result) {
        updateStageCard(1, stage1Result);
        // Unlock Stage 2 if passed
        if (stage1Result.passed) {
            unlockStage(2);
        }
    }
    
    // Update Stage 2
    const stage2Result = getStageProgress(2);
    if (stage2Result) {
        updateStageCard(2, stage2Result);
        // Unlock Stage 3 if passed
        if (stage2Result.passed) {
            unlockStage(3);
        }
    }
    
    // Update Stage 3
    const stage3Result = getStageProgress(3);
    if (stage3Result) {
        updateStageCard(3, stage3Result);
    }
}

function updateStageCardsFromProgress(progress) {
    if (progress.stage1) updateStageCard(1, progress.stage1);
    if (progress.stage2) updateStageCard(2, progress.stage2);
    if (progress.stage3) updateStageCard(3, progress.stage3);
    
    // Unlock stages based on progress
    if (progress.stage1 && progress.stage1.passed) unlockStage(2);
    if (progress.stage2 && progress.stage2.passed) unlockStage(3);
}

function updateStageCard(stageNum, result) {
    const scoreDiv = document.getElementById(`stage${stageNum}Score`);
    const statusDiv = document.getElementById(`stage${stageNum}Status`);
    
    if (result) {
        scoreDiv.innerHTML = `Last Score: ${result.correct}/${result.total} (${result.percentage}%)`;
        
        if (result.passed) {
            statusDiv.innerHTML = `<span class="badge badge-passed"><i class="fas fa-check"></i> Passed</span>`;
        } else {
            statusDiv.innerHTML = `<span class="badge badge-failed"><i class="fas fa-times"></i> Try Again</span>`;
        }
    }
}

function unlockStage(stageNum) {
    const card = document.getElementById(`stage${stageNum}Card`);
    const btn = document.getElementById(`stage${stageNum}Btn`);
    const status = document.getElementById(`stage${stageNum}Status`);
    
    card.classList.remove('locked');
    btn.disabled = false;
    
    if (!getStageProgress(stageNum)) {
        status.innerHTML = `<span class="badge badge-locked">Unlocked!</span>`;
    }
}

// ============================================
// EXAM FLOW
// ============================================

function startStage(stageNum) {
    currentStage = stageNum;
    const config = STAGE_CONFIG[stageNum];
    
    // Select random questions
    currentQuestions = selectRandomQuestions(config.difficulty, config.questions);
    
    // Reset state
    currentQuestionIndex = 0;
    userAnswers = {};
    flaggedQuestions = new Set();
    timeRemaining = config.time;
    
    // Show exam page
    showPage('examPage');
    
    // Update exam header
    document.getElementById('examStageTitle').textContent = config.title;
    
    // Start timer
    startTimer();
    
    // Load first question
    loadQuestion();
    
    // Build question grid
    buildQuestionGrid();
}

function selectRandomQuestions(difficulty, count) {
    const pool = questionsDatabase[difficulty];
    
    // Shuffle and select
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function loadQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    const config = STAGE_CONFIG[currentStage];
    
    // Update progress
    document.getElementById('examProgress').textContent = 
        `Question ${currentQuestionIndex + 1} of ${config.questions}`;
    
    // Update question number and topic
    document.getElementById('questionNumber').textContent = 
        `Question ${currentQuestionIndex + 1}`;
    document.getElementById('questionTopic').textContent = question.topic;
    
    // Update question text
    document.getElementById('questionText').textContent = question.question;
    
    // Update options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    Object.entries(question.options).forEach(([key, value]) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        
        const isSelected = userAnswers[currentQuestionIndex] === key;
        if (isSelected) optionDiv.classList.add('selected');
        
        optionDiv.innerHTML = `
            <input type="radio" 
                   name="currentAnswer" 
                   value="${key}" 
                   ${isSelected ? 'checked' : ''}
                   onchange="selectAnswer('${key}')">
            <span class="option-label">${key}.</span>
            <span class="option-text">${value}</span>
        `;
        
        optionDiv.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') {
                optionDiv.querySelector('input').checked = true;
                selectAnswer(key);
            }
        };
        
        optionsContainer.appendChild(optionDiv);
    });
    
    // Update navigation buttons
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    
    const nextBtn = document.getElementById('nextBtn');
    if (currentQuestionIndex === config.questions - 1) {
        nextBtn.innerHTML = '<i class="fas fa-flag-checkered"></i> Finish';
    } else {
        nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
    }
    
    // Update flag button
    updateFlagButton();
    
    // Update question grid
    updateQuestionGrid();
}

function selectAnswer(option) {
    userAnswers[currentQuestionIndex] = option;
    
    // Update UI
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Update grid
    updateQuestionGrid();
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

function nextQuestion() {
    const config = STAGE_CONFIG[currentStage];
    
    if (currentQuestionIndex < config.questions - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        // Last question - show submit confirmation
        submitExam();
    }
}

function flagQuestion() {
    if (flaggedQuestions.has(currentQuestionIndex)) {
        flaggedQuestions.delete(currentQuestionIndex);
    } else {
        flaggedQuestions.add(currentQuestionIndex);
    }
    
    updateFlagButton();
    updateQuestionGrid();
}

function updateFlagButton() {
    const flagBtn = document.getElementById('flagBtn');
    if (flaggedQuestions.has(currentQuestionIndex)) {
        flagBtn.innerHTML = '<i class="fas fa-flag"></i> Flagged';
        flagBtn.style.color = 'var(--warning-color)';
    } else {
        flagBtn.innerHTML = '<i class="far fa-flag"></i> Flag for Review';
        flagBtn.style.color = '';
    }
}

function buildQuestionGrid() {
    const gridContainer = document.getElementById('questionGrid');
    gridContainer.innerHTML = '';
    
    const config = STAGE_CONFIG[currentStage];
    
    for (let i = 0; i < config.questions; i++) {
        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item';
        gridItem.textContent = i + 1;
        gridItem.onclick = () => {
            currentQuestionIndex = i;
            loadQuestion();
        };
        
        gridContainer.appendChild(gridItem);
    }
    
    updateQuestionGrid();
}

function updateQuestionGrid() {
    const gridItems = document.querySelectorAll('.grid-item');
    
    gridItems.forEach((item, index) => {
        item.classList.remove('answered', 'flagged', 'current');
        
        if (index === currentQuestionIndex) {
            item.classList.add('current');
        }
        
        if (userAnswers[index]) {
            item.classList.add('answered');
        }
        
        if (flaggedQuestions.has(index)) {
            item.classList.add('flagged');
        }
    });
}

// ============================================
// TIMER MANAGEMENT
// ============================================

function startTimer() {
    updateTimerDisplay();
    
    timer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        // Warning at 5 minutes
        if (timeRemaining === 5 * 60) {
            document.getElementById('timer').classList.add('warning');
            alert('⚠️ 5 minutes remaining!');
        }
        
        // Time up
        if (timeRemaining <= 0) {
            clearInterval(timer);
            alert('⏰ Time is up! Your exam will be auto-submitted.');
            autoSubmitExam();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    document.getElementById('timerDisplay').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// ============================================
// EXAM SUBMISSION
// ============================================

function submitExam() {
    const config = STAGE_CONFIG[currentStage];
    const answered = Object.keys(userAnswers).length;
    const unanswered = config.questions - answered;
    
    if (unanswered > 0) {
        if (!confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) {
            return;
        }
    }
    
    if (!confirm('Are you sure you want to submit your exam?')) {
        return;
    }
    
    stopTimer();
    gradeExam();
}

function autoSubmitExam() {
    stopTimer();
    gradeExam();
}

function gradeExam() {
    const config = STAGE_CONFIG[currentStage];
    let correct = 0;
    let wrong = 0;
    const topicStats = {};
    
    // Grade each question
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === question.correct_answer;
        
        if (userAnswer) {
            if (isCorrect) {
                correct++;
            } else {
                wrong++;
            }
        }
        
        // Track topic performance
        if (!topicStats[question.topic]) {
            topicStats[question.topic] = { correct: 0, total: 0 };
        }
        topicStats[question.topic].total++;
        if (isCorrect) {
            topicStats[question.topic].correct++;
        }
    });
    
    const total = config.questions;
    const percentage = Math.round((correct / total) * 100);
    const passed = correct >= config.passMarks;
    
    // Save result
    const result = {
        stage: currentStage,
        correct,
        wrong,
        total,
        percentage,
        passed,
        topicStats,
        timestamp: new Date().toISOString()
    };
    
    saveStageResult(currentStage, result);
    
    // Show results
    showResults(result);
    
    // Check for victory (all 3 stages passed)
    checkVictory();
}

function showResults(result) {
    showPage('resultsPage');
    
    // Update student info
    document.getElementById('resultStudentInfo').textContent = 
        `${currentUser.name} - ${currentUser.department}`;
    
    // Update score circle
    document.getElementById('scorePercentage').textContent = result.percentage + '%';
    
    // Color based on pass/fail
    const scoreCircle = document.getElementById('scoreCircle');
    if (result.passed) {
        scoreCircle.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else {
        scoreCircle.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    }
    
    // Update breakdown
    document.getElementById('correctCount').textContent = result.correct;
    document.getElementById('wrongCount').textContent = result.wrong;
    
    // Update verdict
    const verdict = document.getElementById('verdict');
    const config = STAGE_CONFIG[currentStage];
    
    if (result.passed) {
        verdict.className = 'verdict pass';
        verdict.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            Congratulations! You Passed Stage ${currentStage}!<br>
            <small>You scored ${result.correct}/${result.total} (${result.percentage}%) - 
            Required: ${config.passMarks}/${result.total} (${config.passPercentage}%)</small>
        `;
    } else {
        verdict.className = 'verdict fail';
        verdict.innerHTML = `
            <i class="fas fa-times-circle"></i> 
            Not Passed - Keep Practicing!<br>
            <small>You scored ${result.correct}/${result.total} (${result.percentage}%) - 
            Required: ${config.passMarks}/${result.total} (${config.passPercentage}%)</small>
        `;
    }
    
    // Update topic performance
    const topicBreakdown = document.getElementById('topicBreakdown');
    topicBreakdown.innerHTML = '';
    
    Object.entries(result.topicStats).forEach(([topic, stats]) => {
        const percentage = Math.round((stats.correct / stats.total) * 100);
        
        const topicBar = document.createElement('div');
        topicBar.className = 'topic-bar';
        topicBar.innerHTML = `
            <div class="topic-name">
                <span>${topic}</span>
                <span>${stats.correct}/${stats.total} (${percentage}%)</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%">
                    ${percentage}%
                </div>
            </div>
        `;
        
        topicBreakdown.appendChild(topicBar);
    });
}

function checkVictory() {
    const stage1 = getStageProgress(1);
    const stage2 = getStageProgress(2);
    const stage3 = getStageProgress(3);
    
    if (stage1?.passed && stage2?.passed && stage3?.passed) {
        showVictory();
    }
}

function showVictory() {
    const modal = document.getElementById('victoryModal');
    modal.classList.add('active');
    
    document.getElementById('victoryName').textContent = currentUser.name;
    
    const stage1 = getStageProgress(1);
    const stage2 = getStageProgress(2);
    const stage3 = getStageProgress(3);
    
    document.getElementById('victoryStage1').textContent = stage1.percentage;
    document.getElementById('victoryStage2').textContent = stage2.percentage;
    document.getElementById('victoryStage3').textContent = stage3.percentage;
    
    // Confetti effect
    createConfetti();
}

function closeVictory() {
    document.getElementById('victoryModal').classList.remove('active');
}

function createConfetti() {
    // Simple confetti animation
    const confetti = document.querySelector('.confetti');
    confetti.innerHTML = '';
    
    for (let i = 0; i < 100; i++) {
        const piece = document.createElement('div');
        piece.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: ${['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1'][Math.floor(Math.random() * 4)]};
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation: fall ${2 + Math.random() * 3}s linear infinite;
            opacity: ${Math.random()};
        `;
        confetti.appendChild(piece);
    }
}

// Add confetti animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes fall {
        to {
            transform: translateY(100vh) rotate(360deg);
        }
    }
`;
document.head.appendChild(style);

// ============================================
// REVIEW ANSWERS
// ============================================

function reviewAnswers() {
    showPage('reviewPage');
    
    const reviewContent = document.getElementById('reviewContent');
    reviewContent.innerHTML = '';
    
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === question.correct_answer;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${isCorrect ? 'correct' : 'wrong'}`;
        
        let answerHTML = '';
        
        if (userAnswer) {
            answerHTML = `
                <div class="review-answer ${isCorrect ? 'correct-answer' : 'wrong-answer'}">
                    <span class="answer-label">Your Answer:</span>
                    ${userAnswer}. ${question.options[userAnswer]}
                    ${isCorrect ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>'}
                </div>
            `;
            
            if (!isCorrect) {
                answerHTML += `
                    <div class="review-answer correct-answer">
                        <span class="answer-label">Correct Answer:</span>
                        ${question.correct_answer}. ${question.options[question.correct_answer]}
                        <i class="fas fa-check"></i>
                    </div>
                `;
            }
        } else {
            answerHTML = `
                <div class="review-answer">
                    <span class="answer-label">Not Answered</span>
                </div>
                <div class="review-answer correct-answer">
                    <span class="answer-label">Correct Answer:</span>
                    ${question.correct_answer}. ${question.options[question.correct_answer]}
                </div>
            `;
        }
        
        reviewItem.innerHTML = `
            <div class="review-question">
                <strong>Question ${index + 1}:</strong> ${question.question}
            </div>
            ${answerHTML}
            <div class="ai-explanation">
                <h4><i class="fas fa-robot"></i> AI Explanation</h4>
                <p>${question.explanation || 'The correct answer is ' + question.correct_answer + '. ' + generateAIExplanation(question, isCorrect)}</p>
            </div>
        `;
        
        reviewContent.appendChild(reviewItem);
    });
}

function generateAIExplanation(question, wasCorrect) {
    // Simple AI explanation generator
    // In production, this would call an actual AI API
    
    if (wasCorrect) {
        return "Great job! You understood this concept correctly. " + (question.explanation || "Keep up the good work!");
    } else {
        return "Let's review this concept. " + (question.explanation || "The key is to understand the fundamental principle behind this question. Try reviewing the relevant topic in your textbook.");
    }
}

function backToResults() {
    const result = getStageProgress(currentStage);
    showResults(result);
}

function backToStages() {
    showPage('stagePage');
    updateStageCards();
}

// ============================================
// PAGE NAVIGATION
// ============================================

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    document.getElementById(pageId).classList.add('active');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Prevent accidental page refresh during exam
window.addEventListener('beforeunload', (e) => {
    if (document.getElementById('examPage').classList.contains('active')) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});

// Disable right-click during exam (optional security)
document.addEventListener('contextmenu', (e) => {
    if (document.getElementById('examPage').classList.contains('active')) {
        e.preventDefault();
    }
});

console.log('MTH101 CBT Mock Exam loaded successfully!');
