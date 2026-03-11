// ========================================
// 게임 로직 (game.js)
// ========================================

let pendingScenarioId = null;

function startGame(scenarioId) {
    console.log('startGame 호출:', scenarioId);
    console.log('scenarioId 타입:', typeof scenarioId);
    console.log('scenarios 객체 키들:', Object.keys(scenarios));

    // 시나리오 ID 저장
    pendingScenarioId = scenarioId;
    console.log('pendingScenarioId 저장:', pendingScenarioId);

    // 확인 팝업 표시
    const popup = document.getElementById('gameStartPopup');
    console.log('팝업 엘리먼트:', popup);

    if (popup) {
        popup.classList.add('active');
        console.log('팝업 표시됨');
    } else {
        console.error('팝업을 찾을 수 없습니다');
    }
}

function closeGameStartPopup() {
    document.getElementById('gameStartPopup').classList.remove('active');
    pendingScenarioId = null;
}

async function confirmGameStart() {
    console.log('confirmGameStart 호출');
    console.log('pendingScenarioId (닫기 전):', pendingScenarioId);

    // pendingScenarioId를 먼저 저장 (팝업 닫으면 null이 되므로)
    const scenarioId = pendingScenarioId;
    console.log('scenarioId 저장:', scenarioId);

    // 팝업 닫기
    closeGameStartPopup();

    if (!scenarioId) {
        console.error('시나리오 ID가 없습니다');
        alert('시나리오를 선택해주세요.');
        return;
    }

    // 티켓 확인
    const currentTickets = parseInt(document.getElementById('ticketCount').textContent);
    if (currentTickets <= 0) {
        alert('티켓이 부족합니다. 광고를 시청하거나 티켓을 구매해주세요.');
        return;
    }

    // API를 통한 게임 시작 및 티켓 차감
    const result = await API.startGame(scenarioId);
    if (!result.success) {
        alert(result.message || '게임을 시작할 수 없습니다.');
        return;
    }

    // 티켓 반영 (서버에서 차감했으면 result.ticketsLeft, 아니면 로컬 차감)
    if (typeof result.ticketsLeft === 'number') {
        updateUserStats({ tickets: result.ticketsLeft });
    } else {
        updateUserStats({ tickets: currentTickets - 1 });
    }

    currentGameId = result.gameId;

    // scenarios 객체 확인
    console.log('scenarios 객체:', scenarios);
    console.log('scenarios[scenarioId]:', scenarios[scenarioId]);

    var scenarioSource = (typeof window !== 'undefined' && window.__scenarios) ? window.__scenarios : scenarios;
    currentScenario = scenarioSource[scenarioId];
    currentScenarioId = scenarioId;

    if (!currentScenario) {
        console.error('시나리오를 찾을 수 없습니다:', scenarioId);
        alert('시나리오를 찾을 수 없습니다.');
        return;
    }

    currentQuestion = 0;
    userAnswers = [];
    correctCount = 0;

    console.log('currentScenario 설정 완료:', currentScenario);

    document.getElementById('homeScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');

    console.log('게임 화면으로 전환');

    // 포커스 해제로 버튼 오버 상태가 선택지로 넘어가지 않도록
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }

    // 하단 메뉴 숨기기 및 메인 콘텐츠 패딩 제거
    document.querySelector('.bottom-nav').classList.add('hidden');
    document.querySelector('.main-content').classList.add('no-padding');

    // 플레이 타이머 시작
    startGameTimer();

    loadQuestion();
}

// 게임 플레이 타이머
function startGameTimer() {
    console.log('타이머 시작');
    gameTimeLeft = 600; // 10분 초기화
    const timerElement = document.getElementById('gameTimer');
    console.log('타이머 엘리먼트:', timerElement);

    if (!timerElement) {
        console.error('타이머 엘리먼트를 찾을 수 없습니다');
        return;
    }

    timerElement.classList.add('active');

    // 기존 인터벌 정리
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
    }

    const updateGameTimer = () => {
        console.log('타이머 업데이트:', gameTimeLeft);

        if (gameTimeLeft <= 0) {
            clearInterval(gameTimerInterval);
            timerElement.textContent = '시간 종료';
            // 시간 종료 팝업 표시
            showTimeoutPopup();
            return;
        }

        const minutes = Math.floor(gameTimeLeft / 60);
        const seconds = gameTimeLeft % 60;
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        gameTimeLeft--;
    };

    updateGameTimer();
    gameTimerInterval = setInterval(updateGameTimer, 1000);
    console.log('타이머 인터벌 설정됨:', gameTimerInterval);
}

// 시간 종료 팝업 표시
function showTimeoutPopup() {
    document.getElementById('timeoutPopup').classList.add('active');
}

// 시간 종료 팝업 닫기 및 메인 화면으로
function closeTimeoutPopup() {
    document.getElementById('timeoutPopup').classList.remove('active');
    backToHome();
}

// 게임 타이머 정지
function stopGameTimer() {
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
    }
    document.getElementById('gameTimer').classList.remove('active');
}

// ========================================
// 문제 로드 및 선택
// ========================================

function loadQuestion() {
    console.log('loadQuestion 호출');
    console.log('currentScenario:', currentScenario);
    console.log('currentQuestion:', currentQuestion);

    if (!currentScenario || !currentScenario.questions) {
        console.error('currentScenario가 정의되지 않았습니다');
        return;
    }

    const question = currentScenario.questions[currentQuestion];
    console.log('질문:', question);

    // 배너 이미지 설정 (애니메이션 영역 배경으로)
    const animationArea = document.querySelector('.animation-area');
    if (animationArea) {
        animationArea.style.backgroundImage = `url('${currentScenario.bannerImage}')`;
        animationArea.style.backgroundSize = 'cover';
        animationArea.style.backgroundPosition = 'center';
        console.log('배너 이미지 설정:', currentScenario.bannerImage);
    } else {
        console.error('animation-area를 찾을 수 없습니다');
    }

    // 애니메이션 이미지 숨김 (이모지 아이콘 제거)
    const animImage = document.getElementById('animationImage');
    if (animImage) {
        animImage.style.display = 'none';
    }

    // 컨텍스트 오버레이 표시 (첫 질문에만)
    const contextOverlay = document.getElementById('contextOverlay');
    if (currentQuestion === 0) {
        document.getElementById('contextTitle').textContent = currentScenario.contextTitle;
        document.getElementById('contextSubtitle').textContent = currentScenario.contextSubtitle;
        if (contextOverlay) {
            contextOverlay.style.display = 'block';
        }
    } else {
        if (contextOverlay) {
            contextOverlay.style.display = 'none';
        }
    }

    // 진행바 업데이트
    const progress = ((currentQuestion + 1) / currentScenario.questions.length) * 100;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }

    // 질문 표시
    const questionNumber = document.getElementById('questionNumber');
    const questionText = document.getElementById('questionText');

    if (questionNumber) {
        questionNumber.textContent = `질문 ${currentQuestion + 1}/${currentScenario.questions.length}`;
        console.log('질문 번호 설정:', questionNumber.textContent);
    }

    if (questionText) {
        questionText.textContent = question.q;
        console.log('질문 텍스트 설정:', question.q);
    }

    // 선택지 표시 (항상 기본 상태로 시작)
    const optionsContainer = document.getElementById('optionsContainer');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';

        question.options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.textContent = option;
            onPointerTap(optionDiv, () => selectOption(index, optionDiv));
            optionsContainer.appendChild(optionDiv);
        });

        // 남아 있을 수 있는 오버/선택 상태 제거 (포인터 이벤트 재계산)
        optionsContainer.style.pointerEvents = 'none';
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                optionsContainer.style.pointerEvents = '';
            });
        });

        console.log('선택지 생성 완료:', question.options.length + '개');
    } else {
        console.error('optionsContainer를 찾을 수 없습니다');
    }

    // 다음 버튼 비활성화
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.classList.remove('active');

        // 마지막 문제일 때 버튼 텍스트 변경
        if (currentQuestion === currentScenario.questions.length - 1) {
            nextBtn.textContent = '선택 완료';
        } else {
            nextBtn.textContent = '다음 질문';
        }
    }
}

async function selectOption(index, element) {
    // 이전 선택 제거
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });

    // 현재 선택 표시
    element.classList.add('selected');
    userAnswers[currentQuestion] = index;

    // 서버에 답변 제출 (비동기)
    await API.submitAnswer(currentGameId, currentQuestion, index);

    // 다음 버튼 활성화
    document.getElementById('nextBtn').classList.add('active');
}

async function nextQuestion() {
    if (userAnswers[currentQuestion] === undefined) return;

    // 정답 체크 (임시 - 실제로는 서버에서 처리)
    const question = currentScenario.questions[currentQuestion];
    if (userAnswers[currentQuestion] === question.correct) {
        correctCount++;
    }

    currentQuestion++;

    if (currentQuestion < currentScenario.questions.length) {
        loadQuestion();
    } else {
        await showResult();
    }
}

// ========================================
// 결과 화면
// ========================================

async function showResult() {
    document.getElementById('gameScreen').classList.remove('active');

    // 게임 타이머 정지
    stopGameTimer();

    // 서버에서 결과 받기
    const result = await API.completeGame(currentGameId, userAnswers);

    if (result) {
        if (result.status === 'pending') {
            // 이벤트 진행 중
            showPendingResult(result);
        } else {
            // 이벤트 종료 후
            showFinalResult(result);
        }

        document.getElementById('resultScreen').classList.add('active');
    }
}

// 이벤트 진행 중 결과 화면
function showPendingResult(result) {
    // 배너 이미지 설정
    const bannerImg = document.getElementById('resultBannerImg');
    bannerImg.style.backgroundImage = `url('${currentScenario.bannerImage}')`;

    document.getElementById('resultEmoji').style.display = 'none';
    document.getElementById('resultTitle').textContent = '사람들은 당신과 같은 선택을 했을까요?';
    document.getElementById('resultSubtitle').innerHTML = '이 이벤트는 아직 진행 중입니다<br>결과는 이벤트 종료 후 공개됩니다';

    document.getElementById('totalParticipants').textContent = result.totalParticipants.toLocaleString();

    // 이벤트 종료 카운트다운
    let timeLeft = result.eventTimeLeft;
    const updateEventTimer = () => {
        if (timeLeft <= 0) {
            document.getElementById('eventTimeLeft').textContent = '곧 공개됩니다';
            return;
        }

        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;

        document.getElementById('eventTimeLeft').textContent =
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        timeLeft--;
    };

    updateEventTimer();
    setInterval(updateEventTimer, 1000);

    // 진행 중 콘텐츠 표시
    document.getElementById('pendingContent').style.display = 'block';
    document.getElementById('winnerContent').style.display = 'none';
    document.getElementById('loserContent').style.display = 'none';
    document.getElementById('resultScreen').classList.remove('show-loser');
    document.getElementById('pendingMessage').style.display = 'block';
}

// 이벤트 종료 후 최종 결과 화면
async function showFinalResult(result) {
    document.getElementById('pendingMessage').style.display = 'none';

    // 도전 횟수 증가
    attemptCount++;

    // 도전 시간 생성
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const attemptInfo = `도전 #${attemptCount} · ${timeString}`;

    // 배너 이미지 설정
    const bannerImg = document.getElementById('resultBannerImg');
    bannerImg.style.backgroundImage = `url('${currentScenario.bannerImage}')`;

    if (result.isWinner) {
        // 승자
        document.getElementById('resultEmoji').style.display = 'none';
        document.getElementById('resultTitle').textContent = '🎊 축하합니다! 당신은 Human Experiment 우승자입니다 🎊';
        document.getElementById('resultSubtitle').textContent = '전 세계 사람들의 판단 흐름을 완벽하게 읽어냈어요! 당신은 트렌드의 중심에 있습니다.';

        // 도전 정보 표시
        document.getElementById('attemptInfoWin').textContent = attemptInfo;

        // 1/n 상금 계산 (총 상금 풀을 승자 수로 나눔)
        const totalPool = 1000; // 총 상금 풀 (예시)
        const rewardPerWinner = (totalPool / result.totalWinners).toFixed(2);

        // 리워드 포인트 계산 (문제당 10점)
        const earnedPoints = result.correctCount * 10;

        document.getElementById('rewardAmount').textContent = rewardPerWinner + ' USDT';
        document.getElementById('totalWinners').textContent = result.totalWinners.toLocaleString();
        document.getElementById('earnedPointsWin').textContent = earnedPoints;

        // 문제별 결과 표시 (전부 정답이므로 간단하게)
        const resultsHtml = result.questionResults.map((qr, idx) => `
            <div class="question-result">
                <span class="question-result-icon">✅</span>
                <div class="question-result-content">
                    <div class="question-result-title">Q${qr.questionNumber}. ${qr.question}</div>
                    <div class="question-result-answer">${qr.userAnswer}</div>
                </div>
                <span class="question-result-percent">${qr.userPercentage}%</span>
            </div>
        `).join('');

        document.getElementById('questionResults').innerHTML = resultsHtml;

        document.getElementById('pendingContent').style.display = 'none';
        document.getElementById('winnerContent').style.display = 'block';
        document.getElementById('loserContent').style.display = 'none';
        document.getElementById('resultScreen').classList.remove('show-loser');

        saveTrendMyResult(true, result.correctCount, result.totalQuestions);

        // 최종 승자 리스트 표시
        fillWinnerList('winnerListWin', result.winners || []);

        // 유저 스탯 업데이트
        const currentCash = parseInt(document.getElementById('cashCount').textContent);
        const currentPoints = parseInt(document.getElementById('rewardPoints').textContent);
        updateUserStats({
            cash: currentCash + Math.floor(parseFloat(rewardPerWinner)),
            rewardPoints: currentPoints + earnedPoints
        });
    } else {
        // 패배 (긍정적 메시지)
        // 유저 닉네임 가져오기 (임시로 'Player'사용, 실제로는 서버에서)
        const userName = 'Player'; // 실제로는 API에서 받아올 유저 닉네임

        // 도전 정보 표시
        document.getElementById('attemptInfoLose').textContent = attemptInfo;

        document.getElementById('resultEmoji').style.display = 'none';
        document.getElementById('resultTitle').textContent = `${userName}님은 독특한 시각을 가진 분이네요! 🎨`;
        document.getElementById('resultSubtitle').textContent = '대중과 다른 선택을 하셨어요. 하지만 걱정 마세요! 대부분의 사람들도 이 지점에서 의견이 갈렸답니다.';

        // 리워드 포인트 계산 (문제당 10점)
        const earnedPoints = result.correctCount * 10;

        document.getElementById('correctAnswersLose').textContent = `${result.correctCount} / ${result.totalQuestions}`;
        document.getElementById('earnedPointsLose').textContent = earnedPoints;

        // 문제별 결과 표시
        const resultsHtml = result.questionResults.map((qr, idx) => `
            <div class="question-result">
                <span class="question-result-icon">${qr.isCorrect ? '✅' : '❌'}</span>
                <div class="question-result-content">
                    <div class="question-result-title">Q${qr.questionNumber}. ${qr.question}</div>
                    <div class="question-result-answer">${qr.isCorrect ? qr.userAnswer : qr.correctAnswer} (${qr.isCorrect ? qr.userPercentage : qr.correctPercentage}%)</div>
                </div>
                ${!qr.isCorrect ? `<span class="question-result-percent">내 선택: ${qr.userPercentage}%</span>` : ''}
            </div>
        `).join('');

        document.getElementById('questionResultsLose').innerHTML = resultsHtml;

        saveTrendMyResult(false, result.correctCount, result.totalQuestions);

        // 최종 승자 리스트 표시
        fillWinnerList('winnerListLose', result.winners || []);

        document.getElementById('pendingContent').style.display = 'none';
        document.getElementById('winnerContent').style.display = 'none';
        document.getElementById('loserContent').style.display = 'block';
        document.getElementById('resultScreen').classList.add('show-loser');

        // 유저 스탯 업데이트 (리워드 포인트만)
        const currentPoints = parseInt(document.getElementById('rewardPoints').textContent);
        updateUserStats({
            rewardPoints: currentPoints + earnedPoints
        });
    }
}

// 트렌드 보드 "내 결과" 저장 (로컬)
function saveTrendMyResult(isWinner, correctCount, totalQuestions) {
    if (!currentScenarioId) return;
    try {
        const saved = JSON.parse(localStorage.getItem('ph_trend_my_results') || '{}');
        saved[currentScenarioId] = { isWinner, correctCount, totalQuestions };
        localStorage.setItem('ph_trend_my_results', JSON.stringify(saved));
    } catch (e) { console.warn('saveTrendMyResult', e); }
}

// ========================================
// 액션 버튼 함수들
// ========================================

function retryGame() {
    // 티켓 차감
    const currentTickets = parseInt(document.getElementById('ticketCount').textContent);
    if (currentTickets > 0) {
        updateUserStats({ tickets: currentTickets - 1 });

        // 게임 상태 초기화
        currentQuestion = 0;
        userAnswers = [];
        correctCount = 0;

        // 결과 화면 숨기고 게임 화면 표시
        document.getElementById('resultScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');

        // 타이머 재시작
        startGameTimer();

        // 첫 문제 로드
        loadQuestion();
    } else {
        alert('티켓이 부족합니다. 광고를 시청하거나 티켓을 구매해주세요.');
    }
}

function notifyNextEvent() {
    document.getElementById('notificationPopup').classList.add('active');
}

function closeNotificationPopup() {
    document.getElementById('notificationPopup').classList.remove('active');
}

async function confirmNotification() {
    // 알림 권한 확인
    if (!("Notification" in window)) {
        alert("이 브라우저는 알림을 지원하지 않습니다.");
        closeNotificationPopup();
        return;
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            const settings = typeof getSettings === 'function' ? getSettings() : {};
            await API.setNotification(true, {
                notificationStartTime: settings.notificationStartTime || '09:00',
                notificationEndTime: settings.notificationEndTime || '21:00'
            });
            alert("✅ 알림이 설정되었습니다!\n설정한 시간대(" + (settings.notificationStartTime || '09:00') + "~" + (settings.notificationEndTime || '21:00') + ")에만 알림을 보내드립니다.");
            closeNotificationPopup();
        } else if (permission === "denied") {
            alert("❌ 알림 권한이 거부되었습니다.\n\n브라우저 설정에서 알림 권한을 허용해주세요.");
            closeNotificationPopup();
        } else {
            closeNotificationPopup();
        }
    } catch (error) {
        console.error("알림 권한 요청 실패:", error);
        alert("알림 설정 중 오류가 발생했습니다.");
        closeNotificationPopup();
    }
}

// ========================================
// 티켓 구매
// ========================================

let pendingShopTicketAmount = 0;
let pendingShopPaymentMethod = 'line'; // 'line' | 'kaia'

// 일본 서비스: 엔화(JPY) 기준. LINE Pay=JPY, Kaia=USDT. 환율은 추후 서버/설정으로 교체 가능
const TICKET_PRICE_USDT = 0.1;           // 티켓 1개당 USDT
const USDT_TO_JPY = 150;                 // 1 USDT = N円 (표시·LINE Pay 결제용)

function formatPriceJpyUsdt(amount) {
    const priceUsdt = amount * TICKET_PRICE_USDT;
    const priceJpy = Math.round(priceUsdt * USDT_TO_JPY);
    return '¥' + priceJpy.toLocaleString('ja-JP') + ' / ' + priceUsdt.toFixed(1) + ' USDT';
}

function buyTickets(amount, method) {
    method = method || 'line';
    pendingShopTicketAmount = amount;
    pendingShopPaymentMethod = method;
    document.getElementById('shopPurchaseAmount').textContent = '🎫 ' + amount + '개';
    document.getElementById('shopPurchasePrice').textContent = formatPriceJpyUsdt(amount);
    document.getElementById('shopPurchasePopup').classList.add('active');
}

/** 상점 리스트 가격을 엔/USDT 둘 다 표기로 갱신 (LINE Pay/인앱 캐시 구매용만; 티켓 탭의 Cash 가격은 제외) */
function updateShopListPrices() {
    document.querySelectorAll('.shop-list-item[data-ticket-amount]').forEach(function (el) {
        if (el.querySelector('.shop-list-buy-btn-line, .shop-list-buy-btn-kaia')) {
            const amount = parseInt(el.getAttribute('data-ticket-amount'), 10);
            const priceEl = el.querySelector('.shop-list-item-price');
            if (priceEl && !isNaN(amount)) priceEl.textContent = formatPriceJpyUsdt(amount);
        }
    });
}

function closeShopPurchasePopup() {
    document.getElementById('shopPurchasePopup').classList.remove('active');
    pendingShopTicketAmount = 0;
    pendingShopPaymentMethod = 'line';
}

function confirmShopPurchase() {
    const amount = pendingShopTicketAmount;
    const method = pendingShopPaymentMethod;
    closeShopPurchasePopup();
    if (!amount) return;

    // TODO: method에 따라 LINE Pay / KAIA 실제 결제 연동
    if (method === 'kaia') {
        if (typeof showToast === 'function') {
            showToast('KAIA 결제 기능은 준비 중입니다.');
        } else {
            alert('KAIA 결제 기능은 준비 중입니다.');
        }
    } else {
        if (typeof showToast === 'function') {
            showToast('LINE Pay 결제 기능은 준비 중입니다.');
        } else {
            alert('LINE Pay 결제 기능은 준비 중입니다.');
        }
    }

    // 결제 성공 시:
    // const currentTickets = parseInt(document.getElementById('ticketCount').textContent);
    // updateUserStats({ tickets: currentTickets + amount });
}

// ========================================
// 디버그 함수 (임시 테스트용)
// ========================================

async function testWinnerResult() {
    // 승자 데이터로 강제 설정
    const mockResult = await API.getEventResult(currentGameId);
    mockResult.isWinner = true;
    mockResult.correctCount = 10;
    mockResult.status = 'complete';

    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('resultScreen').classList.add('active');
    showFinalResult(mockResult);
}

async function testLoserResult() {
    // 패배 데이터로 강제 설정
    const mockResult = await API.getEventResult(currentGameId);
    mockResult.isWinner = false;
    mockResult.correctCount = 7;
    mockResult.status = 'complete';

    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('resultScreen').classList.add('active');
    showFinalResult(mockResult);
}

// ========================================
// 게임 나가기
// ========================================

function showExitGamePopup() {
    document.getElementById('exitGamePopup').classList.add('active');
}

function closeExitGamePopup() {
    document.getElementById('exitGamePopup').classList.remove('active');
}

function confirmExitGame() {
    closeExitGamePopup();
    backToHomeForce();
}

function backToHome() {
    // 게임 화면에서 뒤로가기를 누른 경우 확인 팝업 표시
    const gameScreen = document.getElementById('gameScreen');
    if (gameScreen.classList.contains('active')) {
        showExitGamePopup();
    } else {
        // 결과 화면에서 뒤로가기는 그냥 실행
        backToHomeForce();
    }
}

function backToHomeForce() {
    // 게임 타이머 정지
    stopGameTimer();

    document.getElementById('resultScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('homeScreen').classList.add('active');

    // 하단 메뉴 다시 보이기 및 메인 콘텐츠 패딩 복원
    document.querySelector('.bottom-nav').classList.remove('hidden');
    document.querySelector('.main-content').classList.remove('no-padding');
}
