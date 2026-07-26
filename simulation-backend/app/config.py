"""
Configuration Management
Loads configuration uniformly from the .env file in the project root directory
"""

import os
import secrets
from dotenv import load_dotenv

# Load .env file from project root directory
# Path: MiroFish/.env (relative to backend/app/config.py)
project_root_env = os.path.join(os.path.dirname(__file__), '../../.env')

if os.path.exists(project_root_env):
    load_dotenv(project_root_env, override=True)
else:
    # If root directory has no .env, try loading environment variables (for production)
    load_dotenv(override=True)


class Config:
    """Flask configuration class"""

    # Flask configuration
    # Never ship a hardcoded SECRET_KEY: fall back to a fresh random key per
    # process so an unconfigured deploy can't be forged with a known default.
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
    # Default OFF. With debug on, Werkzeug exposes an interactive console that is
    # remote code execution on a public host — it must be opt-in, never default.
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

    # Shared secret the trusted caller (the Next.js proxy) must present in the
    # X-Simulation-Secret header. When unset, /api/* is refused in non-debug
    # runs (fail closed) so the engine is never silently left open.
    API_SECRET = os.environ.get('SIMULATION_API_SECRET')

    # Browser origins allowed for CORS. The proxy is server-to-server (no Origin),
    # so this stays empty unless you deliberately allow direct browser access.
    ALLOWED_ORIGINS = [
        o.strip()
        for o in os.environ.get('SIMULATION_ALLOWED_ORIGINS', '').split(',')
        if o.strip()
    ]

    # JSON configuration - disable ASCII escaping so CJK characters display directly (not as \uXXXX format)
    JSON_AS_ASCII = False

    # LLM configuration (unified OpenAI format)
    LLM_API_KEY = os.environ.get('LLM_API_KEY')
    LLM_BASE_URL = os.environ.get('LLM_BASE_URL', 'https://api.openai.com/v1')
    LLM_MODEL_NAME = os.environ.get('LLM_MODEL_NAME', 'gpt-4o-mini')
    # Secondary provider used when the primary gateway fails. Configure this
    # as DeepSeek while the primary Eliza model handles simulation generation.
    LLM_FALLBACK_API_KEY = os.environ.get('LLM_FALLBACK_API_KEY')
    LLM_FALLBACK_BASE_URL = os.environ.get('LLM_FALLBACK_BASE_URL', 'https://api.deepseek.com/v1')
    LLM_FALLBACK_MODEL_NAME = os.environ.get('LLM_FALLBACK_MODEL_NAME', 'deepseek-v4-flash')

    # Report and interview surfaces are high-volume interactive work; they can
    # use Haiku while setup/simulation work remains on the primary Opus model.
    REPORT_LLM_API_KEY = os.environ.get('REPORT_LLM_API_KEY') or LLM_API_KEY
    REPORT_LLM_BASE_URL = os.environ.get('REPORT_LLM_BASE_URL') or LLM_BASE_URL
    REPORT_LLM_MODEL_NAME = os.environ.get('REPORT_LLM_MODEL_NAME') or LLM_MODEL_NAME
    INTERVIEW_LLM_API_KEY = os.environ.get('INTERVIEW_LLM_API_KEY') or LLM_API_KEY
    INTERVIEW_LLM_BASE_URL = os.environ.get('INTERVIEW_LLM_BASE_URL') or LLM_BASE_URL
    INTERVIEW_LLM_MODEL_NAME = os.environ.get('INTERVIEW_LLM_MODEL_NAME') or LLM_MODEL_NAME

    # Every provider call carries an explicit wall-clock timeout. Without one a
    # stalled upstream holds a worker until the platform kills the process.
    LLM_TIMEOUT_SECONDS = float(os.environ.get('LLM_TIMEOUT_SECONDS', '120'))
    # Transient-failure attempts made by this client. The SDKs' own retries are
    # disabled so the total wait stays predictable.
    LLM_MAX_ATTEMPTS = int(os.environ.get('LLM_MAX_ATTEMPTS', '3'))

    # Report run logs record prompts and tool output for debugging. Capping the
    # stored text keeps a run log from growing without bound and limits how much
    # member-derived material sits in a debug artefact.
    REPORT_LOG_MAX_DETAIL_CHARS = int(
        os.environ.get('REPORT_LOG_MAX_DETAIL_CHARS', '4000')
    )

    # Zep configuration
    ZEP_API_KEY = os.environ.get('ZEP_API_KEY')

    # File upload configuration
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '../uploads')
    ALLOWED_EXTENSIONS = {'pdf', 'md', 'txt', 'markdown'}

    # Text processing configuration
    DEFAULT_CHUNK_SIZE = 500  # Default chunk size
    DEFAULT_CHUNK_OVERLAP = 50  # Default overlap size

    # OASIS simulation configuration
    OASIS_DEFAULT_MAX_ROUNDS = int(os.environ.get('OASIS_DEFAULT_MAX_ROUNDS', '10'))
    OASIS_SIMULATION_DATA_DIR = os.path.join(os.path.dirname(__file__), '../uploads/simulations')

    # OASIS platform available actions configuration
    OASIS_TWITTER_ACTIONS = [
        'CREATE_POST', 'LIKE_POST', 'REPOST', 'FOLLOW', 'DO_NOTHING', 'QUOTE_POST'
    ]
    OASIS_REDDIT_ACTIONS = [
        'LIKE_POST', 'DISLIKE_POST', 'CREATE_POST', 'CREATE_COMMENT',
        'LIKE_COMMENT', 'DISLIKE_COMMENT', 'SEARCH_POSTS', 'SEARCH_USER',
        'TREND', 'REFRESH', 'DO_NOTHING', 'FOLLOW', 'MUTE'
    ]

    # Report Agent configuration
    REPORT_AGENT_MAX_TOOL_CALLS = int(os.environ.get('REPORT_AGENT_MAX_TOOL_CALLS', '5'))
    REPORT_AGENT_MAX_REFLECTION_ROUNDS = int(os.environ.get('REPORT_AGENT_MAX_REFLECTION_ROUNDS', '2'))
    REPORT_AGENT_TEMPERATURE = float(os.environ.get('REPORT_AGENT_TEMPERATURE', '0.5'))

    @classmethod
    def validate(cls):
        """Validate required configuration"""
        errors = []
        if not cls.LLM_API_KEY:
            errors.append("LLM_API_KEY is not configured")
        if not cls.ZEP_API_KEY:
            errors.append("ZEP_API_KEY is not configured")
        return errors
