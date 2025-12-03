import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import FormData from 'form-data';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 8888;

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
  config: { type: mongoose.Schema.Types.Mixed }, // Может быть sentenceModuleConfigSchema или questionModuleConfigSchema
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
    const adjectivesTableCount = await AdjectivesTable.countDocuments();
    if (adjectivesTableCount === 0) {
      await AdjectivesTable.create({
        data: [],
        name: 'adjectives'
      });
      console.log('Default adjectives table created');
    }

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

// Получить Вопросы модуля
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

    // Ваш IMGBB ключ (храните в env в проде)
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '610a7ea1405eee7735cbe4901efe239d';

    // Формируем form-data: сюда передаём именно чистую base64 строку
    const formData = new FormData();
    formData.append('image', imageBase64);

    // Важно: передать заголовки formData.getHeaders()
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      headers: formData.getHeaders ? formData.getHeaders() : {},
      body: formData
    });

    const result = await response.json();

    if (result && result.success) {
      return res.json({
        success: true,
        imageUrl: result.data.url,
        thumbUrl: result.data.thumb?.url,
        deleteUrl: result.data.delete_url
      });
    } else {
      return res.status(500).json({
        success: false,
        error: (result && (result.error?.message || result.error)) || 'Upload failed'
      });
    }
  } catch (error) {
    console.error('upload-image error:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
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
// Initialize server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeDefaultData();
});