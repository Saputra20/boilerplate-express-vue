import express from 'express';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.use((_request, response) => {
  response.status(404).json({ message: 'Not found' });
});
