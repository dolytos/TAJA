const app = document.querySelector('#app');
const key = 'hanja-gyeol-v1';
let record = {seen: [], wrong: [], attempts: 0, correct: 0};
try { record = {...record, ...JSON.parse(localStorage.getItem(key))}; } catch {}
function save() {
  try { localStorage.setItem(key, JSON.stringify(record)); }
  catch { document.querySelector('footer').textContent = '이 브라우저에서 학습 기록을 저장할 수 없어요.'; }
}
const shuffle = items => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};
const initials = [...new Set(deck.map(item => item.group))];
const wordIndex = new Map();
for (const row of vocabulary) {
  for (const char of new Set(row[1])) {
    if (!wordIndex.has(char)) wordIndex.set(char, []);
    wordIndex.get(char).push(row);
  }
}
let group = '전체', card = 0, revealed = false, quiz = null;
let search = '', wordSearch = '', practiceGuide = true, penOnly = false, inkCleanup;
const escapeHtml = text => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const matches = (text, query) => text.normalize('NFKC').replace(/\s/g, '').includes(query.normalize('NFKC').replace(/\s/g, ''));
const searchForm = (value, words = false) => `<form id="lookup" class="lookup"><label for="search-query">${words ? '단어 검색' : '한자 검색'}</label><div class="bar"><input id="search-query" name="query" type="search" maxlength="60" value="${escapeHtml(value)}" placeholder="${words ? '학교, 學, 예문 내용' : '學, 배울, 학'}"><button class="btn" type="submit">검색</button>${value ? button('초기화','clear-search',true) : ''}</div></form>`;
const wordList = rows => rows.map(([word, spelling, meaning, sentence]) =>
  `<article class="word"><h3>${word} <span>${spelling}</span></h3><p>${meaning}</p><p class="example">${sentence}</p></article>`).join('');
function wordsView() {
  const list = vocabulary.filter(row => matches(row.join(' '), wordSearch));
  return `<section class="study"><h1>단어·예문</h1>${searchForm(wordSearch,true)}<p class="muted">${list.length}개 단어</p><div class="word-grid">${wordList(list) || '<p>검색 결과가 없어요.</p>'}</div></section>`;
}
function related(item) {
  const rows = wordIndex.get(item.char) || [];
  const query = encodeURIComponent(item.char);
  return `<section class="related"><h2>단어·예문</h2>${wordList(rows)}
    <a class="dictionary" href="https://hanja.dict.naver.com/#/search?query=${query}" target="_blank" rel="noopener noreferrer">${item.char}이(가) 들어간 단어를 한자사전에서 더 보기 ↗</a></section>`;
}
const studySelection = () => selection().filter(item => matches(item.char + ' ' + item.answer, search));
function studyControls(list) {
  return searchForm(search) + filters() + (list.length ? `<div class="bar"><label for="choose-hanja">글자 선택</label><select id="choose-hanja">${list.map((item,index) => `<option value="${index}" ${index === card ? 'selected' : ''}>${item.char} · ${item.answer}</option>`).join('')}</select></div>` : '<p>검색 결과가 없어요. 다른 검색어나 초성을 선택해 보세요.</p>');
}
function writeView() {
  const list = studySelection(), item = list[card];
  return `<section class="study writing"><h1>따라쓰기</h1>${studyControls(list)}
    ${item ? `<div class="panel write-panel"><div class="bar spread write-top"><span><strong>${item.char} · ${item.answer}</strong> <span class="muted">${card + 1} / ${list.length}</span></span><label><input id="pen-only" type="checkbox" ${penOnly ? 'checked' : ''}> 펜 전용</label></div>
      <div class="practice"><span class="practice-guide" lang="ko" aria-hidden="true" ${practiceGuide ? '' : 'hidden'}>${item.char}</span><canvas id="ink" aria-label="${item.char} 따라쓰기"></canvas></div>
      <div class="bar write-tools"><button type="button" class="btn soft" id="guide" aria-pressed="${practiceGuide}">글자 본보기</button><button type="button" class="btn soft" id="undo">한 획 취소</button><button type="button" class="btn soft" id="wipe">모두 지우기</button></div>
      <p class="muted write-help">펜 전용을 켜면 손가락과 손바닥 입력을 무시해요.</p></div><div class="bar spread">${button('← 이전','prev',true)}${button('다음 →','next')}</div>` : ''}</section>`;
}

const filters = () => '<div class="bar" role="group" aria-label="한자 음의 초성">' + ['전체', ...initials].map(name =>
  '<button class="btn ' + (name === group ? '' : 'soft') + '" data-action="filter" data-value="' + name + '" aria-pressed="' + (name === group) + '">' + name + '</button>').join('') + '</div>';
const selection = () => deck.filter(item => group === '전체' || item.group === group);
const button = (label, action, soft = false) => '<button class="btn ' + (soft ? 'soft' : '') + '" data-action="' + action + '">' + label + '</button>';
function home() {
  const rate = record.attempts ? Math.round(100 * record.correct / record.attempts) + '%' : '—';
  return `<section class="hero"><div><small>한국어문회 4급 배정한자 1,000자</small><h1>한 글자씩,<br>한자가 익숙해져요</h1><p>뜻과 음을 익히고 퀴즈로 확인해 보세요.</p><a class="btn" href="#cards">한자 카드 시작 →</a></div><div class="art" aria-hidden="true"><div class="tile"><b lang="ko">學</b><span>배울 학</span></div></div></section>
  <section class="stats" aria-label="학습 현황"><div class="stat"><span>확인한 카드</span><strong>${record.seen.length} / ${deck.length}</strong></div><div class="stat"><span>퀴즈 정답률</span><strong>${rate}</strong></div><div class="stat"><span>복습할 글자</span><strong>${record.wrong.length}</strong></div></section>
  <h2>학습 메뉴</h2><div class="grid"><a class="entry" href="#write"><span class="icon" aria-hidden="true">筆</span><b>따라쓰기</b><span class="muted">펜이나 손가락으로 한자 쓰기</span></a><a class="entry" href="#words"><span class="icon" aria-hidden="true">文</span><b>단어·예문</b><span class="muted">한자가 단어와 문장에서 쓰이는 방법</span></a><a class="entry" href="#cards"><span class="icon" aria-hidden="true">字</span><b>한자 카드</b><span class="muted">글자를 보고 뜻과 음 떠올리기</span></a><a class="entry" href="#quiz"><span class="icon" aria-hidden="true">問</span><b>퀴즈</b><span class="muted">객관식 10문제로 실력 확인</span></a><a class="entry" href="#review"><span class="icon" aria-hidden="true">習</span><b>오답 노트</b><span class="muted">틀린 글자만 모아 다시 풀기</span></a></div>`;
}
function cards() {
  const list = studySelection(), item = list[card];
  return `<section class="study"><h1>한자 카드</h1>${studyControls(list)}
    ${item ? `<div class="panel flash"><span class="muted">${card + 1} / ${list.length}</span><b class="glyph" lang="ko">${item.char}</b><div aria-live="polite">${revealed ? '<h2>' + item.answer + '</h2>' : button('뜻과 음 보기','reveal')}</div></div><div class="bar spread">${button('← 이전','prev',true)}<a class="btn soft" href="#write">이 글자 따라쓰기</a>${button('다음 →','next')}</div>${revealed ? related(item) : ''}` : ''}</section>`;
}
function review() {
  const list = deck.filter(item => record.wrong.includes(item.char));
  return `<section class="study"><h1>오답 노트</h1><p class="muted">복습 퀴즈에서 맞히면 목록에서 빠져요.</p><div class="panel">${list.length ? list.map(item => `<div class="row"><b lang="ko">${item.char}</b><span>${item.answer}</span><span>${item.group}</span></div>`).join('') : '<p>복습할 글자가 없어요.</p><a class="btn" href="#quiz">퀴즈 풀기</a>'}</div>${list.length ? '<div class="bar">' + button('오답 다시 풀기','retry') + '</div>' : ''}</section>`;
}
function start(list) {
  const questions = shuffle(list).slice(0, 10).map((item, index) => ({
    item, reverse: index % 2 === 1, options: shuffle([item, ...shuffle(deck.filter(other => other !== item && other.answer !== item.answer)).slice(0, 3)])
  }));
  quiz = {questions, index: 0, score: 0, picked: null};
}
function quizView(isReview) {
  const title = isReview ? '오답 노트' : '퀴즈';
  let content;
  if (!quiz) {
    content = filters() + '<div class="panel"><h2>객관식 ' + Math.min(10, selection().length) + '문제</h2><p class="muted">한자를 보고 뜻과 음을 고르거나, 뜻과 음에 맞는 한자를 골라요.</p>' + button('퀴즈 시작','start') + '</div>';
  } else if (quiz.index === quiz.questions.length) {
    content = '<div class="panel" tabindex="-1" id="quiz-result"><h2>퀴즈 완료</h2><p>정답 <strong>' + quiz.score + ' / ' + quiz.questions.length + '</strong></p>' + button(isReview ? '오답 노트로' : '다시 시작','reset',true) + (isReview ? '' : ' <a class="btn" href="#review">오답 노트</a>') + '</div>';
  } else {
    const {item, reverse, options} = quiz.questions[quiz.index];
    const answered = quiz.picked !== null;
    content = `<div class="panel"><span class="muted">${quiz.index + 1} / ${quiz.questions.length}</span>
    <h2 id="question" tabindex="-1">${reverse ? '뜻과 음에 맞는 한자는?' : '이 한자의 뜻과 음은?'}</h2>
    ${reverse ? '<h2>' + item.answer + '</h2>' : '<b class="glyph" lang="ko">' + item.char + '</b>'}
    <div class="choices">${options.map(option => `<button class="choice${answered && option === item ? ' good' : answered && option.char === quiz.picked ? ' bad' : ''}" data-action="pick" data-value="${option.char}" ${answered ? 'disabled' : ''} ${reverse ? 'lang="ko"' : ''}>${reverse ? option.char : option.answer}</button>`).join('')}</div>
    <p class="feedback" aria-live="polite">${answered ? (quiz.picked === item.char ? '정답이에요! ' : '정답은 ') + item.char + ' · ' + item.answer : ''}</p>
    ${answered ? button(quiz.index + 1 === quiz.questions.length ? '결과 보기' : '다음 문제','advance') : ''}</div>`;
  }
  return '<section class="study"><h1>' + title + '</h1>' + content + '</section>';
}
function route() {
  const name = location.hash.slice(1);
  return ['cards','quiz','review','write','words'].includes(name) ? name : 'home';
}
function render(focus) {
  inkCleanup?.();
  inkCleanup = undefined;
  const page = route();
  document.querySelectorAll('nav a').forEach(link => {
    if (link.hash === '#' + page) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  app.innerHTML = page === 'cards' ? cards() : page === 'write' ? writeView() : page === 'words' ? wordsView() : page === 'quiz' || (page === 'review' && quiz) ? quizView(page === 'review') : page === 'review' ? review() : home();
  if (app.querySelector('#ink')) {
    inkCleanup = attachInk(app.querySelector('#ink'), () => penOnly);
    app.querySelector('#pen-only').addEventListener('change', event => { penOnly = event.target.checked; });
    app.querySelector('#guide').addEventListener('click', event => {
      practiceGuide = !practiceGuide;
      app.querySelector('.practice-guide').hidden = !practiceGuide;
      event.currentTarget.setAttribute('aria-pressed', practiceGuide);
    });
  }
  if (focus) app.querySelector(focus)?.focus();
}
app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const {action, value} = target.dataset;
  let focus = '[data-action="' + action + '"]';
  switch (action) {
    case 'clear-search':
      if (route() === 'words') wordSearch = '';
      else { search = ''; card = 0; revealed = false; }
      focus = '#search-query';
      break;
    case 'filter': group = value; card = 0; revealed = false; focus = '[aria-pressed="true"]'; break;
    case 'reveal': {
      revealed = true;
      const {char} = studySelection()[card];
      if (!record.seen.includes(char)) record.seen.push(char);
      save();
      focus = '[data-action="next"]';
      break;
    }
    case 'prev':
    case 'next':
      card = (card + (action === 'next' ? 1 : -1) + studySelection().length) % studySelection().length;
      revealed = false;
      break;
    case 'start':
    case 'retry':
      start(action === 'start' ? selection() : deck.filter(item => record.wrong.includes(item.char)));
      focus = '#question';
      break;
    case 'pick': {
      if (quiz.picked !== null) return;
      const {char} = quiz.questions[quiz.index].item;
      quiz.picked = value;
      record.attempts++;
      if (value === char) {
        quiz.score++;
        record.correct++;
        record.wrong = record.wrong.filter(wrong => wrong !== char);
      } else if (!record.wrong.includes(char)) record.wrong.push(char);
      save();
      focus = '[data-action="advance"]';
      break;
    }
    case 'advance': quiz.index++; quiz.picked = null; focus = '#question, #quiz-result'; break;
    case 'reset': quiz = null; focus = 'button, .panel a'; break;
  }
  render(focus);
});
app.addEventListener('submit', event => {
  if (event.target.id !== 'lookup') return;
  event.preventDefault();
  const query = new FormData(event.target).get('query').trim();
  if (route() === 'words') wordSearch = query;
  else { search = query; group = '전체'; card = 0; revealed = false; }
  render('#search-query');
});
app.addEventListener('change', event => {
  if (event.target.id !== 'choose-hanja') return;
  card = Number(event.target.value);
  revealed = false;
  render('#choose-hanja');
});
let previousPage = route();
window.addEventListener('hashchange', () => {
  quiz = null;
  const page = route();
  if (page === 'quiz' || previousPage === 'quiz') { group = '전체'; card = 0; revealed = false; }
  previousPage = page;
  render();
  window.scrollTo(0,0);
});
render();
