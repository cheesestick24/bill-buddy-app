import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sql from 'mssql';
import session from 'express-session';
import bcrypt from 'bcrypt';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    user: 'bill-buddy',
    password: 'Bb20250202',
    server: 'db-server-bill-buddy.database.windows.net',
    database: 'db-bill-buddy',
    options: {
        encrypt: true,
        enableArithAbort: true
    }
};

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/history', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'history.html'));
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
    const { username, password } = req.body;
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM Users WHERE username = @username');
        const user = result.recordset[0];
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            res.status(200).send('Login successful');
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Error during login');
    }
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, hashedPassword)
            .query('INSERT INTO Users (username, password) OUTPUT INSERTED.id VALUES (@username, @password)');

        const userId = result.recordset[0].id;
        req.session.userId = userId;
        res.status(200).send('User registered and logged in successfully');
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send('Error during registration');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
