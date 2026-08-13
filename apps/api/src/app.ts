import express from 'express';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.status(200).json({ data: { status: 'ok' } });
});

export { app };
