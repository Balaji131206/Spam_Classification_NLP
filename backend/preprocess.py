"""Text preprocessing shared by training and inference.

The SMS pipeline is intentionally simple (matching the report):

    lowercase -> strip non-alphanumeric characters -> collapse whitespace

Email mode applies extra normalisation *before* those steps so that HTML
markup, URLs and email addresses do not dominate the vocabulary:

    strip HTML tags -> URLs become ``urltoken`` -> addresses become ``emailtoken``
    -> lowercase -> strip non-alphanumeric characters -> collapse whitespace
"""

from __future__ import annotations

import re

import logging

LOGGER = logging.getLogger(__name__)

# Compiled once: these run on every message, including large email bodies.
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_URL_RE = re.compile(r"https?://\S+|www\.\S+|\b\S+\.(?:com|net|org|info|biz|ru|cn)\b", re.IGNORECASE)
_EMAIL_ADDRESS_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_NON_ALNUM_RE = re.compile(r"[^a-zA-Z0-9\s]")
_WHITESPACE_RE = re.compile(r"\s+")
# Common HTML entities left behind after tag removal.
_HTML_ENTITY_RE = re.compile(r"&(?:nbsp|amp|lt|gt|quot|#\d+);", re.IGNORECASE)


def _clean_email(text: str) -> str:
    """Remove HTML and mask URLs / email addresses for email mode."""
    text = _HTML_TAG_RE.sub(" ", text)
    text = _HTML_ENTITY_RE.sub(" ", text)
    text = _URL_RE.sub(" urltoken ", text)
    text = _EMAIL_ADDRESS_RE.sub(" emailtoken ", text)
    return text


def preprocess_text(text: str, mode: str = "sms") -> str:
    """Normalise ``text`` into the form used by TF-IDF.

    Args:
        text: Raw message or email body.
        mode: ``"sms"`` for SMS mode, ``"email"`` to enable HTML/URL masking.

    Returns:
        Cleaned, lowercase, whitespace-collapsed text. May be an empty string
        when the input contains no alphanumeric characters at all.
    """
    if not isinstance(text, str):
        text = "" if text is None else str(text)

    if mode == "email":
        text = _clean_email(text)

    text = text.lower()
    text = _NON_ALNUM_RE.sub("", text)
    text = _WHITESPACE_RE.sub(" ", text)
    return text.strip()
