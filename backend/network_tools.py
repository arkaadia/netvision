"""
Network Tools Engine for NetTopology Panel
Provides real backend-backed network diagnostics and utilities:
1. Port Scanner (TCP connect scanner with banner grabbing)
2. DNS Lookup / Dig / Nslookup
3. Traceroute & Path Analysis
4. SSL/TLS Certificate Inspector
5. HTTP Header & Security Header Analyzer
6. ICMP Ping Diagnostic
"""

import socket
import ssl
import time
import subprocess
import re
import json
import urllib.request
import urllib.parse
import hashlib
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

COMMON_PORT_NAMES = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    123: "NTP",
    143: "IMAP",
    161: "SNMP",
    389: "LDAP",
    443: "HTTPS",
    445: "SMB",
    636: "LDAPS",
    993: "IMAPS",
    995: "POP3S",
    1433: "MSSQL",
    1521: "Oracle",
    1723: "PPTP",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    5900: "VNC",
    6379: "Redis",
    8080: "HTTP-Proxy",
    8291: "MikroTik WinBox",
    8443: "HTTPS-Alt",
    8728: "MikroTik API",
    8729: "MikroTik API-SSL"
}


def scan_single_port(host: str, port: int, timeout: float = 0.8) -> dict:
    """Probe a single TCP port, measure RTT and attempt light banner grab."""
    service = COMMON_PORT_NAMES.get(port, "Unknown")
    start = time.time()
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    banner = ""
    state = "closed"
    latency_ms = 0.0

    try:
        res = s.connect_ex((host, port))
        latency_ms = round((time.time() - start) * 1000, 2)
        if res == 0:
            state = "open"
            # Attempt light non-blocking banner reading
            try:
                s.settimeout(0.6)
                if port in [80, 8080, 8443]:
                    s.sendall(b"HEAD / HTTP/1.0\r\nHost: " + host.encode() + b"\r\n\r\n")
                elif port in [21, 22, 23, 25, 110, 143]:
                    pass  # Service sends greeting banner automatically
                chunk = s.recv(512)
                if chunk:
                    clean = re.sub(r'[\r\n]+', ' | ', chunk.decode('latin1', errors='replace')).strip()
                    banner = clean[:120]
            except Exception:
                pass
        elif res in [11, 35, 110]:  # ETIMEDOUT or EAGAIN
            state = "filtered"
    except socket.timeout:
        state = "filtered"
        latency_ms = round(timeout * 1000, 2)
    except Exception:
        state = "closed"
    finally:
        try:
            s.close()
        except Exception:
            pass

    return {
        "port": port,
        "service": service,
        "state": state,
        "latencyMs": latency_ms if state == "open" else None,
        "banner": banner if banner else None
    }


def run_port_scan(host: str, ports: list = None, timeout: float = 0.8) -> dict:
    """Multithreaded TCP port scanner."""
    # Resolve host first
    try:
        target_ip = socket.gethostbyname(host)
    except Exception as e:
        return {
            "success": False,
            "error": f"Could not resolve host '{host}': {str(e)}",
            "host": host,
            "results": []
        }

    if not ports:
        ports = [21, 22, 23, 25, 53, 80, 110, 143, 161, 443, 445, 993, 995, 1723, 3306, 3389, 5432, 8080, 8291, 8443, 8728]

    # Deduplicate and sort ports
    ports = sorted(list(set(int(p) for p in ports if 1 <= int(p) <= 65535)))[:100]

    results = []
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=min(25, len(ports))) as executor:
        futures = [executor.submit(scan_single_port, target_ip, p, timeout) for p in ports]
        for f in futures:
            try:
                results.append(f.result())
            except Exception:
                pass

    results.sort(key=lambda r: r["port"])
    open_ports = [r for r in results if r["state"] == "open"]
    duration_s = round(time.time() - start_time, 2)

    return {
        "success": True,
        "host": host,
        "ip": target_ip,
        "scannedCount": len(ports),
        "openCount": len(open_ports),
        "durationSeconds": duration_s,
        "results": results
    }


def run_dns_lookup(target: str, record_type: str = "A", nameserver: str = None) -> dict:
    """Perform real DNS resolution using dig/nslookup or socket fallback."""
    record_type = (record_type or "A").upper().strip()
    target = target.strip()

    # Try dig command if available
    dig_cmd = ["dig", "+noall", "+answer", "+comments", target, record_type]
    if nameserver:
        dig_cmd.append(f"@{nameserver.strip()}")

    try:
        p = subprocess.run(dig_cmd, capture_output=True, text=True, timeout=5)
        raw_output = p.stdout.strip()
        if p.returncode == 0 and raw_output:
            answers = []
            for line in raw_output.splitlines():
                line = line.strip()
                if not line or line.startswith(";"):
                    continue
                parts = line.split()
                if len(parts) >= 5:
                    answers.append({
                        "name": parts[0],
                        "ttl": parts[1],
                        "class": parts[2],
                        "type": parts[3],
                        "data": " ".join(parts[4:])
                    })
            return {
                "success": True,
                "target": target,
                "recordType": record_type,
                "nameserver": nameserver or "System Default",
                "answers": answers,
                "rawOutput": raw_output
            }
    except Exception:
        pass

    # Try nslookup as secondary CLI option
    try:
        ns_cmd = ["nslookup", f"-query={record_type}", target]
        if nameserver:
            ns_cmd.append(nameserver.strip())
        p = subprocess.run(ns_cmd, capture_output=True, text=True, timeout=5)
        raw_output = p.stdout.strip()
        if p.returncode == 0:
            return {
                "success": True,
                "target": target,
                "recordType": record_type,
                "nameserver": nameserver or "System Default",
                "answers": [{"name": target, "type": record_type, "data": raw_output}],
                "rawOutput": raw_output
            }
    except Exception:
        pass

    # Native Python fallback using socket
    try:
        if record_type in ["A", "AAAA"]:
            family = socket.AF_INET6 if record_type == "AAAA" else socket.AF_INET
            info = socket.getaddrinfo(target, None, family)
            ips = list(set([item[4][0] for item in info]))
            answers = [{"name": target, "type": record_type, "data": ip, "ttl": "N/A"} for ip in ips]
            return {
                "success": True,
                "target": target,
                "recordType": record_type,
                "nameserver": "System Resolver",
                "answers": answers,
                "rawOutput": "\n".join([f"{target}\tIN\t{record_type}\t{ip}" for ip in ips])
            }
        elif record_type == "PTR":
            name, _, _ = socket.gethostbyaddr(target)
            return {
                "success": True,
                "target": target,
                "recordType": "PTR",
                "nameserver": "System Resolver",
                "answers": [{"name": target, "type": "PTR", "data": name, "ttl": "N/A"}],
                "rawOutput": f"{target} domain name pointer {name}"
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"DNS resolution failed: {str(e)}",
            "target": target,
            "recordType": record_type,
            "answers": []
        }

    return {
        "success": False,
        "error": f"No records found for {target} ({record_type})",
        "target": target,
        "recordType": record_type,
        "answers": []
    }


def run_traceroute(host: str, max_hops: int = 25, timeout: int = 2) -> dict:
    """Run real traceroute tool and parse hop by hop."""
    host = host.strip()
    # Resolve host
    try:
        target_ip = socket.gethostbyname(host)
    except Exception as e:
        return {
            "success": False,
            "error": f"Cannot resolve host '{host}': {str(e)}",
            "host": host,
            "hops": []
        }

    max_hops = min(max(int(max_hops), 1), 40)
    timeout = min(max(int(timeout), 1), 5)

    cmd = ["traceroute", "-n", "-m", str(max_hops), "-w", str(timeout), host]
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=max_hops * timeout + 5)
        raw_output = p.stdout.strip() or p.stderr.strip()
        hops = []

        for line in raw_output.splitlines():
            line = line.strip()
            if not line or line.startswith("traceroute to"):
                continue

            match = re.match(r'^\s*(\d+)\s+(.+)$', line)
            if not match:
                continue

            hop_num = int(match.group(1))
            rest = match.group(2).strip()

            if rest.startswith("*") and ("ms" not in rest):
                hops.append({
                    "hop": hop_num,
                    "ip": "*",
                    "host": "Request timed out",
                    "rttMs": None,
                    "status": "timeout"
                })
                continue

            # Extract IP and latency
            ip_match = re.search(r'([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|[a-fA-F0-9:]+)', rest)
            rtt_matches = re.findall(r'([0-9]+\.?[0-9]*)\s*ms', rest)

            rtt_val = float(rtt_matches[0]) if rtt_matches else None
            found_ip = ip_match.group(1) if ip_match else rest.split()[0]

            hops.append({
                "hop": hop_num,
                "ip": found_ip,
                "host": found_ip,
                "rttMs": rtt_val,
                "status": "ok"
            })

        completed = len(hops) > 0 and (hops[-1]["ip"] == target_ip)

        return {
            "success": True,
            "host": host,
            "targetIp": target_ip,
            "maxHops": max_hops,
            "completed": completed,
            "hops": hops,
            "rawOutput": raw_output
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Traceroute execution error: {str(e)}",
            "host": host,
            "targetIp": target_ip,
            "hops": []
        }


def run_cert_lookup(host: str, port: int = 443, timeout: float = 5.0) -> dict:
    """Inspect real SSL/TLS certificate of a target host using socket, SSL and OpenSSL."""
    host = host.strip()
    port = int(port or 443)

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    start_time = time.time()
    try:
        with socket.create_connection((host, port), timeout=timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                der_cert = ssock.getpeercert(binary_form=True)
                cipher = ssock.cipher()
                tls_version = ssock.version()
                latency_ms = round((time.time() - start_time) * 1000, 2)

                sha256_fp = hashlib.sha256(der_cert).hexdigest().upper()
                formatted_fp = ":".join([sha256_fp[i:i+2] for i in range(0, len(sha256_fp), 2)])

                pem_cert = ssl.DER_cert_to_PEM_cert(der_cert)

                # Use openssl to parse subject, issuer, dates, SANs, serial
                p = subprocess.run(
                    ['openssl', 'x509', '-noout', '-subject', '-issuer', '-dates', '-serial', '-ext', 'subjectAltName'],
                    input=pem_cert,
                    text=True,
                    capture_output=True,
                    timeout=5
                )

                stdout = p.stdout or ""
                subject_raw = ""
                issuer_raw = ""
                not_before = ""
                not_after = ""
                serial = ""
                sans = []

                for line in stdout.splitlines():
                    line = line.strip()
                    if line.startswith("subject="):
                        subject_raw = line[len("subject="):].strip()
                    elif line.startswith("issuer="):
                        issuer_raw = line[len("issuer="):].strip()
                    elif line.startswith("notBefore="):
                        not_before = line[len("notBefore="):].strip()
                    elif line.startswith("notAfter="):
                        not_after = line[len("notAfter="):].strip()
                    elif line.startswith("serial="):
                        serial = line[len("serial="):].strip()
                    elif "DNS:" in line or "IP:" in line:
                        for part in line.split(","):
                            part = part.strip()
                            if part.startswith("DNS:") or part.startswith("IP:"):
                                sans.append(part)

                # Parse CommonName and Org
                def parse_kv(text):
                    res = {}
                    # Text format: C = US, O = Google Trust Services, CN = WE2
                    parts = re.split(r',\s*(?=[A-Z]+\s*=)', text)
                    for p_item in parts:
                        kv = p_item.split("=", 1)
                        if len(kv) == 2:
                            res[kv[0].strip()] = kv[1].strip()
                    return res

                subj_dict = parse_kv(subject_raw)
                iss_dict = parse_kv(issuer_raw)

                days_remaining = None
                is_expired = False
                if not_after:
                    try:
                        # e.g., Nov  2 08:37:41 2026 GMT
                        clean_dt_str = " ".join(not_after.split())
                        expiry_dt = datetime.strptime(clean_dt_str, "%b %d %H:%M:%S %Y %Z")
                        now_dt = datetime.utcnow()
                        delta = expiry_dt - now_dt
                        days_remaining = delta.days
                        is_expired = days_remaining < 0
                    except Exception:
                        pass

                return {
                    "success": True,
                    "host": host,
                    "port": port,
                    "latencyMs": latency_ms,
                    "tlsVersion": tls_version,
                    "cipherSuite": cipher[0] if cipher else "Unknown",
                    "cipherBits": cipher[2] if cipher and len(cipher) > 2 else 0,
                    "subject": {
                        "commonName": subj_dict.get("CN", host),
                        "organization": subj_dict.get("O", ""),
                        "organizationalUnit": subj_dict.get("OU", ""),
                        "country": subj_dict.get("C", "")
                    },
                    "issuer": {
                        "commonName": iss_dict.get("CN", issuer_raw),
                        "organization": iss_dict.get("O", ""),
                        "country": iss_dict.get("C", "")
                    },
                    "validFrom": not_before,
                    "validTo": not_after,
                    "daysRemaining": days_remaining,
                    "isExpired": is_expired,
                    "serialNumber": serial,
                    "subjectAltNames": sans[:50],
                    "sha256Fingerprint": formatted_fp
                }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to retrieve SSL/TLS certificate from {host}:{port}: {str(e)}",
            "host": host,
            "port": port
        }


def run_header_analyzer(target_url: str) -> dict:
    """Analyze HTTP response headers and grade security posture."""
    url = target_url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    start = time.time()
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "NetTopology-Security-Scanner/1.0 (Enterprise Network Auditor)"}
    )

    try:
        # Create unverified context if needed for testing self-signed devices
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        with urllib.request.urlopen(req, timeout=8, context=ctx) as response:
            latency_ms = round((time.time() - start) * 1000, 2)
            status_code = response.getcode()
            headers = dict(response.info().items())

            # Evaluate Security Headers
            security_audit = []
            score = 100

            # 1. HSTS
            hsts = headers.get("strict-transport-security")
            if hsts:
                security_audit.append({
                    "header": "Strict-Transport-Security",
                    "status": "pass",
                    "value": hsts,
                    "recommendation": "Enforces HTTPS connections securely."
                })
            else:
                score -= 20
                security_audit.append({
                    "header": "Strict-Transport-Security",
                    "status": "fail",
                    "value": None,
                    "recommendation": "Missing HSTS! Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains'."
                })

            # 2. Content-Security-Policy
            csp = headers.get("content-security-policy")
            if csp:
                security_audit.append({
                    "header": "Content-Security-Policy",
                    "status": "pass",
                    "value": csp[:100] + ("..." if len(csp) > 100 else ""),
                    "recommendation": "Restricts unauthorized script and resource injection."
                })
            else:
                score -= 25
                security_audit.append({
                    "header": "Content-Security-Policy",
                    "status": "fail",
                    "value": None,
                    "recommendation": "Missing CSP! Define allowed sources for scripts, styles, and frames."
                })

            # 3. X-Frame-Options
            xfo = headers.get("x-frame-options")
            if xfo:
                security_audit.append({
                    "header": "X-Frame-Options",
                    "status": "pass",
                    "value": xfo,
                    "recommendation": "Guards against Clickjacking attacks."
                })
            else:
                score -= 15
                security_audit.append({
                    "header": "X-Frame-Options",
                    "status": "fail",
                    "value": None,
                    "recommendation": "Missing X-Frame-Options! Set 'DENY' or 'SAMEORIGIN'."
                })

            # 4. X-Content-Type-Options
            xcto = headers.get("x-content-type-options")
            if xcto and "nosniff" in xcto.lower():
                security_audit.append({
                    "header": "X-Content-Type-Options",
                    "status": "pass",
                    "value": xcto,
                    "recommendation": "Prevents MIME type sniffing."
                })
            else:
                score -= 10
                security_audit.append({
                    "header": "X-Content-Type-Options",
                    "status": "fail",
                    "value": xcto,
                    "recommendation": "Add 'X-Content-Type-Options: nosniff'."
                })

            # 5. Referrer-Policy
            ref_pol = headers.get("referrer-policy")
            if ref_pol:
                security_audit.append({
                    "header": "Referrer-Policy",
                    "status": "pass",
                    "value": ref_pol,
                    "recommendation": "Controls how much referrer information is included with requests."
                })
            else:
                score -= 10
                security_audit.append({
                    "header": "Referrer-Policy",
                    "status": "warn",
                    "value": None,
                    "recommendation": "Recommended: 'strict-origin-when-cross-origin'."
                })

            # 6. Server Disclosure Check
            server_hdr = headers.get("server")
            if server_hdr:
                security_audit.append({
                    "header": "Server",
                    "status": "warn",
                    "value": server_hdr,
                    "recommendation": "Server banner disclosure detected. Consider suppressing or obfuscating version details."
                })
            else:
                security_audit.append({
                    "header": "Server",
                    "status": "pass",
                    "value": "Hidden",
                    "recommendation": "Server header is properly hidden."
                })

            # Grade determination
            score = max(0, score)
            if score >= 90:
                grade = "A+"
            elif score >= 80:
                grade = "A"
            elif score >= 70:
                grade = "B"
            elif score >= 60:
                grade = "C"
            elif score >= 45:
                grade = "D"
            else:
                grade = "F"

            return {
                "success": True,
                "url": url,
                "statusCode": status_code,
                "latencyMs": latency_ms,
                "securityGrade": grade,
                "securityScore": score,
                "headers": headers,
                "securityAudit": security_audit
            }
    except urllib.error.HTTPError as e:
        return {
            "success": True,
            "url": url,
            "statusCode": e.code,
            "latencyMs": round((time.time() - start) * 1000, 2),
            "headers": dict(e.headers.items()),
            "securityGrade": "C",
            "securityScore": 60,
            "securityAudit": [
                {
                    "header": "HTTP Status",
                    "status": "warn",
                    "value": f"HTTP {e.code}",
                    "recommendation": f"Target responded with HTTP {e.code} error."
                }
            ]
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to connect to '{url}': {str(e)}",
            "url": url
        }


def run_ping_host(host: str, count: int = 4, timeout: int = 2) -> dict:
    """Run real ICMP ping command against target host."""
    host = host.strip()
    count = min(max(int(count), 1), 10)
    timeout = min(max(int(timeout), 1), 5)

    cmd = ["ping", "-c", str(count), "-W", str(timeout), host]
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=count * timeout + 4)
        raw_output = p.stdout.strip() or p.stderr.strip()

        # Parse loss percentage
        loss_match = re.search(r'([0-9]+(?:\.[0-9]+)?)\%\s*packet\s*loss', raw_output)
        loss_pct = float(loss_match.group(1)) if loss_match else 100.0

        # Parse rtt min/avg/max/mdev
        rtt_match = re.search(r'rtt\s+min/avg/max/mdev\s*=\s*([0-9\.]+)/([0-9\.]+)/([0-9\.]+)/([0-9\.]+)', raw_output)
        rtt_stats = None
        if rtt_match:
            rtt_stats = {
                "min": float(rtt_match.group(1)),
                "avg": float(rtt_match.group(2)),
                "max": float(rtt_match.group(3)),
                "mdev": float(rtt_match.group(4))
            }

        return {
            "success": p.returncode == 0,
            "host": host,
            "transmitted": count,
            "packetLossPercent": loss_pct,
            "rttStats": rtt_stats,
            "rawOutput": raw_output
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Ping execution error: {str(e)}",
            "host": host,
            "packetLossPercent": 100.0,
            "rttStats": None
        }


def check_host_ping_init(host: str, max_nodes: int = 5, nodes: list = None) -> dict:
    """
    Initiate a multi-node global ping check via check-host.net API.
    Docs: https://check-host.net/about/api#ping-section
    """
    host = (host or "").strip()
    if not host:
        return {"success": False, "error": "Target host is required"}

    # Strip protocol scheme or trailing paths if entered by user
    clean_host = re.sub(r'^https?://', '', host).split('/')[0].split(':')[0]
    if not clean_host:
        clean_host = host

    max_nodes = min(max(int(max_nodes or 5), 1), 30)

    url = f"https://check-host.net/check-ping?host={urllib.parse.quote(clean_host)}&max_nodes={max_nodes}"
    if nodes and isinstance(nodes, list):
        for n in nodes:
            if n and isinstance(n, str):
                url += f"&node={urllib.parse.quote(n.strip())}"

    try:
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "NetTopology-HostChecker/1.0"
            }
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            raw_body = response.read().decode("utf-8", errors="replace")
            data = json.loads(raw_body)
            if data.get("ok") == 1:
                return {
                    "success": True,
                    "requestId": data.get("request_id"),
                    "permanentLink": data.get("permanent_link"),
                    "nodes": data.get("nodes", {}),
                    "targetHost": clean_host
                }
            return {
                "success": False,
                "error": data.get("error") or "Check-Host refused request",
                "raw": data
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to contact Check-Host API: {str(e)}"
        }


def check_host_get_result(request_id: str) -> dict:
    """
    Fetch live multi-node ping results from check-host.net API.
    Docs: https://check-host.net/about/api#ping-section
    """
    request_id = (request_id or "").strip()
    if not request_id:
        return {"success": False, "error": "request_id is required"}

    url = f"https://check-host.net/check-result/{urllib.parse.quote(request_id)}"
    try:
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "NetTopology-HostChecker/1.0"
            }
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            raw_body = response.read().decode("utf-8", errors="replace")
            data = json.loads(raw_body)
            return {
                "success": True,
                "requestId": request_id,
                "results": data
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to fetch check results: {str(e)}"
        }


def check_host_get_nodes() -> dict:
    """Fetch list of all available check-host.net nodes."""
    url = "https://check-host.net/nodes/hosts"
    try:
        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "NetTopology-HostChecker/1.0"
            }
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            raw_body = response.read().decode("utf-8", errors="replace")
            data = json.loads(raw_body)
            return {
                "success": True,
                "nodes": data.get("nodes", {})
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to fetch nodes: {str(e)}"
        }

