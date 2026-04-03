const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

const API_KEY = process.env.SWEETBOOK_API_KEY;
const API_URL = process.env.SWEETBOOK_API_URL;

// 책 생성
app.post('/api/books', async (req, res) => {
  try {
    const { title } = req.body;
    const response = await fetch(`${API_URL}/books`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title || '켜켜이 - 우리의 이야기',
        bookSpecUid: 'PHOTOBOOK_A4_SC',
        creationType: 'TEST'
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 표지 추가
app.post('/api/books/:bookUid/cover', upload.fields([
  { name: 'frontPhoto', maxCount: 1 },
  { name: 'backPhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const { bookUid } = req.params;
    const FormData = (await import('node-fetch')).FormData;
    const { Blob } = await import('node-fetch');
    const form = new FormData();

    const photoFile = req.files?.['frontPhoto']?.[0];
    if (photoFile) {
      const fileBuffer = fs.readFileSync(photoFile.path);
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      form.append('coverPhoto', blob, 'cover.jpg');
    } else {
      return res.json({ success: false, message: '표지 이미지가 없습니다' });
    }

    form.append('templateUid', '75HruEK3EnG5');
    form.append('parameters', JSON.stringify({
      childName: req.body.title || '켜켜이',
      schoolName: '켜켜이',
      volumeLabel: '우리의 이야기',
      periodText: '소중한 추억'
    }));

    const response = await fetch(`${API_URL}/books/${bookUid}/cover`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: form
    });
    const data = await response.json();
    console.log('표지 API 응답:', JSON.stringify(data));
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 콘텐츠 추가
app.post('/api/books/:bookUid/contents', upload.single('file'), async (req, res) => {
  try {
    const { bookUid } = req.params;
    const { date, contents } = req.body;
    const FormData = (await import('node-fetch')).FormData;
    const { Blob } = await import('node-fetch');
    const form = new FormData();

    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      form.append('files', blob, 'content.jpg');
    }
    form.append('templateUid', '5NxuQPBMyuTm');
    if (date || contents) {
      form.append('parameters', JSON.stringify({
        date: date || '',
        contents: contents || ''
      }));
    }

    const response = await fetch(`${API_URL}/books/${bookUid}/contents?breakBefore=page`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: form
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 책 최종화
app.post('/api/books/:bookUid/finalization', async (req, res) => {
  try {
    const { bookUid } = req.params;
    const response = await fetch(`${API_URL}/books/${bookUid}/finalization`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 견적 조회
app.post('/api/orders/estimate', async (req, res) => {
  try {
    const { bookUid } = req.body;
    const response = await fetch(`${API_URL}/orders/estimate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{ bookUid, quantity: 1 }]
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 주문 생성
app.post('/api/orders', async (req, res) => {
  try {
    const { bookUid, shipping } = req.body;
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{ bookUid, quantity: 1 }],
        shipping
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 템플릿 목록 조회
app.get('/api/templates', async (req, res) => {
  try {
    const response = await fetch(`${API_URL}/templates`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`켜켜이 서버 실행 중: http://localhost:${PORT}`);
});