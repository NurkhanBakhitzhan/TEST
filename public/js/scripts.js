document.addEventListener("DOMContentLoaded", async () => {
    const searchInput = document.getElementById("search");
    const categorySelect = document.getElementById("categorySelect");
    const catalog = document.getElementById("catalog");
    const pagination = document.getElementById("pagination");
    const header = document.querySelector("header");

    const itemsPerPage = 12;
    let currentPage = 1;
    let totalPages = 0;
    let lastScrollPosition = 0;

    // Функция для загрузки мебели с сервера
    async function fetchFurniture(search = "", category = "all", page = 1) {
        try {
            const response = await fetch(
                `/api/furniture?search=${encodeURIComponent(search)}&category=${category}&page=${page}&limit=${itemsPerPage}`
            );
            if (!response.ok) throw new Error("Ошибка загрузки данных");
            return await response.json();
        } catch (error) {
            console.error("Ошибка загрузки мебели:", error);
            return { items: [], total: 0, totalPages: 0 };
        }
    }

    // Функция для рендеринга мебели на странице
    function renderFurniture(items) {
        catalog.innerHTML = items.length
            ? items.map((item) => ` 
                <div class="item mui-paper mui-grid__item ${item.category || ""}" data-image="${item.imageUrl}">
                    <img src="${item.imageUrl}" alt="${item.name}" class="mui-image">
                    <h2 class="mui-typography--h6">${item.name}</h2>
                    <p>Категория: ${item.category}</p>
                </div>`).join("")
            : "<p>Мебель не найдена</p>";
    
        document.querySelectorAll(".item").forEach((item) => {
            item.addEventListener("click", () => {
                console.log("Карточка мебели нажата:", item.dataset.image);
                openImageModal(item.dataset.image);
            });
        });
    }
    

    // Функция для рендеринга пагинации
    function renderPagination() {
        pagination.innerHTML = "";
        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement("button");
            button.textContent = i;
            button.className = `mui-button mui-button--outlined ${i === currentPage ? "active" : ""}`;
            button.addEventListener("click", () => {
                currentPage = i;
                updateCatalog();
            });
            pagination.appendChild(button);
        }
    }

    // Функция для обновления каталога с учетом пагинации
    async function updateCatalog() {
        const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
        const selectedCategory = categorySelect ? categorySelect.value : "all";

        console.log("Поисковый запрос:", searchTerm);
        console.log("Выбранная категория:", selectedCategory);

        const data = await fetchFurniture(searchTerm, selectedCategory, currentPage);

        console.log("Загруженные данные:", data);

        renderFurniture(data.items);
        totalPages = data.totalPages || Math.ceil(data.total / itemsPerPage);  // Используем totalPages с сервера
        console.log("Общее количество страниц:", totalPages);
        renderPagination();
    }

    // Функция для открытия модального окна с изображением
    function openImageModal(imageSrc) {
        const imageModal = document.getElementById("image-modal");
        const modalImage = document.getElementById("modal-image");

        if (!imageModal || !modalImage) {
            console.error("Элементы модального окна не найдены.");
            return;
        }

        console.log("URL изображения для модального окна:", imageSrc);
        modalImage.src = imageSrc;
        imageModal.style.display = "flex";

        const closeImageModal = document.querySelector("#image-modal .mui-modal__close");
        const closeModal = () => {
            imageModal.style.display = "none";
        };

        closeImageModal.addEventListener("click", closeModal);
        window.addEventListener("click", (e) => {
            if (e.target === imageModal) {
                closeModal();
            }
        });
    }

    // Функция для обработки видимости хедера при прокрутке
    function handleHeaderVisibility() {
        const currentScrollPosition = window.scrollY;

        if (currentScrollPosition > lastScrollPosition && currentScrollPosition > header.offsetHeight) {
            header.style.transform = "translateY(-100%)";
        } else if (currentScrollPosition < lastScrollPosition) {
            header.style.transform = "translateY(0)";
        }

        lastScrollPosition = currentScrollPosition;
    }

    // Обработчик изменения ввода в поле поиска
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            currentPage = 1;
            updateCatalog();
        });
    }

    // Обработчик изменения выбранной категории
    if (categorySelect) {
        categorySelect.addEventListener("change", () => {
            currentPage = 1;
            updateCatalog();
        });
    }

    // Обработчик прокрутки страницы для скрытия/показа хедера
    window.addEventListener("scroll", handleHeaderVisibility);

    // Инициализация загрузки каталога при загрузке страницы
    await updateCatalog();
});
