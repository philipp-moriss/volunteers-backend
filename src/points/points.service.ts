import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PointsTransaction, PointsTransactionType, PointsTransactionStatus } from './entities/points-transaction.entity';
import { Volunteer } from 'src/user/entities/volunteer.entity';

export interface CreatePointsTransactionDto {
  volunteerId: string;
  taskId?: string;
  amount: number;
  type: PointsTransactionType;
  description?: string;
}

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointsTransaction)
    private readonly transactionRepository: Repository<PointsTransaction>,
    @InjectRepository(Volunteer)
    private readonly volunteerRepository: Repository<Volunteer>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Создает транзакцию баллов и обновляет баланс волонтера
   */
  async createTransaction(dto: CreatePointsTransactionDto): Promise<PointsTransaction> {
    return await this.dataSource.transaction(async (manager) => {
      const volunteerRepository = manager.getRepository(Volunteer);
      const transactionRepository = manager.getRepository(PointsTransaction);

      // Получаем волонтера с блокировкой для предотвращения race condition
      const volunteer = await volunteerRepository.findOne({
        where: { userId: dto.volunteerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!volunteer) {
        throw new NotFoundException(`Volunteer with ID ${dto.volunteerId} not found`);
      }

      const balanceBefore = volunteer.points;
      const balanceAfter = balanceBefore + dto.amount;

      // Проверяем, что баланс не станет отрицательным (если это списание)
      if (balanceAfter < 0) {
        throw new BadRequestException(
          `Insufficient points. Current balance: ${balanceBefore}, requested: ${dto.amount}`,
        );
      }

      // Создаем транзакцию
      const transaction = transactionRepository.create({
        volunteerId: dto.volunteerId,
        taskId: dto.taskId,
        amount: dto.amount,
        type: dto.type,
        description: dto.description,
        status: PointsTransactionStatus.COMPLETED,
        balanceBefore,
        balanceAfter,
      });

      const savedTransaction = await transactionRepository.save(transaction);

      // Обновляем баланс волонтера
      volunteer.points = balanceAfter;
      if (dto.type === PointsTransactionType.TASK_COMPLETION) {
        volunteer.completedTasksCount += 1;
      }
      await volunteerRepository.save(volunteer);

      return savedTransaction;
    });
  }

  /**
   * Получает историю транзакций волонтера
   */
  async getVolunteerTransactions(
    volunteerId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ transactions: PointsTransaction[]; total: number }> {
    const volunteer = await this.volunteerRepository.findOne({
      where: { userId: volunteerId },
    });

    if (!volunteer) {
      throw new NotFoundException(`Volunteer with ID ${volunteerId} not found`);
    }

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.volunteerId = :volunteerId', { volunteerId })
      .leftJoinAndSelect('transaction.task', 'task')
      .orderBy('transaction.createdAt', 'DESC');

    if (limit !== undefined) {
      queryBuilder.limit(limit);
    }
    if (offset !== undefined) {
      queryBuilder.offset(offset);
    }

    const [transactions, total] = await queryBuilder.getManyAndCount();

    return { transactions, total };
  }

  /**
   * Получает баланс волонтера
   */
  async getVolunteerBalance(volunteerId: string): Promise<number> {
    const volunteer = await this.volunteerRepository.findOne({
      where: { userId: volunteerId },
      select: ['points'],
    });

    if (!volunteer) {
      throw new NotFoundException(`Volunteer with ID ${volunteerId} not found`);
    }

    return volunteer.points;
  }
}
