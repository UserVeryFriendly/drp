# Используем базовый образ Python 3.9
FROM python:3.9-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы требований в контейнер
COPY requirements.txt requirements.txt

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем все остальные файлы в контейнер
COPY . .

# Открываем порт для приложения
EXPOSE 8000

# Дефолтная команда для запуска приложения
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app", "--workers", "4"]
