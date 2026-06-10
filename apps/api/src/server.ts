import { buildApp } from './app';
import { config } from './config';

const main = async (): Promise<void> => {
  const app = buildApp({ logger: true });
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
};

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start API:', err);
  process.exit(1);
});
