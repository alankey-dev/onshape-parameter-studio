FROM python:3.12-slim

WORKDIR /app

COPY generate_featurescript.py webapp.py ./
COPY static ./static

EXPOSE 8765
VOLUME ["/app/projects"]

CMD ["python3", "webapp.py", "--host", "0.0.0.0", "--port", "8765", "--no-browser"]
