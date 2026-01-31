// ===== 데이터 =====
let hymns = [];
let favorites = JSON.parse(localStorage.getItem('hymn_favorites') || '[]');
let hymnNotes = JSON.parse(localStorage.getItem('hymn_notes') || '{}');
let currentHymn = null;
let player = null;
let isLoopEnabled = false;
let fontScale = parseFloat(localStorage.getItem('font_scale') || '1');
let progressTimer = null;
let notes = JSON.parse(localStorage.getItem('hymn_notebook') || '[]');
let currentNoteIndex = -1;

// 기도찬양 데이터
const prayerMusic = [
  { id: "prayer1", name: "기도 BGM 1", vid: "f742p7mQ0Ic" },
  { id: "prayer2", name: "기도 BGM 2", vid: "BwsCgTQeKJc" },
  { id: "ccmjazz1", name: "CCM 재즈 1", vid: "VQEXYSZV6hg" },
  { id: "ccmjazz2", name: "CCM 재즈 2", vid: "4iCEvs6qMAc" },
  { id: "prayerbgm", name: "기도원 BGM", vid: "MltCEnth5nM" }
];

// 주제별 카테고리
const themeCategories = {
  "예배": {
    "송영": [1, 7], "경배": [8, 17], "찬양": [18, 41], "주일": [42, 48],
    "봉헌": [49, 52], "예배 마침": [53, 57], "아침과 저녁": [58, 62]
  },
  "성부": { "창조주": [63, 77], "섭리": [78, 79] },
  "성자": {
    "예수 그리스도": [80, 96], "구주 강림": [97, 105], "성탄": [106, 129],
    "주현": [130, 133], "생애": [134, 138], "종려주일": [139, 142],
    "고난": [143, 158], "부활": [159, 173], "재림": [174, 181]
  },
  "성령": { "성령 강림": [182, 195], "은사": [196, 197] },
  "성경": { "성경": [198, 206] },
  "교회": { "하나님 나라": [207, 210], "헌신과 봉사": [211, 218], "성도의 교제": [219, 223] },
  "성례": { "세례 (침례)": [224, 226], "성찬": [227, 233] },
  "천국": { "천국": [234, 249] },
  "구원": { "회개와 용서": [250, 282], "거듭남": [283, 285], "거룩한 생활": [286, 289] },
  "그리스도인의 삶": {
    "은혜와 사랑": [290, 310], "소명과 충성": [311, 335], "시련과 극복": [336, 345],
    "분투와 승리": [346, 360], "기도와 간구": [361, 369], "인도와 보호": [370, 403],
    "평안과 위로": [404, 419], "성결한 생활": [420, 426], "감사의 생활": [427, 429],
    "주와 동행": [430, 447], "제자의 도리": [448, 469], "신유의 권능": [470, 474],
    "화해와 평화": [475, 475], "자연과 환경": [476, 478], "미래와 소망": [479, 494]
  },
  "전도와 선교": {
    "전도": [495, 501], "세계선교": [502, 512], "전도와 교훈": [513, 518],
    "부르심과 영접": [519, 539], "믿음과 확신": [540, 549]
  },
  "행사와 절기": {
    "새해 (송구영신)": [550, 554], "가정": [555, 559], "어린이": [560, 570],
    "젊은이": [571, 575], "어버이": [576, 579], "나라사랑": [580, 584],
    "종교개혁기념일": [585, 586], "감사절": [587, 594]
  },
  "예식": { "임직": [595, 597], "헌당": [598, 600], "혼례": [601, 605], "장례": [606, 610], "추모": [611, 613] },
  "경배와 찬양": { "경배와 찬양": [614, 624] },
  "영창과 기도송": {
    "입례송": [625, 629], "기도송": [630, 632], "헌금응답송": [633, 634],
    "주기도송": [635, 637], "말씀응답송": [638, 639], "축도송": [640, 641], "아멘송": [642, 645]
  }
};

// ===== 초기화 =====
async function init() {
  applyFontScale();
  const res = await fetch('hymns_data.json');
  hymns = await res.json();
  renderAllList(hymns);
  renderThemeTree();
  renderPrayerList();
  renderFavList();
  setupTabs();
  setupSearch();
  setupControls();
  setupMemo();
  setupNotes();
  loadYouTubeAPI();
}

// ===== YouTube API =====
function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function () {
  player = new YT.Player('youtube-player', {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      modestbranding: 1,
      rel: 0
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
};

function onPlayerReady() {
  const vol = document.getElementById('volume');
  player.setVolume(parseInt(vol.value));
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    if (isLoopEnabled) {
      player.seekTo(0);
      player.playVideo();
    } else {
      document.getElementById('play-pause').textContent = '▶ 재생';
    }
  }
  if (event.data === YT.PlayerState.PLAYING) {
    document.getElementById('play-pause').textContent = '⏸ 일시정지';
    document.getElementById('play-pause').disabled = false;
    document.getElementById('stop').disabled = false;
    startProgressTimer();
  }
  if (event.data === YT.PlayerState.PAUSED) {
    document.getElementById('play-pause').textContent = '▶ 재생';
  }
}

function startProgressTimer() {
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    if (!player || !player.getDuration) return;
    const dur = player.getDuration();
    const pos = player.getCurrentTime();
    if (dur > 0) {
      document.getElementById('progress').max = Math.floor(dur);
      document.getElementById('progress').value = Math.floor(pos);
      document.getElementById('current-time').textContent = formatTime(pos);
      document.getElementById('total-time').textContent = formatTime(dur);
    }
  }, 500);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ===== 재생 =====
function playHymn(hymn) {
  if (!player || !player.loadVideoById) return;
  currentHymn = hymn;
  player.loadVideoById(hymn.vid);

  document.getElementById('play-pause').disabled = false;
  document.getElementById('stop').disabled = false;

  // 현재 재생 중 표시
  document.querySelectorAll('.hymn-item.playing, .theme-hymn-item.playing').forEach(el => el.classList.remove('playing'));
  document.querySelectorAll(`[data-hymn-n="${hymn.n}"]`).forEach(el => el.classList.add('playing'));

  // 메모 로드
  loadMemo(hymn.n);
}

// ===== 전체 목록 =====
function renderAllList(list) {
  const ul = document.getElementById('all-list');
  ul.innerHTML = '';
  list.forEach(h => {
    const li = createHymnItem(h);
    ul.appendChild(li);
  });
}

function createHymnItem(h) {
  const li = document.createElement('li');
  li.className = 'hymn-item';
  li.setAttribute('data-hymn-n', h.n);
  if (currentHymn && currentHymn.n === h.n) li.classList.add('playing');

  const text = document.createElement('span');
  text.textContent = `${h.n}장 - ${h.name}`;
  text.style.flex = '1';
  text.style.cursor = 'pointer';
  text.addEventListener('click', () => playHymn(h));

  const fav = document.createElement('button');
  fav.className = 'fav-btn' + (isFavorite(h.n) ? ' active' : '');
  fav.textContent = isFavorite(h.n) ? '★' : '☆';
  fav.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(h);
    fav.className = 'fav-btn' + (isFavorite(h.n) ? ' active' : '');
    fav.textContent = isFavorite(h.n) ? '★' : '☆';
  });

  li.appendChild(text);
  li.appendChild(fav);
  return li;
}

// ===== 기도찬양 =====
function renderPrayerList() {
  const ul = document.getElementById('prayer-list');
  ul.innerHTML = '';
  prayerMusic.forEach(p => {
    const li = document.createElement('li');
    li.className = 'hymn-item';
    li.setAttribute('data-hymn-n', p.id);

    const text = document.createElement('span');
    text.textContent = p.name;
    text.style.flex = '1';
    text.style.cursor = 'pointer';
    text.addEventListener('click', () => playHymn({ n: null, name: p.name, vid: p.vid, id: p.id }));

    li.appendChild(text);
    ul.appendChild(li);
  });
}

// ===== 검색 =====
function setupSearch() {
  const input = document.getElementById('search');
  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q) { renderAllList(hymns); return; }

    const numMatch = q.match(/^(\d+)장?$/);
    let results;
    if (numMatch) {
      const num = parseInt(numMatch[1]);
      results = hymns.filter(h => h.n === num);
    } else {
      const ql = q.toLowerCase();
      results = hymns.filter(h => h.name.toLowerCase().includes(ql));
    }
    if (!results.length && numMatch) {
      results = hymns.filter(h => String(h.n).startsWith(q.replace(/장$/, '')));
    }
    renderAllList(results);
  });
}

// ===== 주제별 =====
function renderThemeTree() {
  const container = document.getElementById('theme-tree');
  container.innerHTML = '';

  const hymnMap = {};
  hymns.forEach(h => { hymnMap[h.n] = h; });

  for (const [major, subs] of Object.entries(themeCategories)) {
    const majorDiv = document.createElement('div');
    majorDiv.className = 'theme-major';
    majorDiv.textContent = major;
    majorDiv.addEventListener('click', () => majorDiv.classList.toggle('open'));

    const subGroup = document.createElement('div');
    subGroup.className = 'theme-sub-group';

    for (const [sub, [start, end]] of Object.entries(subs)) {
      const subDiv = document.createElement('div');
      subDiv.className = 'theme-sub';
      subDiv.textContent = `${sub} (${start}장~${end}장)`;
      subDiv.addEventListener('click', () => subDiv.classList.toggle('open'));

      const hymnsDiv = document.createElement('div');
      hymnsDiv.className = 'theme-hymns';

      for (let n = start; n <= end; n++) {
        const h = hymnMap[n];
        if (!h) continue;
        const item = document.createElement('div');
        item.className = 'theme-hymn-item';
        item.setAttribute('data-hymn-n', h.n);
        item.textContent = `${h.n}장 - ${h.name}`;
        item.addEventListener('click', () => playHymn(h));
        hymnsDiv.appendChild(item);
      }

      subGroup.appendChild(subDiv);
      subGroup.appendChild(hymnsDiv);
    }

    container.appendChild(majorDiv);
    container.appendChild(subGroup);
  }
}

// ===== 보관함 =====
function isFavorite(n) {
  return favorites.includes(n);
}

function toggleFavorite(h) {
  const idx = favorites.indexOf(h.n);
  if (idx >= 0) {
    favorites.splice(idx, 1);
  } else {
    favorites.push(h.n);
  }
  localStorage.setItem('hymn_favorites', JSON.stringify(favorites));
  renderFavList();
  updateFavTab();
  // 전체 목록의 별도 업데이트
  document.querySelectorAll(`[data-hymn-n="${h.n}"] .fav-btn`).forEach(btn => {
    btn.className = 'fav-btn' + (isFavorite(h.n) ? ' active' : '');
    btn.textContent = isFavorite(h.n) ? '★' : '☆';
  });
}

function renderFavList() {
  const ul = document.getElementById('fav-list');
  const empty = document.getElementById('fav-empty');
  ul.innerHTML = '';

  if (favorites.length === 0) {
    empty.classList.add('show');
    return;
  }
  empty.classList.remove('show');

  const hymnMap = {};
  hymns.forEach(h => { hymnMap[h.n] = h; });

  favorites.forEach(n => {
    const h = hymnMap[n];
    if (!h) return;
    const li = createHymnItem(h);
    ul.appendChild(li);
  });
}

function updateFavTab() {
  const tab = document.querySelector('[data-tab="fav"]');
  tab.textContent = `보관함 (${favorites.length})`;
}

// ===== 탭 =====
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  const playerPanel = document.getElementById('player-panel');
  const notepadPanel = document.getElementById('notepad-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');

      // 메모장 탭이면 우측에 메모장 에디터 표시, 아니면 플레이어 표시
      if (tab.dataset.tab === 'notes') {
        playerPanel.style.display = 'none';
        notepadPanel.classList.add('active');
      } else {
        playerPanel.style.display = '';
        notepadPanel.classList.remove('active');
      }
    });
  });

  updateFavTab();
}

// ===== 재생 컨트롤 =====
function setupControls() {
  document.getElementById('play-pause').addEventListener('click', () => {
    if (!player) return;
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  });

  document.getElementById('stop').addEventListener('click', () => {
    if (!player) return;
    player.stopVideo();
    clearInterval(progressTimer);
    document.getElementById('play-pause').textContent = '⏸ 일시정지';
    document.getElementById('play-pause').disabled = true;
    document.getElementById('stop').disabled = true;
    document.getElementById('progress').value = 0;
    document.getElementById('current-time').textContent = '0:00';
    document.getElementById('total-time').textContent = '0:00';
    currentHymn = null;
    document.querySelectorAll('.hymn-item.playing, .theme-hymn-item.playing').forEach(el => el.classList.remove('playing'));
    loadMemo(null);
  });

  document.getElementById('loop').addEventListener('click', function () {
    isLoopEnabled = !isLoopEnabled;
    this.classList.toggle('loop-active', isLoopEnabled);
  });

  document.getElementById('volume').addEventListener('input', function () {
    if (player && player.setVolume) player.setVolume(parseInt(this.value));
    document.getElementById('volume-value').textContent = this.value + '%';
  });

  document.getElementById('progress').addEventListener('input', function () {
    if (player && player.seekTo) player.seekTo(parseInt(this.value), true);
  });
}

// ===== 메모 =====
let memoTimeout = null;

function setupMemo() {
  document.getElementById('hymn-memo').addEventListener('input', function () {
    if (currentHymn === null) return;
    clearTimeout(memoTimeout);
    memoTimeout = setTimeout(() => {
      const text = this.value.trim();
      if (text) {
        hymnNotes[currentHymn.n] = text;
      } else {
        delete hymnNotes[currentHymn.n];
      }
      localStorage.setItem('hymn_notes', JSON.stringify(hymnNotes));
      const status = document.getElementById('memo-status');
      status.textContent = '✓ 저장됨';
      setTimeout(() => { status.textContent = ''; }, 2000);
    }, 500);
  });
}

function loadMemo(hymnNumber) {
  const textarea = document.getElementById('hymn-memo');
  const status = document.getElementById('memo-status');
  if (hymnNumber && hymnNotes[hymnNumber]) {
    textarea.value = hymnNotes[hymnNumber];
  } else {
    textarea.value = '';
  }
  status.textContent = '';
}

// ===== 메모장 =====
function setupNotes() {
  // 좌측 목록 버튼
  document.getElementById('new-note').addEventListener('click', () => {
    const note = {
      title: '새 메모',
      content: '',
      date: new Date().toISOString()
    };
    notes.unshift(note);
    saveNotes();
    renderNotesList();
    selectNote(0);
  });

  document.getElementById('delete-note').addEventListener('click', () => {
    if (currentNoteIndex < 0 || currentNoteIndex >= notes.length) return;
    if (!confirm('이 메모를 삭제하시겠습니까?')) return;
    notes.splice(currentNoteIndex, 1);
    currentNoteIndex = -1;
    saveNotes();
    renderNotesList();
    clearNoteEditor();
  });

  // 우측 메모장 저장
  document.getElementById('notepad-save').addEventListener('click', () => {
    if (currentNoteIndex < 0 || currentNoteIndex >= notes.length) return;
    notes[currentNoteIndex].title = document.getElementById('notepad-title').value.trim() || '제목 없음';
    notes[currentNoteIndex].content = document.getElementById('notepad-editor').innerHTML;
    notes[currentNoteIndex].date = new Date().toISOString();
    saveNotes();
    renderNotesList();
    const status = document.getElementById('notepad-status');
    status.textContent = '✓ 저장됨';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });

  // 서식 도구모음
  document.getElementById('notepad-bold').addEventListener('click', () => {
    document.execCommand('bold');
    document.getElementById('notepad-editor').focus();
  });
  document.getElementById('notepad-italic').addEventListener('click', () => {
    document.execCommand('italic');
    document.getElementById('notepad-editor').focus();
  });
  document.getElementById('notepad-underline').addEventListener('click', () => {
    document.execCommand('underline');
    document.getElementById('notepad-editor').focus();
  });
  document.getElementById('notepad-fontsize').addEventListener('change', function () {
    document.execCommand('fontSize', false, this.value);
    document.getElementById('notepad-editor').focus();
  });
  document.getElementById('notepad-left').addEventListener('click', () => {
    document.execCommand('justifyLeft');
    document.getElementById('notepad-editor').focus();
  });
  document.getElementById('notepad-center').addEventListener('click', () => {
    document.execCommand('justifyCenter');
    document.getElementById('notepad-editor').focus();
  });
  document.getElementById('notepad-right').addEventListener('click', () => {
    document.execCommand('justifyRight');
    document.getElementById('notepad-editor').focus();
  });
  document.getElementById('notepad-ul').addEventListener('click', () => {
    document.execCommand('insertUnorderedList');
    document.getElementById('notepad-editor').focus();
  });

  renderNotesList();
}

function renderNotesList() {
  const ul = document.getElementById('notes-list');
  ul.innerHTML = '';

  if (notes.length === 0) {
    ul.innerHTML = '<div class="notes-empty">메모가 없습니다.<br>"+ 새 메모"를 눌러 추가하세요.</div>';
    clearNoteEditor();
    return;
  }

  notes.forEach((note, i) => {
    const li = document.createElement('li');
    li.className = 'hymn-item' + (i === currentNoteIndex ? ' note-active' : '');
    const text = document.createElement('span');
    text.style.flex = '1';
    text.style.cursor = 'pointer';
    text.textContent = note.title;
    const dateSpan = document.createElement('span');
    dateSpan.textContent = new Date(note.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    dateSpan.style.fontSize = '11px';
    dateSpan.style.opacity = '0.5';
    text.addEventListener('click', () => selectNote(i));
    li.appendChild(text);
    li.appendChild(dateSpan);
    ul.appendChild(li);
  });
}

function selectNote(index) {
  if (index < 0 || index >= notes.length) return;
  currentNoteIndex = index;
  document.getElementById('notepad-title').value = notes[index].title;
  document.getElementById('notepad-editor').innerHTML = notes[index].content;
  renderNotesList();
}

function clearNoteEditor() {
  document.getElementById('notepad-title').value = '';
  document.getElementById('notepad-editor').innerHTML = '';
}

function saveNotes() {
  localStorage.setItem('hymn_notebook', JSON.stringify(notes));
}

// ===== 다크모드 =====
const savedTheme = localStorage.getItem('hymn_theme');
let isDark = savedTheme === null ? true : savedTheme === 'dark';

function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('hymn_theme', isDark ? 'dark' : 'light');
}

// 즉시 테마 적용 (깜빡임 방지)
applyTheme();

// ===== 글자 크기 =====
function applyFontScale() {
  document.documentElement.style.setProperty('--font-scale', fontScale);
  const label = document.getElementById('zoom-level');
  if (label) label.textContent = Math.round(fontScale * 100) + '%';
}

// ===== 사이드바 토글 =====
let sidebarCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';

function applySidebar() {
  const panel = document.getElementById('list-panel');
  const openBtn = document.getElementById('sidebar-open');
  if (sidebarCollapsed) {
    panel.classList.add('collapsed');
    openBtn.classList.add('visible');
  } else {
    panel.classList.remove('collapsed');
    openBtn.classList.remove('visible');
  }
  localStorage.setItem('sidebar_collapsed', sidebarCollapsed);
}

// ===== UI 이벤트 바인딩 =====
function setupUI() {
  // 다크모드 토글
  const themeBtn = document.getElementById('theme-toggle');
  themeBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    isDark = !isDark;
    applyTheme();
  });

  // 글자 크기
  document.getElementById('zoom-in').addEventListener('click', () => {
    if (fontScale < 2) { fontScale = Math.round((fontScale + 0.1) * 10) / 10; }
    localStorage.setItem('font_scale', fontScale);
    applyFontScale();
  });
  document.getElementById('zoom-out').addEventListener('click', () => {
    if (fontScale > 0.5) { fontScale = Math.round((fontScale - 0.1) * 10) / 10; }
    localStorage.setItem('font_scale', fontScale);
    applyFontScale();
  });

  // 사이드바 토글
  document.getElementById('sidebar-close').addEventListener('click', () => {
    sidebarCollapsed = true;
    applySidebar();
  });
  document.getElementById('sidebar-open').addEventListener('click', () => {
    sidebarCollapsed = false;
    applySidebar();
  });
  applySidebar();
}

// ===== 실행 =====
setupUI();
applyTheme();
init();
