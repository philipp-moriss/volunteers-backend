import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Image } from './entities/image.entity';
import { S3Service } from './services/s3.service';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';

@Injectable()
export class ImageService {
  constructor(
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
    private readonly s3Service: S3Service,
  ) {}

  async create(file: Express.Multer.File, folder?: string): Promise<Image> {
    // Загружаем файл в S3
    const { key, url } = await this.s3Service.uploadFile(file, folder);

    // Сохраняем информацию в БД
    const image = this.imageRepository.create({
      filename: file.filename || file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      key,
      url,
      bucket: this.s3Service.bucket,
    });

    return await this.imageRepository.save(image);
  }

  async findAll(): Promise<Image[]> {
    return await this.imageRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Image> {
    const image = await this.imageRepository.findOne({ where: { id } });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    // Генерируем актуальный signed URL
    try {
      const signedUrl = await this.s3Service.getFileUrl(image.key);
      image.url = signedUrl;
    } catch (error) {
      // Если не удалось сгенерировать signed URL, используем сохраненный
    }

    return image;
  }

  async update(id: string, updateImageDto: UpdateImageDto): Promise<Image> {
    const image = await this.findOne(id);

    // Обновляем только те поля, которые переданы
    Object.assign(image, updateImageDto);

    return await this.imageRepository.save(image);
  }

  async remove(id: string): Promise<void> {
    const image = await this.findOne(id);

    // Удаляем файл из S3
    await this.s3Service.deleteFile(image.key);

    // Удаляем запись из БД
    await this.imageRepository.remove(image);
  }

  async getSignedUrl(id: string, expiresIn: number = 3600): Promise<string> {
    const image = await this.findOne(id);
    return await this.s3Service.getFileUrl(image.key, expiresIn);
  }
}
