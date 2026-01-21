import { join } from 'node:path';

export const getEnvironmentFilePaths = (env: string | undefined): string[] => {
  // Environment file is relative to the CWD of the node process
  const cwd = process.cwd();

  const envFilePath: string[] = [join(cwd, '.env')];

  if (env) {
    envFilePath.unshift(join(cwd, `.env.${env}`));
  }

  return envFilePath;
};
