import { Controller, Get } from '@nestjs/common';
import { BrandsService } from './brands.service';

@Controller('brands')
export class BrandsController {
  constructor(private readonly svc: BrandsService) {}

  @Get()
  async list() {
    return this.svc.list();
  }
}