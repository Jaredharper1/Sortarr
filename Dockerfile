FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py /app/app.py
COPY templates /app/templates
COPY static /app/static

ENV PORT=8787
EXPOSE 8787

CMD ["gunicorn", "--bind", "0.0.0.0:8787", "--workers", "2", "--timeout", "120", "app:app"]
