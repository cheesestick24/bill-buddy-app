import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sql from 'mssql';
import session from 'express-session';
import dotenv from 'dotenv';
import apiRouter from './api.mjs';
import { config } from './database/database.mjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sql.connect(config).then(pool => {
    if (pool.connected) {
        console.log('Connected to Azure SQL Database');
    }
}).catch(err => {
    console.error('Database connection failed:', err);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPSの場合はtrueに設定
        maxAge: 30 * 24 * 60 * 60 * 1000 // 1ヶ月 (30日) の持続時間
    }
}));

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'img', 'money_warikan_business.ico')); // アイコンのパスを設定
});

app.get('/', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.get('/login', (req, res) => {
    if (process.env.DEV_MODE === 'development') {
        // 開発モードではOTP認証をスキップ
        req.session.userId = process.env.DEV_ID;
        console.log('User logged in:', req.session.userId);
        return res.redirect('/html/history.html');
    }

    res.sendFile(path.join(__dirname, 'public', 'html/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html/register.html'));
});

app.get('/history', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'html/history.html'));
});

app.get('/otp', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html/otp.html'));
});

app.use('/api', (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).send('Unauthorized');
    }
    next();
}, apiRouter);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
