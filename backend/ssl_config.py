"""
SSL/TLS Configuration for SYNTHESUS IDE
Provides HTTPS support for production deployments.
"""

import os
import ssl
from pathlib import Path
from fastapi import FastAPI
from contextlib import asynccontextmanager

# SSL Configuration
SSL_ENABLED = os.environ.get("SSL_ENABLED", "false").lower() == "true"
SSL_CERT_PATH = os.environ.get("SSL_CERT_PATH", "/app/certs/cert.pem")
SSL_KEY_PATH = os.environ.get("SSL_KEY_PATH", "/app/certs/key.pem")
SSL_CA_PATH = os.environ.get("SSL_CA_PATH", None)

def get_ssl_context() -> ssl.SSLContext | None:
    """Create SSL context for HTTPS server"""
    if not SSL_ENABLED:
        return None
    
    cert_path = Path(SSL_CERT_PATH)
    key_path = Path(SSL_KEY_PATH)
    
    if not cert_path.exists() or not key_path.exists():
        print(f"Warning: SSL certificates not found at {cert_path} and {key_path}")
        print("Running without SSL. Set SSL_ENABLED=false to suppress this warning.")
        return None
    
    context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    context.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))
    
    # Optional: Load CA cert for client certificate verification
    if SSL_CA_PATH and Path(SSL_CA_PATH).exists():
        context.load_verify_locations(cafile=SSL_CA_PATH)
        context.verify_mode = ssl.CERT_OPTIONAL
    
    # Security hardening
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.options |= ssl.OP_NO_COMPRESSION
    context.options |= ssl.OP_CIPHER_SERVER_PREFERENCE
    
    # Set strong cipher suites
    context.set_ciphers(
        'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS'
    )
    
    return context


def generate_self_signed_cert(cert_path: Path, key_path: Path) -> None:
    """Generate self-signed certificates for development/testing"""
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from datetime import datetime, timedelta
        
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        # Generate certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "CA"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "SYNTHESUS IDE"),
            x509.NameAttribute(NameOID.COMMON_NAME, "synthesus.local"),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.utcnow()
        ).not_valid_after(
            datetime.utcnow() + timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("synthesus.local"),
                x509.DNSName("localhost"),
                x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # Write certificate and key
        cert_path.parent.mkdir(parents=True, exist_ok=True)
        cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
        key_path.write_bytes(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ))
        
        print(f"Generated self-signed certificates at {cert_path.parent}")
        
    except ImportError:
        print("Warning: cryptography package not installed. Cannot generate certificates.")
        print("Install with: pip install cryptography")


# Import ipaddress for certificate generation
import ipaddress
