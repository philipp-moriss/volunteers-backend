import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCityDto {
  @ApiProperty({
    description: 'The name of the city',
    example: 'Tel Aviv',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 32.0853,
    required: true,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 34.7818,
    required: true,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
