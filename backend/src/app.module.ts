import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { TrucksModule } from './trucks/trucks.module';
import { DriversModule } from './drivers/drivers.module';
import { TripsModule } from './trips/trips.module';
import { ExpensesModule } from './expenses/expenses.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ThirdPartiesModule } from './third-parties/third-parties.module';
import { BankModule } from './bank/bank.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'truck_track',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production', // true en dev uniquement
      logging: process.env.NODE_ENV === 'development',
    }),
    TrucksModule,
    DriversModule,
    TripsModule,
    ExpensesModule,
    InvoicesModule,
    ThirdPartiesModule,
    BankModule,
  ],
})
export class AppModule {}
