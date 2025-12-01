import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/live',
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Remove from all rooms
    this.rooms.forEach((clients, roomId) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        client.leave(roomId);
        this.server.to(roomId).emit('listener-left', {
          count: clients.size,
        });
      }
    });
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const { roomId, userId } = data;

    // Join socket room
    client.join(roomId);

    // Track in memory
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(client.id);

    // Notify room
    this.server.to(roomId).emit('listener-joined', {
      userId,
      count: this.rooms.get(roomId).size,
    });

    return { success: true };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const { roomId } = data;

    client.leave(roomId);

    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(client.id);
      this.server.to(roomId).emit('listener-left', {
        count: this.rooms.get(roomId).size,
      });
    }

    return { success: true };
  }

  @SubscribeMessage('send-message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; userId: string; username: string; message: string },
  ) {
    const { roomId, ...messageData } = data;

    this.server.to(roomId).emit('new-message', {
      ...messageData,
      timestamp: new Date(),
    });

    return { success: true };
  }

  @SubscribeMessage('send-gift')
  handleGift(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      userId: string;
      username: string;
      giftId: string;
      giftName: string;
      giftIcon: string;
      quantity: number;
    },
  ) {
    const { roomId, ...giftData } = data;

    this.server.to(roomId).emit('gift-received', {
      ...giftData,
      timestamp: new Date(),
    });

    return { success: true };
  }

  // Broadcast to specific room
  broadcastToRoom(roomId: string, event: string, data: any) {
    this.server.to(roomId).emit(event, data);
  }
}
