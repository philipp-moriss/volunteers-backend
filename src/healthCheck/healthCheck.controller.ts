import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from './healthCheck.service';
import { ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@Controller('/health-check')
export class HealthCheckController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @ApiOperation({ summary: 'Health check' })
  @Get('/')
  healthCheck() {
    return 'sucsess';
  }

  @ApiOperation({ summary: 'Health check database' })
  @Get('/db')
  async healthCheckDb(): Promise<string> {
    return this.healthCheckService.healthCheckDb();
  }

  // @ApiOperation({ summary: 'Debug sentry' })
  // @Get('/debug-sentry')
  // getError() {
  //   throw new Error('My first Sentry error!');
  // }
}
