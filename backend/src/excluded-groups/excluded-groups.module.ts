import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExcludedGroup, ExcludedGroupSchema } from './excluded-group.schema';
import { ExcludedGroupsService } from './excluded-groups.service';
import { ExcludedGroupsController } from './excluded-groups.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExcludedGroup.name, schema: ExcludedGroupSchema },
    ]),
  ],
  controllers: [ExcludedGroupsController],
  providers: [ExcludedGroupsService],
})
export class ExcludedGroupsModule {}
