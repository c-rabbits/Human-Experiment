// ========================================
// API 모듈 (api.js)
// ========================================
// Supabase 분기: config.js + supabase-client.js 로드 후, CONFIG.USE_SUPABASE === true 이고
// getSupabase() 가 null 이 아닐 때만 Supabase 호출. 그 외에는 기존 목업 실행.

function useSupabase() {
    return typeof CONFIG !== 'undefined' && CONFIG.USE_SUPABASE && typeof getSupabase === 'function' && getSupabase() !== null;
}

const API = {
    // 베이스 URL (실제 서버 주소로 변경 필요)
    baseURL: 'https://api.popularhuman.com',

    // 유저 정보 가져오기
    async getUserInfo() {
        try {
            // ----- Supabase 분기 (로드 순서: config.js → supabase-js → supabase-client.js → api.js) -----
            if (useSupabase()) {
                const sb = getSupabase();
                const lineUserId = (liffProfile && liffProfile.userId) || (typeof getSupabaseUserId === 'function' ? await getSupabaseUserId() : null);
                if (sb && lineUserId) {
                    const { data: profile, error } = await sb.from('profiles').select('*').eq('line_user_id', lineUserId).maybeSingle();
                    if (!error && profile) {
                        console.log('[API] getUserInfo: Supabase profiles에서 로드');
                        const uidSuffix = (profile.line_user_id || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
                        return {
                            userId: lineUserId,
                            displayName: profile.display_name || (liffProfile && liffProfile.displayName) || '',
                            pictureUrl: profile.picture_url || (liffProfile && liffProfile.pictureUrl) || '',
                            statusMessage: (liffProfile && liffProfile.statusMessage) || '',
                            characterName: profile.display_name || (liffProfile && liffProfile.displayName) || '실험러버',
                            nickname: profile.nickname || undefined,
                            cash: profile.cash != null ? profile.cash : 0,
                            rewardPoints: profile.reward_points != null ? profile.reward_points : 0,
                            tickets: profile.tickets != null ? profile.tickets : 0,
                            uid: 'PH-' + (uidSuffix || 'USER'),
                            walletAddress: typeof getConnectedAddress === 'function' ? (getConnectedAddress() || '') : '',
                            tokenBalance: { usdt: 0, kaia: 0 },
                            claimable: { usdt: 0, kaia: 0 }
                        };
                    }
                    if (error) console.error('[API] getUserInfo Supabase error', error);
                }
            }

            // ----- 기존 목업 -----
            const userId = liffProfile ? liffProfile.userId : 'user123';
            const uidSuffix = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
            const uid = 'PH-' + uidSuffix;
            const walletAddress = typeof getConnectedAddress === 'function' ? (getConnectedAddress() || '') : '';
            const nickname = (typeof localStorage !== 'undefined' && localStorage.getItem('ph_nickname')) || undefined;
            return {
                userId: userId,
                displayName: liffProfile ? liffProfile.displayName : '실험러버',
                pictureUrl: liffProfile ? liffProfile.pictureUrl : '',
                statusMessage: liffProfile ? (liffProfile.statusMessage || '') : '',
                characterName: liffProfile ? liffProfile.displayName : '실험러버',
                nickname: nickname,
                cash: 1250,
                rewardPoints: 850,
                tickets: 5,
                uid: uid,
                walletAddress: walletAddress,
                tokenBalance: { usdt: 0.00, kaia: 0.00 },
                claimable: { usdt: 12.50, kaia: 150.00 }
            };
        } catch (error) {
            console.error('유저 정보 로드 실패:', error);
            return null;
        }
    },

    // 시나리오 목록 가져오기
    async getScenarios() {
        try {
            if (useSupabase()) {
                const sb = getSupabase();
                if (sb) {
                    const { data: eventsList, error: eventsErr } = await sb.from('events').select('id, scenario_id, title, banner_image_url').in('status', ['live', 'scheduled']);
                    if (!eventsErr && eventsList && eventsList.length > 0) {
                        const out = {};
                        for (const ev of eventsList) {
                            const { data: qList } = await sb.from('event_questions').select('text, choices, correct_index, sort_order').eq('event_id', ev.id).order('sort_order', { ascending: true });
                            const questions = (qList || []).map((q) => ({
                                q: q.text || '',
                                options: Array.isArray(q.choices) ? q.choices : [],
                                correct: q.correct_index != null ? q.correct_index : 0
                            }));
                            out[ev.scenario_id] = {
                                name: ev.title || ev.scenario_id,
                                emoji: '',
                                bannerImage: ev.banner_image_url || '',
                                contextTitle: '',
                                contextSubtitle: '',
                                questions: questions
                            };
                        }
                        if (Object.keys(out).length > 0) {
                            console.log('[API] getScenarios: Supabase events에서 로드');
                            return out;
                        }
                    }
                    if (eventsErr) console.error('[API] getScenarios Supabase error', eventsErr);
                }
            }
            return scenarios;
        } catch (error) {
            console.error('시나리오 로드 실패:', error);
            return null;
        }
    },

    // 게임 시작 (티켓 차감)
    async startGame(scenarioId) {
        try {
            if (useSupabase()) {
                const sb = getSupabase();
                const lineUserId = (liffProfile && liffProfile.userId) || (typeof getSupabaseUserId === 'function' ? await getSupabaseUserId() : null);
                if (sb && lineUserId) {
                    const { data: ev, error: evErr } = await sb.from('events').select('id, required_tickets').eq('scenario_id', scenarioId).in('status', ['live', 'scheduled']).maybeSingle();
                    if (!evErr && ev) {
                        const ticketsNeeded = ev.required_tickets != null ? ev.required_tickets : 1;
                        const { data: profile } = await sb.from('profiles').select('tickets').eq('line_user_id', lineUserId).maybeSingle();
                        const hasTickets = profile && (profile.tickets != null ? profile.tickets : 0) >= ticketsNeeded;
                        if (!hasTickets) {
                            return { success: false, message: '티켓이 부족합니다' };
                        }
                        const { data: game, error: gameErr } = await sb.from('games').insert({ event_id: ev.id, line_user_id: lineUserId, status: 'playing' }).select('id').single();
                        if (!gameErr && game) {
                            const newTickets = (profile.tickets || 0) - ticketsNeeded;
                            const { error: upErr } = await sb.from('profiles').update({ tickets: newTickets }).eq('line_user_id', lineUserId);
                            if (!upErr) {
                                console.log('[API] startGame: Supabase games 생성');
                                return { success: true, gameId: game.id, ticketsLeft: newTickets };
                            }
                        }
                        if (gameErr) console.error('[API] startGame Supabase error', gameErr);
                    }
                }
            }
            const currentTickets = parseInt(document.getElementById('ticketCount').textContent, 10) || 0;
            if (currentTickets > 0) {
                if (typeof updateUserStats === 'function') updateUserStats({ tickets: currentTickets - 1 });
                return { success: true, gameId: 'game_' + Date.now() };
            }
            return { success: false, message: '티켓이 부족합니다' };
        } catch (error) {
            console.error('게임 시작 실패:', error);
            return { success: false };
        }
    },

    // 답변 제출 (questionId = 문제 인덱스 0-based, answer = 선택한 옵션 인덱스 0~3)
    async submitAnswer(gameId, questionId, answer) {
        try {
            if (useSupabase() && gameId && typeof questionId === 'number' && typeof answer === 'number') {
                const sb = getSupabase();
                if (sb) {
                    const { error } = await sb.from('game_answers').insert({
                        game_id: gameId,
                        question_index: questionId,
                        selected_index: answer
                    });
                    if (!error) return { success: true };
                    console.error('[API] submitAnswer Supabase error', error);
                }
            }
            return { success: true };
        } catch (error) {
            console.error('답변 제출 실패:', error);
            return { success: false };
        }
    },

    // 게임 완료 및 결과 받기
    async completeGame(gameId, answers) {
        try {
            if (useSupabase() && gameId) {
                const sb = getSupabase();
                if (sb) {
                    const { data: game, error: gameErr } = await sb.from('games').select('id, event_id').eq('id', gameId).maybeSingle();
                    if (!gameErr && game) {
                        await sb.from('games').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', gameId);

                        const { data: qList } = await sb.from('event_questions').select('id, text, choices, correct_index, sort_order').eq('event_id', game.event_id).order('sort_order', { ascending: true });
                        const { data: ansList } = await sb.from('game_answers').select('question_index, selected_index').eq('game_id', gameId).order('question_index', { ascending: true });

                        const totalQuestions = (qList || []).length;
                        const ansMap = {};
                        (ansList || []).forEach((a) => { ansMap[a.question_index] = a.selected_index; });
                        let correctCount = 0;
                        const questionResults = (qList || []).map((q, idx) => {
                            const userSel = ansMap[idx];
                            const correct = q.correct_index != null ? q.correct_index : 0;
                            const isCorrect = userSel === correct;
                            if (isCorrect) correctCount++;
                            const opts = Array.isArray(q.choices) ? q.choices : [];
                            return {
                                questionNumber: idx + 1,
                                question: q.text || '',
                                userAnswer: opts[userSel],
                                correctAnswer: opts[correct],
                                isCorrect: isCorrect,
                                userPercentage: 50,
                                correctPercentage: 50
                            };
                        });

                        const { data: ev } = await sb.from('events').select('end_at').eq('id', game.event_id).single();
                        const eventEnded = ev && new Date(ev.end_at) <= new Date();
                        const status = eventEnded ? 'complete' : 'pending';

                        console.log('[API] completeGame: Supabase 반영, correctCount=', correctCount);
                        return {
                            status: status,
                            correctCount: correctCount,
                            totalQuestions: totalQuestions,
                            totalParticipants: 0,
                            eventTimeLeft: 0,
                            isWinner: false,
                            earnedCash: 0,
                            earnedPoints: 0,
                            rewardAmount: 0,
                            totalWinners: 0,
                            questionResults: questionResults
                        };
                    }
                }
            }
            const tot = (typeof currentScenario !== 'undefined' && currentScenario && currentScenario.questions) ? currentScenario.questions.length : 0;
            return {
                status: 'pending',
                correctCount: typeof correctCount !== 'undefined' ? correctCount : 0,
                totalQuestions: tot,
                totalParticipants: 128492,
                eventTimeLeft: 6138,
                isWinner: false,
                earnedCash: 0,
                earnedPoints: 0,
                rewardAmount: 0,
                totalWinners: 0,
                questionResults: []
            };
        } catch (error) {
            console.error('게임 완료 처리 실패:', error);
            return null;
        }
    },

    // 알림 설정 (푸시 허용 + 알림 받을 시간대 전달)
    async setNotification(enabled, options = {}) {
        try {
            const settings = typeof getSettings === 'function' ? getSettings() : {};
            const start = options.notificationStartTime ?? settings.notificationStartTime ?? '09:00';
            const end = options.notificationEndTime ?? settings.notificationEndTime ?? '21:00';
            // const response = await fetch(`${this.baseURL}/user/notification`, {
            //     method: 'POST',
            //     headers: {
            //         'Authorization': `Bearer ${getLIFFToken()}`,
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify({ enabled, notificationStartTime: start, notificationEndTime: end })
            // });
            // return await response.json();
            console.log('[API] setNotification', { enabled, notificationStartTime: start, notificationEndTime: end });
            return { success: true };
        } catch (error) {
            console.error('알림 설정 실패:', error);
            return { success: false };
        }
    },

    // 이벤트 종료 후 결과 조회
    async getEventResult(gameId) {
        try {
            if (useSupabase() && gameId) {
                const sb = getSupabase();
                if (sb) {
                    const { data: game, error: gameErr } = await sb.from('games').select('id, event_id, line_user_id').eq('id', gameId).maybeSingle();
                    if (!gameErr && game) {
                        const { data: ev } = await sb.from('events').select('reward_usdt').eq('id', game.event_id).single();
                        const { data: qList } = await sb.from('event_questions').select('id, text, choices, correct_index, sort_order').eq('event_id', game.event_id).order('sort_order', { ascending: true });
                        const { data: ansList } = await sb.from('game_answers').select('question_index, selected_index').eq('game_id', gameId).order('question_index', { ascending: true });

                        const totalQuestions = (qList || []).length;
                        const ansMap = {};
                        (ansList || []).forEach((a) => { ansMap[a.question_index] = a.selected_index; });
                        let correctCount = 0;
                        const questionResults = (qList || []).map((q, idx) => {
                            const userSel = ansMap[idx];
                            const correct = q.correct_index != null ? q.correct_index : 0;
                            const isCorrect = userSel === correct;
                            if (isCorrect) correctCount++;
                            const opts = Array.isArray(q.choices) ? q.choices : [];
                            return {
                                questionNumber: idx + 1,
                                question: q.text || '',
                                userAnswer: opts[userSel],
                                correctAnswer: opts[correct],
                                isCorrect: isCorrect,
                                userPercentage: 50,
                                correctPercentage: 50
                            };
                        });

                        const rewardAmount = (ev && ev.reward_usdt != null) ? Number(ev.reward_usdt) : 0;
                        const mockWinners = [
                            { profileImageUrl: (liffProfile && liffProfile.pictureUrl) || '', nickname: '1등' },
                            { profileImageUrl: '', nickname: '2등' },
                            { profileImageUrl: '', nickname: '3등' }
                        ];

                        console.log('[API] getEventResult: Supabase에서 로드');
                        return {
                            status: 'complete',
                            isWinner: false,
                            correctCount: correctCount,
                            totalQuestions: totalQuestions,
                            rewardAmount: rewardAmount,
                            totalWinners: 0,
                            winners: mockWinners,
                            topPercentile: 50,
                            questionResults: questionResults
                        };
                    }
                }
            }
            const isWinner = Math.random() > 0.5;
            const mockWinners = [
                { profileImageUrl: (typeof liffProfile !== 'undefined' && liffProfile && liffProfile.pictureUrl) ? liffProfile.pictureUrl : '', nickname: 'HE1등' },
                { profileImageUrl: '', nickname: '트렌드마스터' },
                { profileImageUrl: '', nickname: '선택왕' }
            ];
            const q = (typeof currentScenario !== 'undefined' && currentScenario && currentScenario.questions) ? currentScenario.questions : [];
            const ua = typeof userAnswers !== 'undefined' ? userAnswers : [];
            return {
                status: 'complete',
                isWinner: isWinner,
                correctCount: isWinner ? 10 : 7,
                totalQuestions: q.length,
                rewardAmount: isWinner ? 32.4 : 0,
                totalWinners: 124,
                winners: mockWinners,
                topPercentile: 38,
                questionResults: q.map((qu, idx) => ({
                    questionNumber: idx + 1,
                    question: qu.q,
                    userAnswer: qu.options[ua[idx]],
                    correctAnswer: qu.options[qu.correct],
                    isCorrect: ua[idx] === qu.correct,
                    userPercentage: Math.floor(Math.random() * 30) + 20,
                    correctPercentage: Math.floor(Math.random() * 30) + 40
                }))
            };
        } catch (error) {
            console.error('결과 조회 실패:', error);
            return null;
        }
    }
};
