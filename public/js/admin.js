document.addEventListener("DOMContentLoaded", () => {
    const addCategoryForm = document.getElementById("add-category-form");
    const addFurnitureForm = document.getElementById("add-furniture-form");
    const categoryTableBody = document.getElementById("category-table-body");
    const furnitureTableBody = document.querySelector("#furniture-table tbody");

    // Обработчик отправки формы добавления категории
    addCategoryForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(addCategoryForm);

        fetch("/admin/add-category", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Категория успешно добавлена!");
                addCategoryForm.reset();
                updateCategoryTable(); // Обновляем таблицу категорий
            } else {
                alert(data.message);
                console.error(data.message);
            }
        })
        .catch(error => {
            console.error("Ошибка при отправке данных:", error);
            alert("Произошла ошибка при добавлении категории.");
        });
    });

    // Функция для обновления таблицы категорий
    function updateCategoryTable() {
        fetch('/admin/getCategories')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.categories) {
                    categoryTableBody.innerHTML = ''; // Очищаем таблицу перед обновлением
                    data.categories.forEach(category => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${category.name}</td>
                            <td>
                                <form action="/admin/delete-category/${category.id}" method="post">
                                    <button type="submit" class="mui-button mui-button--outlined">Удалить</button>
                                </form>
                            </td>
                        `;
                        categoryTableBody.appendChild(row); // Добавляем новые строки в таблицу
                    });
                }
            })
            .catch(error => {
                console.error("Ошибка при обновлении списка категорий:", error);
                alert("Произошла ошибка при обновлении списка категорий.");
            });
    }

    // Обработчик отправки формы добавления мебели
    addFurnitureForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(addFurnitureForm);

        fetch("/admin/add-furniture", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Мебель успешно добавлена!");
                addFurnitureForm.reset();
                updateFurnitureTable(); // Обновляем таблицу мебели
            } else {
                alert(data.message);
                console.error(data.message);
            }
        })
        .catch(error => {
            console.error("Ошибка при отправке данных:", error);
            alert("Произошла ошибка при добавлении мебели.");
        });
    });

    // Функция для обновления таблицы мебели
    function updateFurnitureTable() {
        fetch('/admin/getFurniture')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.furniture) {
                    furnitureTableBody.innerHTML = ''; // Очищаем таблицу перед обновлением
                    data.furniture.forEach(item => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${item.name}</td>
                            <td>${item.category}</td>
                            <td><img src="${item.image}" alt="${item.name}" width="50" height="50"></td>
                            <td>
                                <form action="/admin/delete-furniture" method="post">
                                    <input type="hidden" name="id" value="${item.id}">
                                    <button type="submit" class="mui-button mui-button--outlined">Удалить</button>
                                </form>
                            </td>
                        `;
                        furnitureTableBody.appendChild(row); // Добавляем новые строки в таблицу
                    });
                }
            })
            .catch(error => {
                console.error("Ошибка при обновлении списка мебели:", error);
                alert("Произошла ошибка при обновлении списка мебели.");
            });
    }

    document.addEventListener("DOMContentLoaded", () => {
        const addUserForm = document.getElementById("add-user-form");
        const userTableBody = document.getElementById("user-table-body");
    
        // Обработчик отправки формы добавления пользователя
        addUserForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const formData = new FormData(addUserForm);
    
            fetch("/admin/add-user", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Пользователь успешно добавлен!");
                    addUserForm.reset();
                    updateUserTable(data.users); // Обновляем таблицу пользователей
                } else {
                    alert(data.message);
                    console.error(data.message);
                }
            })
            .catch(error => {
                console.error("Ошибка при отправке данных:", error);
                alert("Произошла ошибка при добавлении пользователя.");
            });
        });
    
        // Функция для обновления таблицы пользователей
        function updateUserTable(users) {
            userTableBody.innerHTML = ''; // Очищаем таблицу перед обновлением
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.is_admin == 1 ? 'Администратор' : 'Обычный пользователь'}</td>
                    <td>
                        <form action="/admin/delete-user" method="post">
                            <input type="hidden" name="id" value="${user.id}">
                            <button type="submit" class="mui-button mui-button--outlined">Удалить</button>
                        </form>
                    </td>
                `;
                userTableBody.appendChild(row); // Добавляем новые строки в таблицу
            });
        }
    });
    

});
