import { NextResponse } from 'next/server';

interface HealthCheck {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: Record<string, HealthCheck>;
}

const startTime = Date.now();

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const checks: Record<string, HealthCheck> = {};
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // BOLT REST Engine reachability check.
  // This app has no direct database connection — data comes from the REST engine via IIS proxy.
  try {
    const apiStart = Date.now();
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const res = await fetch(`${base}/bolt-rest-engine/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    checks.restEngine = {
      name: 'BOLT REST Engine',
      status: res.ok ? 'up' : 'degraded',
      responseTime: Date.now() - apiStart,
    };
    if (!res.ok && overallStatus === 'healthy') overallStatus = 'degraded';
  } catch (error) {
    checks.restEngine = {
      name: 'BOLT REST Engine',
      status: 'down',
      message: error instanceof Error ? error.message : 'REST engine unreachable',
    };
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '0.0.0',
    checks,
  };

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(response, { status: httpStatus });
}
