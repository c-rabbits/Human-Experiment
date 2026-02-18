// ========================================
// 인간실험 관리자 페이지 – 이벤트 CRUD
// 서버 연동 시 AdminAPI.* 호출을 실제 fetch로 교체하면 됨.
// ========================================

// 관리자 비밀번호 (프로토타입용). 서버 연동 시 로그인 API로 대체.
const ADMIN_PASSWORD = 'admin123';

const STATUS_LABELS = {
    draft: '초안',
    scheduled: '예정',
    live: '진행 중',
    ended: '종료',
    cancelled: '취소'
};

// ----------------------------------------
// API 레이어 (목업 ↔ 실제 서버 전환용)
// ----------------------------------------
const AdminAPI = {
    baseURL: 'https://api.popularhuman.com',

    async getEvents(filters = {}) {
        // TODO: 서버 연동 시
        // const q = new URLSearchParams(filters).toString();
        // const res = await fetch(`${this.baseURL}/admin/events?${q}`, { credentials: 'include' });
        // return res.json();
        return getMockEvents();
    },

    async getEvent(id) {
        // const res = await fetch(`${this.baseURL}/admin/events/${id}`, { credentials: 'include' });
        // return res.json();
        const list = getMockEvents();
        return list.find(e => e.id === id) || null;
    },

    async createEvent(body) {
        // const res = await fetch(`${this.baseURL}/admin/events`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     credentials: 'include',
        //     body: JSON.stringify(body)
        // });
        // return res.json();
        return addMockEvent(body);
    },

    async updateEvent(id, body) {
        // const res = await fetch(`${this.baseURL}/admin/events/${id}`, {
        //     method: 'PUT',
        //     headers: { 'Content-Type': 'application/json' },
        //     credentials: 'include',
        //     body: JSON.stringify(body)
        // });
        // return res.json();
        return updateMockEvent(id, body);
    },

    async deleteEvent(id) {
        // await fetch(`${this.baseURL}/admin/events/${id}`, { method: 'DELETE', credentials: 'include' });
        return deleteMockEvent(id);
    }
};

// ----------------------------------------
// 목업 저장소 (localStorage 사용, 서버 연동 전까지)
// ----------------------------------------
const STORAGE_KEY = 'ph_admin_events';

function getMockEvents() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return getDefaultMockEvents();
}

function getDefaultMockEvents() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return [
        {
            id: 'evt_mock1',
            scenarioId: 'sample-1',
            title: '샘플 이벤트 1',
            startAt: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(today.getTime() + 15 * 60 * 60 * 1000).toISOString(),
            rewardUsdt: 50,
            playTimeMinutes: 10,
            requiredTickets: 1,
            questionCount: 10,
            status: 'scheduled',
            bannerImageUrl: '',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        },
        {
            id: 'evt_mock2',
            scenarioId: 'sample-2',
            title: '샘플 이벤트 2',
            startAt: new Date(today.getTime() + 18 * 60 * 60 * 1000).toISOString(),
            endAt: new Date(today.getTime() + 21 * 60 * 60 * 1000).toISOString(),
            rewardUsdt: 50,
            playTimeMinutes: 10,
            requiredTickets: 1,
            questionCount: 10,
            status: 'scheduled',
            bannerImageUrl: '',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        }
    ];
}

function saveMockEvents(events) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function addMockEvent(body) {
    const events = getMockEvents();
    const newEvent = {
        id: 'evt_' + Date.now(),
        scenarioId: (body.scenarioId || '').trim(),
        title: (body.title || '').trim(),
        startAt: body.startAt,
        endAt: body.endAt,
        rewardUsdt: Number(body.rewardUsdt),
        playTimeMinutes: Number(body.playTimeMinutes),
        requiredTickets: Number(body.requiredTickets),
        questionCount: Number(body.questionCount),
        status: body.status || 'scheduled',
        bannerImageUrl: body.bannerImageUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    events.push(newEvent);
    saveMockEvents(events);
    return newEvent;
}

function updateMockEvent(id, body) {
    const events = getMockEvents();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) return null;
    events[idx] = {
        ...events[idx],
        scenarioId: (body.scenarioId || '').trim(),
        title: (body.title || '').trim(),
        startAt: body.startAt,
        endAt: body.endAt,
        rewardUsdt: Number(body.rewardUsdt),
        playTimeMinutes: Number(body.playTimeMinutes),
        requiredTickets: Number(body.requiredTickets),
        questionCount: Number(body.questionCount),
        status: body.status || 'scheduled',
        bannerImageUrl: body.bannerImageUrl !== undefined ? body.bannerImageUrl : events[idx].bannerImageUrl,
        updatedAt: new Date().toISOString()
    };
    saveMockEvents(events);
    return events[idx];
}

function deleteMockEvent(id) {
    const events = getMockEvents().filter(e => e.id !== id);
    saveMockEvents(events);
    return { success: true };
}

// ----------------------------------------
// 로그인
// ----------------------------------------
const SESSION_KEY = 'ph_admin_session';

function handleLogin(e) {
    e.preventDefault();
    const input = document.getElementById('adminPassword');
    const hint = document.getElementById('loginHint');
    const pwd = (input && input.value) || '';
    if (pwd === ADMIN_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, '1');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminMain').classList.remove('hidden');
        if (hint) hint.textContent = '';
        refreshEventList();
        return false;
    }
    if (hint) hint.textContent = '비밀번호가 올바르지 않습니다.';
    return false;
}

function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    document.getElementById('adminMain').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminPassword').value = '';
    document.getElementById('loginHint').textContent = '';
}

function checkSession() {
    if (sessionStorage.getItem(SESSION_KEY)) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminMain').classList.remove('hidden');
        refreshEventList();
    }
}

// ----------------------------------------
// 패널 전환
// ----------------------------------------
function switchPanel(panel) {
    document.querySelectorAll('.admin-panel').forEach(p => {
        p.classList.toggle('active', p.dataset.panel === panel);
    });
    document.querySelectorAll('.admin-nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.panel === panel);
    });
    if (panel === 'list') refreshEventList();
}

// ----------------------------------------
// 목록
// ----------------------------------------
function refreshEventList() {
    const statusFilter = document.getElementById('filterStatus').value;
    const scenarioFilter = (document.getElementById('filterScenario').value || '').trim();

    AdminAPI.getEvents().then(events => {
        let list = events;
        if (statusFilter) list = list.filter(e => e.status === statusFilter);
        if (scenarioFilter) list = list.filter(e => (e.scenarioId || '').toLowerCase().includes(scenarioFilter.toLowerCase()));
        renderEventList(list);
    }).catch(() => renderEventList([]));
}

function formatDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderEventList(events) {
    const tbody = document.getElementById('eventListBody');
    const emptyEl = document.getElementById('listEmpty');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (events.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    events.forEach(evt => {
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + escapeHtml(evt.title) + '</td>' +
            '<td>' + escapeHtml(evt.scenarioId) + '</td>' +
            '<td>' + formatDateTime(evt.startAt) + '</td>' +
            '<td>' + formatDateTime(evt.endAt) + '</td>' +
            '<td>' + evt.rewardUsdt + '</td>' +
            '<td><span class="status-badge status-' + evt.status + '">' + (STATUS_LABELS[evt.status] || evt.status) + '</span></td>' +
            '<td>' +
            '<button type="button" class="btn btn-outline btn-sm" onclick="editEvent(\'' + evt.id + '\')">수정</button> ' +
            '<button type="button" class="btn btn-danger btn-sm" onclick="openDeleteModal(\'' + evt.id + '\', \'' + escapeHtml(evt.title).replace(/'/g, "\\'") + '\')">삭제</button>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

// ----------------------------------------
// 폼 (추가/수정)
// ----------------------------------------
function setFormMode(mode, eventId) {
    const form = document.getElementById('eventForm');
    const titleEl = document.getElementById('formPanelTitle');
    const idEl = document.getElementById('eventId');
    const submitBtn = document.getElementById('formSubmitBtn');
    if (!form) return;

    form.reset();
    idEl.value = '';

    if (mode === 'add') {
        titleEl.textContent = '이벤트 추가';
        submitBtn.textContent = '저장';
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventScenarioId').value = '';
        document.getElementById('eventRewardUsdt').value = 50;
        document.getElementById('eventPlayTimeMinutes').value = 10;
        document.getElementById('eventRequiredTickets').value = 1;
        document.getElementById('eventQuestionCount').value = 10;
        document.getElementById('eventStatus').value = 'scheduled';
        const now = new Date();
        const start = new Date(now.getTime() + 60 * 60 * 1000);
        const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        document.getElementById('eventStartAt').value = formatDateTimeLocal(start);
        document.getElementById('eventEndAt').value = formatDateTimeLocal(end);
        return;
    }

    if (mode === 'edit' && eventId) {
        titleEl.textContent = '이벤트 수정';
        submitBtn.textContent = '수정 저장';
        idEl.value = eventId;
        AdminAPI.getEvent(eventId).then(evt => {
            if (!evt) return;
            document.getElementById('eventTitle').value = evt.title || '';
            document.getElementById('eventScenarioId').value = evt.scenarioId || '';
            document.getElementById('eventStartAt').value = formatDateTimeLocal(evt.startAt);
            document.getElementById('eventEndAt').value = formatDateTimeLocal(evt.endAt);
            document.getElementById('eventRewardUsdt').value = evt.rewardUsdt;
            document.getElementById('eventPlayTimeMinutes').value = evt.playTimeMinutes;
            document.getElementById('eventRequiredTickets').value = evt.requiredTickets;
            document.getElementById('eventQuestionCount').value = evt.questionCount;
            document.getElementById('eventStatus').value = evt.status;
        });
    }
}

function formatDateTimeLocal(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return y + '-' + m + '-' + day + 'T' + h + ':' + min;
}

function editEvent(id) {
    setFormMode('edit', id);
    switchPanel('form');
}

function saveEvent(e) {
    e.preventDefault();
    const id = document.getElementById('eventId').value;
    const body = {
        title: document.getElementById('eventTitle').value,
        scenarioId: document.getElementById('eventScenarioId').value,
        startAt: new Date(document.getElementById('eventStartAt').value).toISOString(),
        endAt: new Date(document.getElementById('eventEndAt').value).toISOString(),
        rewardUsdt: document.getElementById('eventRewardUsdt').value,
        playTimeMinutes: document.getElementById('eventPlayTimeMinutes').value,
        requiredTickets: document.getElementById('eventRequiredTickets').value,
        questionCount: document.getElementById('eventQuestionCount').value,
        status: document.getElementById('eventStatus').value
    };

    const promise = id ? AdminAPI.updateEvent(id, body) : AdminAPI.createEvent(body);
    promise.then(() => {
        switchPanel('list');
        refreshEventList();
    }).catch(err => {
        alert('저장 실패: ' + (err && err.message ? err.message : '알 수 없음'));
    });
    return false;
}

// ----------------------------------------
// 삭제 모달
// ----------------------------------------
let deleteTargetId = null;

function openDeleteModal(id, title) {
    deleteTargetId = id;
    const msg = document.getElementById('deleteModalMessage');
    if (msg) msg.textContent = '「' + (title || id) + '」 이벤트를 삭제하시겠습니까?';
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteConfirmBtn').onclick = confirmDelete;
}

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteModal').classList.add('hidden');
}

function confirmDelete() {
    if (!deleteTargetId) return;
    AdminAPI.deleteEvent(deleteTargetId).then(() => {
        closeDeleteModal();
        refreshEventList();
    }).catch(() => alert('삭제 실패'));
}

// ----------------------------------------
// 초기화
// ----------------------------------------
document.addEventListener('DOMContentLoaded', function () {
    checkSession();
});
