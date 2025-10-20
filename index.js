// server.js - ИСПРАВЛЕННЫЙ БЭКЕНД
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import FormData from 'form-data';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 8888;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = "mongodb://learnlng_db_user:eatapple88@ac-5b9zkip-shard-00-00.spftlfo.mongodb.net:27017,ac-5b9zkip-shard-00-01.spftlfo.mongodb.net:27017,ac-5b9zkip-shard-00-02.spftlfo.mongodb.net:27017/?ssl=true&replicaSet=atlas-kb1waw-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

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

    // Check if table exists, if not create empty table
    const tableCount = await Table.countDocuments();
    if (tableCount === 0) {
      await Table.create({
        data: [],
        name: 'main'
      });
      console.log('Default table created');
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
        },
        {
          translations: {
            russian: 'СТОЛ',
            english: 'A table',
            turkish: 'Masa'
          }
        },
        {
          translations: {
            russian: 'СТУЛ',
            english: 'A chair',
            turkish: 'Sandalye'
          }
        }
      ]);
      console.log('Sample words created');
    }
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
}

// Routes

// Get all data (for admin panel)
app.get('/api/db', async (req, res) => {
  try {
    const [words, images, numberValues, lessons, tests, testResults, flags, settings, table] = await Promise.all([
      Word.find(),
      Image.find(),
      NumberValue.find(),
      Lesson.find(),
      Test.find(),
      TestResult.find(),
      Flag.find(),
      Settings.findOne(),
      Table.findOne({ name: 'main' })
    ]);

    res.json({
      words,
      images,
      numbers: numberValues, // ИСПРАВЛЕНО: сохраняем обратную совместимость
      lessons,
      tests: tests || [],
      testResults: testResults || [],
      flags,
      settings: settings || {
        fontColor: '#000000',
        bgColor: '#f0f0f0',
        fontBgColor: '#808080'
      },
      table: table?.data || []
    });
  } catch (error) {
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

// Get table data
app.get('/api/table', async (req, res) => {
  try {
    const table = await Table.findOne({ name: 'main' });
    res.json(table?.data || []);
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

    // Применяем фильтры
    const filteredLessons = lessons.filter(lesson => {
      if (level && lesson['Уровень изучения номер'] !== level) return false;
      // Для studiedLanguage и hintLanguage нужно проверить наличие соответствующих колонок
      if (studiedLanguage) {
        const studiedCol = `База существительные слова ${studiedLanguage}`;
        if (!Object.keys(lesson).includes(studiedCol)) return false;
      }
      if (hintLanguage) {
        const hintCol = `База существительные слова ${hintLanguage}`;
        if (!Object.keys(lesson).includes(hintCol)) return false;
      }
      return true;
    });

    // Преобразуем в формат для фронтенда
    const formattedLessons = filteredLessons.map(lesson => ({
      _id: `table_${lesson['Урок номер']}_${lesson['Урок название']}`, // Генерируем ID
      title: lesson['Урок название'],
      level: lesson['Уровень изучения номер'],
      theme: lesson['Урок название'],
      studiedLanguage: studiedLanguage || 'русский', // Берем из фильтра
      hintLanguage: hintLanguage || 'английский', // Берем из фильтра
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

// Initialize server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeDefaultData();
});