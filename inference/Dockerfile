# Hugging Face Docker Space / generic container for the PotatoGuard model API
FROM python:3.11-slim
WORKDIR /app
COPY inference/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY inference/ ./inference/
ENV PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn inference.app:app --host 0.0.0.0 --port ${PORT}"]
