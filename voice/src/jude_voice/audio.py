"""Audio decoding. Audio is processed in memory and never written to disk."""

from __future__ import annotations

import io

import numpy as np
import soundfile as sf


class AudioError(ValueError):
    pass


def decode(data: bytes) -> tuple[np.ndarray, int]:
    """Decode WAV/FLAC/OGG bytes into mono float32 samples and the sample rate."""
    if not data:
        raise AudioError("The audio file is empty.")
    try:
        samples, rate = sf.read(io.BytesIO(data), dtype="float32", always_2d=True)
    except Exception as error:  # soundfile raises several backend-specific types
        raise AudioError("Use WAV, FLAC or OGG audio.") from error
    if rate < 8000 or rate > 96000:
        raise AudioError("Use audio sampled between 8 kHz and 96 kHz.")
    mono = samples.mean(axis=1).astype(np.float32)
    if not np.isfinite(mono).all():
        raise AudioError("The audio contains invalid samples.")
    return mono, int(rate)


def duration(samples: np.ndarray, rate: int) -> float:
    return float(len(samples)) / float(rate)


def resample(samples: np.ndarray, rate: int, target: int = 16000) -> np.ndarray:
    """Linear resampling, adequate for the spectral test engine (real models resample)."""
    if rate == target or len(samples) == 0:
        return samples
    count = max(1, int(round(len(samples) * target / rate)))
    positions = np.linspace(0, len(samples) - 1, count)
    return np.interp(positions, np.arange(len(samples)), samples).astype(np.float32)
