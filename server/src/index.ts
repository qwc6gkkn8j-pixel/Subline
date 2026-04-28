import { createApp } from './app.js';
import { env } from './lib/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SUBLINE server listening on http://localhost:${env.PORT}`);
});
