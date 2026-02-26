import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(
    cors({
        origin: [
            'http://mglstore.mn:3002',
            'http://admin.mglstore.mn:3003',
            'http://vendor.mglstore.mn:3004',
            // We also include the local ports that the monorepo is trying to use
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
        ],
        credentials: true,
    })
);

app.use(express.json());

app.get('/', (req, res) => {
    res.send('API is running...');
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
    console.log(`[api] Application is running on: http://localhost:${port}`);
});
