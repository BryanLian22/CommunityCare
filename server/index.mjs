import { server } from './app.mjs';
const port = Number(process.env.API_PORT || 3001), host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => console.log(`CommunityCare server: http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
