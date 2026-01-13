import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ImageService } from './image.service';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Image')
@Controller('image')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post()
  @ApiOperation({ summary: 'Upload an image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Optional folder name for organizing images',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.imageService.create(file, folder);
  }

  @Get()
  @ApiOperation({ summary: 'Get all images' })
  findAll() {
    return this.imageService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get image by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.imageService.findOne(id);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get signed URL for image' })
  getSignedUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    const expiresInSeconds = expiresIn ? parseInt(expiresIn, 10) : 3600;
    return this.imageService.getSignedUrl(id, expiresInSeconds);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update image metadata' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateImageDto: UpdateImageDto,
  ) {
    return this.imageService.update(id, updateImageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an image' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.imageService.remove(id);
  }
}
