import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sql from 'mssql';
import session from 'express-session';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        enableArithAbort: true
    }
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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
    cookie: { secure: false } // secure: true for HTTPS
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

app.get('/api/history', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Unauthorized');
    }
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('userId', sql.Int, req.session.userId)
            .query('SELECT * FROM BillRecords WHERE userId = @userId ORDER BY createdAt DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Error fetching data');
    }
});

app.post('/save', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Unauthorized');
    }
    const { date, totalAmount, location, memo, splitRatio, roundingOption, myShare, theirShare } = req.body;
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('userId', sql.Int, req.session.userId)
            .input('date', sql.Date, date)
            .input('totalAmount', sql.Decimal(10, 2), totalAmount)
            .input('location', sql.NVarChar, location)
            .input('memo', sql.NVarChar, memo)
            .input('splitRatio', sql.Int, splitRatio)
            .input('roundingOption', sql.NVarChar, roundingOption)
            .input('myShare', sql.Decimal(10, 2), myShare)
            .input('theirShare', sql.Decimal(10, 2), theirShare)
            .query(`
                INSERT INTO BillRecords (userId, date, totalAmount, location, memo, splitRatio, roundingOption, myShare, theirShare)
                VALUES (@userId, @date, @totalAmount, @location, @memo, @splitRatio, @roundingOption, @myShare, @theirShare)
            `);
        res.status(200).send('Data saved successfully');
    } catch (err) {
        console.error('Error saving data:', err);
        res.status(500).send('Error saving data');
    }
});

app.delete('/api/history/:id', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Unauthorized');
    }
    const { id } = req.params;
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, req.session.userId)
            .query('DELETE FROM BillRecords WHERE id = @id AND userId = @userId');
        res.status(200).send('Record deleted successfully');
    } catch (err) {
        console.error('Error deleting record:', err);
        res.status(500).send('Error deleting record');
    }
});

app.post('/login', async (req, res) => {
    const { usernameOrEmail } = req.body;
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('usernameOrEmail', sql.NVarChar, usernameOrEmail)
            .query('SELECT * FROM Users WHERE username = @usernameOrEmail OR email = @usernameOrEmail');
        const user = result.recordset[0];
        if (user) {
            const otp = crypto.randomBytes(3).toString('hex');
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
            await pool.request()
                .input('userId', sql.Int, user.id)
                .input('otp', sql.NVarChar, otp)
                .input('expiresAt', sql.DateTime, expiresAt)
                .query('INSERT INTO OTP (userId, otp, expiresAt) VALUES (@userId, @otp, @expiresAt)');

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Your OTP Code',
                text: `Your OTP code is ${otp}`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                    return res.status(500).send('Error sending OTP email');
                }
                console.log('Email sent:', user.email);
                console.log('OTP:', otp); // 開発用に一時的にコンソールに出力
                res.status(200).send('OTP sent to your email');
            });
        } else {
            res.status(404).send('User not found, please register');
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Error during login');
    }
});

app.post('/verify-otp', async (req, res) => {
    const { usernameOrEmail, otp } = req.body;
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('usernameOrEmail', sql.NVarChar, usernameOrEmail)
            .query('SELECT * FROM Users WHERE username = @usernameOrEmail OR email = @usernameOrEmail');
        const user = result.recordset[0];
        if (user) {
            const otpResult = await pool.request()
                .input('userId', sql.Int, user.id)
                .input('otp', sql.NVarChar, otp)
                .query('SELECT * FROM OTP WHERE userId = @userId AND otp = @otp AND expiresAt > GETDATE()');
            if (otpResult.recordset.length > 0) {
                req.session.userId = user.id;
                res.status(200).send('Login successful');
            } else {
                res.status(401).send('Invalid or expired OTP');
            }
        } else {
            res.status(401).send('Invalid username or email');
        }
    } catch (err) {
        console.error('Error during OTP verification:', err);
        res.status(500).send('Error during OTP verification');
    }
});

app.post('/register', async (req, res) => {
    const { username, email } = req.body;
    if (!username || !email) {
        return res.status(400).send('Username and email are required');
    }
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .query('INSERT INTO Users (username, email) OUTPUT INSERTED.id VALUES (@username, @email)');

        const userId = result.recordset[0].id;
        req.session.userId = userId;
        res.status(200).send('User registered and logged in successfully');
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send('Error during registration');
    }
});

app.get('/api/check-login', async (req, res) => {
    if (req.session.userId) {
        try {
            const pool = await sql.connect(config);
            const result = await pool.request()
                .input('userId', sql.Int, req.session.userId)
                .query('SELECT username FROM Users WHERE id = @userId');
            const user = result.recordset[0];
            res.status(200).json({ username: user.username });
        } catch (err) {
            console.error('Error fetching user data:', err);
            res.status(500).send('Error fetching user data');
        }
    } else {
        res.status(401).send('Not logged in');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error during logout');
        }
        res.redirect('/html/logout.html'); // パスを修正
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
