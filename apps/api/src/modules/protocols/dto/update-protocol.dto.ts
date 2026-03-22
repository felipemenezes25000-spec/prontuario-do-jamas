import { PartialType } from '@nestjs/swagger';
import { CreateProtocolDto } from './create-protocol.dto';

export class UpdateProtocolDto extends PartialType(CreateProtocolDto) {}
