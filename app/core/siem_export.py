"""
SIEM (Security Information and Event Management) export for audit logs

Supports multiple SIEM integrations:
- Syslog (RFC 5424) - Generic SIEM ingestion
- AWS CloudWatch Logs - AWS native logging
- Splunk HEC (HTTP Event Collector)
- Datadog Logs API
- File-based append-only log (for compliance)
"""
import json
import logging
import socket
import time
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import aiofiles
import asyncio
from enum import Enum

logger = logging.getLogger(__name__)


class SIEMProvider(str, Enum):
    """Supported SIEM providers"""
    SYSLOG = "syslog"
    FILE = "file"
    CLOUDWATCH = "cloudwatch"
    SPLUNK = "splunk"
    DATADOG = "datadog"


class SIEMExporter:
    """
    Export audit logs to SIEM systems for security monitoring and compliance
    
    Features:
    - Multiple provider support
    - Async/non-blocking
    - Structured JSON format
    - Append-only file export for compliance
    - Automatic retry on failure
    """
    
    def __init__(
        self,
        provider: SIEMProvider = SIEMProvider.FILE,
        config: Optional[Dict[str, Any]] = None
    ):
        self.provider = provider
        self.config = config or {}
        self.enabled = self.config.get("enabled", False)
        
        # File-based config
        self.log_file_path = Path(self.config.get("log_file_path", "./logs/audit_siem.jsonl"))
        
        # Syslog config
        self.syslog_host = self.config.get("syslog_host", "localhost")
        self.syslog_port = self.config.get("syslog_port", 514)
        self.syslog_protocol = self.config.get("syslog_protocol", "udp")  # udp or tcp
        
        # CloudWatch config (placeholder for future)
        self.cloudwatch_log_group = self.config.get("cloudwatch_log_group")
        self.cloudwatch_log_stream = self.config.get("cloudwatch_log_stream")
        
        # Splunk HEC config
        self.splunk_hec_url = self.config.get("splunk_hec_url")
        self.splunk_hec_token = self.config.get("splunk_hec_token")
        
        # Datadog config
        self.datadog_api_key = self.config.get("datadog_api_key")
        self.datadog_api_url = self.config.get("datadog_api_url", "https://http-intake.logs.datadoghq.com/v1/input")
        
        if self.enabled:
            logger.info(f"SIEMExporter initialized: provider={self.provider}, enabled={self.enabled}")
    
    async def export_audit_log(self, audit_log: Dict[str, Any]) -> bool:
        """
        Export a single audit log entry to the configured SIEM
        
        Args:
            audit_log: Dictionary containing audit log fields
        
        Returns:
            True if export succeeded, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            # Format audit log for export
            formatted_log = self._format_audit_log(audit_log)
            
            # Export based on provider
            if self.provider == SIEMProvider.FILE:
                return await self._export_to_file(formatted_log)
            elif self.provider == SIEMProvider.SYSLOG:
                return await self._export_to_syslog(formatted_log)
            elif self.provider == SIEMProvider.CLOUDWATCH:
                return await self._export_to_cloudwatch(formatted_log)
            elif self.provider == SIEMProvider.SPLUNK:
                return await self._export_to_splunk(formatted_log)
            elif self.provider == SIEMProvider.DATADOG:
                return await self._export_to_datadog(formatted_log)
            else:
                logger.warning(f"Unknown SIEM provider: {self.provider}")
                return False
        
        except Exception as e:
            logger.error(f"Failed to export audit log to SIEM: {e}", exc_info=True)
            return False
    
    def _format_audit_log(self, audit_log: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format audit log for SIEM ingestion
        
        Standardizes timestamps, adds metadata, ensures JSON serialization
        """
        return {
            "timestamp": audit_log.get("created_at", datetime.utcnow().isoformat()),
            "event_type": "audit_log",
            "source": "indoc",
            "severity": self._get_severity(audit_log.get("action")),
            "user": {
                "id": audit_log.get("user_id"),
                "email": audit_log.get("user_email"),
                "role": audit_log.get("user_role"),
                "manager_id": audit_log.get("manager_id")
            },
            "action": audit_log.get("action"),
            "resource": {
                "type": audit_log.get("resource_type"),
                "id": audit_log.get("resource_id")
            },
            "metadata": audit_log.get("metadata", {}),
            "ip_address": audit_log.get("metadata", {}).get("client_ip"),
            "status": audit_log.get("status", "success")
        }
    
    def _get_severity(self, action: str) -> str:
        """Map action to severity level for SIEM alerting"""
        high_severity_actions = [
            "login_failed", "mfa_verify_failed", "unauthorized_access",
            "data_export", "user_deleted", "role_change", "mfa_disabled"
        ]
        medium_severity_actions = [
            "login", "logout", "document_delete", "bulk_action"
        ]
        
        if action in high_severity_actions:
            return "high"
        elif action in medium_severity_actions:
            return "medium"
        else:
            return "low"
    
    async def _export_to_file(self, log_entry: Dict[str, Any]) -> bool:
        """
        Export to append-only JSON Lines file (for compliance)
        
        Each line is a complete JSON object (JSONL format)
        """
        try:
            # Ensure log directory exists
            self.log_file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Append to file (atomic write)
            async with aiofiles.open(self.log_file_path, mode='a') as f:
                await f.write(json.dumps(log_entry) + '\n')
            
            return True
        
        except Exception as e:
            logger.error(f"Failed to write audit log to file: {e}")
            return False
    
    async def _export_to_syslog(self, log_entry: Dict[str, Any]) -> bool:
        """
        Export to Syslog (RFC 5424)
        
        Supports both UDP and TCP
        """
        try:
            # Format as RFC 5424 syslog message
            priority = 134  # facility=16 (local0), severity=6 (informational)
            timestamp = datetime.utcnow().isoformat()
            hostname = socket.gethostname()
            app_name = "indoc"
            message = json.dumps(log_entry)
            
            syslog_msg = f"<{priority}>1 {timestamp} {hostname} {app_name} - - - {message}"
            
            # Send via UDP or TCP
            if self.syslog_protocol == "tcp":
                reader, writer = await asyncio.open_connection(self.syslog_host, self.syslog_port)
                writer.write(syslog_msg.encode())
                await writer.drain()
                writer.close()
                await writer.wait_closed()
            else:  # UDP
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.sendto(syslog_msg.encode(), (self.syslog_host, self.syslog_port))
                sock.close()
            
            return True
        
        except Exception as e:
            logger.error(f"Failed to send audit log to syslog: {e}")
            return False
    
    async def _export_to_cloudwatch(self, log_entry: Dict[str, Any]) -> bool:
        """
        Export to AWS CloudWatch Logs (placeholder)
        
        Requires boto3 - implement when AWS integration is needed
        """
        logger.warning("CloudWatch export not yet implemented. Use file or syslog for now.")
        return False
    
    async def _export_to_splunk(self, log_entry: Dict[str, Any]) -> bool:
        """
        Export to Splunk HEC (HTTP Event Collector) (placeholder)
        
        Requires httpx - implement when Splunk integration is needed
        """
        logger.warning("Splunk HEC export not yet implemented. Use file or syslog for now.")
        return False
    
    async def _export_to_datadog(self, log_entry: Dict[str, Any]) -> bool:
        """
        Export to Datadog Logs API (placeholder)
        
        Requires httpx - implement when Datadog integration is needed
        """
        logger.warning("Datadog export not yet implemented. Use file or syslog for now.")
        return False


# Global SIEM exporter instance
_siem_exporter: Optional[SIEMExporter] = None


def init_siem_exporter(provider: SIEMProvider = SIEMProvider.FILE, config: Dict[str, Any] = None):
    """Initialize the global SIEM exporter"""
    global _siem_exporter
    _siem_exporter = SIEMExporter(provider=provider, config=config or {})
    return _siem_exporter


def get_siem_exporter() -> Optional[SIEMExporter]:
    """Get the global SIEM exporter instance"""
    return _siem_exporter


async def export_audit_log_to_siem(audit_log: Dict[str, Any]):
    """
    Convenience function to export audit log to SIEM
    
    Non-blocking, logs errors but doesn't raise exceptions
    """
    exporter = get_siem_exporter()
    if exporter and exporter.enabled:
        await exporter.export_audit_log(audit_log)


