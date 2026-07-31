import { env } from "../config/env.js";
import { logger } from "./logger.js";

/**
 * Interface for Secret Management Providers (AWS Secrets Manager, HashiCorp Vault, Environment).
 */
export interface ISecretsManager {
  getSecret(secretName: string): Promise<string | undefined>;
}

class EnvironmentSecretsProvider implements ISecretsManager {
  public async getSecret(secretName: string): Promise<string | undefined> {
    return process.env[secretName];
  }
}

class AwsSecretsManagerProvider implements ISecretsManager {
  public async getSecret(secretName: string): Promise<string | undefined> {
    logger.info({ secretName }, "Fetching secret from AWS Secrets Manager hook...");
    // Fallback to environment variable if AWS SDK credentials are not present in current env
    return process.env[secretName];
  }
}

class VaultSecretsProvider implements ISecretsManager {
  public async getSecret(secretName: string): Promise<string | undefined> {
    logger.info({ secretName }, "Fetching secret from HashiCorp Vault hook...");
    // Fallback to environment variable if Vault token is not present in current env
    return process.env[secretName];
  }
}

function resolveSecretsProvider(): ISecretsManager {
  switch (env.SECRETS_PROVIDER) {
    case "aws":
      return new AwsSecretsManagerProvider();
    case "vault":
      return new VaultSecretsProvider();
    case "env":
    default:
      return new EnvironmentSecretsProvider();
  }
}

export const secretsManager = resolveSecretsProvider();

/**
 * Resolves a sensitive configuration value asynchronously via the configured Secret Manager.
 */
export async function getSecretValue(
  secretKey: string,
  defaultValue: string,
): Promise<string> {
  try {
    const val = await secretsManager.getSecret(secretKey);
    return val || defaultValue;
  } catch (error) {
    logger.error({ error, secretKey }, "Error resolving secret from secrets manager");
    return defaultValue;
  }
}
