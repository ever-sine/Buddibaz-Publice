'use strict';
const el = id => document.getElementById(id);
const keys = ['A','B','C','D'];
const publicShowCode=new URLSearchParams(location.search).get('show')||'';
let sessionCsrf = '';
let serverClockOffset = 0;
let lastView = null;
let currentRoundId = '';
let selectedOption = '';
let submitting = false;

let countdownInterval = null;
// Always present an empty mobile field at a fresh login. The quiz never pre-fills personal numbers.
const mobileInput = el('pubPhone');
if (mobileInput) {
  mobileInput.value = '';
  window.addEventListener('pageshow', event => {
    if (event.persisted) mobileInput.value = '';
  });
}
const ageSelect = el('pubAge');
for (let age = 7; age <= 50; age++) ageSelect.add(new Option(`${age} years`, String(age)));
function showLogin(show) {
  el('loginView').hidden = !show;
  el('participantView').hidden = show;
}
function showLoginError(msg) { el('loginError').hidden = !msg; el('loginError').textContent = msg || ''; }
function showAnswerError(msg) { el('answerError').hidden = !msg; el('answerError').textContent = msg || ''; }
function selectWaiting(status) {
  const text = {
    waiting: ['◎', 'Waiting for the Next Question', 'The next round will appear as soon as the host publishes it.'],
    submitted: ['✓', 'Answer Submitted', 'Your response has been recorded. Await the next round.'],
    expired: ['⌛', 'Time Up', 'This round has ended. Await the next question.']
  }[status] || ['◎', 'Waiting for the Next Question', ''];
  el('waitingIcon').textContent = text[0];
  el('waitingTitle').textContent = text[1];
  el('waitingDescription').textContent = text[2];
  el('waitingTag').textContent = status === 'submitted' ? 'ANSWER SUBMITTED' : status === 'expired' ? 'TIME UP' : 'LIVE QUIZ';
  el('waitingView').hidden = false;
  el('quizView').hidden = true;
}
function syncClock(data) {
  if (data?.serverTime) serverClockOffset = Date.parse(data.serverTime) - Date.now();
}
function remainingMilliseconds() {
  if (!lastView || !lastView.round) return 0;
  return Math.max(0, Date.parse(lastView.round.expiresAt) - (Date.now() + serverClockOffset));
}
function updateTimer() {
  if (!lastView || lastView.status !== 'active' || el('quizView').hidden) return;
  const remaining = remainingMilliseconds();
  const seconds = Math.ceil(remaining / 1000);
  el('timeLeft').textContent = String(seconds).padStart(2, '0');
  el('quizTimer').classList.toggle('urgent', seconds <= 10);
  const ring = el('timerRing');
  ring.style.strokeDashoffset = String(150.796 * (1 - Math.min(1, remaining / 30000)));
  if (remaining === 0) { lastView.status = 'expired'; selectWaiting('expired'); }
}
function preferredText(q, base) {
  return q.languageMode === 'en' ? q[`${base}En`] || q[`${base}Hi`] : q[`${base}Hi`] || q[`${base}En`];
}
function buildQuestion(question) {
  el('pubQuestionTitle').textContent = question.title || '';
  el('pubQuestionText').textContent = preferredText(question, 'text');
  const extra = question.languageMode === 'both' && question.textEn && question.textEn !== question.textHi;
  el('pubQuestionEnglish').hidden = !extra;
  el('pubQuestionEnglish').textContent = extra ? question.textEn : '';
  const grid = el('pubOptions');
  grid.replaceChildren();
  keys.forEach(key => {
    const btn = document.createElement('button');
    btn.type = 'button';btn.className = 'pub-option';btn.dataset.option = key;
    btn.setAttribute('role','radio');btn.setAttribute('aria-checked','false');
    const letter = document.createElement('span');letter.className = 'letter';letter.textContent = key;
    const content = document.createElement('span');content.className = 'option-content';
    content.append(document.createTextNode(preferredText({ ...question, optionsHi: question.optionsHi, optionsEn: question.optionsEn }, 'options')?.[key] || `Option ${key}`));
    if (question.languageMode === 'both' && question.optionsEn?.[key] && question.optionsEn[key] !== question.optionsHi?.[key]) {
      const en = document.createElement('small');en.textContent = question.optionsEn[key];content.append(en);
    }
    btn.append(letter,content);
    btn.addEventListener('click', () => {
      if (submitting || remainingMilliseconds() <= 0) return;
      selectedOption = key;
      grid.querySelectorAll('.pub-option').forEach(opt => {
        const chosen = opt.dataset.option === key;
        opt.classList.toggle('is-selected',chosen);
        opt.setAttribute('aria-checked',String(chosen));
      });
      el('pubSubmitBtn').disabled = false;
      showAnswerError('');
    });
    grid.append(btn);
  });
}

function renderPublicRanking(value) {
  const data=value||{};
  const ranks=Array.isArray(data.top)?data.top:[];
  const grid=el('pubRankGrid');
  if(!grid)return;
  const cards=grid.querySelectorAll('.bb-rank-entry');
  cards.forEach((card,i)=>{
    const entry=ranks[i];
    const name=entry?.name||'Awaiting results';
    const score=entry ? `${Number(entry.score)||0} PTS` : '—';
    const text=card.querySelector('span');
    if(text.textContent!==name){card.classList.remove('is-new');void card.offsetWidth;card.classList.add('is-new');}
    text.textContent=name;card.querySelector('small').textContent=score;
  });
  el('pubMyPosition').textContent=data.myRank?`YOUR RANK #${data.myRank}`:'YOUR RANK —';
}
function showPublicFinal(final,player) {
  const won=final.isWinner===true;
  const panel=el('pubFinalView');
  panel.classList.toggle('is-loss',!won);
  el('pubFinalSymbol').textContent=won?'🏆':'◈';
  el('pubFinalStatus').textContent=won?'WINNER':'LOSS';
  el('pubFinalPlayer').textContent=won?String(final.winnerName||player||'Winner'):String(player||'Player');
  el('pubFinalMessage').textContent=won?'Congratulations! You are the Public Quiz winner.':'Thank you for participating.';
  el('waitingView').hidden=true;el('quizView').hidden=true;
  el('pubLiveRanking').hidden=true;
  panel.hidden=false;
}
function render(data) {
  if (!data || !data.ok) return;
  syncClock(data);
  lastView = data;
  showLogin(false);
  renderPublicRanking(data.leaderboard);
  el('playerName').textContent = data.participant?.name || 'Player';
  el('pubConnection').textContent = '● NGROK LIVE • Rankings update automatically';
  if(data.status==='results'&&data.finalResult){showPublicFinal(data.finalResult,data.participant?.name);return;}
  el('pubFinalView').hidden=true;
  el('pubLiveRanking').hidden=false;
  if (data.status !== 'active' || !data.round || !data.question) {
    currentRoundId = '';
    selectedOption = '';
    selectWaiting(data.status);
    return;
  }
  if (remainingMilliseconds() <= 0) { selectWaiting('expired');return; }
  if (currentRoundId !== data.round.id) {
    currentRoundId = data.round.id;
    selectedOption = '';
    submitting = false;
    el('pubSubmitBtn').disabled = true;
    showAnswerError('');
    buildQuestion(data.question);
  }
  el('waitingView').hidden = true;
  el('quizView').hidden = false;
  updateTimer();
}
// Cloudflare Pages: lightweight polling instead of long-running SSE connections.
let livePoll = null;
function connectLive() {
  if (livePoll) clearInterval(livePoll);
  let busy = false;
  livePoll = setInterval(async () => {
    if (busy || document.hidden) return;
    busy = true;
    try {
      const data = await jsonRequest('/api/public/me?show='+encodeURIComponent(publicShowCode));
      sessionCsrf = data.csrfToken || sessionCsrf;
      render(data);
    } catch (error) {
      if (error.status === 401 || error.status === 410) {
        clearInterval(livePoll); livePoll = null;
        showLogin(true);
      } else el('pubConnection').textContent='○ Connection interrupted • reconnecting...';
    } finally { busy=false; }
  }, 4000);
}
async function jsonRequest(path, options = {}) {
  const response = await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  let data = {};
  try { data = await response.json(); } catch (_) { }
  if (!response.ok) { const error = new Error(data.error || 'Network error');error.status = response.status;throw error; }
  return data;
}
el('pubAge').addEventListener('change',() => {
  const age = Number(el('pubAge').value);
  el('guardianConsentRow').hidden = !(age >= 7 && age < 18);
  el('pubGuardianConsent').required = age >= 7 && age < 18;
});
el('publicLoginForm').addEventListener('submit',async event => {
  event.preventDefault();showLoginError('');
  const btn=el('joinQuizBtn');btn.disabled=true;
  try {
    const data = await jsonRequest('/api/public/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      showCode:publicShowCode,name:el('pubName').value,phone:el('pubPhone').value,age:Number(el('pubAge').value),
      guardianConsent:el('pubGuardianConsent').checked,privacyConsent:el('pubPrivacyConsent').checked})});
    sessionCsrf=data.csrfToken;render(data);connectLive();
  } catch(error){showLoginError(error.message);}finally{btn.disabled=false;}
});
el('pubSubmitBtn').addEventListener('click',async () => {
  if (submitting || !selectedOption || !lastView?.round) return;
  if (remainingMilliseconds() === 0) {selectWaiting('expired');return;}
  submitting=true;el('pubSubmitBtn').disabled=true;showAnswerError('');
  try {
    await jsonRequest('/api/public/answer',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':sessionCsrf},body:JSON.stringify({roundId:lastView.round.id,option:selectedOption})});
    lastView.status='submitted';currentRoundId='';selectWaiting('submitted');
  } catch(error) {
    if (error.status === 409) {
      try {render(await jsonRequest('/api/public/me?show='+encodeURIComponent(publicShowCode)));}catch(_) {selectWaiting('expired');}
    } else {showAnswerError(error.message);el('pubSubmitBtn').disabled=false;}
  }finally{submitting=false;}
});
el('pubLogoutBtn').addEventListener('click',async () => {
  if (livePoll) {clearInterval(livePoll);livePoll=null;}
  try {await jsonRequest('/api/public/logout',{method:'POST'});}catch(_) { }
  sessionCsrf='';lastView=null;currentRoundId='';el('pubLiveRanking').hidden=false;showLogin(true);
});
countdownInterval=setInterval(updateTimer,120);
(async()=>{
  if(!/^[A-Za-z0-9_-]{20,40}$/.test(publicShowCode)){showLogin(true);showLoginError('Invalid Public Show link. Request a new invitation.');el('joinQuizBtn').disabled=true;return;}
  try {const data=await jsonRequest('/api/public/me?show='+encodeURIComponent(publicShowCode));sessionCsrf=data.csrfToken;render(data);connectLive();}
  catch(_) {showLogin(true);}
})();
