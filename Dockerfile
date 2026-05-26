FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py start.sh ./
COPY ".streamlit" ".streamlit/"
COPY ["Stock Predictions Model.keras", "Stock Predictions Model.keras"]

RUN chmod +x start.sh

ENV MODEL_PATH="Stock Predictions Model.keras"
ENV MARKET="IN"
ENV PORT=8501

EXPOSE 8501

CMD ["./start.sh"]
