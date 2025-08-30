import { Module } from '@nestjs/common';
import { SearchCommand } from './commands/search.command';

@Module({
  providers: [SearchCommand],
})
export class AppModule {}