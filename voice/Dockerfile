# Jude voice API. Build from this directory:
#   docker build -t jude-voice .                       # pyannote models (CPU)
#   docker build -t jude-voice-lite --build-arg EXTRAS= .   # fake engine only, no torch
ARG PYTHON_VERSION=3.12

FROM python:${PYTHON_VERSION}-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.13.6 /uv /bin/uv
ARG EXTRAS=ml
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /srv
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project ${EXTRAS:+--extra $EXTRAS}
COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev ${EXTRAS:+--extra $EXTRAS}

FROM python:${PYTHON_VERSION}-slim
# Audio is decoded with soundfile and passed to pyannote in memory, so no ffmpeg is needed.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libsndfile1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 jude \
    && mkdir -p /models && chown jude /models
WORKDIR /srv
COPY --from=build --chown=jude /srv /srv
ENV PATH="/srv/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/models \
    VOICE_ENGINE=pyannote
USER jude
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)"
CMD ["uvicorn", "jude_voice.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
