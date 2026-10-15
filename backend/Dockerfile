# Builds an image with the Python 3.12 image
FROM python:3.12-alpine

WORKDIR /backend

# Install deps (plus Jupyter bits for the jupyter service)
COPY backend/pyproject.toml .
RUN pip install --no-cache-dir ".[notebook]" \
    && python -m ipykernel install --sys-prefix \
       --name gcomollo \
       --display-name "Python (gcomollo)" \
    && python -m ipykernel install --user \
       --name backend-gcomollo \
       --display-name "Python (backend-gcomollo)"

COPY ./backend /backend

EXPOSE 6942 8888

# default command is for the api service; jupyter service overrides it
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "6942"]
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "6942", "--reload", "--reload-dir", "/backend"]
