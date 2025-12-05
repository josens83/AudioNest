import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserLevelResponseDto {
  @ApiProperty()
  level: number;

  @ApiProperty()
  xp: number;

  @ApiProperty()
  xpToNext: number;

  @ApiProperty({ description: 'Progress percentage to next level (0-100)' })
  progress: number;

  @ApiPropertyOptional()
  title?: string;

  @ApiProperty()
  totalXpEarned: number;

  @ApiProperty()
  levelUps: number;
}

export class LevelTierResponseDto {
  @ApiProperty()
  level: number;

  @ApiProperty()
  xpRequired: number;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiPropertyOptional()
  frameColor?: string;

  @ApiPropertyOptional({ description: 'Benefits at this level' })
  benefits?: Record<string, unknown>;
}

export class AddXpDto {
  @ApiProperty({ description: 'Amount of XP to add' })
  amount: number;

  @ApiProperty({ description: 'Source of XP (e.g., "listen", "badge", "challenge")' })
  source: string;

  @ApiPropertyOptional()
  referenceId?: string;
}

export class XpGainResponseDto {
  @ApiProperty()
  xpGained: number;

  @ApiProperty()
  previousLevel: number;

  @ApiProperty()
  newLevel: number;

  @ApiProperty()
  leveledUp: boolean;

  @ApiProperty()
  currentXp: number;

  @ApiProperty()
  xpToNext: number;
}
