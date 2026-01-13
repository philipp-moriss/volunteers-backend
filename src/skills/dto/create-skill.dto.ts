import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  iconSvg: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}
