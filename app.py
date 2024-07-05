from flask import Flask, render_template, request, redirect, url_for, jsonify
import requests
import os
from dotenv import load_dotenv
import webbrowser
import threading
from urllib.parse import quote, unquote
import time

app = Flask(__name__)

# Загружаем переменные окружения из .env файла
load_dotenv()

# Параметры подключения к Dremio API, используя переменные окружения
dremio_address = os.getenv('DREMIO_API_ADDRESS')
dremio_username = os.getenv('DREMIO_API_USERNAME')
dremio_password = os.getenv('DREMIO_API_PASSWORD')
print(dremio_address, dremio_password, dremio_username)

# Глобальная переменная для хранения последнего успешного результата
cached_data = {}

def fetch_data(organization):
    global cached_data
    try:
        # Аутентификация на Dremio и получение токена
        auth_response = requests.post(f'http://{dremio_address}/apiv2/login', json={
            "userName": dremio_username,
            "password": dremio_password
        })
        auth_response.raise_for_status()
        token = auth_response.json()["token"]

        headers = {
            "Authorization": f"_dremio{token}"
        }

        print(f"Fetching data from Dremio for organization: {organization}")
        print(f'Пришло:__ {organization} __')

        # Формируем базовый запрос
        base_query = """
            SELECT id, description, place, fio_response,
                duedate, actionbody, resolution_statu
            FROM servises.JIRA.lean.btl_vue_lean_001_main
            WHERE week_due_flag = 1
        """

        if organization != "Все":
            base_query += f" AND organization LIKE '%{organization}%'"

        base_query += " ORDER BY created"
        
        query_response = requests.post(f'http://{dremio_address}/api/v3/sql', headers=headers, json={"sql": base_query})
        query_response.raise_for_status()
        job_id = query_response.json()["id"]

        # Запрашиваем статус выполнения задания
        job_status = "RUNNING"
        while job_status in ("RUNNING", "STARTING", "QUEUED", "PLANNING"):
            time.sleep(1)
            job_status_response = requests.get(f'http://{dremio_address}/api/v3/job/{job_id}', headers=headers)
            job_status_response.raise_for_status()
            job_json = job_status_response.json()
            job_status = job_json["jobState"]

        print(f"Job status: {job_status}")
        
        if job_status != "COMPLETED":
            print(f"Query failed with job status {job_status}, details: {job_json.get('errorMessage', 'No error message')}")
            # Используем кешированные данные при неудачном запросе
            return cached_data.get(organization, [])

        # Получаем результат задания
        job_result_response = requests.get(f'http://{dremio_address}/api/v3/job/{job_id}/results', headers=headers)
        job_result_response.raise_for_status()
        result = job_result_response.json()

        data = result["rows"]

        if not data:
            return cached_data.get(organization, [])

        formatted_data = []
        for row in data:
            formatted_row = [value if value is not None else '' for value in row.values()]
            if len(formatted_row) > 4 and formatted_row[4]:
                formatted_row[4] = formatted_row[4][:10]  # Используем первые 10 символов для формата даты
            formatted_data.append(formatted_row)

        # Обновляем кешированные данные
        cached_data[organization] = formatted_data

        return formatted_data
    except Exception as e:
        # Используем кешированные данные при возникновении исключения
        print(f"Exception occurred: {e}, returning cached data if available")
        return cached_data.get(organization, [])


def fetch_organizations():
    try:
        # Аутентификация на Dremio и получение токена
        auth_response = requests.post(f'http://{dremio_address}/apiv2/login', json={
            "userName": dremio_username,
            "password": dremio_password
        })
        auth_response.raise_for_status()
        token = auth_response.json()["token"]

        headers = {
            "Authorization": f"_dremio{token}"
        }

        print("Fetching list of organizations from Dremio")

        # Выполнение запроса к Dremio
        query = """
        SELECT organization
        FROM servises.JIRA.lean.btl_vue_lean_001_main
        GROUP BY organization
        ORDER BY organization
        """
        
        query_response = requests.post(f'http://{dremio_address}/api/v3/sql', headers=headers, json={"sql": query})
        query_response.raise_for_status()
        job_id = query_response.json()["id"]

        # Запрашиваем статус выполнения задания
        job_status = "RUNNING"
        while job_status in ("RUNNING", "STARTING", "QUEUED", "PLANNING"):
            time.sleep(1)
            job_status_response = requests.get(f'http://{dremio_address}/api/v3/job/{job_id}', headers=headers)
            job_status_response.raise_for_status()
            job_json = job_status_response.json()
            job_status = job_json["jobState"]

        print(f"Job status: {job_status}")
        
        if job_status != "COMPLETED":
            print(f"Query failed with job status {job_status}, details: {job_json.get('errorMessage', 'No error message')}")
            return []

        # Получаем результат задания
        job_result_response = requests.get(f'http://{dremio_address}/api/v3/job/{job_id}/results', headers=headers)
        job_result_response.raise_for_status()
        result = job_result_response.json()

        organizations = [row['organization'] for row in result["rows"]]

        print(f"Fetched {len(organizations)} organizations")
        return organizations
    except Exception as e:
        print(f"Exception occurred: {e}")
        return []


@app.route('/', methods=['GET', 'POST'])
def select_organization():
    if request.method == 'POST':
        selected_org = request.form['organization']
        encoded_org = quote(selected_org, safe='')
        print(f"Organization selected: {selected_org}")
        return redirect(url_for('index', organization=encoded_org))

    organizations = fetch_organizations()
    return render_template('select_organization.html', organizations=organizations)


@app.route('/dashboard')
def index():
    organization = request.args.get('organization')
    if organization:
        organization = unquote(organization).replace('&#34;', '"')
    else:
        return redirect(url_for('select_organization'))

    print(f"Rendering page for organization: {organization}")
    data = fetch_data(organization)
    print(f"Data for organization {organization}: {len(data)} rows")
    return render_template('index.html', data=data, organization=organization)


@app.route('/update-data')
def update_data():
    organization = request.args.get('organization')
    if organization:
        organization = unquote(organization).replace('&#34;', '"')
    else:
        return jsonify([])

    print(f"Updating data for organization: {organization}")
    data = fetch_data(organization)
    print(f"Data updated for organization {organization}: {len(data)} rows")
    return jsonify(data)


def open_browser():
    print("Opening browser...")
    # webbrowser.open('http://127.0.0.1:5000/')


if __name__ == '__main__':
    threading.Timer(1, open_browser).start()
    print("Server starting...")
    app.run(debug=True, use_reloader=False)