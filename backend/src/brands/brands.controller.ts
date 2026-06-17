import { Controller, Get } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { Public } from '../auth/public.decorator';

@Controller('brands')
export class BrandsController {
  constructor(private readonly svc: BrandsService) {}

  @Public()
  @Get()
  async list() {
    return this.svc.list();
  }
}