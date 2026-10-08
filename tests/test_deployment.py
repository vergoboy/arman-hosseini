"""Smoke tests for the arman-hosseini.ir deployment.

Covers the local deploy config, the build output, and the live server:
HTTP->HTTPS, the served pages, the admin dashboard behind its nginx proxy,
the API's auth requirement, the TLS certificate, and the fact that the
other vhosts on 45.135.242.135 are still answering.

    python3 -m pytest tests/test_deployment.py
"""

from __future__ import annotations

import http.client
import json
import socket
import ssl
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "arman-hosseini.ir"
HTTPS = f"https://{DOMAIN}"
HOST = "45.135.242.135"
TIMEOUT = 20


def request(host: str, path: str, *, port: int = 80, tls: bool = False, server_hostname: str | None = None):
    """Issue one request without following redirects, so the status is observable."""
    if tls:
        context = ssl.create_default_context()
        conn = http.client.HTTPSConnection(host, port, timeout=TIMEOUT, context=context)
    else:
        conn = http.client.HTTPConnection(host, port, timeout=TIMEOUT)
    try:
        conn.request("GET", path, headers={"Host": server_hostname or host, "User-Agent": "pytest-smoke"})
        response = conn.getresponse()
        body = response.read()
        return response.status, dict(response.getheaders()), body
    finally:
        conn.close()


def fetch_cert() -> dict:
    context = ssl.create_default_context()
    with socket.create_connection((DOMAIN, 443), timeout=TIMEOUT) as sock:
        with context.wrap_socket(sock, server_hostname=DOMAIN) as tls:
            return tls.getpeercert()


def config() -> dict:
    return json.loads((ROOT / "deploy.config.json").read_text())


# --- local -----------------------------------------------------------------


def test_deploy_config_targets_this_server_only():
    cfg = config()
    assert cfg["host"] == HOST
    assert cfg["user"] == "ubuntu"
    assert cfg["remotePath"] == "/opt/arman-hosseini"
    assert cfg["localDir"] == "dist"
    for key in ("password", "passphrase", "privateKey", "token", "secret"):
        assert key not in cfg, f"credential field {key!r} must not live in the committed config"


def test_build_output_has_every_required_page():
    for page in (
        "index.html",
        "en/index.html",
        "fa/index.html",
        "en/projects/index.html",
        "404.html",
        "robots.txt",
        "sitemap.xml",
        "llms.txt",
    ):
        assert (ROOT / "dist" / page).is_file(), f"missing build output: dist/{page}"


def test_build_output_declares_canonical_origin():
    sitemap = (ROOT / "dist" / "sitemap.xml").read_text()
    assert HTTPS in sitemap
    homepage = (ROOT / "dist" / "en" / "index.html").read_text()
    assert f'href="{HTTPS}/en/"' in homepage


# --- live site -------------------------------------------------------------


def test_http_redirects_to_https():
    status, headers, _ = request(DOMAIN, "/en/")
    assert status == 301
    assert headers["Location"].startswith(f"{HTTPS}/")


def test_https_serves_the_english_homepage():
    status, headers, body = request(DOMAIN, "/en/", port=443, tls=True, server_hostname=DOMAIN)
    assert status == 200
    assert headers.get("Content-Type", "").startswith("text/html")
    assert b"<title>" in body
    assert "max-age=31536000" in headers.get("Strict-Transport-Security", "")


def test_https_serves_the_persian_homepage():
    status, _, body = request(DOMAIN, "/fa/", port=443, tls=True, server_hostname=DOMAIN)
    assert status == 200
    assert "آرمان حسینی".encode() in body


def test_root_is_the_language_picker():
    status, headers, body = request(DOMAIN, "/", port=443, tls=True, server_hostname=DOMAIN)
    assert status == 200
    assert headers.get("Content-Type", "").startswith("text/html")
    assert "arman-hosseini.ir/en/".encode() in body


def test_admin_dashboard_is_served_through_nginx():
    status, headers, body = request(DOMAIN, "/admin/", port=443, tls=True, server_hostname=DOMAIN)
    assert status == 200
    assert headers.get("Content-Type", "").startswith("text/html")
    assert b"<title>" in body


def test_api_requires_authentication():
    for endpoint in ("/api/stats", "/api/entries"):
        status, _, _ = request(DOMAIN, endpoint, port=443, tls=True, server_hostname=DOMAIN)
        assert status == 401, f"{endpoint} returned {status} without a token"

    status, _, body = request(DOMAIN, "/api/health", port=443, tls=True, server_hostname=DOMAIN)
    assert status == 200, f"/api/health returned {status}"


def test_unknown_path_is_404_not_a_wrong_page():
    status, _, _ = request(DOMAIN, "/no-such-page/", port=443, tls=True, server_hostname=DOMAIN)
    assert status == 404


def test_certificate_is_valid_and_covers_the_domain():
    cert = fetch_cert()
    names = [value for kind, value in cert["subjectAltName"] if kind == "DNS"]
    assert DOMAIN in names

    expires = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
    days_left = (expires - datetime.now(timezone.utc)).days
    assert days_left > 30, f"certificate expires in {days_left} days"

    issuer = dict(pair for group in cert["issuer"] for pair in group)
    assert "Let's Encrypt" in issuer.get("organizationName", "")


# --- the rest of the server ------------------------------------------------


@pytest.mark.parametrize("url", ["https://nikatormc.ir/", "https://panelll.nikatormc.ir/", "https://vergoboy.ir/"])
def test_other_sites_still_answer(url):
    host = url.split("//", 1)[1].split("/", 1)[0]
    status, _, _ = request(host, "/", port=443, tls=True, server_hostname=host)
    assert status == 200, f"{url} returned {status}"


def test_nginx_config_is_valid_and_site_is_deployed():
    result = subprocess.run(
        ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", f"ubuntu@{HOST}",
         "sudo nginx -t && test -L /opt/arman-hosseini/current "
         "&& sudo find /opt/arman-hosseini/releases -type f | wc -l"],
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    assert "test is successful" in result.stderr
    assert int(result.stdout.strip().splitlines()[-1]) > 0
