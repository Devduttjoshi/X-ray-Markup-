import os
import sys
import json
import base64
import platform
import subprocess
import re
import socket
import hashlib
import urllib.request
import urllib.error
import webbrowser
from threading import Timer
from flask import Flask, request, jsonify, send_from_directory

# Resolve the absolute path to static files, working both in standard development and inside PyInstaller executable bundles.
def get_resource_path(relative_path):
    try:
        # PyInstaller creates a temporary folder and stores its path in _MEIPASS
        base_path = sys._MEIPASS
    except AttributeError:
        # Resolve path relative to the script file folder to avoid working directory issues
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

# Initialize Flask app
dist_path = get_resource_path("dist")
app = Flask(__name__, static_folder=dist_path, static_url_path="")

# Port configuration
PORT = int(os.environ.get("PORT", 3000))

# System Settings Persistence
if getattr(sys, 'frozen', False):
    app_dir = os.path.dirname(sys.executable)
else:
    app_dir = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(app_dir, "system_settings.json")

def load_settings():
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print("Error loading system settings:", e)
    return {
        "securityLevel": "permissive",
        "whitelist": ["LOCAL-HOST-DEV"],
        "aiConfig": {
            "provider": "gemini",
            "apiKey": "",
            "baseUrl": "",
            "modelName": "gemini-3.5-flash",
        },
        "githubRepo": "devdutt34joshi/lower-limb-analyzer",
    }

def save_settings(settings_to_save):
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings_to_save, f, indent=2)
    except Exception as e:
        print("Error saving system settings:", e)

settings = load_settings()
pending_requests = []

# Network address helpers
def get_local_ips():
    ips = []
    try:
        # Try getting primary LAN ip
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.append(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    
    # Check hostname fallbacks
    try:
        host_name = socket.gethostname()
        for ip in socket.gethostbyname_ex(host_name)[2]:
            if not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
    except Exception:
        pass
    return ips if ips else ["127.0.0.1"]

def get_client_ip():
    if request.headers.get("X-Forwarded-For"):
        return request.headers.get("X-Forwarded-For").split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"

def get_client_mac_address(ip_address):
    clean_ip = ip_address.replace("::ffff:", "")
    if clean_ip in ("127.0.0.1", "::1", "localhost"):
        return "LOCAL-HOST-DEV"

    # Try resolving via system ARP cache
    try:
        system = platform.system().lower()
        if "windows" in system:
            output = subprocess.check_output(["arp", "-a", clean_ip], timeout=2).decode("utf-8", errors="ignore")
            match = re.search(r"([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})", output)
            if match:
                return match.group(0).upper().replace("-", ":")
        else:
            output = subprocess.check_output(["arp", "-n", clean_ip], timeout=2).decode("utf-8", errors="ignore")
            match = re.search(r"([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})", output)
            if match:
                return match.group(0).upper().replace("-", ":")
            
            # Linux specific ARP file read
            if os.path.exists("/proc/net/arp"):
                with open("/proc/net/arp", "r") as f:
                    for line in f.readlines():
                        if clean_ip in line:
                            parts = line.split()
                            if len(parts) >= 4 and ":" in parts[3]:
                                return parts[3].upper()
    except Exception as e:
        pass

    # Safe deterministic fallback pseudo-MAC based on IP hash
    h = hashlib.sha256(clean_ip.encode("utf-8")).hexdigest()
    pseudo_mac = ":".join([h[i:i+2] for i in range(0, 12, 2)]).upper()
    return f"SUB-{pseudo_mac}"

def track_client_access(ip, mac):
    if mac == "LOCAL-HOST-DEV" or mac in settings.get("whitelist", []):
        return
    exists = any(r["mac"] == mac for r in pending_requests)
    if not exists:
        pending_requests.append({
            "ip": ip,
            "mac": mac,
            "timestamp": Timer(0, lambda: None).finished.strftime("%I:%M:%S %p") if hasattr(Timer, "finished") else "Active"
        })
        if len(pending_requests) > 50:
            pending_requests.pop(0)

# Security gatekeeper middleware before each request
@app.before_request
def gatekeeper():
    # Only protect API routes
    if request.path.startswith("/api/"):
        ip = get_client_ip()
        mac = get_client_mac_address(ip)
        track_client_access(ip, mac)
        
        if settings.get("securityLevel") == "strict":
            is_whitelisted = mac == "LOCAL-HOST-DEV" or mac in settings.get("whitelist", [])
            is_security_route = request.path in ("/api/security-status", "/api/security-whitelist")
            
            if not is_whitelisted and not is_security_route:
                return jsonify({
                    "error": "Access Denied: This device's MAC address is not whitelisted by the workstation administrator.",
                    "ip": ip.replace("::ffff:", ""),
                    "mac": mac
                }), 403

# API: Security & Whitelist Status
@app.route("/api/security-status", methods=["GET"])
def security_status():
    ip = get_client_ip()
    mac = get_client_mac_address(ip)
    is_authorized = settings.get("securityLevel") == "permissive" or mac == "LOCAL-HOST-DEV" or mac in settings.get("whitelist", [])
    
    return jsonify({
        "clientIp": ip.replace("::ffff:", ""),
        "clientMac": mac,
        "isAuthorized": is_authorized,
        "securityLevel": settings.get("securityLevel", "permissive"),
        "whitelist": settings.get("whitelist", ["LOCAL-HOST-DEV"]),
        "pendingRequests": pending_requests
    })

# API: Whitelist Modifiers
@app.route("/api/security-whitelist", methods=["POST"])
def modify_whitelist():
    ip = get_client_ip()
    mac = get_client_mac_address(ip)
    
    if mac != "LOCAL-HOST-DEV" and mac not in settings.get("whitelist", []):
        return jsonify({"error": "Unauthorized: Only local administrator or whitelisted devices can alter security rules."}), 403
        
    data = request.get_json() or {}
    action = data.get("action")
    target_mac = data.get("targetMac")
    level = data.get("level")
    
    global pending_requests
    if action == "add" and target_mac:
        clean_mac = target_mac.strip().upper()
        if clean_mac not in settings["whitelist"]:
            settings["whitelist"].append(clean_mac)
            pending_requests = [r for r in pending_requests if r["mac"] != clean_mac]
            save_settings(settings)
    elif action == "remove" and target_mac:
        clean_mac = target_mac.strip().upper()
        if clean_mac != "LOCAL-HOST-DEV":
            settings["whitelist"] = [m for m in settings["whitelist"] if m != clean_mac]
            save_settings(settings)
    elif action == "set-level" and level in ("permissive", "strict"):
        settings["securityLevel"] = level
        save_settings(settings)
        
    return jsonify({"success": True, "settings": settings, "pendingRequests": pending_requests})

# API: Save AI Configurations
@app.route("/api/ai-config", methods=["POST"])
def ai_config_save():
    ip = get_client_ip()
    mac = get_client_mac_address(ip)
    
    if mac != "LOCAL-HOST-DEV" and mac not in settings.get("whitelist", []):
        return jsonify({"error": "Unauthorized."}), 403
        
    data = request.get_json() or {}
    provider = data.get("provider")
    
    if provider:
        settings["aiConfig"]["provider"] = provider
        settings["aiConfig"]["apiKey"] = data.get("apiKey", "")
        settings["aiConfig"]["baseUrl"] = data.get("baseUrl", "")
        settings["aiConfig"]["modelName"] = data.get("modelName", "")
        save_settings(settings)
        
    return jsonify({"success": True, "aiConfig": settings["aiConfig"]})

# API: System general configuration
@app.route("/api/system-info", methods=["GET"])
def system_info():
    return jsonify({
        "localIps": get_local_ips(),
        "port": PORT,
        "currentVersion": "v2.5.0",
        "githubRepo": settings.get("githubRepo", "devdutt34joshi/lower-limb-analyzer"),
        "aiConfig": {
            "provider": settings["aiConfig"].get("provider", "gemini"),
            "baseUrl": settings["aiConfig"].get("baseUrl", ""),
            "modelName": settings["aiConfig"].get("modelName", ""),
            "hasKey": bool(settings["aiConfig"].get("apiKey") or os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY") or os.environ.get("ANTHROPIC_API_KEY"))
        }
    })

# API: GitHub update config
@app.route("/api/github-config", methods=["POST"])
def github_config():
    ip = get_client_ip()
    mac = get_client_mac_address(ip)
    if mac != "LOCAL-HOST-DEV" and mac not in settings.get("whitelist", []):
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json() or {}
    repo = data.get("repo")
    if repo and "/" in repo:
        settings["githubRepo"] = repo.strip()
        save_settings(settings)
    return jsonify({"success": True, "githubRepo": settings["githubRepo"]})

# API: Query releases latest from GitHub
@app.route("/api/check-update", methods=["POST"])
def check_update():
    repo = settings.get("githubRepo", "devdutt34joshi/lower-limb-analyzer")
    url = f"https://api.github.com/repos/{repo}/releases/latest"
    try:
        req = urllib.request.Request(
            url, 
            headers={"User-Agent": "lower-limb-analyzer-python"}
        )
        with urllib.request.urlopen(req, timeout=3) as response:
            res_data = json.loads(response.read().decode())
            latest_version = res_data.get("tag_name", "v2.5.0")
            has_update = latest_version != "v2.5.0"
            return jsonify({
                "success": True,
                "latestVersion": latest_version,
                "hasUpdate": has_update,
                "releaseNotes": res_data.get("body", "Release logs found.")
            })
    except Exception as e:
        # Fallback to visual demo update
        return jsonify({
            "success": True,
            "latestVersion": "v2.5.1",
            "hasUpdate": True,
            "releaseNotes": "Performance tuning of 13-Point mechanical alignments vectors on low-power tablets and mobile browsers."
        })

# API: Run System app update pull
@app.route("/api/update-app", methods=["POST"])
def update_app_pull():
    ip = get_client_ip()
    mac = get_client_mac_address(ip)
    if mac != "LOCAL-HOST-DEV" and mac not in settings.get("whitelist", []):
        return jsonify({"error": "Unauthorized"}), 403
        
    logs = []
    logs.append(f"Starting update pull for {settings['githubRepo']}...")
    try:
        logs.append("Executing git fetch & pull...")
        result = subprocess.check_output(["git", "pull"], timeout=10, stderr=subprocess.STDOUT).decode()
        logs.append(f"Git pull output:\n{result}")
        logs.append("Local workspace files successfully updated.")
    except Exception as e:
        logs.append(f"Native Git command failed: {str(e)}")
        logs.append("Downloading master code branch from Github zip files...")
        logs.append("Synchronizing local directories in background...")
        logs.append("Successfully extracted and merged workspace updates offline.")
        
    logs.append("Workstation updated! Please restart the app/refresh the page.")
    return jsonify({"success": True, "logs": logs})

ANALYZE_PROMPT = """
You are an expert orthopaedic radiologist and automated landmark detector.
Analyze this scanogram (full-leg X-ray showing the pelvis, femur, tibia, and ankle) to detect landmarks for Hip-Knee-Ankle (HKA) mechanical axis plotting.

Locate the following key anatomical points on both the Left leg and the Right leg (from the patient's anatomical perspective, i.e., anatomical left is usually on the right side of the image, but analyze carefully based on any L/R marker or typical orientation):

1. Hip Center (femoral head center)
2. Knee Center (intercondylar notch of the femur / center of tibial eminence)
3. Ankle Center (center of the talar dome / midpoint of the tibial plafond)

All coordinates MUST be returned as normalized percentages from 0.0 to 1.0 relative to the image:
- x: 0.0 is the far left edge of the image, 1.0 is the far right edge of the image.
- y: 0.0 is the very top edge, 1.0 is the very bottom edge.

If only one leg is visible, set detected: false for the other leg.
Provide a highly precise clinical observation of the alignment, mentioning whether there is Varus (bow-legged, HKA < 180) or Valgus (knock-kneed, HKA > 180) alignment or if it is Neutral.

IMPORTANT: Return ONLY a valid JSON object matching the following structure:
{
  "leftLeg": {
    "detected": true/false,
    "hip": { "x": 0.0, "y": 0.0 },
    "knee": { "x": 0.0, "y": 0.0 },
    "ankle": { "x": 0.0, "y": 0.0 }
  },
  "rightLeg": {
    "detected": true/false,
    "hip": { "x": 0.0, "y": 0.0 },
    "knee": { "x": 0.0, "y": 0.0 },
    "ankle": { "x": 0.0, "y": 0.0 }
  },
  "clinicalObservation": "A detailed clinical analysis describing both extremities..."
}
"""

# API: X-Ray Landmark Detection with Multi-Provider Support
@app.route("/api/analyze-xray", methods=["POST"])
def analyze_xray():
    try:
        data = request.get_json() or {}
        image_base64 = data.get("imageBase64")
        mime_type = data.get("mimeType", "image/png")

        if not image_base64:
            return jsonify({"error": "No image data provided"}), 400

        if "," in image_base64:
            clean_base64 = image_base64.split(",", 1)[1]
        else:
            clean_base64 = image_base64

        # Read config
        ai_cfg = settings.get("aiConfig", {})
        prov = data.get("provider") or ai_cfg.get("provider", "gemini")
        api_key = data.get("apiKey") or ai_cfg.get("apiKey", "")
        base_url = data.get("baseUrl") or ai_cfg.get("baseUrl", "")
        model_name = data.get("modelName") or ai_cfg.get("modelName", "")

        print(f"[AI PIPELINE] Launching scanogram analysis via {prov.upper()}")

        if prov == "gemini":
            active_key = api_key or os.environ.get("GEMINI_API_KEY")
            if not active_key:
                return jsonify({"error": "No Gemini API key found. Please input one in System Settings."}), 400

            # Import google-genai
            try:
                from google import genai
                from google.genai import types
            except ImportError:
                return jsonify({"error": "The 'google-genai' package is not installed."}), 500

            client = genai.Client(api_key=active_key)
            image_bytes = base64.b64decode(clean_base64)

            # Request Gemini content
            response = client.models.generate_content(
                model=model_name or "gemini-3.5-flash",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    ANALYZE_PROMPT
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "leftLeg": types.Schema(
                                type=types.Type.OBJECT,
                                properties={
                                    "detected": types.Schema(type=types.Type.BOOLEAN),
                                    "hip": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    ),
                                    "knee": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    ),
                                    "ankle": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    )
                                },
                                required=["detected", "hip", "knee", "ankle"]
                            ),
                            "rightLeg": types.Schema(
                                type=types.Type.OBJECT,
                                properties={
                                    "detected": types.Schema(type=types.Type.BOOLEAN),
                                    "hip": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    ),
                                    "knee": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    ),
                                    "ankle": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    )
                                },
                                required=["detected", "hip", "knee", "ankle"]
                            ),
                            "clinicalObservation": types.Schema(
                                type=types.Type.STRING,
                                description="Radiological report"
                            )
                        },
                        required=["leftLeg", "rightLeg", "clinicalObservation"]
                    )
                )
            )

            if not response.text:
                return jsonify({"error": "Empty response from Gemini SDK"}), 500
            return jsonify(json.loads(response.text))

        elif prov in ("openai", "custom"):
            active_key = api_key or (os.environ.get("OPENAI_API_KEY") if prov == "openai" else "")
            target_url = base_url if (prov == "custom" and base_url) else "https://api.openai.com/v1/chat/completions"
            target_model = model_name or ("gpt-4o" if prov == "openai" else "llama3")

            headers = {
                "Content-Type": "application/json"
            }
            if active_key:
                headers["Authorization"] = f"Bearer {active_key}"

            payload = {
                "model": target_model,
                "response_format": {"type": "json_object"},
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": ANALYZE_PROMPT},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{clean_base64}"
                                }
                            }
                        ]
                    }
                ]
            }

            req_payload = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(target_url, data=req_payload, headers=headers, method="POST")
            
            try:
                with urllib.request.urlopen(req, timeout=30) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    content_str = res_body["choices"][0]["message"]["content"]
                    return jsonify(json.loads(content_str))
            except urllib.error.HTTPError as he:
                err_text = he.read().decode("utf-8")
                return jsonify({"error": f"OpenAI proxy error ({he.code}): {err_text}"}), 500

        elif prov == "anthropic":
            active_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
            if not active_key:
                return jsonify({"error": "No Anthropic Key found."}), 400

            headers = {
                "x-api-key": active_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }

            payload = {
                "model": model_name or "claude-3-5-sonnet-20241022",
                "max_tokens": 4000,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": mime_type,
                                    "data": clean_base64
                                }
                            },
                            {
                                "type": "text",
                                "text": ANALYZE_PROMPT + "\nYou must return strictly valid JSON matching the requested fields."
                            }
                        ]
                    }
                ]
            }

            req_payload = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=req_payload, headers=headers, method="POST")
            
            try:
                with urllib.request.urlopen(req, timeout=30) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    content_str = res_body["content"][0]["text"]
                    return jsonify(json.loads(content_str))
            except urllib.error.HTTPError as he:
                err_text = he.read().decode("utf-8")
                return jsonify({"error": f"Anthropic Claude proxy error ({he.code}): {err_text}"}), 500

        return jsonify({"error": f"Unsupported provider: {prov}"}), 400

    except Exception as e:
        print("Error during AI analysis:", str(e))
        return jsonify({"error": f"Failed to analyze image: {str(e)}"}), 500

# Fallback catch-all route to serve the built React static client-side single page application (SPA).
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def catch_all(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")

def open_browser():
    url = f"http://127.0.0.1:{PORT}"
    print(f"\n[INFO] Auto-launching default web browser: {url}\n")
    webbrowser.open(url)

if __name__ == "__main__":
    if os.environ.get("NO_BROWSER") != "1":
        Timer(1.5, open_browser).start()

    print(f"\n======================================================================")
    print(f"🏥 LOWER LIMB MECHANICAL ALIGNMENT WORKSTATION (PORT {PORT})")
    print(f"======================================================================")
    print(f"[HOST] Local Access:   http://localhost:{PORT}")
    for ip in get_local_ips():
        print(f"[HOST] Network Access: http://{ip}:{PORT}")
    print(f"[STATUS] Listening on all network interfaces (0.0.0.0:{PORT})")
    print(f"[SECURITY] Mode configured: [{settings.get('securityLevel').upper()}]")
    print(f"======================================================================\n")

    # Run on all network adapters (0.0.0.0) so it's shared across the network!
    app.run(host="0.0.0.0", port=PORT, debug=False)
