let lastUpdateTime = 0; // Время последнего обновления в миллисекундах
const updateInterval = 25000; // Интервал обновления в миллисекундах (25 секунд)
const orgEncoded = encodeURIComponent(organization);

function saveCache(data) {
    localStorage.setItem(orgEncoded, JSON.stringify(data));
}

function loadCache() {
    const cachedData = localStorage.getItem(orgEncoded);
    return cachedData ? JSON.parse(cachedData) : null;
}

function scrollToBottom(speed, frameSkip) {
    let frameCount = 0;

    function scrollStep() {
        frameCount++;
        if (frameCount >= frameSkip) {
            window.scrollBy(0, speed);
            frameCount = 0;
        }

        if ((window.innerHeight + window.scrollY) < document.body.scrollHeight) {
            requestAnimationFrame(scrollStep);
        } else {
            console.log("End of scroll reached.");
            const currentTime = new Date().getTime();
            if (currentTime - lastUpdateTime >= updateInterval) {
                console.log("Fetching new data...");
                lastUpdateTime = currentTime;
                setTimeout(fetchDataAndScroll, 5000); // 5 секунд перед обновлением данных и началом прокрутки
            } else {
                console.log("Waiting to fetch new data.");
                setTimeout(() => {
                    scrollToBottom(1, 2); // Продолжить прокрутку через 25 секунд
                }, updateInterval - (currentTime - lastUpdateTime));
            }
        }
    }

    console.log("Starting scroll...");
    requestAnimationFrame(scrollStep);
}

function fetchDataAndScroll() {
    console.log(`Fetching data from server for organization: ${organization}...`);
    fetch(`/update-data?organization=${orgEncoded}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Updating table with new data...");
            const tableBody = document.getElementById('table-body');
            const rows = tableBody.querySelectorAll('tr');

            // Сохранение кэша
            saveCache(data);

            // Скрыть текущие данные, но оставить заголовок таблицы
            rows.forEach((row, index) => {
                row.classList.add('row-fade-out');
            });

            setTimeout(() => {
                tableBody.innerHTML = ''; // Очистить только tbody перед добавлением новых данных

                data.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.classList.add('row-fade-in'); // Добавляем класс анимации

                    row.forEach((item, index) => {
                        const td = document.createElement('td');
                        td.innerText = item; // Используем innerText вместо innerHTML для исключения ссылок
                        tr.appendChild(td);
                    });

                    tableBody.appendChild(tr);
                });

                console.log("New data applied. Restarting scroll...");
                updateStatusDots(); // Обновим классы кружочков после обновления данных
                window.scrollTo(0, 0); // Прокручиваем вверх

                setTimeout(() => {
                    scrollToBottom(1, 2);
                }, 7000);
            }, 1000); // Время ожидания синхронизировано с длительностью анимации fade-out
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            const cachedData = loadCache();
            if (cachedData) {
                console.log("Using cached data...");
                
                const tableBody = document.getElementById('table-body');
                const rows = tableBody.querySelectorAll('tr');

                // Скрыть текущие данные, но оставить заголовок таблицы
                rows.forEach((row, index) => {
                    row.classList.add('row-fade-out');
                });

                setTimeout(() => {
                    tableBody.innerHTML = ''; // Очистить только tbody перед добавлением новых данных

                    cachedData.forEach(row => {
                        const tr = document.createElement('tr');
                        tr.classList.add('row-fade-in'); // Добавляем класс анимации

                        row.forEach((item, index) => {
                            const td = document.createElement('td');
                            td.innerText = item; // Используем innerText вместо innerHTML для исключения ссылок
                            tr.appendChild(td);
                        });

                        tableBody.appendChild(tr);
                    });

                    console.log("Cached data applied. Restarting scroll...");
                    updateStatusDots(); // Обновим классы кружочков после обновления данных
                    window.scrollTo(0, 0); // Прокручиваем вверх

                    setTimeout(() => {
                        scrollToBottom(1, 2);
                    }, 7000);
                }, 1000); // Время ожидания синхронизировано с длительностью анимации fade-out
            }
        });
}

function updateTable(data) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = ''; // Очистить перед добавлением новых данных

    data.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(item => {
            const td = document.createElement('td');
            td.innerText = item;
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

function updateStatusDots() {
    const rows = document.querySelectorAll('#table-body tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const statusCell = cells[cells.length - 1]; // Последняя ячейка (статус)

        if (statusCell) {
            const status = statusCell.textContent.trim();
            let statusClass = '';

            switch (status) {
                case 'Готово':
                    statusClass = 'status-ready';
                    break;
                case 'Нет решения':
                    statusClass = 'status-no-solution';
                    break;
                case 'Отклонён':
                    statusClass = 'status-rejected';
                    break;
                default:
                    statusClass = '';
            }

            let dot = statusCell.querySelector('.status-dot');
            if (!dot) {
                dot = document.createElement('span');
                dot.classList.add('status-dot');
                statusCell.insertBefore(dot, statusCell.firstChild); // Вставляем перед текстом статуса
            }

            dot.className = 'status-dot ' + statusClass;
        }
    });
}

// Задержка перед началом прокрутки страницы вниз при загрузке
window.onload = function () {
    const cachedData = loadCache();
    if (cachedData) {
        console.log('Using cached data on load.');
        updateTable(cachedData);
        updateStatusDots();
    }

    setTimeout(() => {
        scrollToBottom(1, 2); // Скролл на 1px с пропуском каждых 2 кадров для замедленной прокрутки
    }, 5000);  // Задержка в 5 секунд перед началом прокрутки
};

document.addEventListener("DOMContentLoaded", function() {
    updateStatusDots();
});