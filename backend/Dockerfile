FROM python:3.12-alpine

# 1. Install deps from pyproject.toml (separate folder, build time only)
WORKDIR /deps
ARG EXTRAS=""
COPY backend/pyproject.toml .
RUN pip install --no-cache-dir ".${EXTRAS:+[$EXTRAS]}" \
    && if echo "$EXTRAS" | grep -q notebook; then \
         python -m ipykernel install --sys-prefix \
           --name gcomollo --display-name "Python (gcomollo)" \
         && python -m ipykernel install --user \
           --name backend-gcomollo --display-name "Python (backend-gcomollo)"; \
       fi

# 2. App code: contents of backend/src live at /backend
WORKDIR /backend
COPY backend/src /backend
ENV PYTHONPATH=/backend

EXPOSE 6942 8888
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "6942"]