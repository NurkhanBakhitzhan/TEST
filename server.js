const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2');
const multer = require('multer');
const app = express();
const port = 3000;

// Настройка хранилища для multer
const storage = multer.memoryStorage(); // Сохраняем в памяти
const upload = multer({ storage: storage });

// Подключение к базе данных MySQL
const db = mysql.createPool({
    host: 'mysql.railway.internal',
    user: 'root',
    password: 'oulagqzfiMyuboXdJnTlLwqPIDUVvVVQ',
    database: 'railway'
});

// Настройка сессий
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

// Настройка сервера
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// === Middleware для авторизации ===
function checkAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

function checkAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.is_admin) {
        return res.redirect('/catalog');
    }
    next();
}

// === Маршруты ===

// Редирект с корневого маршрута на страницу логина
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Страница логина
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Проверка пользователя в базе данных
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) return res.status(500).send('Ошибка сервера');
        if (results.length === 0) return res.status(401).send('Неверные учетные данные');

        const user = results[0];

        // Сохраняем данные пользователя в сессии
        req.session.user = {
            id: user.id,
            username: user.username,
            is_admin: Boolean(user.is_admin),
        };

        // Редирект в зависимости от роли
        if (user.is_admin) {
            res.redirect('/admin'); // Перенаправление администратора
        } else {
            res.redirect('/catalog'); // Перенаправление для обычного пользователя
        }
    });
});

// Выход
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Ошибка выхода:', err);
            return res.status(500).send('Ошибка выхода');
        }
        res.redirect('/login');
    });
});

// API для мебели
app.get('/api/furniture', (req, res) => {
    const { search, category, page, limit } = req.query;
    const pageNumber = parseInt(page) || 1;
    const itemsPerPage = parseInt(limit) || 12;

    let query = `
        SELECT f.id, f.name, c.name AS category 
        FROM furniture f 
        JOIN categories c ON f.category_id = c.id
    `;
    let params = [];
    let countQuery = `
        SELECT COUNT(*) AS total 
        FROM furniture f 
        JOIN categories c ON f.category_id = c.id
    `;

    if (search && search.trim() !== '') {
        query += ' WHERE f.name LIKE ?';
        countQuery += ' WHERE f.name LIKE ?';
        params.push(`%${search.trim()}%`);
    }

    if (category && category !== 'all') {
        query += search && search.trim() !== '' ? ' AND c.name = ?' : ' WHERE c.name = ?';
        countQuery += search && search.trim() !== '' ? ' AND c.name = ?' : ' WHERE c.name = ?';
        params.push(category);
    }

    // Пагинация
    query += ' LIMIT ? OFFSET ?';
    params.push(itemsPerPage, (pageNumber - 1) * itemsPerPage);

    // Выполнение запросов
    db.query(query, params, (err, furniture) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Ошибка сервера");
        }

        // Получаем общее количество элементов
        db.query(countQuery, params.slice(0, params.length - 2), (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Ошибка сервера");
            }

            const totalItems = results[0].total;
            const totalPages = Math.ceil(totalItems / itemsPerPage);

            // Добавляем URL изображения для каждого элемента
            const furnitureWithImages = furniture.map(item => ({
                ...item,
                imageUrl: `/image/${item.id}`,
            }));

            res.json({
                items: furnitureWithImages,
                total: totalItems,
                totalPages: totalPages,
            });
        });
    });
});

// Страница каталога
app.get('/catalog', (req, res) => {
    // Извлечение категорий из базы данных
    const categoryQuery = 'SELECT DISTINCT c.name AS category FROM furniture f JOIN categories c ON f.category_id = c.id';
    db.query(categoryQuery, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Ошибка сервера");
        }

        const categories = rows.map(row => row.category); // Создаем массив категорий

        // Извлечение мебели для отображения
        const furnitureQuery = 'SELECT f.id, f.name, c.name AS category FROM furniture f JOIN categories c ON f.category_id = c.id';
        db.query(furnitureQuery, (err, furniture) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Ошибка сервера");
            }

            const itemsPerPage = 12;
            const page = parseInt(req.query.page) || 1;
            const totalItems = furniture.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);

            const startIndex = (page - 1) * itemsPerPage;
            const paginatedFurniture = furniture.slice(startIndex, startIndex + itemsPerPage);

            res.render('catalog', {
                categories, // Передаем категории в шаблон
                furniture: paginatedFurniture,
                totalPages,
                currentPage: page,
            });
        });
    });
});

// Главная страница админки
app.get('/admin', (req, res) => {
    const usersQuery = 'SELECT * FROM users';
    db.query(usersQuery, (err, users) => {
        if (err) return res.status(500).send('Ошибка получения пользователей');

        const categoriesQuery = 'SELECT * FROM categories';
        db.query(categoriesQuery, (err, categories) => {
            if (err) return res.status(500).send('Ошибка получения категорий');

            const furnitureQuery = 'SELECT * FROM furniture';
            db.query(furnitureQuery, (err, furniture) => {
                if (err) return res.status(500).send('Ошибка получения мебели');

                res.render('admin', {
                    users: users || [],
                    categories: categories || [],
                    furniture: furniture || []
                });
            });
        });
    });
});

// Получение изображения по ID мебели
app.get('/image/:id', (req, res) => {
    const { id } = req.params;
    const imageQuery = 'SELECT image FROM furniture WHERE id = ?';
    db.query(imageQuery, [id], (err, rows) => {
        if (err) return res.status(500).send('Ошибка получения изображения');
        if (rows.length > 0 && rows[0].image) {
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(rows[0].image);
        } else {
            res.status(404).send('Изображение не найдено');
        }
    });
});

// === Операции с мебелью ===

// Добавление мебели
app.post('/admin/add-furniture', upload.single('image'), (req, res) => {
    const { name, category_id } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null;

    if (!imageBuffer) {
        return res.status(400).send('Изображение обязательно');
    }

    db.query(
        'INSERT INTO furniture (name, category_id, image) VALUES (?, ?, ?)',
        [name, category_id, imageBuffer],
        (err) => {
            if (err) {
                console.error('Ошибка добавления мебели:', err);
                return res.status(500).send('Ошибка добавления мебели');
            }
            res.redirect('/admin');
        }
    );
});

// Удаление мебели
app.post('/admin/delete-furniture', (req, res) => {
    const { id } = req.body;

    db.query('DELETE FROM furniture WHERE id = ?', [id], (err) => {
        if (err) {
            console.error('Ошибка удаления мебели:', err);
            return res.status(500).send('Ошибка удаления мебели');
        }
        res.redirect('/admin');
    });
});

// Редактирование мебели
app.post('/admin/edit-furniture', upload.single('image'), (req, res) => {
    const { id, name, category_id } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null;

    if (imageBuffer) {
        db.query(
            'UPDATE furniture SET name = ?, category_id = ?, image = ? WHERE id = ?',
            [name, category_id, imageBuffer, id],
            (err) => {
                if (err) {
                    console.error('Ошибка обновления мебели:', err);
                    return res.status(500).send('Ошибка обновления мебели');
                }
                res.redirect('/admin');
            }
        );
    } else {
        db.query(
            'UPDATE furniture SET name = ?, category_id = ? WHERE id = ?',
            [name, category_id, id],
            (err) => {
                if (err) {
                    console.error('Ошибка обновления мебели:', err);
                    return res.status(500).send('Ошибка обновления мебели');
                }
                res.redirect('/admin');
            }
        );
    }
});

// === Операции с категориями ===

// Добавление категории
app.post('/admin/add-category', (req, res) => {
    const { name } = req.body;

    db.query(
        'INSERT INTO categories (name) VALUES (?)',
        [name],
        (err) => {
            if (err) {
                console.error('Ошибка добавления категории:', err);
                return res.status(500).send('Ошибка добавления категории');
            }
            res.redirect('/admin');
        }
    );
});

// Удаление категории
app.post('/admin/delete-category/:id', (req, res) => {
    const { id } = req.params;

    db.query(
        'DELETE FROM categories WHERE id = ?',
        [id],
        (err) => {
            if (err) {
                console.error('Ошибка удаления категории:', err);
                return res.status(500).send('Ошибка удаления категории');
            }
            res.redirect('/admin');
        }
    );
});

// === Операции с пользователями ===

// Добавление пользователя
app.post('/admin/add-user', (req, res) => {
    const { username, password, is_admin } = req.body;

    if (!username || !password) {
        return res.status(400).send('Имя пользователя и пароль обязательны');
    }

    db.query(
        'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)',
        [username, password, is_admin],
        (err) => {
            if (err) {
                console.error('Ошибка добавления пользователя:', err);
                return res.status(500).send('Ошибка добавления пользователя');
            }
            res.redirect('/admin');
        }
    );
});

// Удаление пользователя
app.post('/admin/delete-user', (req, res) => {
    const { id } = req.body;

    db.query(
        'DELETE FROM users WHERE id = ?',
        [id],
        (err) => {
            if (err) {
                console.error('Ошибка удаления пользователя:', err);
                return res.status(500).send('Ошибка удаления пользователя');
            }
            res.redirect('/admin');
        }
    );
});

// Редактирование пользователя
app.post('/admin/edit-user', (req, res) => {
    const { id, username, password, is_admin } = req.body;

    if (password) {
        db.query(
            'UPDATE users SET username = ?, password = ?, is_admin = ? WHERE id = ?',
            [username, password, is_admin, id],
            (err) => {
                if (err) {
                    console.error('Ошибка обновления пользователя:', err);
                    return res.status(500).send('Ошибка обновления пользователя');
                }
                res.redirect('/admin');
            }
        );
    } else {
        db.query(
            'UPDATE users SET username = ?, is_admin = ? WHERE id = ?',
            [username, is_admin, id],
            (err) => {
                if (err) {
                    console.error('Ошибка обновления пользователя:', err);
                    return res.status(500).send('Ошибка обновления пользователя');
                }
                res.redirect('/admin');
            }
        );
    }
});


// Слушаем порт
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
