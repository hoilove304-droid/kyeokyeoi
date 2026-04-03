let entryCount = 0;

function addEntry(data = {}) {
  const timeline = document.getElementById('timeline');
  const id = entryCount++;

  const entry = document.createElement('div');
  entry.className = 'timeline-entry';
  entry.id = `entry-${id}`;

  entry.innerHTML = `
    <div class="timeline-entry-header">
      <input
        type="text"
        class="timeline-period"
        placeholder="시기 (예: 1990년)"
        value="${data.period || ''}"
      />
      <input
        type="text"
        class="timeline-title-input"
        placeholder="제목 (예: 결혼식)"
        value="${data.title || ''}"
      />
      <button class="btn-remove" onclick="removeEntry('entry-${id}')">×</button>
    </div>
    <div class="timeline-body">
      <div class="timeline-photo" id="photo-${id}">
        <input type="file" accept="image/*" onchange="previewPhoto(this, ${id})" />
        <span style="font-size:24px;">📷</span>
        <span>사진 추가</span>
      </div>
      <textarea
        class="timeline-text"
        placeholder="이 시기의 기억을 글로 남겨주세요. 사진이 없어도 괜찮아요."
      >${data.text || ''}</textarea>
    </div>
  `;

  timeline.appendChild(entry);
}

function removeEntry(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function previewPhoto(input, id) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const photoBox = document.getElementById(`photo-${id}`);
    const existing = photoBox.querySelector('img');
    if (existing) existing.remove();
    const spans = photoBox.querySelectorAll('span');
    spans.forEach(s => s.style.display = 'none');
    const img = document.createElement('img');
    img.src = e.target.result;
    photoBox.appendChild(img);
  };
  reader.readAsDataURL(file);
}

async function createBook() {
  const title = document.getElementById('bookTitle').value || '켜켜이 - 우리의 이야기';
  const entries = document.querySelectorAll('.timeline-entry');

  if (entries.length < 24) {
    alert(`시기를 최소 24개 이상 입력해주세요. (현재 ${entries.length}개)`);
    return;
  }

  showLoading('책을 생성하고 있어요...');

  try {
    // 1. 책 생성
    updateLoadingText('책을 생성하고 있어요... (1/4)');
    const bookRes = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    const bookData = await bookRes.json();
    if (!bookData.success) {
      throw new Error(bookData.message || '책 생성 실패');
    }
    const bookUid = bookData.data.bookUid;
    console.log('책 생성 완료:', bookUid);

    // 2. 표지 추가
    updateLoadingText('표지를 만들고 있어요... (2/4)');
    const coverBlob = await createDummyCoverImage(title);
    const coverForm = new FormData();
    coverForm.append('title', title);
    coverForm.append('frontPhoto', coverBlob, 'front.jpg');
    coverForm.append('backPhoto', coverBlob, 'back.jpg');
    const coverRes = await fetch(`/api/books/${bookUid}/cover`, {
      method: 'POST',
      body: coverForm
    });
    const coverData = await coverRes.json();
    console.log('표지 추가:', coverData);
    if (!coverData.success) {
      throw new Error('표지 추가 실패: ' + (coverData.errors?.[0] || coverData.message));
    }

    // 3. 콘텐츠 추가
    updateLoadingText('내용을 담고 있어요... (3/4)');
    for (const entry of entries) {
      const period = entry.querySelector('.timeline-period').value;
      const entryTitle = entry.querySelector('.timeline-title-input').value;
      const text = entry.querySelector('.timeline-text').value;
      const fileInput = entry.querySelector('input[type="file"]');

      const form = new FormData();
      form.append('date', period);
      form.append('contents', `${entryTitle}\n${text}`);
      form.append('templateUid', 'cnH0Ud1nl1f9');

      if (fileInput.files[0]) {
        form.append('file', fileInput.files[0]);
      } else {
        const dummyBlob = await createDummyContentImage(period, entryTitle, text);
        form.append('file', dummyBlob, 'content.jpg');
      }

      const contentRes = await fetch(`/api/books/${bookUid}/contents`, {
        method: 'POST',
        body: form
      });
      const contentData = await contentRes.json();
      console.log('콘텐츠 추가:', contentData);
      if (!contentData.success) {
        throw new Error('콘텐츠 추가 실패: ' + (contentData.errors?.[0] || contentData.message));
      }
    }

    // 4. 최종화
    updateLoadingText('마무리하고 있어요... (4/4)');
    const finalRes = await fetch(`/api/books/${bookUid}/finalization`, {
      method: 'POST'
    });
    const finalData = await finalRes.json();
    console.log('최종화:', finalData);
    if (!finalData.success) {
      throw new Error('책 최종화 실패: ' + (finalData.errors?.[0] || finalData.message));
    }

    // entries 데이터 저장
    const entryDataList = [];
    for (const entry of entries) {
      const period = entry.querySelector('.timeline-period').value;
      const entryTitle = entry.querySelector('.timeline-title-input').value;
      const text = entry.querySelector('.timeline-text').value;
      const fileInput = entry.querySelector('input[type="file"]');
      let photoUrl = null;
      if (fileInput.files[0]) {
        photoUrl = URL.createObjectURL(fileInput.files[0]);
      }
      entryDataList.push({ period, title: entryTitle, text, photoUrl });
    }

    localStorage.setItem('bookUid', bookUid);
    localStorage.setItem('bookTitle', title);
    localStorage.setItem('bookEntries', JSON.stringify(entryDataList));

    hideLoading();

    // 미리보기 페이지로 이동
    window.location.href = `/preview.html`;

  } catch (err) {
    hideLoading();
    alert('오류가 발생했어요: ' + err.message);
    console.error(err);
  }
}

// 더미 표지 이미지 생성
function createDummyCoverImage(title) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1B2A4A';
    ctx.fillRect(0, 0, 800, 800);
    ctx.fillStyle = '#C9A84C';
    ctx.font = 'bold 60px serif';
    ctx.textAlign = 'center';
    ctx.fillText('켜켜이', 400, 360);
    ctx.font = '28px serif';
    ctx.fillStyle = '#F5F0E8';
    ctx.fillText(title, 400, 440);
    canvas.toBlob(resolve, 'image/jpeg', 0.9);
  });
}

// 더미 콘텐츠 이미지 생성
function createDummyContentImage(period, title, text) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = '#C9A84C';
    ctx.font = 'bold 24px serif';
    ctx.textAlign = 'left';
    ctx.fillText(period, 60, 80);
    ctx.fillStyle = '#1B2A4A';
    ctx.font = 'bold 36px serif';
    ctx.fillText(title, 60, 140);
    ctx.fillStyle = '#444';
    ctx.font = '22px serif';
    const words = text.split(' ');
    let line = '';
    let y = 220;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > 680 && line !== '') {
        ctx.fillText(line, 60, y);
        line = word + ' ';
        y += 40;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, 60, y);
    canvas.toBlob(resolve, 'image/jpeg', 0.9);
  });
}

function showLoading(text) {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('loadingText').textContent = text;
  document.querySelector('.submit-area').style.display = 'none';
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
  document.querySelector('.submit-area').style.display = 'block';
}

function updateLoadingText(text) {
  const el = document.getElementById('loadingText');
  if (el) el.textContent = text;
}