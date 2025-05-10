import express from 'express';
import sql from 'mssql';
import bcrypt from 'bcrypt';
import { config } from './database/database.mjs';

const router = express.Router();
const SALT_ROUNDS = 10;

router.get('/history', async (req, res) => {
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
    const { usernameOrEmail, password } = req.body;
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('usernameOrEmail', sql.NVarChar, usernameOrEmail)
            .query('SELECT * FROM Users WHERE username = @usernameOrEmail OR email = @usernameOrEmail');
        const user = result.recordset[0];
        if (user) {
            // パスワードのハッシュと比較
            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (isMatch) {
                req.session.userId = user.id;
                console.log('User logged in:', user.id);
                res.status(200).send('Login successful');
            } else {
                res.status(401).send('Invalid username, email, or password');
            }
        } else {
            res.status(404).send('User not found');
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send(`Error during login: ${err.message}`);
    }
});

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).send('Username, email, and password are required');
    }
    try {
        const pool = await sql.connect(config);

        // ユーザー名またはメールアドレスの重複を確認
        const existingUser = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE username = @username OR email = @email');

        if (existingUser.recordset.length > 0) {
            return res.status(409).send('Username or email already exists'); // HTTP 409 Conflict
        }

        // パスワードをハッシュ化して新規ユーザーを登録
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('passwordHash', sql.NVarChar, hashedPassword)
            .query('INSERT INTO Users (username, email, passwordHash) OUTPUT INSERTED.id VALUES (@username, @email, @passwordHash)');

        const userId = result.recordset[0].id;
        req.session.userId = userId;
        res.status(200).send('User registered successfully');
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
        res.redirect('/html/logout.html');
    });
});

export default router;
