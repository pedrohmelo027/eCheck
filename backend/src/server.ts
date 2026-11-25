import { criarApp } from './app';
import { env } from './config/env';

const { PORT, FRONTEND_URL } = env();

criarApp(FRONTEND_URL).listen(PORT, () => {
  console.log(`eCheck API em http://localhost:${PORT}`);
});
