// ===== 앱 상태 =====
const App = {
  user: null,
  userDoc: null,
  currentPage: 'dashboard',
  currentCourse: null,
  quizData: [],
  quizIndex: 0,
  quizScore: 0,
};

// ===== 유틸 =====
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.className = 'toast', 2800);
}

function $(id) { return document.getElementById(id); }

function formatDate(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('ko-KR');
}

// ===== 인증 =====
auth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    App.user = firebaseUser;
    const doc = await db.collection('users').doc(firebaseUser.uid).get();
    if (!doc.exists) {
      // 최초 로그인 시 사용자 문서 생성
      await db.collection('users').doc(firebaseUser.uid).set({
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        role: 'student',
        progress: {},
        completedCourses: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      App.userDoc = (await db.collection('users').doc(firebaseUser.uid).get()).data();
    } else {
      App.userDoc = doc.data();
    }
    initApp();
  } else {
    $('login-page').style.display = 'flex';
    $('app').style.display = 'none';
  }
});

async function handleLogin() {
  const email = $('login-email').value.trim();
  const pw = $('login-pw').value;
  const err = $('login-error');
  err.style.display = 'none';
  try {
    await auth.signInWithEmailAndPassword(email, pw);
  } catch (e) {
    err.style.display = 'block';
    err.textContent = '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
}

async function handleSignup() {
  const name = $('signup-name').value.trim();
  const email = $('signup-email').value.trim();
  const pw = $('signup-pw').value;
  const pw2 = $('signup-pw2').value;
  const err = $('signup-error');
  err.style.display = 'none';

  if (!name) { err.style.display = 'block'; err.textContent = '이름을 입력하세요.'; return; }
  if (!email) { err.style.display = 'block'; err.textContent = '이메일을 입력하세요.'; return; }
  if (pw.length < 6) { err.style.display = 'block'; err.textContent = '비밀번호는 6자리 이상이어야 합니다.'; return; }
  if (pw !== pw2) { err.style.display = 'block'; err.textContent = '비밀번호가 일치하지 않습니다.'; return; }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pw);
    await cred.user.updateProfile({ displayName: name });
    await db.collection('users').doc(cred.user.uid).set({
      email,
      name,
      role: 'student',
      progress: {},
      completedCourses: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    err.style.display = 'block';
    if (e.code === 'auth/email-already-in-use') err.textContent = '이미 사용 중인 이메일입니다.';
    else err.textContent = '회원가입 중 오류가 발생했습니다.';
  }
}

function toggleAuthForm(type) {
  $('form-login').style.display = type === 'login' ? 'block' : 'none';
  $('form-signup').style.display = type === 'signup' ? 'block' : 'none';
}

function handleLogout() {
  auth.signOut();
}

// ===== 앱 초기화 =====
function initApp() {
  $('login-page').style.display = 'none';
  $('app').style.display = 'block';

  // 사용자 정보 표시
  const name = App.userDoc.name || App.user.email;
  $('user-name').textContent = name;
  $('user-role').textContent = App.userDoc.role === 'admin' ? '관리자' : '학습자';
  $('user-avatar').textContent = name[0].toUpperCase();

  // 관리자 메뉴 표시
  if (App.userDoc.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
  }

  // 저장된 테마 색상 적용
  loadThemeColor();

  navigate('dashboard');
}

// ===== 라우팅 =====
function navigate(page, data = null) {
  App.currentPage = page;
  App.currentCourse = data;

  // 네비 활성화
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // 페이지 렌더
  const content = $('page-content');
  content.innerHTML = '<div class="spinner"></div>';

  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'courses': renderCourses(); break;
    case 'viewer': renderViewer(data); break;
    case 'quiz': startQuiz(data); break;
    case 'admin-content': renderAdminContent(); break;
    case 'admin-quiz': renderAdminQuiz(data); break;
    case 'admin-progress': renderAdminProgress(); break;
    case 'admin-settings': renderAdminSettings(); break;
  }
}

// ===== 대시보드 =====
async function renderDashboard() {
  const courses = await db.collection('courses').orderBy('order').get();
  const total = courses.size;
  const completed = (App.userDoc.completedCourses || []).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  $('page-content').innerHTML = `
    <div class="page-header">
      <h1>안녕하세요, ${App.userDoc.name}님 👋</h1>
      <p>오늘도 학습을 이어가세요!</p>
    </div>
    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-num">${total}</div>
        <div class="stat-label">전체 학습</div>
      </div>
      <div class="card stat-card">
        <div class="stat-num">${completed}</div>
        <div class="stat-label">완료한 학습</div>
      </div>
      <div class="card stat-card">
        <div class="stat-num">${progress}%</div>
        <div class="stat-label">전체 진도율</div>
      </div>
    </div>
    <div class="page-header" style="margin-bottom:16px">
      <h1 style="font-size:18px">이어서 학습하기</h1>
    </div>
    <div id="recent-courses"></div>
  `;

  // 최근 미완료 학습 3개
  const recentEl = $('recent-courses');
  const incompleteCourses = courses.docs.filter(d => !(App.userDoc.completedCourses || []).includes(d.id)).slice(0, 3);
  if (incompleteCourses.length === 0) {
    recentEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><p>모든 학습을 완료했습니다!</p></div>`;
  } else {
    recentEl.innerHTML = `<div class="course-grid">${incompleteCourses.map(d => courseCardHTML(d.id, d.data())).join('')}</div>`;
  }
}

// ===== 학습 목록 =====
async function renderCourses() {
  const snap = await db.collection('courses').orderBy('order').get();
  const completed = App.userDoc.completedCourses || [];

  if (snap.empty) {
    $('page-content').innerHTML = `
      <div class="page-header"><h1>학습 목록</h1></div>
      <div class="empty-state"><div class="empty-icon">📚</div><p>등록된 학습이 없습니다.</p></div>
    `;
    return;
  }

  $('page-content').innerHTML = `
    <div class="page-header">
      <h1>학습 목록</h1>
      <p>총 ${snap.size}개의 학습 콘텐츠가 있습니다.</p>
    </div>
    <div class="course-grid">${snap.docs.map(d => courseCardHTML(d.id, d.data())).join('')}</div>
  `;
}

function courseCardHTML(id, data) {
  const completed = (App.userDoc.completedCourses || []).includes(id);
  const typeMap = { text: ['📝', 'badge-text', '글 학습'], video: ['🎥', 'badge-video', '영상 학습'], ppt: ['📊', 'badge-ppt', 'PPT 학습'] };
  const [icon, badgeClass, label] = typeMap[data.type] || ['📄', 'badge-text', '학습'];

  return `
    <div class="card course-card" onclick="openCourse('${id}')">
      ${completed ? '<div class="done-check">✅</div>' : ''}
      <div class="course-type"><span class="badge ${badgeClass}">${icon} ${label}</span></div>
      <h3>${data.title}</h3>
      <p>${data.description || ''}</p>
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width:${completed ? 100 : 0}%"></div>
      </div>
    </div>
  `;
}

async function openCourse(courseId) {
  const doc = await db.collection('courses').doc(courseId).get();
  if (!doc.exists) { showToast('학습을 찾을 수 없습니다.', 'error'); return; }
  navigate('viewer', { id: courseId, ...doc.data() });
}

// ===== 학습 뷰어 =====
async function renderViewer(courseData) {
  if (!courseData) return;

  let contentHTML = '';
  if (courseData.type === 'text') {
    contentHTML = `<div class="viewer-text-content">${(courseData.content || '').replace(/\n/g, '<br>')}</div>`;
  } else if (courseData.type === 'video') {
    const url = courseData.fileUrl || '';
    // YouTube embed 처리
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&]+)/);
    if (ytMatch) {
      contentHTML = `<div class="viewer-video-content"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen></iframe></div>`;
    } else {
      contentHTML = `<div class="viewer-video-content"><video controls src="${url}"></video></div>`;
    }
  } else if (courseData.type === 'ppt') {
    const url = courseData.fileUrl || '';
    // Google Slides 또는 Office Online 임베드
    const embedUrl = url.includes('docs.google.com') ? url.replace('/edit', '/embed') :
      `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    contentHTML = `<div class="viewer-ppt-content"><iframe src="${embedUrl}" allowfullscreen></iframe></div>`;
  }

  const typeMap = { text: 'badge-text', video: 'badge-video', ppt: 'badge-ppt' };
  const labelMap = { text: '📝 글 학습', video: '🎥 영상 학습', ppt: '📊 PPT 학습' };

  $('page-content').innerHTML = `
    <div class="viewer-wrap">
      <div class="viewer-header">
        <button class="btn btn-outline btn-sm" onclick="navigate('courses')">← 목록으로</button>
        <div>
          <span class="badge ${typeMap[courseData.type] || 'badge-text'}">${labelMap[courseData.type] || '학습'}</span>
        </div>
        <h2>${courseData.title}</h2>
      </div>
      <div class="card viewer-body">
        ${contentHTML}
      </div>
      <div class="viewer-nav">
        <p style="font-size:13px;color:var(--text-muted)">학습을 완료했나요?</p>
        <button class="btn btn-primary" onclick="completeCourse('${courseData.id}')">✅ 학습 완료</button>
      </div>
    </div>
  `;
}

async function completeCourse(courseId) {
  const completed = App.userDoc.completedCourses || [];
  if (completed.includes(courseId)) {
    showToast('이미 완료한 학습입니다.', 'info');
    // 퀴즈로 바로 이동 가능
    navigate('quiz', courseId);
    return;
  }
  completed.push(courseId);
  await db.collection('users').doc(App.user.uid).update({
    completedCourses: completed,
    [`progress.${courseId}`]: true
  });
  App.userDoc.completedCourses = completed;
  showToast('학습을 완료했습니다! 퀴즈를 시작합니다.', 'success');
  setTimeout(() => navigate('quiz', courseId), 1000);
}

// ===== 퀴즈 =====
async function startQuiz(courseId) {
  const snap = await db.collection('courses').doc(courseId).collection('quizzes').get();
  if (snap.empty) {
    $('page-content').innerHTML = `
      <div class="page-header"><h1>퀴즈</h1></div>
      <div class="empty-state"><div class="empty-icon">❓</div><p>등록된 퀴즈가 없습니다.</p><br>
      <button class="btn btn-outline" onclick="navigate('courses')">← 목록으로</button></div>
    `;
    return;
  }

  // 랜덤 5개 선택
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 5);
  App.quizData = shuffled;
  App.quizIndex = 0;
  App.quizScore = 0;

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = App.quizData[App.quizIndex];
  if (!q) { renderQuizResult(); return; }

  $('page-content').innerHTML = `
    <div class="quiz-wrap">
      <div class="page-header"><h1>퀴즈</h1></div>
      <div class="card" style="padding:28px">
        <div class="quiz-progress">${App.quizIndex + 1} / ${App.quizData.length}</div>
        <div class="progress-bar-wrap" style="margin-bottom:20px">
          <div class="progress-bar" style="width:${((App.quizIndex)/App.quizData.length)*100}%"></div>
        </div>
        <div class="quiz-q">${q.question}</div>
        <div class="quiz-options">
          ${(q.options || []).map((opt, i) => `
            <div class="quiz-option" onclick="answerQuiz(${i}, ${q.answer}, this)">${opt}</div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function answerQuiz(selected, correct, el) {
  document.querySelectorAll('.quiz-option').forEach(o => o.style.pointerEvents = 'none');
  if (selected === correct) {
    el.classList.add('correct');
    App.quizScore++;
  } else {
    el.classList.add('wrong');
    document.querySelectorAll('.quiz-option')[correct].classList.add('correct');
  }
  setTimeout(() => {
    App.quizIndex++;
    renderQuizQuestion();
  }, 1000);
}

function renderQuizResult() {
  const pct = Math.round((App.quizScore / App.quizData.length) * 100);
  const msg = pct >= 80 ? '훌륭해요! 🎉' : pct >= 60 ? '잘 했어요! 👍' : '다시 도전해보세요 💪';
  $('page-content').innerHTML = `
    <div class="quiz-wrap">
      <div class="card quiz-result">
        <div class="score">${App.quizScore}/${App.quizData.length}</div>
        <div class="score-label">${pct}점 · ${msg}</div>
        <div style="margin-top:28px;display:flex;gap:12px;justify-content:center">
          <button class="btn btn-outline" onclick="navigate('courses')">← 학습 목록</button>
          <button class="btn btn-primary" onclick="navigate('dashboard')">🏠 홈으로</button>
        </div>
      </div>
    </div>
  `;
}

// ===== 관리자: 콘텐츠 관리 =====
async function renderAdminContent() {
  const snap = await db.collection('courses').orderBy('order').get();

  $('page-content').innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><h1>콘텐츠 관리</h1><p>학습 자료를 추가하고 순서를 조정하세요.</p></div>
      <button class="btn btn-primary" onclick="openContentModal()">+ 새 콘텐츠 추가</button>
    </div>
    <div class="content-list" id="content-list">
      ${snap.empty ? `<div class="empty-state"><div class="empty-icon">📂</div><p>등록된 콘텐츠가 없습니다.</p></div>` :
        snap.docs.map((d, i) => contentItemHTML(d.id, d.data(), i)).join('')}
    </div>
  `;

  // 드래그 앤 드롭 정렬
  if (!snap.empty) initDragSort();
}

function contentItemHTML(id, data, idx) {
  const typeMap = { text: ['📝', 'badge-text'], video: ['🎥', 'badge-video'], ppt: ['📊', 'badge-ppt'] };
  const [icon, badgeClass] = typeMap[data.type] || ['📄', 'badge-text'];
  return `
    <div class="card content-item" data-id="${id}" draggable="true">
      <span class="drag-handle">⠿</span>
      <div class="content-info">
        <div class="content-title">${data.title}</div>
        <div class="content-meta"><span class="badge ${badgeClass}" style="font-size:11px">${icon} ${data.type}</span> · 순서 ${idx + 1}</div>
      </div>
      <div class="content-actions">
        <button class="btn btn-outline btn-sm" onclick="editContent('${id}')">수정</button>
        <button class="btn btn-danger btn-sm" onclick="deleteContent('${id}')">삭제</button>
      </div>
    </div>
  `;
}

function initDragSort() {
  const list = $('content-list');
  let dragged = null;
  list.querySelectorAll('.content-item').forEach(item => {
    item.addEventListener('dragstart', () => { dragged = item; item.style.opacity = '0.5'; });
    item.addEventListener('dragend', () => { item.style.opacity = '1'; saveSortOrder(); });
    item.addEventListener('dragover', e => { e.preventDefault(); const rect = item.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) list.insertBefore(dragged, item);
      else list.insertBefore(dragged, item.nextSibling);
    });
  });
}

async function saveSortOrder() {
  const items = document.querySelectorAll('.content-item[data-id]');
  const batch = db.batch();
  items.forEach((el, i) => {
    batch.update(db.collection('courses').doc(el.dataset.id), { order: i });
  });
  await batch.commit();
  showToast('순서가 저장되었습니다.', 'success');
}

// 콘텐츠 추가/수정 모달
let editingId = null;
function openContentModal(id = null, data = null) {
  editingId = id;
  $('modal-title').textContent = id ? '콘텐츠 수정' : '새 콘텐츠 추가';
  $('content-form-title').value = data?.title || '';
  $('content-form-type').value = data?.type || 'text';
  $('content-form-desc').value = data?.description || '';
  $('content-form-body').value = data?.content || '';
  $('content-form-url').value = data?.fileUrl || '';
  toggleContentFields();
  $('content-modal').classList.add('open');
}

function toggleContentFields() {
  const type = $('content-form-type').value;
  $('field-body').style.display = type === 'text' ? 'block' : 'none';
  $('field-url').style.display = type !== 'text' ? 'block' : 'none';
  $('field-file').style.display = type !== 'text' ? 'block' : 'none';
  $('url-label').textContent = type === 'video' ? '영상 URL (YouTube 또는 직접 URL)' : 'PPT URL (Google Slides 또는 직접 URL)';
}

async function saveContent() {
  const title = $('content-form-title').value.trim();
  const type = $('content-form-type').value;
  const description = $('content-form-desc').value.trim();
  const content = $('content-form-body').value;
  let fileUrl = $('content-form-url').value.trim();

  if (!title) { showToast('제목을 입력하세요.', 'error'); return; }

  // 파일 업로드 처리
  const fileInput = $('content-form-file');
  if (fileInput.files[0]) {
    showToast('파일 업로드 중...', 'info');
    const file = fileInput.files[0];
    const ref = storage.ref(`courses/${Date.now()}_${file.name}`);
    await ref.put(file);
    fileUrl = await ref.getDownloadURL();
  }

  const snap = await db.collection('courses').orderBy('order', 'desc').limit(1).get();
  const maxOrder = snap.empty ? 0 : (snap.docs[0].data().order || 0) + 1;

  const courseData = { title, type, description, content, fileUrl, order: editingId ? undefined : maxOrder };
  if (editingId) delete courseData.order;

  if (editingId) {
    await db.collection('courses').doc(editingId).update(courseData);
    showToast('수정되었습니다.', 'success');
  } else {
    await db.collection('courses').add({ ...courseData, order: maxOrder, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    showToast('추가되었습니다.', 'success');
  }

  closeModal('content-modal');
  renderAdminContent();
}

async function editContent(id) {
  const doc = await db.collection('courses').doc(id).get();
  openContentModal(id, doc.data());
}

async function deleteContent(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  await db.collection('courses').doc(id).delete();
  showToast('삭제되었습니다.', 'success');
  renderAdminContent();
}

// ===== 관리자: 진도율 =====
async function renderAdminProgress() {
  const [usersSnap, coursesSnap] = await Promise.all([
    db.collection('users').where('role', '==', 'student').get(),
    db.collection('courses').orderBy('order').get()
  ]);

  const totalCourses = coursesSnap.size;

  $('page-content').innerHTML = `
    <div class="page-header">
      <h1>학습자 진도율</h1>
      <p>총 ${usersSnap.size}명의 학습자</p>
    </div>
    <div class="card" style="overflow:hidden">
      <table class="student-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>이메일</th>
            <th>완료 학습</th>
            <th>진도율</th>
            <th>가입일</th>
          </tr>
        </thead>
        <tbody>
          ${usersSnap.empty ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">학습자가 없습니다.</td></tr>` :
            usersSnap.docs.map(d => {
              const u = d.data();
              const done = (u.completedCourses || []).length;
              const pct = totalCourses > 0 ? Math.round((done / totalCourses) * 100) : 0;
              return `
                <tr>
                  <td><strong>${u.name || '-'}</strong></td>
                  <td style="color:var(--text-muted)">${u.email}</td>
                  <td>${done} / ${totalCourses}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="progress-bar-wrap" style="width:80px;margin:0">
                        <div class="progress-bar" style="width:${pct}%"></div>
                      </div>
                      <span style="font-size:13px">${pct}%</span>
                    </div>
                  </td>
                  <td style="color:var(--text-muted)">${formatDate(u.createdAt)}</td>
                </tr>
              `;
            }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ===== 관리자: 색상 설정 =====
const THEME_COLORS = [
  { name: '블루', value: '#2563eb' },
  { name: '인디고', value: '#4f46e5' },
  { name: '퍼플', value: '#7c3aed' },
  { name: '핑크', value: '#db2777' },
  { name: '레드', value: '#dc2626' },
  { name: '오렌지', value: '#ea580c' },
  { name: '그린', value: '#16a34a' },
  { name: '틸', value: '#0d9488' },
];

function renderAdminSettings() {
  const current = localStorage.getItem('theme-color') || '#2563eb';

  $('page-content').innerHTML = `
    <div class="page-header"><h1>설정</h1></div>
    <div class="color-settings">
      <div class="card" style="padding:24px">
        <h3 style="font-size:16px;margin-bottom:16px">🎨 테마 색상</h3>
        <div class="color-swatches">
          ${THEME_COLORS.map(c => `
            <div class="swatch ${c.value === current ? 'selected' : ''}"
              style="background:${c.value}"
              title="${c.name}"
              onclick="applyThemeColor('${c.value}', this)">
            </div>
          `).join('')}
        </div>
        <div class="form-group">
          <label>직접 입력 (hex)</label>
          <input type="color" id="custom-color" value="${current}" style="height:42px;padding:4px 8px"
            oninput="applyThemeColor(this.value)">
        </div>
        <div class="color-preview">미리보기 버튼</div>
      </div>

      <div class="card" style="padding:24px;margin-top:16px">
        <h3 style="font-size:16px;margin-bottom:16px">👤 관리자 계정 추가</h3>
        <div class="form-group">
          <label>이메일로 관리자 권한 부여</label>
          <input type="email" id="admin-email" placeholder="user@example.com">
        </div>
        <button class="btn btn-primary" onclick="grantAdmin()">관리자 권한 부여</button>
      </div>
    </div>
  `;
}

function applyThemeColor(color, el) {
  document.documentElement.style.setProperty('--primary', color);
  // primary-dark (어둡게)
  document.documentElement.style.setProperty('--primary-dark', shadeColor(color, -20));
  // primary-light (밝게)
  document.documentElement.style.setProperty('--primary-light', shadeColor(color, 80) + '40');
  localStorage.setItem('theme-color', color);
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
  if (el) el.classList.add('selected');
  showToast('색상이 변경되었습니다.', 'success');
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function loadThemeColor() {
  const saved = localStorage.getItem('theme-color');
  if (saved) applyThemeColor(saved);
}

async function grantAdmin() {
  const email = $('admin-email').value.trim();
  if (!email) { showToast('이메일을 입력하세요.', 'error'); return; }
  const snap = await db.collection('users').where('email', '==', email).get();
  if (snap.empty) { showToast('해당 이메일의 사용자를 찾을 수 없습니다.', 'error'); return; }
  await snap.docs[0].ref.update({ role: 'admin' });
  showToast(`${email}에게 관리자 권한을 부여했습니다.`, 'success');
  $('admin-email').value = '';
}

// ===== 모달 =====
function closeModal(id) {
  $(id).classList.remove('open');
}

// ===== 관리자: 퀴즈 관리 =====
async function renderAdminQuiz(courseId) {
  // courseId가 없으면 코스 선택 화면
  if (!courseId) {
    const snap = await db.collection('courses').orderBy('order').get();
    $('page-content').innerHTML = `
      <div class="page-header">
        <h1>퀴즈 관리</h1>
        <p>퀴즈를 관리할 학습을 선택하세요.</p>
      </div>
      <div class="content-list">
        ${snap.empty
          ? `<div class="empty-state"><div class="empty-icon">📂</div><p>등록된 콘텐츠가 없습니다.</p></div>`
          : snap.docs.map(d => {
              const data = d.data();
              const typeMap = { text: ['📝','badge-text'], video: ['🎥','badge-video'], ppt: ['📊','badge-ppt'] };
              const [icon, badge] = typeMap[data.type] || ['📄','badge-text'];
              return `
                <div class="card content-item" style="cursor:pointer" onclick="navigate('admin-quiz','${d.id}')">
                  <div class="content-info">
                    <div class="content-title">${data.title}</div>
                    <div class="content-meta"><span class="badge ${badge}" style="font-size:11px">${icon} ${data.type}</span></div>
                  </div>
                  <button class="btn btn-outline btn-sm">퀴즈 관리 →</button>
                </div>
              `;
            }).join('')}
      </div>
    `;
    return;
  }

  // 특정 코스의 퀴즈 목록
  const [courseDoc, quizSnap] = await Promise.all([
    db.collection('courses').doc(courseId).get(),
    db.collection('courses').doc(courseId).collection('quizzes').get()
  ]);
  const courseTitle = courseDoc.data()?.title || '학습';

  $('page-content').innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <button class="btn btn-outline btn-sm" onclick="navigate('admin-quiz')" style="margin-bottom:10px">← 학습 목록</button>
        <h1>${courseTitle} · 퀴즈</h1>
        <p>총 ${quizSnap.size}개의 퀴즈 · 학습자에게는 랜덤 5개가 출제됩니다.</p>
      </div>
      <button class="btn btn-primary" onclick="openQuizModal('${courseId}')">+ 퀴즈 추가</button>
    </div>
    <div class="content-list" id="quiz-list">
      ${quizSnap.empty
        ? `<div class="empty-state"><div class="empty-icon">❓</div><p>등록된 퀴즈가 없습니다.</p></div>`
        : quizSnap.docs.map((d, i) => quizItemHTML(courseId, d.id, d.data(), i)).join('')}
    </div>
  `;
}

function quizItemHTML(courseId, quizId, data, idx) {
  const correctLabel = data.options?.[data.answer] || '-';
  return `
    <div class="card content-item" data-quiz-id="${quizId}">
      <div class="content-info">
        <div class="content-title">Q${idx + 1}. ${data.question}</div>
        <div class="content-meta" style="margin-top:6px">
          ${(data.options || []).map((opt, i) =>
            `<span style="margin-right:10px;${i === data.answer ? 'color:var(--success);font-weight:600' : 'color:var(--text-muted)'}">
              ${i === data.answer ? '✅' : '○'} ${opt}
            </span>`
          ).join('')}
        </div>
      </div>
      <div class="content-actions">
        <button class="btn btn-outline btn-sm" onclick="editQuiz('${courseId}','${quizId}')">수정</button>
        <button class="btn btn-danger btn-sm" onclick="deleteQuiz('${courseId}','${quizId}')">삭제</button>
      </div>
    </div>
  `;
}

let quizEditingId = null;
let quizEditingCourseId = null;

function openQuizModal(courseId, quizId = null, data = null) {
  quizEditingCourseId = courseId;
  quizEditingId = quizId;
  $('quiz-modal-title').textContent = quizId ? '퀴즈 수정' : '퀴즈 추가';
  $('quiz-form-question').value = data?.question || '';
  for (let i = 0; i < 4; i++) {
    $(`quiz-opt-${i}`).value = data?.options?.[i] || '';
  }
  $('quiz-form-answer').value = data?.answer ?? 0;
  $('quiz-modal').classList.add('open');
}

async function editQuiz(courseId, quizId) {
  const doc = await db.collection('courses').doc(courseId).collection('quizzes').doc(quizId).get();
  openQuizModal(courseId, quizId, doc.data());
}

async function deleteQuiz(courseId, quizId) {
  if (!confirm('이 퀴즈를 삭제할까요?')) return;
  await db.collection('courses').doc(courseId).collection('quizzes').doc(quizId).delete();
  showToast('삭제되었습니다.', 'success');
  navigate('admin-quiz', courseId);
}

async function saveQuiz() {
  const question = $('quiz-form-question').value.trim();
  const options = [0,1,2,3].map(i => $(`quiz-opt-${i}`).value.trim());
  const answer = parseInt($('quiz-form-answer').value);

  if (!question) { showToast('문제를 입력하세요.', 'error'); return; }
  if (options.some(o => !o)) { showToast('보기 4개를 모두 입력하세요.', 'error'); return; }

  const data = { question, options, answer };

  if (quizEditingId) {
    await db.collection('courses').doc(quizEditingCourseId).collection('quizzes').doc(quizEditingId).update(data);
    showToast('수정되었습니다.', 'success');
  } else {
    await db.collection('courses').doc(quizEditingCourseId).collection('quizzes').add({
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('퀴즈가 추가되었습니다.', 'success');
  }

  closeModal('quiz-modal');
  navigate('admin-quiz', quizEditingCourseId);
}
