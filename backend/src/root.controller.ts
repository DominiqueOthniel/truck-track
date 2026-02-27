import { Controller, Get } from '@nestjs/common';

@Controller('')
export class RootController {
  @Get()
  root(): { name: string; version: string; api: string; docs: string } {
    return {
      name: 'Truck Track API',
      version: '1.0.0',
      api: '/api',
      docs: 'GET /api pour l’API, GET /api/health pour le health check.',
    };
  }
}
