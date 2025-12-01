import { IsString, IsNumber, IsBoolean, IsOptional, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveProgressDto {
  @ApiProperty()
  @IsString()
  episodeId: string;

  @ApiProperty()
  @IsNumber()
  position: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class SaveSyncDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentEpisodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  currentPosition?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  queue?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
