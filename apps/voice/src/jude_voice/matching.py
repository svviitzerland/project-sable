"""Voiceprint comparison. A match means "probably the same voice", never an identity."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


def normalize(vector: np.ndarray) -> np.ndarray:
    vector = np.asarray(vector, dtype=np.float32).reshape(-1)
    norm = float(np.linalg.norm(vector))
    return vector / norm if norm > 0 else vector


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(normalize(a), normalize(b)))


@dataclass(frozen=True)
class Score:
    id: str
    score: float


def rank(embedding: np.ndarray, candidates: list[tuple[str, np.ndarray]]) -> list[Score]:
    scores = [Score(key, round(cosine(embedding, vector), 4)) for key, vector in candidates]
    return sorted(scores, key=lambda item: item.score, reverse=True)


def best_match(scores: list[Score], threshold: float) -> Score | None:
    return scores[0] if scores and scores[0].score >= threshold else None
