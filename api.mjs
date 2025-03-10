import express from 'express';
import sql from 'mssql';
import { config } from './database/database.mjs';

const router = express.Router();

router.get('/history', async (req, res) => {
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
        res.status(500).send(`Error fetching data: ${err.message}`);
    }
});

router.post('/save', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Unauthorized');
    }
    const { date, totalAmount, location, memo, splitRatio, myShare, theirShare, isSettled, category, payer } = req.body;
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('userId', sql.Int, req.session.userId)
            .input('date', sql.Date, date)
            .input('totalAmount', sql.Decimal(10, 2), totalAmount)
            .input('location', sql.NVarChar, location)
            .input('memo', sql.NVarChar, memo)
            .input('splitRatio', sql.Int, splitRatio || null)
            .input('myShare', sql.Decimal(10, 2), myShare || null)
            .input('theirShare', sql.Decimal(10, 2), theirShare || null)
            .input('isSettled', sql.Bit, isSettled)
            .input('category', sql.NVarChar, category)
            .input('payer', sql.NVarChar, payer)
            .query(`
                INSERT INTO BillRecords (userId, date, totalAmount, location, memo, splitRatio, myShare, theirShare, isSettled, category, payer)
                VALUES (@userId, @date, @totalAmount, @location, @memo, @splitRatio, @myShare, @theirShare, @isSettled, @category, @payer)
            `);
        res.status(200).send('Data saved successfully');
    } catch (err) {
        console.error('Error saving data:', err);
        res.status(500).send(`Error saving data: ${err.message}`);
    }
});

router.delete('/history/:id', async (req, res) => {
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
        res.status(500).send(`Error deleting record: ${err.message}`);
    }
});

router.post('/history/bulk-delete', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Unauthorized');
    }
    const { ids } = req.body;
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('userId', sql.Int, req.session.userId)
            .query(`DELETE FROM BillRecords WHERE id IN (${ids.join(',')}) AND userId = @userId`);
        res.status(200).send('Records deleted successfully');
    } catch (err) {
        console.error('Error deleting records:', err);
        res.status(500).send(`Error deleting records: ${err.message}`);
    }
});

router.post('/history/mark-as-settled', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Unauthorized');
    }
    const { ids } = req.body;
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('userId', sql.Int, req.session.userId)
            .query(`UPDATE BillRecords SET isSettled = 1 WHERE id IN (${ids.join(',')}) AND userId = @userId`);
        res.status(200).send('Records marked as settled successfully');
    } catch (err) {
        console.error('Error marking records as settled:', err);
        res.status(500).send(`Error marking records as settled: ${err.message}`);
    }
});

router.post('/login', async (req, res) => {
    const { usernameOrEmail } = req.body;
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('usernameOrEmail', sql.NVarChar, usernameOrEmail)
            .query('SELECT * FROM Users WHERE username = @usernameOrEmail OR email = @usernameOrEmail');
        const user = result.recordset[0];
        if (user) {
            const otp = (Math.floor(100000 + Math.random() * 900000)).toString(); // 6桁の数字
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

            console.log('Sending email to:', user.email); // 送信先のメールアドレスをログに出力
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                    return res.status(500).send(`Error sending OTP email: ${error.message}`);
                }
                console.log('Email sent:', info.response); // 送信成功時のレスポンスをログに出力
                console.log('OTP:', otp); // 開発用に一時的にコンソールに出力
                res.status(200).send('OTP sent to your email');
            });
        } else {
            res.status(404).send('User not found, please register');
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send(`Error during login: ${err.message}`);
    }
});

router.post('/verify-otp', async (req, res) => {
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
        res.status(500).send(`Error during OTP verification: ${err.message}`);
    }
});

router.post('/register', async (req, res) => {
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
        res.status(500).send(`Error during registration: ${err.message}`);
    }
});

router.get('/check-login', async (req, res) => {
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
            res.status(500).send(`Error fetching user data: ${err.message}`);
        }
    } else {
        res.status(401).send('Not logged in');
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).send(`Error during logout: ${err.message}`);
        }
        res.redirect('/html/logout.html'); // パスを修正
    });
});

export default router;
