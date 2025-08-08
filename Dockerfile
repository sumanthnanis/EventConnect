FROM python:3.11-slim
WORKDIR /app
# Copy Python requirements
COPY pyproject.toml uv.lock ./
# Install uv and dependencies
RUN pip install uv
RUN uv sync --frozen
# Copy application code
COPY main.py ./
COPY server/ ./server/
EXPOSE 5000
# Set environment variables
ENV PORT=5000
ENV PYTHONPATH=/app
# Run the FastAPI application
CMD ["python", "main.py"]
