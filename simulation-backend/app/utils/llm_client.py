"""
LLM Client — supports both Anthropic and OpenAI-compatible APIs.
Detects which provider to use based on the API key prefix.
"""

import json
import random
import re
import time
from typing import Optional, Dict, Any, List

from ..config import Config
from .logger import get_logger


logger = get_logger('mirofish.llm_client')


class LLMClient:
    """Unified LLM client that auto-detects Anthropic vs OpenAI."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        fallback_api_key: Optional[str] = None,
        fallback_base_url: Optional[str] = None,
        fallback_model: Optional[str] = None,
    ):
        self.api_key = api_key or Config.LLM_API_KEY
        self.base_url = base_url or Config.LLM_BASE_URL
        self.model = model or Config.LLM_MODEL_NAME
        self.fallback_api_key = fallback_api_key or Config.LLM_FALLBACK_API_KEY
        self.fallback_base_url = fallback_base_url or Config.LLM_FALLBACK_BASE_URL
        self.fallback_model = fallback_model or Config.LLM_FALLBACK_MODEL_NAME

        if not self.api_key:
            raise ValueError("LLM_API_KEY not configured")

        self.client, self.is_anthropic = self._create_client(self.api_key, self.base_url)
        self.stream_primary = self._requires_streaming(self.api_key, self.base_url)

        self.fallback_client = None
        self.fallback_is_anthropic = False
        self.stream_fallback = False
        if self.fallback_api_key and (
            self.fallback_api_key,
            self.fallback_base_url,
            self.fallback_model,
        ) != (self.api_key, self.base_url, self.model):
            self.fallback_client, self.fallback_is_anthropic = self._create_client(
                self.fallback_api_key,
                self.fallback_base_url,
            )
            self.stream_fallback = self._requires_streaming(
                self.fallback_api_key,
                self.fallback_base_url,
            )

    @staticmethod
    def _create_client(api_key: str, base_url: str):
        # Some OpenAI-compatible gateways (e.g. Eliza Cloud, behind Cloudflare)
        # 403 "Your request was blocked" for non-browser User-Agents — including
        # the default OpenAI SDK UA. Send a browser UA so the edge lets us through.
        browser_ua = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        )

        # max_retries=0 keeps this client's retry loop the only one. Leaving the
        # SDK default on multiplies attempts and makes the real wait unbounded.
        if api_key.startswith('sk-ant-'):
            from anthropic import Anthropic
            return Anthropic(
                api_key=api_key,
                default_headers={"User-Agent": browser_ua},
                timeout=Config.LLM_TIMEOUT_SECONDS,
                max_retries=0,
            ), True

        from openai import OpenAI
        return OpenAI(
            api_key=api_key,
            base_url=base_url,
            default_headers={"User-Agent": browser_ua},
            timeout=Config.LLM_TIMEOUT_SECONDS,
            max_retries=0,
        ), False

    @staticmethod
    def _log_usage(model: str, usage, started_at: float, streamed: bool) -> None:
        """Record what a call cost. Token counts, never prompt or completion text."""
        input_tokens = (
            getattr(usage, "prompt_tokens", None)
            or getattr(usage, "input_tokens", None)
        )
        output_tokens = (
            getattr(usage, "completion_tokens", None)
            or getattr(usage, "output_tokens", None)
        )
        logger.info(
            "llm_call model=%s streamed=%s duration_ms=%d input_tokens=%s output_tokens=%s",
            model,
            streamed,
            int((time.monotonic() - started_at) * 1000),
            input_tokens if input_tokens is not None else "unknown",
            output_tokens if output_tokens is not None else "unknown",
        )

    @staticmethod
    def _requires_streaming(api_key: str, base_url: str) -> bool:
        """Eliza Cloud's completion gateway bills correctly only in stream mode."""
        return api_key.startswith('eliza_') or 'elizacloud.ai' in (base_url or '').lower()

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        response_format: Optional[Dict] = None
    ) -> str:
        """
        Send a chat request and return the response text.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Temperature parameter
            max_tokens: Max tokens in response
            response_format: Response format hint (OpenAI only)

        Returns:
            Model response text
        """
        try:
            return self._chat_with_client(
                self.client,
                self.is_anthropic,
                self.model,
                self.stream_primary,
                messages,
                temperature,
                max_tokens,
                response_format,
            )
        except Exception as exc:
            if not self.fallback_client:
                raise
            logger.warning(
                "Primary LLM request failed for model %s: %s. Falling back to %s.",
                self.model,
                str(exc)[:200],
                self.fallback_model,
            )
            return self._chat_with_client(
                self.fallback_client,
                self.fallback_is_anthropic,
                self.fallback_model,
                self.stream_fallback,
                messages,
                temperature,
                max_tokens,
                response_format,
            )

    def _chat_with_client(
        self,
        client,
        is_anthropic: bool,
        model: str,
        stream: bool,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        response_format: Optional[Dict] = None,
    ) -> str:
        if is_anthropic:
            return self._chat_anthropic(
                client, model, messages, temperature, max_tokens, response_format
            )
        return self._chat_openai(
            client, model, stream, messages, temperature, max_tokens, response_format
        )

    def _chat_anthropic(
        self,
        client,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        response_format: Optional[Dict] = None
    ) -> str:
        # Extract system message if present
        system_msg = ""
        chat_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"]
            else:
                chat_messages.append(msg)

        # If JSON format requested, add instruction to system prompt
        if response_format and response_format.get("type") == "json_object":
            json_instruction = "\n\nYou must respond with valid JSON only. No markdown code fences, no explanation — just the JSON object."
            system_msg += json_instruction

        kwargs = {
            "model": model,
            "messages": chat_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if system_msg:
            kwargs["system"] = system_msg

        started_at = time.monotonic()
        response = client.messages.create(**kwargs)
        self._log_usage(model, getattr(response, "usage", None), started_at, False)
        content = response.content[0].text
        return content

    def _chat_openai(
        self,
        client,
        model: str,
        stream: bool,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        response_format: Optional[Dict] = None
    ) -> str:
        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if response_format:
            kwargs["response_format"] = response_format

        max_attempts = max(1, Config.LLM_MAX_ATTEMPTS)
        response = None
        for attempt in range(max_attempts):
            started_at = time.monotonic()
            try:
                response = client.chat.completions.create(**kwargs, stream=stream)
                if stream:
                    parts = []
                    stream_usage = None
                    for chunk in response:
                        stream_usage = getattr(chunk, "usage", None) or stream_usage
                        if chunk.choices and chunk.choices[0].delta:
                            parts.append(chunk.choices[0].delta.content or '')
                    content = ''.join(parts).strip()
                    if not content:
                        raise RuntimeError("Streaming completion returned empty content")
                    self._log_usage(model, stream_usage, started_at, True)
                    return content
                break
            except Exception as exc:
                if attempt == max_attempts - 1 or not self._is_retryable_openai_error(exc):
                    raise
                # Jittered backoff: identical retry storms from parallel section
                # workers otherwise land on the upstream at the same instant.
                delay = (2 ** attempt) * (1 + random.random() * 0.25)
                logger.warning(
                    "OpenAI-compatible request failed transiently (attempt %s/%s): %s. "
                    "Retrying in %.1fs.",
                    attempt + 1,
                    max_attempts,
                    str(exc)[:200],
                    delay,
                )
                time.sleep(delay)

        if response is None:
            raise RuntimeError("OpenAI-compatible request completed without a response")

        self._log_usage(model, getattr(response, "usage", None), started_at, False)
        content = response.choices[0].message.content or ''
        # Strip <think> tags from reasoning models
        content = re.sub(r'<think>[\s\S]*?</think>', '', content).strip()
        if not content:
            raise RuntimeError("Completion returned empty content")
        return content

    @staticmethod
    def _is_retryable_openai_error(error: Exception) -> bool:
        """Retry transient upstream failures without retrying invalid user input."""
        status_code = getattr(error, "status_code", None)
        if isinstance(status_code, int):
            return status_code in (408, 409, 429) or status_code >= 500

        message = str(error).lower()
        return any(
            marker in message
            for marker in (
                "timeout",
                "timed out",
                "connection",
                "rate limit",
                "error code: 429",
                "error code: 500",
                "error code: 502",
                "error code: 503",
                "error code: 504",
            )
        )

    def chat_json(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096
    ) -> Dict[str, Any]:
        """
        Send a chat request and parse the response as JSON.

        Args:
            messages: List of message dicts
            temperature: Temperature parameter
            max_tokens: Max tokens

        Returns:
            Parsed JSON object
        """
        response = self.chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"}
        )

        # Clean markdown code block markers
        cleaned = response.strip()
        cleaned = re.sub(r'^```(?:json)?\s*\n?', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\n?```\s*$', '', cleaned)
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            raise ValueError(f"LLM returned invalid JSON: {cleaned[:200]}")
