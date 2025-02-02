import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sql from 'mssql';

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

app.get('/api/history', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query('SELECT * FROM BillRecords ORDER BY createdAt DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Error fetching data');
    }
});

app.post('/save', async (req, res) => {
    const { date, totalAmount, location, memo, splitRatio, roundingOption, myShare, theirShare } = req.body;
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('date', sql.Date, date)
            .input('totalAmount', sql.Decimal(10, 2), totalAmount)
            .input('location', sql.NVarChar, location)
            .input('memo', sql.NVarChar, memo)
            .input('splitRatio', sql.Int, splitRatio)
            .input('roundingOption', sql.NVarChar, roundingOption)
            .input('myShare', sql.Decimal(10, 2), myShare)
            .input('theirShare', sql.Decimal(10, 2), theirShare)
            .query(`
                INSERT INTO BillRecords (date, totalAmount, location, memo, splitRatio, roundingOption, myShare, theirShare)
                VALUES (@date, @totalAmount, @location, @memo, @splitRatio, @roundingOption, @myShare, @theirShare)
            `);
        res.status(200).send('Data saved successfully');
    } catch (err) {
        console.error('Error saving data:', err);
        res.status(500).send('Error saving data');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
