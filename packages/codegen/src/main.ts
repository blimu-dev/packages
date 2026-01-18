import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli/cli.module';

async function bootstrap() {
  await CommandFactory.run(CliModule, {
    logger: ['error', 'warn', 'log'],
  });
}

bootstrap().catch((error) => {
  console.error('CLI Error:', error);
  process.exit(1);
});
