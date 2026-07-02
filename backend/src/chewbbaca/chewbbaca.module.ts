import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AlleleProfile,
  AlleleProfileSchema,
} from '../allele-profiles/allele-profiles.schema';
import { ChewbbacaController } from './chewbbaca.controller';
import { ChewbbacaService } from './chewbbaca.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlleleProfile.name, schema: AlleleProfileSchema },
    ]),
  ],
  controllers: [ChewbbacaController],
  providers: [ChewbbacaService],
  exports: [ChewbbacaService],
})
export class ChewbbacaModule {}
