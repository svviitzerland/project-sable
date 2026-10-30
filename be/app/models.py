from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import JSON, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def uid() -> str:
    return str(uuid4())


def now() -> str:
    return datetime.now(UTC).isoformat()


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "jude_users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(Text)
    demo: Mapped[bool] = mapped_column(default=False)


class Session(Base):
    __tablename__ = "jude_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("jude_users.id", ondelete="CASCADE")
    )
    expires: Mapped[float] = mapped_column(Float)


class Case(Base):
    __tablename__ = "jude_cases"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("jude_users.id"))
    title: Mapped[str] = mapped_column(String(160))
    reference: Mapped[str] = mapped_column(String(100), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    synthetic: Mapped[bool] = mapped_column(default=False)
    status: Mapped[str] = mapped_column(String(24), default="ready")
    created_at: Mapped[str] = mapped_column(String(40), default=now)
    speakers: Mapped[dict] = mapped_column(JSON, default=dict)


class Document(Base):
    __tablename__ = "jude_documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(
        ForeignKey("jude_cases.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    mime: Mapped[str] = mapped_column(String(100))
    storage_key: Mapped[str] = mapped_column(Text)
    storage: Mapped[str] = mapped_column(String(20), default="local")
    digest: Mapped[str] = mapped_column(String(64))
    pages: Mapped[int]
    created_at: Mapped[str] = mapped_column(String(40), default=now)
    __table_args__ = (UniqueConstraint("case_id", "digest"),)


class Chunk(Base):
    __tablename__ = "jude_chunks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(
        ForeignKey("jude_cases.id", ondelete="CASCADE"), index=True
    )
    document_id: Mapped[str] = mapped_column(
        ForeignKey("jude_documents.id", ondelete="CASCADE")
    )
    page: Mapped[int]
    section: Mapped[str] = mapped_column(String(100), default="")
    text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list | None] = mapped_column(JSON, nullable=True)
    embedding_model: Mapped[str] = mapped_column(String(200), default="")


class Hearing(Base):
    __tablename__ = "jude_hearings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(
        ForeignKey("jude_cases.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    date: Mapped[str] = mapped_column(String(40), default="")
    kind: Mapped[str] = mapped_column(String(24), default="manual")
    status: Mapped[str] = mapped_column(String(24), default="ready")
    source_document_id: Mapped[str | None] = mapped_column(
        ForeignKey("jude_documents.id"), nullable=True
    )
    created_at: Mapped[str] = mapped_column(String(40), default=now)


class EvidenceLink(Base):
    __tablename__ = "jude_evidence_links"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(
        ForeignKey("jude_cases.id", ondelete="CASCADE"), index=True
    )
    source_id: Mapped[str] = mapped_column(
        ForeignKey("jude_chunks.id", ondelete="CASCADE")
    )
    target_id: Mapped[str] = mapped_column(
        ForeignKey("jude_chunks.id", ondelete="CASCADE")
    )
    relation: Mapped[str] = mapped_column(String(24), default="related")
    explanation: Mapped[str] = mapped_column(Text, default="")
    basis: Mapped[str] = mapped_column(String(24), default="manual")
    confirmed: Mapped[bool] = mapped_column(default=False)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_quote: Mapped[str] = mapped_column(Text, default="")
    target_quote: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(String(40), default=now)
    __table_args__ = (UniqueConstraint("case_id", "source_id", "target_id"),)


class Segment(Base):
    __tablename__ = "jude_segments"
    hearing_id: Mapped[str | None] = mapped_column(
        ForeignKey("jude_hearings.id"), nullable=True, index=True
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(
        ForeignKey("jude_cases.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(Text)
    speaker: Mapped[str] = mapped_column(String(80), default="Unknown")
    start: Mapped[float] = mapped_column(Float, default=0)
    end: Mapped[float] = mapped_column(Float, default=0)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    origin: Mapped[str] = mapped_column(String(24), default="manual")
    analysis_state: Mapped[str] = mapped_column(String(30), default="queued")
    analysis_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String(40), default=now)


class Finding(Base):
    __tablename__ = "jude_findings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(
        ForeignKey("jude_cases.id", ondelete="CASCADE"), index=True
    )
    segment_id: Mapped[str] = mapped_column(
        ForeignKey("jude_segments.id", ondelete="CASCADE"), unique=True
    )
    status: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(240))
    explanation: Mapped[str] = mapped_column(Text)
    uncertainty: Mapped[str] = mapped_column(Text)
    verification: Mapped[str] = mapped_column(Text)
    question: Mapped[str] = mapped_column(Text)
    citations: Mapped[list] = mapped_column(JSON, default=list)
    review: Mapped[dict] = mapped_column(JSON, default=dict)
    legal: Mapped[list] = mapped_column(JSON, default=list)
    mode: Mapped[str] = mapped_column(String(20))
    elapsed_ms: Mapped[int] = mapped_column(default=0)
    reviewed: Mapped[bool] = mapped_column(default=False)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(String(40), default=now)


class Contract(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class Credentials(Contract):
    email: str = Field(
        min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    )
    password: str = Field(min_length=10, max_length=128)
    name: str = Field(default="Counsel", min_length=1, max_length=100)


class UserOut(Contract):
    id: str
    name: str
    email: str
    demo: bool


class CaseCreate(Contract):
    title: str = Field(min_length=1, max_length=160)
    reference: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=2000)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value):
        if not value.strip():
            raise ValueError("Enter a case title")
        return value.strip()


class CaseOut(CaseCreate):
    id: str
    synthetic: bool
    status: str
    created_at: str = Field(max_length=40)
    speakers: dict[str, str]


class DocumentOut(Contract):
    id: str
    case_id: str
    name: str
    mime: str
    pages: int
    created_at: str = Field(max_length=40)


class SourceOut(Contract):
    id: str
    document_id: str
    document_name: str
    page: int
    section: str
    text: str
    score: float = 0


class SegmentIn(Contract):
    hearing_id: str | None = Field(default=None, max_length=36)
    text: str = Field(min_length=3, max_length=6000)
    speaker: str = Field(default="Unknown", min_length=1, max_length=80)
    start: float = Field(default=0, ge=0, le=86400)
    end: float = Field(default=0, ge=0, le=86400)

    @field_validator("text", "speaker")
    @classmethod
    def not_blank(cls, value):
        if not value.strip():
            raise ValueError("Text and speaker must not be blank")
        return value.strip()


class SegmentOut(SegmentIn):
    text: str = Field(min_length=1, max_length=6000)
    id: str
    confidence: float | None
    origin: str
    analysis_state: str
    analysis_error: str | None
    created_at: str = Field(max_length=40)


Status = Literal[
    "supported", "potential_inconsistency", "context_needed", "insufficient_evidence"
]


class Citation(Contract):
    chunk_id: str
    quote: str = Field(min_length=1, max_length=3000)
    relation: Literal["supports", "conflicts", "context"]


class Conclusion(Contract):
    status: Status
    title: str = Field(max_length=240)
    explanation: str = Field(max_length=3000)
    uncertainty: str = Field(max_length=2000)
    verification: str = Field(max_length=1000)
    question: str = Field(max_length=1000)
    citations: list[Citation] = Field(max_length=8)


class FindingOut(Conclusion):
    id: str
    segment_id: str
    review: dict
    legal: list[dict]
    mode: str
    elapsed_ms: int
    reviewed: bool
    note: str
    created_at: str = Field(max_length=40)


class FindingUpdate(Contract):
    reviewed: bool
    note: str = Field(default="", max_length=4000)


class SpeakerUpdate(Contract):
    speaker: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=80)


class HearingCreate(Contract):
    title: str = Field(min_length=1, max_length=160)
    date: str = Field(default="", max_length=40)

    @field_validator("title")
    @classmethod
    def not_blank(cls, value):
        if not value.strip():
            raise ValueError("Enter a hearing title")
        return value.strip()


class HearingOut(HearingCreate):
    id: str
    case_id: str
    kind: str
    status: str
    source_document_id: str | None
    created_at: str = Field(max_length=40)


class CaseDetail(Contract):
    hearings: list[HearingOut] = Field(default_factory=list)
    case: CaseOut
    documents: list[DocumentOut]
    segments: list[SegmentOut]
    findings: list[FindingOut]


class SearchOut(Contract):
    results: list[SourceOut]
    method: str


class LegalOut(Contract):
    results: list[dict]
    content: str = "metadata_only"
    note: str


class ConnectionOut(Contract):
    configured: bool
    note: str


class Capabilities(Contract):
    demo_available: bool
    storage: str
    analysis: ConnectionOut
    speech: ConnectionOut
    legal: ConnectionOut
    embeddings: ConnectionOut


class Message(Contract):
    message: str
