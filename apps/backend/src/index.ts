import { app } from './app.js';
import { logger } from './lib/logger.js';
import { env } from './config/env.js';

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
