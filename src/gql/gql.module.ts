import { Module, Provider } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExMonitorResolver } from '@/exchange/admin/ex-monitor.resolver';
import { ExchangeModule } from '@/exchange/exchange.module';

const providers: Provider[] = [ExMonitorResolver];

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: './schema.gql',
      // cors: {
      //   credentials: true,
      //   origin: true,
      // },
      installSubscriptionHandlers: true,
    }),
    SystemConfigModule,
    ExchangeModule,
  ],
  providers,
  exports: [GraphQLModule, ...providers],
})
export class GqlModule {}
