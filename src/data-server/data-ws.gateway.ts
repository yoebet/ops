import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import { GatewayMetadata } from '@nestjs/websockets/interfaces/gateway-metadata.interface';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import { UseInterceptors } from '@nestjs/common';
import {
  DataRequest,
  LiveDataRequest,
  MetaDataRequest,
  OflowResponse,
  SubscriptionRequest,
} from './commands';
import { DATA_WS_PATH, OflowCommand } from './constants';
import { MetadataService } from './services/metadata.service';
import { DataQueryService } from './services/data-query.service';
import { DataSubscriptionService } from './services/data-subscription.service';
import { AppLogger } from '@/common/app-logger';
import { ConfigService } from '@nestjs/config';
import { Config, DataWsConfig } from '@/common/config.types';
import { Env } from '@/env';
import {
  authSocket,
  CurrentWsUser,
} from '@/common-web/decorators/ws-user.decorator';
import { UserInfo } from '@/common-web/auth/user-info';

@UseInterceptors(CSI)
@WebSocketGateway({
  path: DATA_WS_PATH,
  cors: Env.dataWs?.cors,
} as GatewayMetadata)
export class DataWsGateway
  implements
    OnGatewayInit,
    OnGatewayConnection<Socket>,
    OnGatewayDisconnect<Socket>
{
  private wsConfig: DataWsConfig;

  constructor(
    private metadataService: MetadataService,
    private marketDataService: DataQueryService,
    private subscriptionService: DataSubscriptionService,
    private configService: ConfigService<Config>,
    private logger: AppLogger,
  ) {
    logger.setContext('oflow-ws');
    this.wsConfig = this.configService.get('dataWs') || {};
  }

  @WebSocketServer()
  server: Server;

  afterInit() {
    const { auth, readonly, mode } = this.wsConfig.adminUi || {};
    instrument(this.server, {
      auth: auth
        ? {
            type: 'basic',
            ...auth,
          }
        : false,
      readonly,
      mode,
    });

    this.subscriptionService.server = this.server;
  }

  handleConnection(socket: Socket, ..._args): any {
    let user: UserInfo = socket.request['user'];
    if (!user) {
      user = authSocket(socket);
    }
    if (user?.userId) {
      this.logger.verbose(user);
      this.logger.log(`${socket.id} [${user.userId}] connected`);
    } else {
      this.logger.log(`${socket.id} connected`);
    }
  }

  handleDisconnect(socket: Socket): any {
    const user: UserInfo = socket.request['user'];
    if (user?.userId) {
      this.logger.log(`${socket.id} [${user.userId}] disconnected`);
    } else {
      this.logger.log(`${socket.id} disconnected`);
    }
    this.subscriptionService.handleDisconnect(socket);
  }

  @SubscribeMessage(OflowCommand.meta)
  async getMetaData(
    @MessageBody() req: MetaDataRequest,
    // @ConnectedSocket() socket: Socket,
    // @CurrentWsUser() cu,
  ): Promise<OflowResponse> {
    // this.logger.log(`${socket.id} getMetaData`);
    const data = await this.metadataService.getMetaData(req);
    return {
      data: data,
      success: true,
    };
  }

  @SubscribeMessage(OflowCommand.live)
  async getLiveData(
    @MessageBody() req: LiveDataRequest,
    // @ConnectedSocket() socket: Socket,
  ): Promise<OflowResponse> {
    const data = await this.marketDataService.getLatest(req);
    return {
      data,
      success: true,
    };
  }

  @SubscribeMessage(OflowCommand.data)
  async fetchData(
    @MessageBody() req: DataRequest,
    // @ConnectedSocket() socket: Socket,
  ): Promise<OflowResponse> {
    // this.logger.log(`${socket.id} fetchData`);
    const data = await this.marketDataService.fetchData(req);
    return {
      data,
      success: true,
    };
  }

  @SubscribeMessage(OflowCommand.subs)
  async subs(
    @MessageBody() req: SubscriptionRequest,
    @ConnectedSocket() socket: Socket,
  ): Promise<OflowResponse> {
    // this.logger.log(`${socket.id} ${req.op}`);
    // this.logger.log(req);
    return this.subscriptionService.subs(req, socket);
  }
}
