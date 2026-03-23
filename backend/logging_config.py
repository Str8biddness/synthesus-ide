"""
Structured logging configuration for SYNTHESUS IDE
Provides JSON logging for production and colored console logging for development.
"""

import logging
import logging.config
import json
import sys
from datetime import datetime, timezone
from typing import Any, Dict

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_object: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_object["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in {
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "getMessage",
                "message", "asctime"
            }:
                log_object[key] = value
        
        return json.dumps(log_object)


def get_logging_config(env: str = "development") -> Dict[str, Any]:
    """Get logging configuration based on environment"""
    
    if env == "production":
        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "json": {
                    "()": JSONFormatter
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "json",
                    "stream": sys.stdout
                }
            },
            "root": {
                "level": "INFO",
                "handlers": ["console"]
            },
            "loggers": {
                "uvicorn": {
                    "level": "INFO",
                    "handlers": ["console"],
                    "propagate": False
                },
                "uvicorn.access": {
                    "level": "INFO",
                    "handlers": ["console"],
                    "propagate": False
                }
            }
        }
    else:
        # Development configuration with colored output
        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "colored": {
                    "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S"
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "colored",
                    "stream": sys.stdout
                }
            },
            "root": {
                "level": "DEBUG",
                "handlers": ["console"]
            },
            "loggers": {
                "uvicorn": {
                    "level": "INFO",
                    "handlers": ["console"],
                    "propagate": False
                }
            }
        }


def setup_logging(env: str = "development") -> None:
    """Setup logging configuration"""
    config = get_logging_config(env)
    logging.config.dictConfig(config)


class LoggerMixin:
    """Mixin to add logger to classes"""
    
    @property
    def logger(self) -> logging.Logger:
        return logging.getLogger(self.__class__.__name__)


def log_request(request_id: str, method: str, path: str, status_code: int, duration_ms: float) -> None:
    """Log HTTP request details"""
    logger = logging.getLogger("synthesus.access")
    logger.info(
        f"{method} {path} - {status_code} - {duration_ms:.2f}ms",
        extra={
            "request_id": request_id,
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": duration_ms
        }
    )


def log_security_event(event_type: str, details: Dict[str, Any]) -> None:
    """Log security-related events"""
    logger = logging.getLogger("synthesus.security")
    logger.warning(
        f"Security event: {event_type}",
        extra={
            "event_type": event_type,
            **details
        }
    )


def log_ai_request(backend: str, model: str, operation: str, duration_ms: float, success: bool) -> None:
    """Log AI operation metrics"""
    logger = logging.getLogger("synthesus.ai")
    logger.info(
        f"AI {operation} via {backend}/{model} - success={success} - {duration_ms:.2f}ms",
        extra={
            "backend": backend,
            "model": model,
            "operation": operation,
            "duration_ms": duration_ms,
            "success": success
        }
    )


def log_code_execution(language: str, success: bool, duration_ms: float, warnings: int = 0) -> None:
    """Log code execution metrics"""
    logger = logging.getLogger("synthesus.execution")
    logger.info(
        f"Code execution [{language}] - success={success} - {duration_ms:.2f}ms",
        extra={
            "language": language,
            "success": success,
            "duration_ms": duration_ms,
            "security_warnings": warnings
        }
    )
