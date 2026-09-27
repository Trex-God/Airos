import "server-only";

const PRODUCTION_BUILD_PHASE = "phase-production-build";

export function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE === PRODUCTION_BUILD_PHASE;
}

export function requireServerEnv(name: string, minimumLength = 1): string {
  const value = process.env[name];

  if (!value || value.length < minimumLength) {
    throw new Error(`${name} is missing or invalid.`);
  }

  return value;
}
