import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TelemedicineService } from './telemedicine.service';

interface CreateRoomDto {
  encounterId: string;
}

@Controller('telemedicine')
export class TelemedicineController {
  constructor(private readonly telemedicineService: TelemedicineService) {}

  @Post('rooms')
  async createRoom(@Body() body: CreateRoomDto) {
    return this.telemedicineService.createRoom(body.encounterId);
  }

  @Get('rooms/:roomName/token')
  async getToken(
    @Param('roomName') roomName: string,
    @Query('userName') userName: string,
    @Query('isOwner') isOwner: string,
  ) {
    const owner = isOwner === 'true';
    const token = await this.telemedicineService.getParticipantToken(
      roomName,
      userName,
      owner,
    );
    return { token };
  }

  @Delete('rooms/:roomName')
  async deleteRoom(@Param('roomName') roomName: string) {
    await this.telemedicineService.deleteRoom(roomName);
    return { deleted: true };
  }
}
