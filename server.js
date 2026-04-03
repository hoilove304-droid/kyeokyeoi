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

// 책 만들기
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
        bookSpecUid: 'SQUAREBOOK_HC',
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
    const form = new FormData();

    if (req.files['frontPhoto']) {
      form.append('frontPhoto', fs.createReadStream(req.files['frontPhoto'][0].path));
    }
    if (req.files['backPhoto']) {
      form.append('backPhoto', fs.createReadStream(req.files['backPhoto'][0].path));
    }
    form.append('templateUid', 'tpl_F8d15af9fd');
    form.append('parameters', JSON.stringify({ title: req.body.title || '켜켜이' }));

    const response = await fetch(`${API_URL}/books/${bookUid}/cover`, {
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

// 콘텐츠 추가
app.post('/api/books/:bookUid/contents', upload.single('file'), async (req, res) => {
  try {
    const { bookUid } = req.params;
    const { templateUid, date, contents } = req.body;
    const FormData = (await import('node-fetch')).FormData;
    const form = new FormData();

    if (req.file) {
      form.append('files', fs.createReadStream(req.file.path));
    }
    form.append('templateUid', templateUid || 'cnH0Ud1nl1f9');
    if (date || contents) {
      form.append('parameters', JSON.stringify({ date, contents }));
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

// 책 마무리
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

// 견적 조회하기
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`켜켜이 서버 실행 중: http://localhost:${PORT}`);
});