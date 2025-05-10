import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sql from 'mssql';
import session from 'express-session';
import dotenv from 'dotenv';

import apiRouter from './api.mjs';
import { config } from './database/database.mjs';

// ───── 環境変数の読み込み ─────
dotenv.config();

// ───── 初期設定 ─────
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ───── データベース接続 ─────
sql.connect(config).then(pool => {
    if (pool.connected) {
        console.log('Connected to Azure SQL Database');
    }
}).catch(err => {
    console.error('Database connection failed:', err);
});

// ───── ミドルウェア設定 ─────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30日
    }
}));

// ───── 認証ミドルウェア ─────
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login'); // ログイン画面にリダイレクト
    }
    next(); // 認証済みの場合は次の処理へ
}

// ───── APIルート ─────
app.use('/api', apiRouter);

// ───── ルート定義 ─────
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'img', 'money_warikan_business.ico'));
});

app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.get('/login', (req, res) => {
    if (process.env.DEV_MODE === 'development') {
        // 開発モードでは強制ログイン
        req.session.userId = process.env.DEV_ID;
        console.log('User logged in (DEV):', req.session.userId);
        return res.redirect('/history');
    }
    res.sendFile(path.join(__dirname, 'public', 'html/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html/register.html'));
});

app.get('/history', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html/history.html'));
});

// ───── サーバ起動 ─────
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
