import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CreateTaskDto } from 'src/task/dto/create-task.dto';

@Injectable()
export class AgentService {
  private readonly openaiClient: OpenAI;
  private readonly assistantId: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const assistantId = this.configService.get<string>('OPEN_AI_ASSISTENT_MAIN');

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }

    if (!assistantId) {
      throw new Error('OPEN_AI_ASSISTENT_MAIN is not defined in environment variables');
    }

    this.assistantId = assistantId;

    this.openaiClient = new OpenAI({
      apiKey,
    });
  }

  async processTaskAiCreation(
    textTask: string,
    categoriesJson: string,
    skillsJson: string,
  ): Promise<CreateTaskDto> {
    try {
      // Формируем промпт с контекстом категорий и скилов
      const fullPrompt = this.buildPrompt(textTask, categoriesJson, skillsJson);

      // Создаем thread
      const thread = await this.openaiClient.beta.threads.create();

      // Отправляем сообщение пользователя
      await this.openaiClient.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: fullPrompt,
      });

      // Запускаем ассистента
      const run = await this.openaiClient.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistantId,
      });

      // Ждем завершения выполнения
      await this.waitForCompletion(run.id, thread.id);

      // Извлекаем ответ
      const rawResponse = await this.extractResponse(thread.id);

      // Парсим JSON из ответа
      const jsonContent = this.extractJsonFromResponse(rawResponse);

      // Валидируем и возвращаем структурированные данные
      return this.validateAndTransformResponse(jsonContent);
    } catch (error) {
      throw new BadRequestException(
        `Failed to process task with AI: ${error.message}`,
      );
    }
  }

  private detectLanguage(text: string): string {
    // Простая эвристика для определения языка
    // Проверяем наличие кириллицы для русского, иврита для иврита, латиницы для английского
    const cyrillicPattern = /[А-Яа-яЁё]/;
    const hebrewPattern = /[א-ת]/;
    
    if (cyrillicPattern.test(text)) {
      return 'русский';
    } else if (hebrewPattern.test(text)) {
      return 'иврит';
    } else {
      return 'английский';
    }
  }

  private buildPrompt(
    userPrompt: string,
    categoriesJson: string,
    skillsJson: string,
  ): string {
    const detectedLanguage = this.detectLanguage(userPrompt);
    
    return `Ты - AI-ассистент волонтерской платформы. Твоя задача - преобразовать описание задачи от пользователя в структурированный формат для создания задачи (таски) в системе.

КОНТЕКСТ:
Пользователь описывает задачу, которую нужно выполнить волонтерам. Твоя задача - проанализировать описание и создать структурированную задачу с правильной категорией и необходимыми навыками.

ВАЖНО - ЯЗЫК ОТВЕТА:
Определен язык запроса пользователя: ${detectedLanguage}
ВСЕ текстовые поля (type, title, description, details) должны быть написаны на ТОМ ЖЕ ЯЗЫКЕ, что и запрос пользователя.
Если запрос на русском - отвечай на русском, если на английском - на английском, если на иврите - на иврите.

ОПИСАНИЕ ЗАДАЧИ ОТ ПОЛЬЗОВАТЕЛЯ:
${userPrompt}

ДОСТУПНЫЕ КАТЕГОРИИ (выбери ОДНУ наиболее подходящую категорию по id, или null если нет подходящей):
${categoriesJson}

ДОСТУПНЫЕ НАВЫКИ (выбери подходящие навыки по id, может быть несколько, один или ни одного):
${skillsJson}

ИНСТРУКЦИИ ПО ЗАПОЛНЕНИЮ:

1. "type" - тип помощи (строка):
   - Краткое описание типа помощи, например: "Покупки/Доставка", "Образование", "Транспорт", "Бытовые услуги", "Медицинская помощь", "Юридическая помощь" и т.д.
   - Должен отражать суть задачи
   - Обязательное поле

2. "title" - название задачи (строка, до 500 символов):
   - Краткое, понятное название задачи
   - Должно быть информативным и привлекательным для волонтеров
   - Примеры: "Забрать ребенка из детского сада", "Купить продукты для пожилого человека", "Помочь с заполнением документов"
   - Обязательное поле

3. "description" - описание задачи (строка):
   - Подробное описание того, что нужно сделать
   - Должно содержать все важные детали из запроса пользователя
   - Должно быть понятным для волонтеров
   - Обязательное поле

4. "details" - дополнительные детали (строка, опционально):
   - Дополнительная информация, которая может быть полезна волонтеру
   - Адреса, контакты, особые требования, время выполнения и т.д.
   - Если в запросе пользователя нет дополнительных деталей, можно оставить null или не включать поле

5. "points" - баллы за выполнение (число от 0 до 100):
   - Оцени сложность и время выполнения задачи
   - Простые задачи (доставка, покупки) - 5-15 баллов
   - Средние задачи (обучение, помощь с документами) - 15-30 баллов
   - Сложные задачи (длительная помощь, специальные навыки) - 30-50 баллов
   - По умолчанию 10, если не указано иное

6. "categoryId" - ID категории (UUID или null):
   - Выбери ОДНУ наиболее подходящую категорию из списка доступных
   - Используй точный UUID из списка категорий
   - Если нет подходящей категории, используй null
   - Опциональное поле

7. "skillIds" - массив ID навыков (массив UUID или пустой массив):
   - Выбери навыки, которые необходимы для выполнения задачи
   - Может быть несколько навыков, один или ни одного
   - Используй только UUID из списка доступных навыков
   - Если навыки не требуются, верни пустой массив []
   - Опциональное поле

8. "firstResponseMode" - режим первого отклика (boolean):
   - true - задача автоматически назначается первому откликнувшемуся волонтеру
   - false - создатель задачи выбирает волонтера вручную
   - По умолчанию false
   - Опциональное поле

ФОРМАТ ОТВЕТА:
Верни ответ ТОЛЬКО в формате валидного JSON без markdown разметки, дополнительного текста или комментариев.

Пример структуры JSON:
{
  "type": "тип помощи",
  "title": "название задачи",
  "description": "подробное описание",
  "details": "дополнительные детали или null",
  "points": число,
  "categoryId": "uuid или null",
  "skillIds": ["uuid1", "uuid2"] или пустой массив [],
  "firstResponseMode": false
}

КРИТИЧЕСКИ ВАЖНО:
- Верни ТОЛЬКО валидный JSON объект
- НЕ используй markdown разметку (не оборачивай в тройные обратные кавычки)
- НЕ добавляй комментарии или пояснения
- categoryId и skillIds должны точно соответствовать UUID из предоставленных списков
- Если категория или навыки не подходят, используй null для categoryId и [] для skillIds
- ВСЕ текстовые поля (type, title, description, details) должны быть на ТОМ ЖЕ ЯЗЫКЕ, что и запрос пользователя (${detectedLanguage})
- Поля type, title, description обязательны`;
  }

  private async waitForCompletion(
    runId: string,
    threadId: string,
  ): Promise<void> {
    let runStatus = await this.openaiClient.beta.threads.runs.retrieve(
      threadId,
      runId,
    );
    let maxTries = 30;

    while (runStatus.status !== 'completed' && maxTries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await this.openaiClient.beta.threads.runs.retrieve(
        threadId,
        runId,
      );
      maxTries--;
    }

    if (runStatus.status !== 'completed') {
      throw new Error('OpenAI run did not complete in time');
    }
  }

  private async extractResponse(threadId: string): Promise<string> {
    const messagesResp = await this.openaiClient.beta.threads.messages.list(
      threadId,
    );
    const assistantMessages = messagesResp.data.filter(
      (m: any) => m.role === 'assistant',
    );

    if (!assistantMessages.length) {
      throw new Error('No assistant response received');
    }

    return assistantMessages
      .map((m: any) => {
        if (
          Array.isArray(m.content) &&
          m.content.length > 0 &&
          m.content[0].type === 'text'
        ) {
          return m.content[0].text.value;
        }
        return '';
      })
      .join('\n');
  }

  private extractJsonFromResponse(response: string): any {
    // Пытаемся найти JSON в ответе (может быть обернут в markdown код блоки)
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (error) {
        // Если не получилось распарсить, пробуем найти JSON напрямую
      }
    }

    // Пытаемся найти JSON объект напрямую в тексте
    const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0]);
      } catch (error) {
        // Продолжаем поиск, если не удалось распарсить
      }
    }

    // Пытаемся найти JSON массив напрямую в тексте
    const jsonArrayMatch = response.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      try {
        return JSON.parse(jsonArrayMatch[0]);
      } catch (error) {
        // Продолжаем поиск, если не удалось распарсить
      }
    }

    // Если JSON не найден, пытаемся распарсить весь ответ как JSON
    try {
      return JSON.parse(response);
    } catch (error) {
      throw new Error('No valid JSON found in response');
    }
  }

  private validateAndTransformResponse(jsonContent: any): CreateTaskDto {
    // Валидация обязательных полей
    if (!jsonContent.type || typeof jsonContent.type !== 'string') {
      throw new Error('Invalid response: type is required and must be a string');
    }

    if (!jsonContent.title || typeof jsonContent.title !== 'string') {
      throw new Error('Invalid response: title is required and must be a string');
    }

    if (!jsonContent.description || typeof jsonContent.description !== 'string') {
      throw new Error(
        'Invalid response: description is required and must be a string',
      );
    }

    // Формируем DTO
    const dto: CreateTaskDto = {
      programId: `${"string"}-${"string"}-${"string"}-${"string"}-${"string"}`, // Будет установлено в TaskService
      needyId: `${"string"}-${"string"}-${"string"}-${"string"}-${"string"}`, // Будет установлено в TaskService
      type: jsonContent.type,
      title: jsonContent.title,
      description: jsonContent.description,
      details: jsonContent.details || undefined,
      points: jsonContent.points ?? 10,
      categoryId: jsonContent.categoryId || undefined,
      skillIds: Array.isArray(jsonContent.skillIds)
        ? jsonContent.skillIds
        : undefined,
      firstResponseMode: jsonContent.firstResponseMode ?? false,
    };

    return dto;
  }
}
