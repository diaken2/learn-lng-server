import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import FormData from 'form-data';
import fetch from 'node-fetch';
import multer from 'multer';
import fs from "fs"
import path from 'path';
import EasyYandexS3 from 'easy-yandex-s3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8888;
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/podcasts/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});



const s3 = new EasyYandexS3({
  auth: {
    accessKeyId: process.env.YANDEX_ACCESS_KEY_ID,
    secretAccessKey: process.env.YANDEX_SECRET_ACCESS_KEY,
  },
  Bucket: process.env.YANDEX_BUCKET || 'id-langlearn',
  debug: false,
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB максимум
  },
  fileFilter: function (req, file, cb) {
    // Проверяем тип файла
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Только аудио файлы разрешены!'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
const MONGODB_URI = "mongodb://learnlng_db_user:eatapple88@ac-5b9zkip-shard-00-00.spftlfo.mongodb.net:27017,ac-5b9zkip-shard-00-01.spftlfo.mongodb.net:27017,ac-5b9zkip-shard-00-02.spftlfo.mongodb.net:27017/?ssl=true&replicaSet=atlas-kb1waw-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
const adjectivesTableSchema = new mongoose.Schema({
  data: { type: Array, required: true },
  name: { type: String, default: 'adjectives' }
}, { timestamps: true });

// МОДЕЛЬ ДЛЯ ТАБЛИЦЫ ПРИЛАГАТЕЛЬНЫХ

// Mongoose Schemas
const wordSchema = new mongoose.Schema({
  translations: {
    russian: { type: String, required: true },
    english: { type: String, required: true },
    turkish: { type: String, required: true }
  },
  imageId: { type: String, default: '' }
}, { timestamps: true });

const imageSchema = new mongoose.Schema({
  src: { type: String, required: true },
  label: { type: String, required: true }
}, { timestamps: true });

// ИСПРАВЛЕНО: переименовал numberSchema в numberValueSchema
const numberValueSchema = new mongoose.Schema({
  value: { type: String, required: true }
}, { timestamps: true });
// Схема для подкастов
const podcastSchema = new mongoose.Schema({
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonModule', required: true },
  title: { type: String, required: true },
  audioUrl: { type: String, required: true }, // Ссылка на аудио в Yandex S3
  originalTranscript: { type: String, required: true }, // Титры на оригинальном языке
  hintTranscript: { type: String }, // Титры на языке подсказки
  hint: { type: String }, // Подсказка
  order: { type: Number, default: 0 },
  duration: { type: Number }, // Длительность в секундах
  fileSize: { type: Number }, // Размер файла в байтах
  mimeType: { type: String } // MIME тип файла
}, { timestamps: true });


const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  level: { type: String, required: true },
  theme: { type: String, required: true },
  studiedLanguage: { type: String, required: true },
  hintLanguage: { type: String, required: true },
  words: [{ 
    imageBase: String,
    imagePng: String,
    translations: Map
  }],
  fontColor: { type: String, default: '#000000' },
  bgColor: { type: String, default: '#f0f0f0' },
  lessonNumber: { type: String, required: true }
}, { timestamps: true });
const testModuleConfigSchema = new mongoose.Schema({
  database: { type: String, required: true },
  wordCount: { type: Number, required: true },
  theme: { type: String, required: true },
  words: [{
    imageBase: String,
    imagePng: String,
    translations: Map,
    displayWord: String,
    _id: false
  }]
}, { _id: false });
const testSchema = new mongoose.Schema({
  lessonId: { type: String, required: true },
  studiedLanguage: { type: String, required: true },
  hintLanguage: { type: String, required: true },
  level: { type: String, required: true },
  theme: { type: String, required: true },
  wordIds: [{ type: String }],
  words: [{ 
    imageBase: String,
    imagePng: String,
    translations: Map
  }],
  fontColor: { type: String, default: '#000000' },
  bgColor: { type: String, default: '#f0f0f0' }
}, { timestamps: true });

const testResultSchema = new mongoose.Schema({
  testId: { type: String, required: true },
  userId: { type: String, default: 'anonymous' },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  incorrectWords: [{ type: String }],
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const flagSchema = new mongoose.Schema({
  language: { type: String, required: true },
  image: { type: String, required: true }
}, { timestamps: true });

const settingsSchema = new mongoose.Schema({
  fontColor: { type: String, default: '#000000' },
  bgColor: { type: String, default: '#f0f0f0' },
  fontBgColor: { type: String, default: '#808080' }
}, { timestamps: true });

const tableSchema = new mongoose.Schema({
  data: { type: Array, required: true },
  name: { type: String, default: 'main' }
}, { timestamps: true });

// Mongoose Models
const questionWordsSchema = new mongoose.Schema({
  data: { type: Array, required: true },
  name: { type: String, default: 'question-words' }
}, { timestamps: true });

// Схема для падежей прилагательных
const adjectiveCaseSchema = new mongoose.Schema({
  imageBase: { type: String, required: true },
  language: { 
    type: String, 
    required: true,
    enum: ['русский', 'французский', 'немецкий', 'арабский', 'китайский'] // и т.д.
  },
  // Для русского - полная структура
  singular: {
    masculine: {
      nominative: { type: String },
      genitive: { type: String },
      dative: { type: String },
      accusative: { type: String },
      instrumental: { type: String },
      prepositional: { type: String }
    },
    feminine: {
      nominative: { type: String },
      genitive: { type: String },
      dative: { type: String },
      accusative: { type: String },
      instrumental: { type: String },
      prepositional: { type: String }
    },
    neuter: {
      nominative: { type: String },
      genitive: { type: String },
      dative: { type: String },
      accusative: { type: String },
      instrumental: { type: String },
      prepositional: { type: String }
    }
  },
  plural: {
    nominative: { type: String },
    genitive: { type: String },
    dative: { type: String },
    accusative: { type: String },
    instrumental: { type: String },
    prepositional: { type: String }
  },
  // Для других языков могут быть другие поля
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

const AdjectiveCase = mongoose.model('AdjectiveCase', adjectiveCaseSchema);
const Podcast = mongoose.model('Podcast', podcastSchema);
const QuestionWords = mongoose.model('QuestionWords', questionWordsSchema);
const AdjectivesTable = mongoose.model('AdjectivesTable', adjectivesTableSchema);
const Word = mongoose.model('Word', wordSchema);
const Image = mongoose.model('Image', imageSchema);
// ИСПРАВЛЕНО: переименовал Number в NumberValue
const NumberValue = mongoose.model('NumberValue', numberValueSchema);
const Lesson = mongoose.model('Lesson', lessonSchema);
const Test = mongoose.model('Test', testSchema);
const TestResult = mongoose.model('TestResult', testResultSchema);
const Flag = mongoose.model('Flag', flagSchema);
const Settings = mongoose.model('Settings', settingsSchema);
const Table = mongoose.model('Table', tableSchema);
const lessonTypeSchema = new mongoose.Schema({
  typeId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  config: { type: Object } // Конфигурация для типа урока
}, { timestamps: true });


// Новая схема для модулей уроков

// Новая схема для предложений (Фразы)
// Обновите sentenceSchema для включения падежей
const sentenceSchema = new mongoose.Schema({
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonModule', required: true },
  sentenceStructure: [{
    word: String,
    wordData: {
      imageBase: String,
      imagePng: String,
      translations: Map
    },
    database: String,
    lesson: String,
    number: String,
    gender: String,
    case: String, // ДОБАВЛЕНО
    _id: false
  }],
  image: { type: String },
  order: { type: Number, default: 0 }
}, { timestamps: true });


const sentenceModuleConfigSchema = new mongoose.Schema({
  columnsCount: { type: Number, default: 2 },
  columnConfigs: [{
    database: { type: String, required: true },
    filters: {
      number: String,
      gender: String
    }
  }]
}, { _id: false });

const questionModuleConfigSchema = new mongoose.Schema({
  questionColumnsCount: { type: Number, default: 3 },
  answerColumnsCount: { type: Number, default: 3 },
  requiresPairAnswer: { type: Boolean, default: true },
  questionColumnConfigs: [{
    database: { type: String, required: true },
    filters: {
      number: String,
      gender: String,
      case: String
    }
  }],
  answerColumnConfigs: [{
    database: { type: String, required: true },
    filters: {
      number: String,
      gender: String,
      case: String
    }
  }]
}, { _id: false });

// Обновите lessonModuleSchema чтобы включить конфигурацию Вопросов
const lessonModuleSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  typeId: { type: Number, required: true },
  order: { type: Number, required: true },
  title: { type: String },
  config: { type: mongoose.Schema.Types.Mixed }, // Может быть любой конфиг
  content: { type: Array },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
const nounCaseSchema = new mongoose.Schema({
  imageBase: { type: String, required: true }, // связь с основным словом
  language: { type: String, default: 'русский' },
  singular: {
    nominative: { type: String }, // именительный
    genitive: { type: String },   // родительный  
    dative: { type: String },     // дательный
    accusative: { type: String }, // винительный
    instrumental: { type: String }, // творительный
    prepositional: { type: String } // предложный
  },
  plural: {
    nominative: { type: String }, // именительный
    genitive: { type: String },   // родительный  
    dative: { type: String },     // дательный
    accusative: { type: String }, // винительный
    instrumental: { type: String }, // творительный
    prepositional: { type: String } // предложный
  }
}, { timestamps: true });
const prepositionsTableSchema = new mongoose.Schema({
  data: { type: Array, required: true },
  name: { type: String, default: 'prepositions' }
}, { timestamps: true });
const questionSchema = new mongoose.Schema({
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'LessonModule', required: true },
  questionStructure: [{
    word: String,
    wordData: {
      imageBase: String,
      imagePng: String,
      translations: Map
    },
    database: String,
    lesson: String,
    number: String,
    gender: String,
    case: String,
    _id: false
  }],
  answerStructure: [{
    word: String,
    wordData: {
      imageBase: String,
      imagePng: String,
      translations: Map
    },
    database: String,
    lesson: String,
    number: String,
    gender: String,
    case: String,
    _id: false
  }],
  questionImage: { type: String },
  // ОБНОВИТЕ ЭТУ ЧАСТЬ:
  requiresPairAnswer: { 
    type: Boolean, 
    default: true,
    set: function(value) {
      // Гарантируем, что значение всегда будет boolean
      return value === undefined || value === null ? true : Boolean(value);
    }
  },
  answerImage: { type: String },
  hint: { type: String },
  englishQuestion: { type: String },
  englishAnswer: { type: String },
  autoEnglishQuestion: { type: String },
  autoEnglishAnswer: { type: String },
  order: { type: Number, default: 0 }
}, { timestamps: true });

const Question = mongoose.model('Question', questionSchema);

const PrepositionsTable = mongoose.model('PrepositionsTable', prepositionsTableSchema);

const NounCase = mongoose.model('NounCase', nounCaseSchema);
const LessonModule = mongoose.model('LessonModule',lessonModuleSchema);

const LessonType = mongoose.model('LessonType', lessonTypeSchema);

const Sentence = mongoose.model('Sentence', sentenceSchema);
// Инициализация типов уроков
async function initializeLessonTypes() {
  const typesCount = await LessonType.countDocuments();
  if (typesCount === 0) {
    console.log('Initializing lesson types...');
    await LessonType.insertMany([
      {
        typeId: 1,
        name: 'Лексика',
        description: 'Урок с отдельными словами и картинками'
      },
    {
  typeId: 2,
  name: 'Тест лексика',
  description: 'Тест на знание слов (интегрированный в модули)',
  config: {
    supportsWordSelection: true,
    requiresWordCount: true,
    availableDatabases: ['nouns', 'adjectives', 'verbs', 'question-words', 'prepositions']
  }
},
      {
        typeId: 3,
        name: 'Фразы',
        description: 'Урок с составлением предложений',
        config: {
          maxColumns: 20,
          availableDatabases: ['nouns', 'adjectives', 'verbs', 'pronouns', 'numerals', 'adverbs', 'prepositions']
        }
      },
      {
        typeId: 4,
        name: 'Вопрос',
        description: 'Урок с Вопросами и ответами',
        config: {
          requiresPairAnswer: true,
          questionColumns: 3,
          answerColumns: 3,
          availableDatabases: ['nouns', 'adjectives', 'verbs', 'pronouns', 'numerals', 'adverbs', 'prepositions', 'question-words']
        }
      },
      {
      typeId: 5,
      name: 'Подкаст',
      description: 'Аудио урок с титрами и подсказками',
      config: {
        hasAudio: true,
        requiresTranscript: true,
        supportsMultipleLanguages: true
      }
    }
    ]);
    console.log('Lesson types initialized with 4 types');
  } else {
    // Проверяем, есть ли тип "Вопрос", если нет - добавляем
    const existingTypes = await LessonType.find();
    const hasQuestionType = existingTypes.some(t => t.typeId === 4);
    
    if (!hasQuestionType) {
      console.log('Adding missing question type...');
      await LessonType.create({
        typeId: 4,
        name: 'Вопрос',
        description: 'Урок с Вопросами и ответами',
        config: {
          requiresPairAnswer: true,
          questionColumns: 3,
          answerColumns: 3,
          availableDatabases: ['nouns', 'adjectives', 'verbs', 'pronouns', 'numerals', 'adverbs', 'prepositions', 'question-words']
        }
      });
      console.log('Question type added successfully');
    }
    
    console.log(`Found ${existingTypes.length} lesson types in database`);
  }
}

// Инициализация типов уроков
  const typesCount = await LessonType.countDocuments();
  if (typesCount === 0) {
    await LessonType.insertMany([
      {
        typeId: 1,
        name: 'Лексика',
        description: 'Урок с отдельными словами и картинками'
      },
      {
        typeId: 2,
        name: 'Тест лексика',
        description: 'Тест на знание слов'
      },
      {
        typeId: 3,
        name: 'Фразы',
        description: 'Урок с составлением предложений',
        config: {
          maxColumns: 20,
          availableDatabases: ['nouns', 'adjectives', 'verbs', 'pronouns', 'numerals', 'adverbs', 'prepositions']
        }
      },
      {
        typeId: 4,
        name: 'Вопрос',
        description: 'Урок с Вопросами и ответами',
        config: {
          requiresPairAnswer: true,
          questionColumns: 3,
          answerColumns: 3,
          availableDatabases: ['nouns', 'adjectives', 'verbs', 'pronouns', 'numerals', 'adverbs', 'prepositions', 'question-words']
        }
      }
    ]);
    console.log('Lesson types initialized');
  }
// Initialize default data
async function initializeDefaultData() {
  try {
    // Check if flags exist, if not create default flags
    const flagsCount = await Flag.countDocuments();
    if (flagsCount === 0) {
      await Flag.insertMany([
        { language: 'Русский', image: '🇷🇺' },
        { language: 'Английский', image: '🇺🇸' },
        { language: 'Турецкий', image: '🇹🇷' }
      ]);
      console.log('Default flags created');
    }

    // Check if settings exist, if not create default settings
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      await Settings.create({
        fontColor: '#000000',
        bgColor: '#f0f0f0',
        fontBgColor: '#808080'
      });
      console.log('Default settings created');
    }

    // Check if main table exists, if not create empty table
    const tableCount = await Table.countDocuments();
    if (tableCount === 0) {
      await Table.create({
        data: [],
        name: 'main'
      });
      console.log('Default main table created');
    }

    // Check if adjectives table exists, if not create empty table
    

    // Check if words exist, if not create sample words
    const wordsCount = await Word.countDocuments();
    if (wordsCount === 0) {
      await Word.insertMany([
        {
          translations: {
            russian: 'ЯБЛОКО',
            english: 'An apple',
            turkish: 'Elma'
          }
        },
        {
          translations: {
            russian: 'БАНАН',
            english: 'A banana',
            turkish: 'Muz'
          }
        }
      ]);
      console.log('Sample words created');
        await initializeLessonTypes();
    }
     const typesCount = await LessonType.countDocuments();
    if (typesCount === 0) {
      await LessonType.insertMany([
        {
          typeId: 1,
          name: 'Лексика',
          description: 'Урок с отдельными словами и картинками'
        },
        {
          typeId: 2, 
          name: 'Тест лексика',
          description: 'Тест на знание слов'
        },
        {
          typeId: 3,
          name: 'Фразы',
          description: 'Урок с составлением предложений',
          config: {
            maxColumns: 20,
            availableDatabases: ['nouns', 'adjectives', 'verbs', 'pronouns', 'numerals', 'adverbs', 'prepositions']
          }
        }
      ]);
      console.log('Lesson types initialized');

     
const questionWordsCount = await QuestionWords.countDocuments();
if (questionWordsCount === 0) {
  const initialQuestionWords = [
    {
      'Картинка': '',
      'Русский': 'Что',
      'Английский': 'What',
      'Турецкий': 'Ne'
    },
    {
      'Картинка': '',
      'Русский': 'Это',
      'Английский': 'This',
      'Турецкий': 'Bu'
    },
    {
      'Картинка': '',
      'Русский': 'Где', 
      'Английский': 'Where',
      'Турецкий': 'Nerede'
    },
    {
      'Картинка': '',
      'Русский': 'Кто',
      'Английский': 'Who',
      'Турецкий': 'Kim'
    },
    {
      'Картинка': '',
      'Русский': 'Когда',
      'Английский': 'When',
      'Турецкий': 'Ne zaman'
    }
  ];
  
  await QuestionWords.create({
    data: initialQuestionWords,
    name: 'question-words'
  });
  console.log('Default question words table created');
  const prepositionsTableCount = await PrepositionsTable.countDocuments();
if (prepositionsTableCount === 0) {
  await PrepositionsTable.create({
    data: [],
    name: 'prepositions'
  });
  console.log('Default prepositions table created');
}

// И добавьте инициализацию начальных данных для предлогов:
const prepositionsCount = await PrepositionsTable.countDocuments();
if (prepositionsCount === 0) {
  const initialPrepositions = [
    {
      'Картинка': '',
      'Русский': 'В',
      'Английский': 'In',
      'Турецкий': 'İçinde'
    },
    {
      'Картинка': '',
      'Русский': 'На',
      'Английский': 'On',
      'Турецкий': 'Üzerinde'
    },
    {
      'Картинка': '',
      'Русский': 'Под',
      'Английский': 'Under',
      'Турецкий': 'Altında'
    },
    {
      'Картинка': '',
      'Русский': 'За',
      'Английский': 'Behind',
      'Турецкий': 'Arkasında'
    },
    {
      'Картинка': '',
      'Русский': 'Перед',
      'Английский': 'In front of',
      'Турецкий': 'Önünde'
    }
  ];
  
  await PrepositionsTable.create({
    data: initialPrepositions,
    name: 'prepositions'
  });
  console.log('Default prepositions table data created');
}
}
    }
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
}
// Замените старую функцию uploadImageToImgbb на эту:

const uploadImageToImageBan = async (imageBuffer, fileName) => {
  try {
    const CLIENT_ID = 'jKEVwUkcbZN9XiW7GnYy';
    
    // Конвертируем в base64
    const base64Image = imageBuffer.toString('base64');
    
    // Создаем FormData с помощью node-fetch
    const formData = new FormData();
    formData.append('image', base64Image);
    formData.append('name', fileName || 'upload.jpg');
    
    console.log('Sending request to ImageBan...');
    
    const response = await fetch('https://api.imageban.ru/v1', {
      method: 'POST',
      headers: {
        'Authorization': `TOKEN ${CLIENT_ID}`,
      },
      body: formData
    });

    const text = await response.text();
    console.log('Raw ImageBan response:', text);
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      throw new Error('Invalid JSON response from ImageBan');
    }
    
    console.log('Parsed ImageBan result:', result);
    
    // ИСПРАВЛЕНА ПРОВЕРКА ОТВЕТА
    if (result.success === true && result.data && result.data.link) {
      console.log('Upload successful, link:', result.data.link);
      return result.data.link;
    } else if (result.success === true && result.data) {
      // Иногда data может быть объектом, а не массивом
      console.log('Upload successful (object format), link:', result.data.link);
      return result.data.link;
    } else {
      console.error('ImageBan error or unexpected format:', result);
      throw new Error(result.error?.message || 'Upload failed - unexpected response format');
    }
  } catch (error) {
    console.error('Error uploading to ImageBan:', error);
    throw error;
  }
};
app.get('/api/adjective-cases/:imageBase', async (req, res) => {
  try {
    const adjectiveCase = await AdjectiveCase.findOne({ 
      imageBase: req.params.imageBase,
      language: 'русский'
    });
    res.json(adjectiveCase || { 
      singular: { masculine: {}, feminine: {}, neuter: {} },
      plural: {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/api/podcasts', upload.single('audioFile'), async (req, res) => {
  try {
    console.log('Creating podcast with data:', req.body);
    console.log('Audio file:', req.file);

    if (!req.file) {
      return res.status(400).json({ error: 'Аудио файл обязателен' });
    }

    // Используем resolve для получения полного пути
    const fullPath = resolve(__dirname, req.file.path);
    console.log('Full path to file:', fullPath);

    // Проверяем существование файла
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Файл не найден: ${fullPath}`);
    }

    // Загружаем файл в Yandex S3
    const s3Upload = await s3.Upload(
      {
        path: fullPath,
        name: req.file.filename,
      },
      '/podcasts/'
    );

    console.log('S3 upload result:', s3Upload);

    if (!s3Upload || !s3Upload.Location) {
      throw new Error('Ошибка загрузки в S3: не получена ссылка на файл');
    }

    // Получаем информацию о файле
    const fileStats = fs.statSync(fullPath);

    // Создаем объект подкаста
    const podcastData = {
      moduleId: req.body.moduleId,
      title: req.body.title,
      audioUrl: s3Upload.Location,
      originalTranscript: req.body.originalTranscript,
      hintTranscript: req.body.hintTranscript,
      hint: req.body.hint,
      duration: parseInt(req.body.duration) || 0,
      fileSize: fileStats.size,
      mimeType: req.file.mimetype
    };

    const podcast = new Podcast(podcastData);
    const savedPodcast = await podcast.save();

    // Удаляем временный файл
    fs.unlinkSync(fullPath);
    console.log('Temporary file deleted');

    res.json(savedPodcast);
  } catch (error) {
    console.error('Error creating podcast:', error);
    
    // Удаляем временный файл при ошибке
    if (req.file) {
      const fullPath = resolve(__dirname, req.file.path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('Temporary file deleted after error');
      }
    }
    
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});

// Получить подкасты модуля
app.get('/api/lesson-modules/:moduleId/podcasts', async (req, res) => {
  try {
    const podcasts = await Podcast.find({ 
      moduleId: req.params.moduleId 
    }).sort('order');
    
    res.json(podcasts);
  } catch (error) {
    console.error('Error fetching podcasts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить подкаст по ID
app.get('/api/podcasts/:id', async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id);
    if (!podcast) {
      return res.status(404).json({ error: 'Подкаст не найден' });
    }
    res.json(podcast);
  } catch (error) {
    console.error('Error fetching podcast:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обновить подкаст
app.put('/api/podcasts/:id', async (req, res) => {
  try {
    const podcast = await Podcast.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!podcast) {
      return res.status(404).json({ error: 'Подкаст не найден' });
    }
    
    res.json(podcast);
  } catch (error) {
    console.error('Error updating podcast:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить подкаст (также удаляем из S3)
app.delete('/api/podcasts/:id', async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id);
    
    if (!podcast) {
      return res.status(404).json({ error: 'Подкаст не найден' });
    }

    // Удаляем файл из S3
    if (podcast.audioUrl) {
      try {
        const key = podcast.audioUrl.split('/').pop();
        await s3.Remove(`/podcasts/${key}`);
      } catch (s3Error) {
        console.error('Error deleting from S3:', s3Error);
      }
    }

    await Podcast.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Подкаст удален успешно' });
  } catch (error) {
    console.error('Error deleting podcast:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/adjective-cases/:imageBase/:language', async (req, res) => {
  try {
    const { imageBase, language } = req.params;
    
    const adjectiveCase = await AdjectiveCase.findOne({ 
      imageBase: imageBase,
      language: language
    });
    
    // Если не найдено для конкретного языка, пробуем русский как fallback
    if (!adjectiveCase && language !== 'русский') {
      const russianCase = await AdjectiveCase.findOne({
        imageBase: imageBase,
        language: 'русский'
      });
      
      if (russianCase) {
        return res.json({
          ...russianCase.toObject(),
          isFallback: true,
          originalLanguage: 'русский'
        });
      }
    }
    
    res.json(adjectiveCase || { 
      singular: { masculine: {}, feminine: {}, neuter: {} },
      plural: {},
      language: language
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/adjective-cases', async (req, res) => {
  try {
    const { imageBase, language, singular, plural, config } = req.body;
    
    const adjectiveCase = await AdjectiveCase.findOneAndUpdate(
      { imageBase, language },
      { singular, plural, config },
      { upsert: true, new: true }
    );
    
    res.json(adjectiveCase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Сохранить/обновить падежи прилагательного
app.post('/api/adjective-cases', async (req, res) => {
  try {
    const { imageBase, singular, plural } = req.body;
    
    const adjectiveCase = await AdjectiveCase.findOneAndUpdate(
      { imageBase, language: 'русский' },
      { singular, plural },
      { upsert: true, new: true }
    );
    
    res.json(adjectiveCase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/question-words', async (req, res) => {
  try {
    const table = await QuestionWords.findOne({ name: 'question-words' });
    res.json(Array.isArray(table?.data) ? table.data : []);
  } catch (error) {
    console.error('Error fetching question words:', error);
    res.json([]);
  }
});
app.get('/api/prepositions-table', async (req, res) => {
  try {
    const table = await PrepositionsTable.findOne({ name: 'prepositions' });
    res.json(Array.isArray(table?.data) ? table.data : []);
  } catch (error) {
    console.error('Error fetching prepositions table:', error);
    res.json([]);
  }
});

// Save prepositions table data
app.post('/api/prepositions-table', async (req, res) => {
  try {
    const { tableData } = req.body;
    
    await PrepositionsTable.findOneAndUpdate(
      { name: 'prepositions' },
      { data: tableData },
      { upsert: true, new: true }
    );

    res.json({ message: 'Prepositions table data saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Save question words table

app.post('/api/questions', async (req, res) => {
  try {
    console.log('Creating question with data:', req.body);
    
    // Гарантируем, что requiresPairAnswer всегда есть
    const questionData = {
      ...req.body,
      requiresPairAnswer: req.body.requiresPairAnswer !== false // true по умолчанию
    };
    
    const question = new Question(questionData);
    const savedQuestion = await question.save();
    console.log('Question created successfully:', savedQuestion);
    res.json(savedQuestion);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: error.message });
  }
});



// Маршрут для загрузки изображения вопроса
app.post('/api/questions/upload-image', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    // Проверяем, является ли это data URL (data:image/...)
    let base64Data;
    if (imageBase64.startsWith('data:')) {
      // Извлекаем base64 часть из data URL
      const matches = imageBase64.match(/^data:.+\/(.+);base64,(.*)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ success: false, error: 'Invalid image data format' });
      }
      base64Data = matches[2];
    } else {
      // Уже чистая base64 строка
      base64Data = imageBase64;
    }

    // Конвертируем base64 в буфер
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Генерируем имя файла
    const fileName = `question_${Date.now()}.jpg`;
    
    // Загружаем на ImageBan
    const imageUrl = await uploadImageToImageBan(imageBuffer, fileName, 'image/jpeg');
    
    return res.json({
      success: true,
      imageUrl: imageUrl,
      thumbUrl: imageUrl,
      deleteUrl: null
    });
    
  } catch (error) {
    console.error('Error uploading question image:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Server error' 
    });
  }
});
// Получить Вопросы модуля
app.get('/api/module-test/:moduleId', async (req, res) => {
  try {
    const module = await LessonModule.findById(req.params.moduleId);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    if (module.typeId !== 2) {
      return res.status(400).json({ error: 'This module is not a test module' });
    }

    // Получаем урок для языковых настроек
    const lesson = await Lesson.findById(module.lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const testData = {
      moduleId: module._id,
      title: module.title || `Тест по теме "${module.config?.theme || 'неизвестная тема'}"`,
      studiedLanguage: lesson.studiedLanguage,
      hintLanguage: lesson.hintLanguage,
      level: lesson.level,
      theme: module.config?.theme || 'Тест',
      words: module.config?.words || [],
      config: module.config,
      fontColor: lesson.fontColor,
      bgColor: lesson.bgColor
    };

    res.json(testData);
  } catch (error) {
    console.error('Error fetching module test:', error);
    res.status(500).json({ error: error.message });
  }
});
// Маршрут для сохранения результатов теста из модуля
app.post('/api/module-test/results', async (req, res) => {
  try {
    const { moduleId, userId, score, totalQuestions, incorrectWords } = req.body;
    
    const testResult = await TestResult.create({
      moduleId, // Теперь сохраняем moduleId вместо testId
      userId: userId || 'anonymous',
      score,
      totalQuestions,
      incorrectWords,
      testType: 'module', // Добавляем тип теста
      completedAt: new Date()
    });
    
    res.json({ 
      success: true, 
      message: 'Test results saved successfully',
      result: testResult
    });
  } catch (error) {
    console.error('Error saving test results:', error);
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/lesson-modules/:moduleId/questions', async (req, res) => {
  try {
    const questions = await Question.find({ 
      moduleId: req.params.moduleId 
    }).sort('order');
    console.log(`Found ${questions.length} questions for module ${req.params.moduleId}`);
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/question-words', async (req, res) => {
  try {
    const { tableData } = req.body;
    
    await QuestionWords.findOneAndUpdate(
      { name: 'question-words' },
      { data: tableData },
      { upsert: true, new: true }
    );

    res.json({ message: 'Question words table saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/debug/sentences', async (req, res) => {
  try {
    const sentences = await Sentence.find().populate('moduleId');
    console.log('All sentences in DB:', JSON.stringify(sentences, null, 2));
    res.json(sentences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/debug/module/:id', async (req, res) => {
  try {
    const module = await LessonModule.findById(req.params.id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    res.json({
      module: {
        id: module._id,
        title: module.title,
        typeId: module.typeId,
        config: module.config,
        columnConfigs: module.config?.columnConfigs,
        configExists: !!module.config,
        columnConfigsExist: !!module.config?.columnConfigs,
        columnConfigsCount: module.config?.columnConfigs?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Routes
app.get('/api/adjectives-table', async (req, res) => {
    try {
        const table = await AdjectivesTable.findOne({ name: 'adjectives' });
        // Всегда возвращаем массив, даже если таблица не найдена
        res.json(Array.isArray(table?.data) ? table.data : []);
    } catch (error) {
        console.error('Error fetching adjectives table:', error);
        res.json([]); // Всегда возвращаем массив при ошибке
    }
});
// Получить модули по ID табличного урока
// Получить модули по ID табличного урока С УЧЕТОМ ЯЗЫКОВ
app.get('/api/lesson-modules/by-table-lesson/:lessonId', async (req, res) => {
  try {
    const tableLessonId = req.params.lessonId;
    const { studiedLanguage, hintLanguage } = req.query; // ДОБАВЛЯЕМ ПАРАМЕТРЫ ЯЗЫКОВ
    
    // Извлекаем информацию из ID табличного урока
    const match = tableLessonId.match(/^table_([^_]+)_(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid table lesson ID format' });
    }
    
    const lessonNumber = match[1];
    const lessonTitle = decodeURIComponent(match[2]);
    
    console.log(`Looking for modules for table lesson: ${lessonTitle} (${lessonNumber}) with languages: ${studiedLanguage} → ${hintLanguage}`);
    
    // Ищем урок в базе данных по номеру, названию И ЯЗЫКАМ
    const lesson = await Lesson.findOne({
      lessonNumber: lessonNumber,
      title: lessonTitle,
      studiedLanguage: studiedLanguage?.toLowerCase(),
      hintLanguage: hintLanguage?.toLowerCase()
    });
    
    if (!lesson) {
      console.log(`No lesson found in database for: ${lessonTitle} (${lessonNumber}) with languages ${studiedLanguage} → ${hintLanguage}`);
      return res.json([]);
    }
    
    console.log(`Found lesson in database: ${lesson._id} - ${lesson.title} (${lesson.studiedLanguage} → ${lesson.hintLanguage})`);
    
    // Ищем модули для найденного урока
    const modules = await LessonModule.find({ 
      lessonId: lesson._id,
      isActive: true 
    }).sort('order');
    
    console.log(`Found ${modules.length} modules for table lesson ${tableLessonId}`);
    res.json(modules);
  } catch (error) {
    console.error('Error fetching table lesson modules:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lessons/create-from-table', async (req, res) => {
  try {
    const { tableLessonId, studiedLanguage, hintLanguage } = req.body;
    
    const match = tableLessonId.match(/^table_([^_]+)_(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid table lesson ID format' });
    }
    
    const lessonNumber = match[1];
    const lessonTitle = decodeURIComponent(match[2]);
    
    // Проверяем, существует ли уже такой урок
    const existingLesson = await Lesson.findOne({
      lessonNumber: lessonNumber,
      title: lessonTitle
    });
    
    if (existingLesson) {
      return res.json(existingLesson);
    }
    
    // Получаем данные из таблицы
    const table = await Table.findOne({ name: 'main' });
    if (!table || !table.data) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Находим заголовок урока в таблице
    const lessonHeader = table.data.find(row => 
      row['Урок номер'] === lessonNumber && 
      row['Урок название'] === lessonTitle
    );
    
    if (!lessonHeader) {
      return res.status(404).json({ error: 'Lesson not found in table' });
    }
    
    // Собираем слова урока
    const words = [];
    let currentLesson = null;
    let collectingWords = false;
    
    for (const row of table.data) {
      if (row['Урок номер'] === lessonNumber && row['Урок название'] === lessonTitle) {
        currentLesson = lessonTitle;
        collectingWords = true;
        continue;
      }
      
      if (row['Урок номер'] && row['Урок номер'] !== lessonNumber) {
        if (collectingWords) break;
        continue;
      }
      
      if (collectingWords && row['База изображение'] && row['База изображение'].trim() !== '') {
        const translations = new Map();
        
        Object.keys(row).forEach(col => {
          if (col.includes('База существительные слова')) {
            const language = col.split(' ').pop();
            const translation = row[col] || '';
            if (translation.trim() !== '') {
              translations.set(language.toLowerCase(), translation);
            }
          }
        });
        
        words.push({
          imageBase: row['База изображение'],
          imagePng: row['Картинка png'] || '',
          translations: translations
        });
      }
    }
    
    // Создаем урок в базе данных
    const newLesson = new Lesson({
      title: lessonTitle,
      level: lessonHeader['Уровень изучения номер'] || 'A1',
      theme: lessonTitle,
      studiedLanguage: studiedLanguage || 'русский',
      hintLanguage: hintLanguage || 'английский',
      words: words,
      fontColor: '#000000',
      bgColor: '#ffffff',
      lessonNumber: lessonNumber
    });
    
    const savedLesson = await newLesson.save();
    console.log(`Created lesson in database for table lesson: ${lessonTitle}`);
    
    res.json(savedLesson);
  } catch (error) {
    console.error('Error creating lesson from table:', error);
    res.status(500).json({ error: error.message });
  }
});
// Save adjectives table data
app.post('/api/adjectives-table', async (req, res) => {
  try {
    const { tableData } = req.body;
    
    await AdjectivesTable.findOneAndUpdate(
      { name: 'adjectives' },
      { data: tableData },
      { upsert: true, new: true }
    );

    res.json({ message: 'Adjectives table data saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/noun-cases/:imageBase', async (req, res) => {
  try {
    const nounCase = await NounCase.findOne({ 
      imageBase: req.params.imageBase,
      language: 'русский'
    });
    res.json(nounCase || { singular: {}, plural: {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save cases for a word
app.post('/api/noun-cases', async (req, res) => {
  try {
    const { imageBase, singular, plural } = req.body;
    
    const nounCase = await NounCase.findOneAndUpdate(
      { imageBase, language: 'русский' },
      { singular, plural },
      { upsert: true, new: true }
    );
    
    res.json(nounCase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Получить модуль по ID
app.get('/api/lesson-modules/:id', async (req, res) => {
  try {
    const module = await LessonModule.findById(req.params.id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json(module);
  } catch (error) {
    console.error('Error fetching module:', error);
    res.status(500).json({ error: error.message });
  }
});
// Получить предложения модуля (уже должен быть)

app.post('/api/adjectives-table/sync-themes', async (req, res) => {
  try {
    const nounsTable = await Table.findOne({ name: 'main' });
    let adjectivesTable = await AdjectivesTable.findOne({ name: 'adjectives' });
    
    if (!nounsTable || !nounsTable.data) {
      return res.status(400).json({ error: 'Nouns table not found' });
    }

    // Если таблицы прилагательных нет, создаем пустую
    if (!adjectivesTable) {
      adjectivesTable = await AdjectivesTable.create({
        data: [],
        name: 'adjectives'
      });
    }

    // Получаем все темы из таблицы существительных
    const nounThemes = new Set();
    nounsTable.data.forEach(row => {
      if (row['Урок название'] && row['Урок название'].trim() !== '') {
        nounThemes.add(row['Урок название']);
      }
    });

    // Получаем существующие темы из таблицы прилагательных
    const existingAdjectiveThemes = new Set();
    if (adjectivesTable.data && adjectivesTable.data.length > 0) {
      adjectivesTable.data.forEach(row => {
        if (row['Урок название'] && row['Урок название'].trim() !== '') {
          existingAdjectiveThemes.add(row['Урок название']);
        }
      });
    }

    // Находим темы, которых нет в таблице прилагательных
    const themesToAdd = Array.from(nounThemes).filter(theme => !existingAdjectiveThemes.has(theme));
    
    let updatedAdjectivesData = adjectivesTable.data || [];
    let addedCount = 0;

    // Получаем структуру колонок из существующей таблицы прилагательных
    let existingColumns = [];
    if (updatedAdjectivesData.length > 0) {
      existingColumns = Object.keys(updatedAdjectivesData[0]);
    } else {
      // Если таблица пустая, создаем базовую структуру
      existingColumns = [
        'Уровень изучения номер',
        'Урок номер', 
        'Урок название',
        'База изображение',
        'Картинка png',
        // Базовые колонки для языков
        'База прилагательные номер Русский',
        'База прилагательные слова Русский',
        'База прилагательные мужской род Русский',
        'База прилагательные женский род Русский',
        'База прилагательные средний род Русский',
        'База прилагательные множественное число Русский',
        'База прилагательные номер Английский',
        'База прилагательные слова Английский',
        'База прилагательные мужской род Английский',
        'База прилагательные женский род Английский',
        'База прилагательные средний род Английский',
        'База прилагательные множественное число Английский',
        'База прилагательные номер Турецкий',
        'База прилагательные слова Турецкий',
        'База прилагательные мужской род Турецкий',
        'База прилагательные женский род Турецкий',
        'База прилагательные средний род Турецкий',
        'База прилагательные множественное число Турецкий'
      ];
    }

    // Добавляем недостающие темы
    themesToAdd.forEach(theme => {
      // Находим соответствующий урок в таблице существительных для копирования метаданных
      const nounLesson = nounsTable.data.find(row => 
        row['Урок название'] === theme && 
        row['Уровень изучения номер'] && 
        row['Урок номер']
      );
      
      if (nounLesson) {
        // Создаем новую строку с существующей структурой колонок
        const newLessonRow = {};
        existingColumns.forEach(col => {
          newLessonRow[col] = '';
        });
        
        // Заполняем основные поля
        newLessonRow['Уровень изучения номер'] = nounLesson['Уровень изучения номер'];
        newLessonRow['Урок номер'] = nounLesson['Урок номер'];
        newLessonRow['Урок название'] = theme;
        
        updatedAdjectivesData.push(newLessonRow);
        addedCount++;
      }
    });

    // Сохраняем обновленную таблицу прилагательных
    const updatedTable = await AdjectivesTable.findOneAndUpdate(
      { name: 'adjectives' },
      { data: updatedAdjectivesData },
      { upsert: true, new: true }
    );

    // Возвращаем только массив данных, а не весь объект MongoDB
    res.json({
      success: true,
      message: `Themes synchronized successfully. Added ${addedCount} new themes.`,
      addedThemes: themesToAdd,
      data: updatedAdjectivesData // Возвращаем только массив данных
    });

  } catch (error) {
    console.error('Error syncing themes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all data (for admin panel) - ОБНОВЛЕННЫЙ

// Get all data (for admin panel)
app.get('/api/db', async (req, res) => {
  try {
    const [
      words, images, numberValues, lessons, tests, testResults, 
      flags, settings, table, adjectivesTable, questionWords, prepositionsTable // ← ДОБАВЬ prepositionsTable
    ] = await Promise.all([
      Word.find(),
      Image.find(),
      NumberValue.find(),
      Lesson.find(),
      Test.find(),
      TestResult.find(),
      Flag.find(),
      Settings.findOne(),
      Table.findOne({ name: 'main' }),
      AdjectivesTable.findOne({ name: 'adjectives' }),
      QuestionWords.findOne({ name: 'question-words' }),
      PrepositionsTable.findOne({ name: 'prepositions' }) // ← ДОБАВЬ ЭТУ СТРОЧКУ
    ]);

    res.json({
      words,
      images,
      numbers: numberValues,
      lessons,
      tests: tests || [],
      testResults: testResults || [],
      flags,
      settings: settings || {
        fontColor: '#000000',
        bgColor: '#f0f0f0',
        fontBgColor: '#808080'
      },
      table: table?.data || [],
      adjectivesTable: adjectivesTable?.data || [],
      questionWords: questionWords?.data || [],
      prepositionsTable: prepositionsTable?.data || [] // ← ДОБАВЬ ЭТУ СТРОЧКУ
    });
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find({});
    console.log('All lessons in DB:', lessons);
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching all lessons:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save table data
app.post('/api/table', async (req, res) => {
  try {
    const { tableData } = req.body;
    
    await Table.findOneAndUpdate(
      { name: 'main' },
      { data: tableData },
      { upsert: true, new: true }
    );

    res.json({ message: 'Table data saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// МАРШРУТЫ ДЛЯ ТИПОВ УРОКОВ И МОДУЛЕЙ

// Получить все типы уроков
app.get('/api/lesson-types', async (req, res) => {
  try {
    const types = await LessonType.find().sort('typeId');
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать модуль урока
app.post('/api/lesson-modules', async (req, res) => {
  try {
    const module = new LessonModule(req.body);
    const savedModule = await module.save();
    res.json(savedModule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить модули урока
app.get('/api/lessons/:lessonId/modules', async (req, res) => {
  try {
    const modules = await LessonModule.find({ 
      lessonId: req.params.lessonId 
    }).sort('order');
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновить модуль урока
app.put('/api/lesson-modules/:id', async (req, res) => {
  try {
    const module = await LessonModule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Удалить модуль урока
app.delete('/api/lesson-modules/:id', async (req, res) => {
  try {
    await LessonModule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать предложение для модуля
app.post('/api/sentences', async (req, res) => {
  try {
    console.log('Creating sentence with data:', req.body);
    const sentence = new Sentence(req.body);
    const savedSentence = await sentence.save();
    console.log('Sentence created successfully:', savedSentence);
    res.json(savedSentence);
  } catch (error) {
    console.error('Error creating sentence:', error);
    res.status(500).json({ error: error.message });
  }
});
// НОВОЕ: Обновить предложение
app.put('/api/sentences/:id', async (req, res) => {
  try {
    console.log('Updating sentence:', req.params.id, req.body);
    const sentence = await Sentence.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!sentence) {
      return res.status(404).json({ error: 'Sentence not found' });
    }
    console.log('Sentence updated successfully:', sentence);
    res.json(sentence);
  } catch (error) {
    console.error('Error updating sentence:', error);
    res.status(500).json({ error: error.message });
  }
});


// НОВОЕ: Удалить предложение
app.delete('/api/sentences/:id', async (req, res) => {
  try {
    const sentence = await Sentence.findByIdAndDelete(req.params.id);
    if (!sentence) {
      return res.status(404).json({ error: 'Sentence not found' });
    }
    res.json({ message: 'Sentence deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить предложения модуля
app.get('/api/lesson-modules/:moduleId/sentences', async (req, res) => {
  try {
    const sentences = await Sentence.find({ 
      moduleId: req.params.moduleId 
    }).sort('order');
    console.log(`Found ${sentences.length} sentences for module ${req.params.moduleId}`);
    res.json(sentences);
  } catch (error) {
    console.error('Error fetching sentences:', error);
    res.status(500).json({ error: error.message });
  }
});
// Get table data
app.get('/api/table', async (req, res) => {
    try {
        const table = await Table.findOne({ name: 'main' });
        res.json(Array.isArray(table?.data) ? table.data : []);
    } catch (error) {
        console.error('Error fetching table:', error);
        res.json([]);
    }
});
// Удалить Вопрос
app.delete('/api/questions/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Маршрут для добавления недостающих типов уроков
app.post('/api/lesson-types/add-missing', async (req, res) => {
  try {
    const existingTypes = await LessonType.find();
    const hasQuestionType = existingTypes.some(t => t.typeId === 4);
    
    if (!hasQuestionType) {
      await LessonType.create({
        typeId: 4,
        name: 'Вопрос',
        description: 'Урок с Вопросами и ответами',
        config: {
          requiresPairAnswer: true,
          questionColumns: 3,
          answerColumns: 3,
          availableDatabases: ['nouns', 'adjectives', 'verbs', 'pronouns', 'numerals', 'adverbs', 'prepositions', 'question-words']
        }
      });
      res.json({ success: true, message: 'Question type added successfully' });
    } else {
      res.json({ success: true, message: 'Question type already exists' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Save all data (for admin panel)
app.post('/api/db', async (req, res) => {
  try {
    const { words, images, numbers, lessons, tests, flags, settings, table } = req.body;

    // Update words
    if (words) {
      for (const word of words) {
        if (word._id) {
          await Word.findByIdAndUpdate(word._id, word);
        } else {
          await Word.create(word);
        }
      }
    }

    // Update images
    if (images) {
      for (const image of images) {
        if (image._id) {
          await Image.findByIdAndUpdate(image._id, image);
        } else {
          await Image.create(image);
        }
      }
    }

    // Update numbers (теперь numberValues)
    if (numbers) {
      for (const number of numbers) {
        if (number._id) {
          await NumberValue.findByIdAndUpdate(number._id, number);
        } else {
          await NumberValue.create(number);
        }
      }
    }

    // Update lessons
    if (lessons) {
      for (const lesson of lessons) {
        if (lesson._id) {
          await Lesson.findByIdAndUpdate(lesson._id, lesson);
        } else {
          await Lesson.create(lesson);
        }
      }
    }

    // Update tests
    if (tests) {
      for (const test of tests) {
        if (test._id) {
          await Test.findByIdAndUpdate(test._id, test);
        } else {
          await Test.create(test);
        }
      }
    }

    // Update flags
    if (flags) {
      for (const flag of flags) {
        if (flag._id) {
          await Flag.findByIdAndUpdate(flag._id, flag);
        } else {
          await Flag.create(flag);
        }
      }
    }

    // Update settings
    if (settings) {
      await Settings.findOneAndUpdate({}, settings, { upsert: true });
    }

    // Update table
    if (table) {
      await Table.findOneAndUpdate(
        { name: 'main' },
        { data: table },
        { upsert: true }
      );
    }

    res.json({ message: 'Database updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Words CRUD
app.get('/api/words', async (req, res) => {
  try {
    const words = await Word.find();
    res.json(words);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/words', async (req, res) => {
  try {
    const word = await Word.create(req.body);
    res.json(word);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/words/:id', async (req, res) => {
  try {
    const word = await Word.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(word);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete('/api/lessons/:id', async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    // Также удаляем связанные тесты
    await Test.deleteMany({ lessonId: req.params.id });
    
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/words/:id', async (req, res) => {
  try {
    await Word.findByIdAndDelete(req.params.id);
    res.json({ message: 'Word deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/lesson-modules/by-lesson/:lessonId', async (req, res) => {
  try {
    const modules = await LessonModule.find({ 
      lessonId: req.params.lessonId,
      isActive: true 
    }).sort('order');
    
    console.log(`Found ${modules.length} modules for lesson ${req.params.lessonId}`);
    res.json(modules);
  } catch (error) {
    console.error('Error fetching lesson modules:', error);
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/lessons/:id/exists', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    res.json({ exists: !!lesson });
  } catch (error) {
    res.json({ exists: false });
  }
});

// Images CRUD
app.get('/api/images', async (req, res) => {
  try {
    const images = await Image.find();
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/images', async (req, res) => {
  try {
    const image = await Image.create(req.body);
    res.json(image);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload image to imgbb
app.post('/api/upload-image', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    // Проверяем, является ли это data URL (data:image/...)
    let base64Data;
    if (imageBase64.startsWith('data:')) {
      // Извлекаем base64 часть из data URL
      const matches = imageBase64.match(/^data:.+\/(.+);base64,(.*)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ success: false, error: 'Invalid image data format' });
      }
      base64Data = matches[2];
    } else {
      // Уже чистая base64 строка
      base64Data = imageBase64;
    }

    // Конвертируем base64 в буфер
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Генерируем имя файла
    const fileName = `image_${Date.now()}.jpg`;
    
    // Загружаем на ImageBan
    const imageUrl = await uploadImageToImageBan(imageBuffer, fileName, 'image/jpeg');
    
    return res.json({
      success: true,
      imageUrl: imageUrl,
      thumbUrl: imageUrl, // ImageBan не возвращает отдельно thumbnail, используем ту же ссылку
      deleteUrl: null // ImageBan не предоставляет delete URL при гостевой загрузке
    });
    
  } catch (error) {
    console.error('upload-image error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Server error' 
    });
  }
});

// Flags CRUD
app.get('/api/flags', async (req, res) => {
  try {
    const flags = await Flag.find();
    res.json(flags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/flags', async (req, res) => {
  try {
    const flag = await Flag.create(req.body);
    res.json(flag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/flags/:id', async (req, res) => {
  try {
    const flag = await Flag.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(flag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/flags/:id', async (req, res) => {
  try {
    await Flag.findByIdAndDelete(req.params.id);
    res.json({ message: 'Flag deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lessons CRUD
app.get('/api/learning/lessons', async (req, res) => {
  try {
    const { level, studiedLanguage, hintLanguage } = req.query;
    
    let query = {};
    if (level) query.level = level;
    if (studiedLanguage) query.studiedLanguage = studiedLanguage;
    if (hintLanguage) query.hintLanguage = hintLanguage;

    const lessons = await Lesson.find(query).select('-words -wordIds');
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение конкретного урока для обучения
app.get('/api/learning/lesson/:id', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Получаем слова для урока (в вашей структуре слова хранятся в самом уроке)
    res.json({
      lesson: {
        id: lesson._id,
        title: lesson.title,
        level: lesson.level,
        theme: lesson.theme,
        studiedLanguage: lesson.studiedLanguage,
        hintLanguage: lesson.hintLanguage,
        fontColor: lesson.fontColor,
        bgColor: lesson.bgColor,
        words: lesson.words || [] // слова уже включены в модель урока
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение всех уроков (для главной страницы)
app.get('/api/lessons/all', async (req, res) => {
  try {
    const lessons = await Lesson.find({}).select('title level theme studiedLanguage hintLanguage');
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lessons', async (req, res) => {
  try {
    const { level, studiedLanguage, hintLanguage } = req.query;
    
    console.log('Query params:', { level, studiedLanguage, hintLanguage });
    
    let query = {};
    if (level && level !== 'undefined') query.level = level;
    if (studiedLanguage && studiedLanguage !== 'undefined') query.studiedLanguage = studiedLanguage;
    if (hintLanguage && hintLanguage !== 'undefined') query.hintLanguage = hintLanguage;

    console.log('Mongo query:', query);

    const lessons = await Lesson.find(query);
    console.log('Found lessons:', lessons.length, lessons);
    
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: error.message });
  }
});

// В бэкенде ЗАМЕНИМ маршруты для available-languages и available-levels
app.get('/api/available-languages', async (req, res) => {
  try {
    const table = await Table.findOne({ name: 'main' });
    if (!table || !table.data) {
      return res.json([]);
    }

    // Получаем все языки из колонок таблицы
    const languages = new Set();
    
    table.data.forEach(row => {
      Object.keys(row).forEach(col => {
        if (col.includes('База существительные слова')) {
          const language = col.split(' ').pop(); // "Русский", "Английский", "Испанский" и т.д.
          if (language && language.trim() !== '') {
            languages.add(language);
          }
        }
      });
    });

    const availableLanguages = Array.from(languages).sort();
    console.log('Available languages from table:', availableLanguages);
    res.json(availableLanguages);
  } catch (error) {
    console.error('Error fetching available languages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/available-levels', async (req, res) => {
  try {
    const table = await Table.findOne({ name: 'main' });
    if (!table || !table.data) {
      return res.json([]);
    }

    // Получаем все уровни из колонки "Уровень изучения номер"
    const levels = new Set();
    
    table.data.forEach(row => {
      const level = row['Уровень изучения номер'];
      if (level && level.trim() !== '') {
        levels.add(level);
      }
    });

    const availableLevels = Array.from(levels).sort();
    console.log('Available levels from table:', availableLevels);
    res.json(availableLevels);
  } catch (error) {
    console.error('Error fetching available levels:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить уроки из таблицы с фильтрацией
app.get('/api/table-lessons', async (req, res) => {
  try {
    const { level, studiedLanguage, hintLanguage } = req.query;
    const table = await Table.findOne({ name: 'main' });
    
    if (!table || !table.data) {
      return res.json([]);
    }

    console.log('Filtering table lessons with:', { level, studiedLanguage, hintLanguage });

    // Фильтруем уроки из таблицы
    const lessons = table.data.filter(row => {
      const hasLevel = row['Уровень изучения номер'] && row['Уровень изучения номер'].trim() !== '';
      const hasLessonNumber = row['Урок номер'] && row['Урок номер'].trim() !== '';
      const hasTitle = row['Урок название'] && row['Урок название'].trim() !== '';
      
      return hasLevel && hasLessonNumber && hasTitle;
    });

    // Преобразуем в формат для фронтенда
    const formattedLessons = lessons.map(lesson => ({
      _id: `table_${lesson['Урок номер']}_${encodeURIComponent(lesson['Урок название'])}`,
      title: lesson['Урок название'],
      level: lesson['Уровень изучения номер'],
      theme: lesson['Урок название'],
      studiedLanguage: studiedLanguage || 'русский',
      hintLanguage: hintLanguage || 'английский',
      lessonNumber: lesson['Урок номер']
    }));

    console.log(`Found ${formattedLessons.length} lessons from table`);
    res.json(formattedLessons);
  } catch (error) {
    console.error('Error fetching table lessons:', error);
    res.status(500).json({ error: error.message });
  }
});

// В бэкенде добавим маршрут для загрузки урока из таблицы
app.get('/api/table-lessons/:id', async (req, res) => {
  try {
    const lessonId = req.params.id;
    const studiedLanguage = req.query.studiedLanguage || 'русский';
    const hintLanguage = req.query.hintLanguage || 'английский';
    
    console.log('Loading table lesson with ID:', lessonId, 'languages:', { studiedLanguage, hintLanguage });
    
    // Извлекаем информацию из ID (формат: table_1.1_Еда)
    const match = lessonId.match(/^table_([^_]+)_(.+)$/);
    if (!match) {
      return res.status(404).json({ error: 'Invalid lesson ID format' });
    }
    
    const lessonNumber = match[1];
    const lessonTitle = decodeURIComponent(match[2]); // Декодируем название
    
    const table = await Table.findOne({ name: 'main' });
    if (!table || !table.data) {
      return res.status(404).json({ error: 'Table not found' });
    }

    console.log('Looking for lesson:', lessonNumber, lessonTitle);

    // Находим заголовок урока
    const lessonHeader = table.data.find(row => 
      row['Урок номер'] === lessonNumber && 
      row['Урок название'] === lessonTitle
    );
    
    if (!lessonHeader) {
      console.log('Lesson header not found');
      return res.status(404).json({ error: 'Lesson not found in table' });
    }

    console.log('Found lesson header:', lessonHeader);

    // Находим все слова этого урока
    const words = [];
    let currentLesson = null;
    let collectingWords = false;
    
    for (const row of table.data) {
      // Если это заголовок нашего урока
      if (row['Урок номер'] === lessonNumber && row['Урок название'] === lessonTitle) {
        currentLesson = lessonTitle;
        collectingWords = true;
        continue;
      }
      
      // Если это заголовок другого урока - прекращаем сбор
      if (row['Урок номер'] && row['Урок номер'] !== lessonNumber) {
        if (collectingWords) break;
        continue;
      }
      
      // Если собираем слова и это строка со словом
      if (collectingWords && row['База изображение'] && row['База изображение'].trim() !== '') {
        console.log('Found word row:', row);
        
        const translations = {};
        
        // Добавляем переводы для всех языков
        Object.keys(row).forEach(col => {
          if (col.includes('База существительные слова')) {
            const language = col.split(' ').pop();
            const translation = row[col] || '';
            if (translation.trim() !== '') {
              // Приводим язык к нижнему регистру для совместимости
              const langKey = language.toLowerCase();
              translations[langKey] = translation;
            }
          }
        });
        
        const wordObj = {
          imageBase: row['База изображение'],
          imagePng: row['Картинка png'] || '',
          translations: translations
        };
        
        console.log('Created word object:', wordObj);
        words.push(wordObj);
      }
    }

    const lessonData = {
      _id: lessonId,
      title: lessonTitle,
      level: lessonHeader['Уровень изучения номер'],
      theme: lessonTitle,
      studiedLanguage: studiedLanguage,
      hintLanguage: hintLanguage,
      fontColor: '#000000',
      bgColor: '#ffffff',
      lessonNumber: lessonNumber,
      words: words
    };

    console.log(`Loaded table lesson: ${lessonTitle}, words: ${words.length}`, lessonData);
    res.json(lessonData);
  } catch (error) {
    console.error('Error loading table lesson:', error);
    res.status(500).json({ error: error.message });
  }
});

// Маршрут для создания урока (ОБНОВЛЕННЫЙ)
app.post('/api/lessons', async (req, res) => {
  try {
    console.log('Creating lesson with data:', req.body);
    
    const lesson = new Lesson(req.body);
    const savedLesson = await lesson.save();
    
    console.log('Lesson saved successfully:', savedLesson);
    res.json(savedLesson);
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lessons/:id', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tests CRUD
app.get('/api/tests', async (req, res) => {
  try {
    const tests = await Test.find();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// В server.js обновляем маршрут создания теста
app.post('/api/tests', async (req, res) => {
  try {
    console.log('Creating test with data:', req.body);
    
    const test = new Test(req.body);
    const savedTest = await test.save();
    
    console.log('Test saved successfully:', savedTest);
    res.json(savedTest);
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get lesson for learning
app.get('/api/learning/lesson/:id', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const words = await Word.find({ _id: { $in: lesson.wordIds } });
    
    res.json({
      lesson,
      words
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get test
app.get('/api/learning/test/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const words = await Word.find({ _id: { $in: test.wordIds } });
    
    res.json({
      test,
      words
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/table-languages', async (req, res) => {
  try {
    const table = await Table.findOne({ name: 'main' });
    if (!table || !table.data) {
      return res.json([]);
    }

    // Получаем все языки из колонок таблицы
    const languages = new Set();
    
    table.data.forEach(row => {
      Object.keys(row).forEach(col => {
        if (col.includes('База существительные слова')) {
          const language = col.split(' ').pop();
          if (language && language.trim() !== '') {
            languages.add(language);
          }
        }
      });
    });

    const availableLanguages = Array.from(languages).sort();
    console.log('Available languages from table:', availableLanguages);
    res.json(availableLanguages);
  } catch (error) {
    console.error('Error fetching table languages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Синхронизировать флаги с языками из таблицы
app.post('/api/flags/sync', async (req, res) => {
  try {
    // Получаем языки из таблицы
    const table = await Table.findOne({ name: 'main' });
    if (!table || !table.data) {
      return res.status(400).json({ error: 'Table not found' });
    }

    const languages = new Set();
    table.data.forEach(row => {
      Object.keys(row).forEach(col => {
        if (col.includes('База существительные слова')) {
          const language = col.split(' ').pop();
          if (language && language.trim() !== '') {
            languages.add(language);
          }
        }
      });
    });

    const tableLanguages = Array.from(languages);
    
    // Получаем существующие флаги
    const existingFlags = await Flag.find();
    const existingLanguages = existingFlags.map(flag => flag.language);
    
    // Находим языки, для которых нужно создать флаги
    const languagesToAdd = tableLanguages.filter(lang => !existingLanguages.includes(lang));
    
    // Создаем флаги для отсутствующих языков
    const defaultFlagImages = {
      'Русский': '🇷🇺',
      'Английский': '🇺🇸', 
      'Турецкий': '🇹🇷',
      'Испанский': '🇪🇸',
      'Немецкий': '🇩🇪',
      'Французский': '🇫🇷',
      'Итальянский': '🇮🇹',
      'Китайский': '🇨🇳',
      'Японский': '🇯🇵'
    };

    const newFlags = languagesToAdd.map(language => ({
      language,
      image: defaultFlagImages[language] || '🏴'
    }));

    if (newFlags.length > 0) {
      await Flag.insertMany(newFlags);
    }

    // Находим флаги для языков, которых больше нет в таблице
    const languagesToRemove = existingLanguages.filter(lang => !tableLanguages.includes(lang));
    if (languagesToRemove.length > 0) {
      await Flag.deleteMany({ language: { $in: languagesToRemove } });
    }

    const updatedFlags = await Flag.find();
    
    res.json({
      added: newFlags.length,
      removed: languagesToRemove.length,
      flags: updatedFlags
    });

  } catch (error) {
    console.error('Error syncing flags:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test-words/:testId', async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Получаем урок для этого теста
    const lesson = await Lesson.findById(test.lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found for this test' });
    }

    res.json({
      test,
      words: lesson.words || []
    });
  } catch (error) {
    console.error('Error fetching test words:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test-results', async (req, res) => {
  try {
    const results = await TestResult.find().sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test-results', async (req, res) => {
  try {
    const { testId, userId, score, totalQuestions, incorrectWords } = req.body;
    
    const testResult = await TestResult.create({
      testId,
      userId: userId || 'anonymous',
      score,
      totalQuestions,
      incorrectWords,
      completedAt: new Date()
    });
    
    res.json({ 
      success: true, 
      message: 'Test results saved successfully',
      result: testResult
    });
  } catch (error) {
    console.error('Error saving test results:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tests/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tests/:id', async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available lessons for user
app.get('/api/learning/lessons', async (req, res) => {
  try {
    const { level, studiedLanguage, hintLanguage } = req.query;
    
    let query = {};
    if (level) query.level = level;
    if (studiedLanguage) query.studiedLanguage = studiedLanguage;
    if (hintLanguage) query.hintLanguage = hintLanguage;

    const lessons = await Lesson.find(query);
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/reorder-columns', async (req, res) => {
  try {
    console.log('Starting column reordering...');
    
    const table = await Table.findOne({ name: 'main' });
    if (!table || !table.data) {
      return res.status(404).json({ success: false, message: 'No table data found' });
    }

    const firstRow = table.data[0];
    if (!firstRow) {
      return res.status(400).json({ success: false, message: 'Table is empty' });
    }

    const currentColumns = Object.keys(firstRow);
    console.log('Current columns:', currentColumns);

    // Разделяем колонки на группы
    const baseColumns = []; // Базовые колонки (Уровень, Урок, База изображение и т.д.)
    const languageGroups = {}; // Группы по языкам
    const otherColumns = []; // Остальные колонки
    const pluralColumns = []; // Колонки множественного числа

    // Сначала собираем все колонки по типам
    currentColumns.forEach(col => {
      if (col.includes('База существительные множественное')) {
        pluralColumns.push(col);
        const language = col.split(' ').pop();
        if (!languageGroups[language]) {
          languageGroups[language] = { number: null, word: null, plural: null };
        }
        languageGroups[language].plural = col;
      }
      else if (col.includes('База существительные слова')) {
        const language = col.split(' ').pop();
        if (!languageGroups[language]) {
          languageGroups[language] = { number: null, word: null, plural: null };
        }
        languageGroups[language].word = col;
      }
      else if (col.includes('База существительные номер')) {
        const language = col.split(' ').pop();
        if (!languageGroups[language]) {
          languageGroups[language] = { number: null, word: null, plural: null };
        }
        languageGroups[language].number = col;
      }
      else if (col === 'Уровень изучения номер' || 
               col === 'Урок номер' || 
               col === 'Урок название' || 
               col === 'База изображение' || 
               col === 'Картинка png') {
        baseColumns.push(col);
      } else {
        otherColumns.push(col);
      }
    });

    console.log('Language groups:', languageGroups);
    console.log('Base columns:', baseColumns);
    console.log('Plural columns:', pluralColumns);

    // Строим новый порядок колонок
    const newColumnOrder = [...baseColumns, ...otherColumns];

    // Добавляем колонки для каждого языка в правильном порядке
    Object.keys(languageGroups).forEach(language => {
      const group = languageGroups[language];
      if (group.number) newColumnOrder.push(group.number);
      if (group.word) newColumnOrder.push(group.word);
      if (group.plural) newColumnOrder.push(group.plural);
    });

    console.log('New column order:', newColumnOrder);
    console.log(`Reordering: ${currentColumns.length} -> ${newColumnOrder.length} columns`);

    // Перестраиваем все строки с новым порядком колонок
    const updatedData = table.data.map(row => {
      const newRow = {};
      newColumnOrder.forEach(col => {
        newRow[col] = row[col] || ''; // Сохраняем значение или пустую строку
      });
      return newRow;
    });

    // Сохраняем обновленные данные
    await Table.findOneAndUpdate(
      { name: 'main' },
      { data: updatedData },
      { new: true }
    );

    const result = { 
      success: true, 
      message: `Column reordering completed successfully!`,
      details: {
        previousOrder: currentColumns,
        newOrder: newColumnOrder,
        totalRows: updatedData.length,
        languages: Object.keys(languageGroups)
      }
    };
    
    console.log('Reordering result:', result);
    res.json(result);
    
  } catch (error) {
    console.error('Error during column reordering:', error);
    res.status(500).json({ 
      success: false, 
      message: `Reordering failed: ${error.message}` 
    });
  }
});

// Вставь в бэкенд ПЕРЕД app.listen():
// Добавить тему "Цвета" в таблицу прилагательных
// Умное добавление темы "Цвета" - синхронизирует с существующими языками
// Добавить тему "Цвета" с переводами на языки из таблицы существительных
// Создать таблицу прилагательных с нуля и добавить тему "Цвета"
app.get('/api/adjectives-table/create-with-colors', async (req, res) => {
  try {
    console.log('=== СОЗДАНИЕ ТАБЛИЦЫ ПРИЛАГАТЕЛЬНЫХ С НУЛЯ С ТЕМОЙ "ЦВЕТА" ===');
    
    // 1. Удаляем старую таблицу (если есть)
    await AdjectivesTable.deleteMany({ name: 'adjectives' });
    console.log('Старая таблица удалена');
    
    // 2. Базовые языки которые всегда должны быть
    const baseLanguages = ['Русский', 'Английский', 'Турецкий', 'Испанский', 'Немецкий', 'Французский'];
    
    // 3. Создаём структуру колонок
    const baseColumns = [
      'Уровень изучения номер',
      'Урок номер',
      'Урок название',
      'База изображение',
      'Картинка png'
    ];
    
    // Добавляем колонки для каждого языка
    baseLanguages.forEach(language => {
      baseColumns.push(`База прилагательные номер ${language}`);
      baseColumns.push(`База прилагательные слова ${language}`);
      baseColumns.push(`База прилагательные мужской род ${language}`);
      baseColumns.push(`База прилагательные женский род ${language}`);
      baseColumns.push(`База прилагательные средний род ${language}`);
      baseColumns.push(`База прилагательные множественное число ${language}`);
    });
    
    console.log(`Создано колонок: ${baseColumns.length} для ${baseLanguages.length} языков`);
    
    // 4. Создаём данные для таблицы
    const tableData = [];
    
    // 5. Тема 1: Цвета (урок 1.1)
    const colorsThemeHeader = {};
    baseColumns.forEach(col => {
      colorsThemeHeader[col] = '';
    });
    colorsThemeHeader['Уровень изучения номер'] = 'A1';
    colorsThemeHeader['Урок номер'] = '1.1';
    colorsThemeHeader['Урок название'] = 'Цвета';
    
    tableData.push(colorsThemeHeader);
    
    // 6. РЕАЛЬНЫЕ ПЕРЕВОДЫ ЦВЕТОВ
    const colors = [
      {
        id: '1',
        imageBase: '1.1.1',
        imagePng: 'https://i.ibb.co/4F8MZbP/red-color.png',
        translations: {
          Русский: { masculine: 'красный', feminine: 'красная', neuter: 'красное', plural: 'красные' },
          Английский: 'red',
          Турецкий: 'kırmızı',
          Испанский: 'rojo',
          Немецкий: 'rot',
          Французский: 'rouge'
        }
      },
      {
        id: '2',
        imageBase: '1.1.2',
        imagePng: 'https://i.ibb.co/0Vz6YxC/white-color.png',
        translations: {
          Русский: { masculine: 'белый', feminine: 'белая', neuter: 'белое', plural: 'белые' },
          Английский: 'white',
          Турецкий: 'beyaz',
          Испанский: 'blanco',
          Немецкий: 'weiß',
          Французский: 'blanc'
        }
      },
      {
        id: '3',
        imageBase: '1.1.3',
        imagePng: 'https://i.ibb.co/D9t3RQF/blue-color.png',
        translations: {
          Русский: { masculine: 'синий', feminine: 'синяя', neuter: 'синее', plural: 'синие' },
          Английский: 'blue',
          Турецкий: 'mavi',
          Испанский: 'azul',
          Немецкий: 'blau',
          Французский: 'bleu'
        }
      },
      {
        id: '4',
        imageBase: '1.1.4',
        imagePng: 'https://i.ibb.co/LJkF2qt/green-color.png',
        translations: {
          Русский: { masculine: 'зеленый', feminine: 'зеленая', neuter: 'зеленое', plural: 'зеленые' },
          Английский: 'green',
          Турецкий: 'yeşil',
          Испанский: 'verde',
          Немецкий: 'grün',
          Французский: 'vert'
        }
      },
      {
        id: '5',
        imageBase: '1.1.5',
        imagePng: 'https://i.ibb.co/r2WgyYt/black-color.png',
        translations: {
          Русский: { masculine: 'черный', feminine: 'черная', neuter: 'черное', plural: 'черные' },
          Английский: 'black',
          Турецкий: 'siyah',
          Испанский: 'negro',
          Немецкий: 'schwarz',
          Французский: 'noir'
        }
      },
      {
        id: '6',
        imageBase: '1.1.6',
        imagePng: 'https://i.ibb.co/GV7LqRf/yellow-color.png',
        translations: {
          Русский: { masculine: 'желтый', feminine: 'желтая', neuter: 'желтое', plural: 'желтые' },
          Английский: 'yellow',
          Турецкий: 'sarı',
          Испанский: 'amarillo',
          Немецкий: 'gelb',
          Французский: 'jaune'
        }
      }
    ];
    
    // 7. Добавляем цвета в таблицу
    colors.forEach((color, index) => {
      const colorRow = {};
      baseColumns.forEach(col => {
        colorRow[col] = '';
      });
      
      // Базовые поля
      colorRow['База изображение'] = color.imageBase;
      colorRow['Картинка png'] = color.imagePng;
      
      // Заполняем для каждого языка
      baseLanguages.forEach(language => {
        // Номер для языка
        const numberCol = `База прилагательные номер ${language}`;
        colorRow[numberCol] = `${color.imageBase}.${index + 1}`;
        
        // Переводы
        if (color.translations[language]) {
          const translation = color.translations[language];
          
          // Для русского - полная структура
          if (language === 'Русский' && typeof translation === 'object') {
            colorRow[`База прилагательные мужской род ${language}`] = translation.masculine;
            colorRow[`База прилагательные женский род ${language}`] = translation.feminine;
            colorRow[`База прилагательные средний род ${language}`] = translation.neuter;
            colorRow[`База прилагательные множественное число ${language}`] = translation.plural;
            colorRow[`База прилагательные слова ${language}`] = translation.masculine;
          }
          // Для других языков - просто слово
          else if (typeof translation === 'string') {
            colorRow[`База прилагательные слова ${language}`] = translation;
            // Для совместимости заполняем остальные колонки
            colorRow[`База прилагательные мужской род ${language}`] = translation;
            colorRow[`База прилагательные женский род ${language}`] = translation;
            colorRow[`База прилагательные средний род ${language}`] = translation;
            colorRow[`База прилагательные множественное число ${language}`] = translation;
          }
        }
      });
      
      tableData.push(colorRow);
    });
    
    // 8. Тема 2: Характеристики (урок 1.2)
    const characteristicsThemeHeader = {};
    baseColumns.forEach(col => {
      characteristicsThemeHeader[col] = '';
    });
    characteristicsThemeHeader['Уровень изучения номер'] = 'A1';
    characteristicsThemeHeader['Урок номер'] = '1.2';
    characteristicsThemeHeader['Урок название'] = 'Характеристики';
    
    tableData.push(characteristicsThemeHeader);
    
    // 9. Характеристики
    const characteristics = [
      {
        id: '1',
        imageBase: '1.2.1',
        imagePng: 'https://i.ibb.co/t3tY2H9/big.png',
        translations: {
          Русский: { masculine: 'большой', feminine: 'большая', neuter: 'большое', plural: 'большие' },
          Английский: 'big',
          Турецкий: 'büyük',
          Испанский: 'grande',
          Немецкий: 'groß',
          Французский: 'grand'
        }
      },
      {
        id: '2',
        imageBase: '1.2.2',
        imagePng: 'https://i.ibb.co/7QqjV0H/small.png',
        translations: {
          Русский: { masculine: 'маленький', feminine: 'маленькая', neuter: 'маленькое', plural: 'маленькие' },
          Английский: 'small',
          Турецкий: 'küçük',
          Испанский: 'pequeño',
          Немецкий: 'klein',
          Французский: 'petit'
        }
      },
      {
        id: '3',
        imageBase: '1.2.3',
        imagePng: 'https://i.ibb.co/0G5MkFk/beautiful.png',
        translations: {
          Русский: { masculine: 'красивый', feminine: 'красивая', neuter: 'красивое', plural: 'красивые' },
          Английский: 'beautiful',
          Турецкий: 'güzel',
          Испанский: 'hermoso',
          Немецкий: 'schön',
          Французский: 'beau'
        }
      }
    ];
    
    // 10. Добавляем характеристики
    characteristics.forEach((char, index) => {
      const charRow = {};
      baseColumns.forEach(col => {
        charRow[col] = '';
      });
      
      charRow['База изображение'] = char.imageBase;
      charRow['Картинка png'] = char.imagePng;
      
      baseLanguages.forEach(language => {
        const numberCol = `База прилагательные номер ${language}`;
        charRow[numberCol] = `${char.imageBase}.${index + 1}`;
        
        if (char.translations[language]) {
          const translation = char.translations[language];
          
          if (language === 'Русский' && typeof translation === 'object') {
            charRow[`База прилагательные мужской род ${language}`] = translation.masculine;
            charRow[`База прилагательные женский род ${language}`] = translation.feminine;
            charRow[`База прилагательные средний род ${language}`] = translation.neuter;
            charRow[`База прилагательные множественное число ${language}`] = translation.plural;
            charRow[`База прилагательные слова ${language}`] = translation.masculine;
          }
          else if (typeof translation === 'string') {
            charRow[`База прилагательные слова ${language}`] = translation;
            charRow[`База прилагательные мужской род ${language}`] = translation;
            charRow[`База прилагательные женский род ${language}`] = translation;
            charRow[`База прилагательные средний род ${language}`] = translation;
            charRow[`База прилагательные множественное число ${language}`] = translation;
          }
        }
      });
      
      tableData.push(charRow);
    });
    
    // 11. Создаём таблицу
    const newTable = await AdjectivesTable.create({
      data: tableData,
      name: 'adjectives'
    });
    
    console.log(`✅ Таблица создана! Всего строк: ${tableData.length}`);
    console.log(`✅ Темы: "Цвета" (${colors.length} слов), "Характеристики" (${characteristics.length} слов)`);
    
    // 12. Формируем отчёт
    const colorExamples = colors.map(c => ({
      русский: c.translations.Русский.masculine,
      английский: c.translations.Английский,
      турецкий: c.translations.Турецкий,
      испанский: c.translations.Испанский
    }));
    
    res.json({
      success: true,
      message: '✅ Таблица прилагательных создана с нуля с темами!',
      details: {
        totalRows: tableData.length,
        themes: [
          { name: 'Цвета', lessonNumber: '1.1', words: colors.length },
          { name: 'Характеристики', lessonNumber: '1.2', words: characteristics.length }
        ],
        languages: baseLanguages,
        columnsCreated: baseColumns.length,
        colorExamples: colorExamples,
        characteristicsExamples: characteristics.map(c => ({
          русский: c.translations.Русский.masculine,
          английский: c.translations.Английский,
          турецкий: c.translations.Турецкий
        }))
      }
    });
    
  } catch (error) {
    console.error('Ошибка создания таблицы:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    });
  }
});

// Добавь также эндпоинт для падежей прилагательных
app.get('/api/restore-adjective-cases', async (req, res) => {
  try {
    // Восстанавливаем падежи для основных прилагательных
    const casesToRestore = [
      {
        imageBase: '1.1.1', // красный
        language: 'русский',
        singular: {
          masculine: {
            nominative: 'красный',
            genitive: 'красного',
            dative: 'красному',
            accusative: 'красный',
            instrumental: 'красным',
            prepositional: 'красном'
          },
          feminine: {
            nominative: 'красная',
            genitive: 'красной',
            dative: 'красной',
            accusative: 'красную',
            instrumental: 'красной',
            prepositional: 'красной'
          },
          neuter: {
            nominative: 'красное',
            genitive: 'красного',
            dative: 'красному',
            accusative: 'красное',
            instrumental: 'красным',
            prepositional: 'красном'
          }
        },
        plural: {
          nominative: 'красные',
          genitive: 'красных',
          dative: 'красным',
          accusative: 'красные',
          instrumental: 'красными',
          prepositional: 'красных'
        }
      },
      {
        imageBase: '1.1.2', // белый
        language: 'русский',
        singular: {
          masculine: {
            nominative: 'белый',
            genitive: 'белого',
            dative: 'белому',
            accusative: 'белый',
            instrumental: 'белым',
            prepositional: 'белом'
          },
          feminine: {
            nominative: 'белая',
            genitive: 'белой',
            dative: 'белой',
            accusative: 'белую',
            instrumental: 'белой',
            prepositional: 'белой'
          },
          neuter: {
            nominative: 'белое',
            genitive: 'белого',
            dative: 'белому',
            accusative: 'белое',
            instrumental: 'белым',
            prepositional: 'белом'
          }
        },
        plural: {
          nominative: 'белые',
          genitive: 'белых',
          dative: 'белым',
          accusative: 'белые',
          instrumental: 'белыми',
          prepositional: 'белых'
        }
      },
      {
        imageBase: '1.2.1', // большой
        language: 'русский',
        singular: {
          masculine: {
            nominative: 'большой',
            genitive: 'большого',
            dative: 'большому',
            accusative: 'большой',
            instrumental: 'большим',
            prepositional: 'большом'
          },
          feminine: {
            nominative: 'большая',
            genitive: 'большой',
            dative: 'большой',
            accusative: 'большую',
            instrumental: 'большой',
            prepositional: 'большой'
          },
          neuter: {
            nominative: 'большое',
            genitive: 'большого',
            dative: 'большому',
            accusative: 'большое',
            instrumental: 'большим',
            prepositional: 'большом'
          }
        },
        plural: {
          nominative: 'большие',
          genitive: 'больших',
          dative: 'большим',
          accusative: 'большие',
          instrumental: 'большими',
          prepositional: 'больших'
        }
      },
      {
        imageBase: '1.2.3', // красивый
        language: 'русский',
        singular: {
          masculine: {
            nominative: 'красивый',
            genitive: 'красивого',
            dative: 'красивому',
            accusative: 'красивый',
            instrumental: 'красивым',
            prepositional: 'красивом'
          },
          feminine: {
            nominative: 'красивая',
            genitive: 'красивой',
            dative: 'красивой',
            accusative: 'красивую',
            instrumental: 'красивой',
            prepositional: 'красивой'
          },
          neuter: {
            nominative: 'красивое',
            genitive: 'красивого',
            dative: 'красивому',
            accusative: 'красивое',
            instrumental: 'красивым',
            prepositional: 'красивом'
          }
        },
        plural: {
          nominative: 'красивые',
          genitive: 'красивых',
          dative: 'красивым',
          accusative: 'красивые',
          instrumental: 'красивыми',
          prepositional: 'красивых'
        }
      }
    ];
    
    for (const caseData of casesToRestore) {
      await AdjectiveCase.findOneAndUpdate(
        { imageBase: caseData.imageBase, language: caseData.language },
        caseData,
        { upsert: true, new: true }
      );
    }
    
    res.json({
      success: true,
      message: 'Восстановлены падежи для 4 основных прилагательных',
      restoredCases: casesToRestore.length
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Initialize server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeDefaultData();
});