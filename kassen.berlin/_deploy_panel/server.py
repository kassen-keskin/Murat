import os
import io
import sys
import json
import time
import stat
import shutil
import hashlib
import datetime
import webbrowser
import threading
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, Response
import paramiko
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent
WEB_ROOT = BASE_DIR.parent  # D:\source\Code\kassen.berlin
PANEL_ROOT = WEB_ROOT.parent / "panel"  # D:\source\Code\panel
KATALOG_DIR = WEB_ROOT / "katalog"
KATALOG_IMAGE_DIR = KATALOG_DIR / "image"
CATALOG_JSON_PATH = KATALOG_DIR / "catalog_data.json"
CATALOG_JS_PATH = KATALOG_DIR / "catalog_data.js"

CONFIG_PATH = BASE_DIR / "config.json"
OPT_CACHE_PATH = BASE_DIR / ".image_opt_cache.json"
DEPLOY_STATE_PATH = BASE_DIR / ".deploy_state.json"
BACKUP_LOCAL_DIR = BASE_DIR / "backups" / "local"
BACKUP_LIVE_DIR = BASE_DIR / "backups" / "live"

BACKUP_LOCAL_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_LIVE_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)

# Sadece canlı sunucuya gönderilebilecek güvenli web dosyaları (beyaz liste)
TRACKED_WEB_FILES = [
    "index.html",
    "style.css",
    "script.js",
    "catalog_auth_config.js",
    "og_image.jpg",
    "assets/k.bmp",
    "assets/logo.png",
    "katalog/index.html",
    "katalog/tailwind.css",
    "katalog/catalog_auth_config.js",
    "katalog/logo.jpg",
    "katalog/og_image.jpg",
    "katalog/whatsapp.bmp",
    "katalog/vue.global.prod.js",
    "katalog/catalog_data.json",
    "katalog/catalog_data.js",
]


def load_json(path, default=None):
    if default is None:
        default = {}
    try:
        if Path(path).exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"JSON okuma hatası ({path}): {e}")
    return default


def save_json(path, data):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def get_config():
    return load_json(CONFIG_PATH, {})


def generate_catalog_js(catalog_data):
    """catalog_data.json verisinden catalog_data.js üretir."""
    js_content = "window.KATALOG_DATA = " + json.dumps(catalog_data, ensure_ascii=False, indent=4) + ";"
    with open(CATALOG_JS_PATH, "w", encoding="utf-8") as f:
        f.write(js_content)


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def compare_catalogs(old_cat, new_cat):
    """İki catalog_data.json nesnesini karşılaştırır ve detaylı ürün farklarını döndürür."""
    old_products = {str(p.get("id")): p for p in (old_cat or {}).get("products", []) if p.get("id") is not None}
    new_products = {str(p.get("id")): p for p in (new_cat or {}).get("products", []) if p.get("id") is not None}

    added = []
    removed = []
    modified = []

    for pid, np in new_products.items():
        if pid not in old_products:
            added.append({
                "id": np.get("id"),
                "brand": np.get("brand", ""),
                "model": np.get("model", ""),
                "priceSatis": np.get("priceSatis", ""),
                "priceAylik": np.get("priceAylik", ""),
                "images": np.get("images", []),
            })
        else:
            op = old_products[pid]
            changes = []
            fields_to_check = [
                ("brand", "Marka"),
                ("model", "Model"),
                ("priceSatis", "Satış Fiyatı"),
                ("priceSatisAylik", "Satış Aylık"),
                ("priceSatisDetay", "Satış Detay"),
                ("price", "Kira Fiyatı"),
                ("priceAylik", "Kira Aylık"),
                ("priceHibrit", "Hibrit Fiyat"),
                ("offerNoSatis", "Satış Teklif No"),
                ("offerNo", "Kira Teklif No"),
                ("images", "Görseller"),
                ("industries", "Sektörler"),
            ]
            for key, label in fields_to_check:
                if op.get(key) != np.get(key):
                    changes.append({
                        "field": label,
                        "old": op.get(key),
                        "new": np.get(key),
                    })
            if op.get("translations") != np.get("translations"):
                changes.append({
                    "field": "Dil Çevirileri / Özellikler / Slogan",
                    "old": "Eski metin",
                    "new": "Güncellendi",
                })
            if changes:
                modified.append({
                    "id": np.get("id"),
                    "brand": np.get("brand", ""),
                    "model": np.get("model", ""),
                    "changes": changes,
                })

    for pid, op in old_products.items():
        if pid not in new_products:
            removed.append({
                "id": op.get("id"),
                "brand": op.get("brand", ""),
                "model": op.get("model", ""),
            })

    return {
        "added": added,
        "modified": modified,
        "removed": removed,
        "old_count": len(old_products),
        "new_count": len(new_products),
        "old_modified": (old_cat or {}).get("lastModified", "-"),
        "new_modified": (new_cat or {}).get("lastModified", "-"),
    }


def validate_local_catalog():
    """Lokaldeki catalog_data.json, catalog_data.js ve görsellerin bütünlüğünü doğrular."""
    if not CATALOG_JSON_PATH.exists():
        return {"valid": False, "error": "catalog_data.json bulunamadı!"}

    catalog = load_json(CATALOG_JSON_PATH, {})
    products = catalog.get("products", [])

    # catalog_data.js senkron kontrolü
    js_synced = False
    if CATALOG_JS_PATH.exists():
        expected_prefix = "window.KATALOG_DATA = "
        try:
            js_text = CATALOG_JS_PATH.read_text(encoding="utf-8").strip()
            if js_text.startswith(expected_prefix) and js_text.endswith(";"):
                js_json = json.loads(js_text[len(expected_prefix):-1])
                js_synced = (js_json.get("version") == catalog.get("version") and len(js_json.get("products", [])) == len(products))
        except Exception:
            js_synced = False

    missing_images = []
    referenced_images = set()
    products_without_images = []

    for p in products:
        imgs = p.get("images") or []
        if not imgs:
            products_without_images.append({
                "id": p.get("id"),
                "brand": p.get("brand", ""),
                "model": p.get("model", ""),
            })
        for img_rel in imgs:
            norm_rel = img_rel.replace("\\", "/").lstrip("/")
            referenced_images.add(norm_rel)
            img_path = KATALOG_DIR / norm_rel
            if not img_path.exists() or img_path.stat().st_size == 0:
                missing_images.append({
                    "product_id": p.get("id"),
                    "brand": p.get("brand", ""),
                    "model": p.get("model", ""),
                    "image": norm_rel,
                })

    # Klasördeki tüm görselleri tara
    all_images = []
    large_images = []
    unused_images = []
    total_size_bytes = 0
    cfg = get_config().get("image_optimization", {})
    threshold_kb = cfg.get("png_quantize_threshold_kb", 250)

    if KATALOG_IMAGE_DIR.exists():
        for root, _, files in os.walk(KATALOG_IMAGE_DIR):
            for fname in files:
                fpath = Path(root) / fname
                rel = fpath.relative_to(KATALOG_DIR).as_posix()
                size_b = fpath.stat().st_size
                total_size_bytes += size_b
                size_kb = round(size_b / 1024, 1)
                is_used = rel in referenced_images
                item = {
                    "path": rel,
                    "size_kb": size_kb,
                    "used": is_used,
                }
                all_images.append(item)
                if not is_used:
                    unused_images.append(item)
                if size_kb > threshold_kb and fpath.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
                    large_images.append(item)

    large_images.sort(key=lambda x: x["size_kb"], reverse=True)

    return {
        "valid": len(missing_images) == 0 and js_synced,
        "js_synced": js_synced,
        "product_count": len(products),
        "last_modified": catalog.get("lastModified", "-"),
        "version": catalog.get("version", "-"),
        "missing_images": missing_images,
        "products_without_images": products_without_images,
        "total_images_count": len(all_images),
        "referenced_images_count": len(referenced_images),
        "unused_images_count": len(unused_images),
        "total_images_mb": round(total_size_bytes / (1024 * 1024), 2),
        "large_images": large_images,
    }


def connect_sftp(server_cfg):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=server_cfg["host"],
        port=int(server_cfg.get("port", 22)),
        username=server_cfg["username"],
        password=server_cfg["password"],
        timeout=15,
    )
    return ssh, ssh.open_sftp()


def sftp_walk_files(sftp, remote_dir, base_remote_dir=None):
    """Uzak SFTP dizinindeki tüm dosyaları {rel_path: SFTPAttributes} olarak döndürür."""
    if base_remote_dir is None:
        base_remote_dir = remote_dir
    result = {}
    try:
        for attr in sftp.listdir_attr(remote_dir):
            full_path = f"{remote_dir.rstrip('/')}/{attr.filename}"
            if stat.S_ISDIR(attr.st_mode):
                result.update(sftp_walk_files(sftp, full_path, base_remote_dir))
            else:
                rel = full_path[len(base_remote_dir.rstrip("/")) + 1:]
                result[rel] = {
                    "size": attr.st_size,
                    "mtime": attr.st_mtime,
                    "remote_path": full_path,
                }
    except Exception as e:
        print(f"SFTP dizin okuma uyarısı ({remote_dir}): {e}")
    return result


def sftp_mkdir_p(sftp, remote_directory):
    """Uzak SFTP sunucusunda iç içe klasörleri oluşturur."""
    if remote_directory in ("", "/"):
        return
    dirs = []
    cur = remote_directory.rstrip("/")
    while cur and cur != "/":
        dirs.append(cur)
        cur = os.path.dirname(cur).replace("\\", "/")
    for d in reversed(dirs):
        try:
            sftp.stat(d)
        except IOError:
            try:
                sftp.mkdir(d)
            except Exception:
                pass


def optimize_single_image(img_path, max_dim=1600, jpeg_q=85, webp_q=85, png_thresh_kb=250):
    """Tek bir görseli görüntü kalitesini bozmadan sıkıştırır. Küçülürse üzerine yazar."""
    fpath = Path(img_path)
    if not fpath.exists():
        return None
    ext = fpath.suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp"):
        return None

    orig_size = fpath.stat().st_size
    if orig_size < 40 * 1024:  # 40 KB altı zaten çok küçük
        return None

    try:
        with Image.open(fpath) as img:
            w, h = img.size
            resized = False
            if w > max_dim or h > max_dim:
                ratio = min(max_dim / float(w), max_dim / float(h))
                new_size = (max(1, int(w * ratio)), max(1, int(h * ratio)))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                resized = True

            buf = io.BytesIO()
            if ext in (".jpg", ".jpeg"):
                if img.mode in ("RGBA", "P"):
                    bg = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == "P":
                        img = img.convert("RGBA")
                    bg.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
                    img = bg
                elif img.mode != "RGB":
                    img = img.convert("RGB")
                img.save(buf, format="JPEG", quality=jpeg_q, optimize=True, progressive=True)

            elif ext == ".webp":
                img.save(buf, format="WEBP", quality=webp_q, method=6)

            elif ext == ".png":
                if orig_size > png_thresh_kb * 1024 or resized:
                    # TinyPNG tarzı yüksek kaliteli 256 renk nicemleme (saydamlık korunur)
                    if img.mode not in ("RGBA", "RGB"):
                        img = img.convert("RGBA")
                    quantized = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
                    quantized.save(buf, format="PNG", optimize=True)
                else:
                    img.save(buf, format="PNG", optimize=True)

            new_bytes = buf.getvalue()
            new_size = len(new_bytes)

            # En az %8 kazanç varsa kaydet
            if new_size < orig_size * 0.92:
                with open(fpath, "wb") as out_f:
                    out_f.write(new_bytes)
                return {
                    "old_kb": round(orig_size / 1024, 1),
                    "new_kb": round(new_size / 1024, 1),
                    "saved_kb": round((orig_size - new_size) / 1024, 1),
                    "percent": round((1 - new_size / orig_size) * 100, 1),
                }
    except Exception as e:
        print(f"Görsel optimizasyon hatası ({fpath}): {e}")
    return None


# ==================== ROUTES ====================

@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/site/")
@app.route("/site/<path:subpath>")
def preview_site(subpath="index.html"):
    """Lokal web sitesini önbelleksiz (no-cache) olarak test etmeyi sağlar."""
    full_target = WEB_ROOT / subpath
    if full_target.is_dir():
        subpath = subpath.rstrip("/") + "/index.html"
    resp = send_from_directory(WEB_ROOT, subpath)
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return resp


@app.route("/api/status", methods=["GET"])
def api_status():
    validation = validate_local_catalog()
    cfg = get_config()
    return jsonify({
        "ok": True,
        "validation": validation,
        "config": {
            "local_host": cfg.get("local_server", {}).get("host", ""),
            "live_host": cfg.get("live_server", {}).get("host", ""),
            "live_root": cfg.get("live_server", {}).get("remote_web_root", ""),
            "image_optimization": cfg.get("image_optimization", {}),
        },
    })


@app.route("/api/sync-js", methods=["POST"])
def api_sync_js():
    """Lokal catalog_data.json'dan catalog_data.js dosyasını yeniden üretir."""
    catalog = load_json(CATALOG_JSON_PATH, {})
    generate_catalog_js(catalog)
    return jsonify({"ok": True, "validation": validate_local_catalog()})


@app.route("/api/check-local-server", methods=["POST"])
def api_check_local_server():
    """İç ağ sunucusuna (192.168.178.170) bağlanıp ürün ve görsel farklarını analiz eder."""
    cfg = get_config().get("local_server", {})
    try:
        ssh, sftp = connect_sftp(cfg)
    except Exception as e:
        return jsonify({"ok": False, "error": f"İç ağ sunucusuna ({cfg.get('host')}) bağlanılamadı: {e}"}), 500

    try:
        # 1. Uzak catalog_data.json oku
        with sftp.open(cfg["remote_catalog_json"], "r") as rf:
            remote_catalog = json.loads(rf.read().decode("utf-8"))

        local_catalog = load_json(CATALOG_JSON_PATH, {})
        diff = compare_catalogs(local_catalog, remote_catalog)

        # 2. Uzak image klasörünü tara
        remote_images = sftp_walk_files(sftp, cfg["remote_image_dir"])
        opt_cache = load_json(OPT_CACHE_PATH, {})

        new_images = []
        updated_images = []
        missing_on_remote = []

        # Uzak catalog_data.json içindeki tüm görseller uzak sunucuda var mı?
        for p in remote_catalog.get("products", []):
            for img_rel in (p.get("images") or []):
                norm_rel = img_rel.replace("\\", "/").lstrip("/")
                rel_in_image = norm_rel[len("image/"):] if norm_rel.startswith("image/") else norm_rel
                if rel_in_image not in remote_images and not (KATALOG_DIR / norm_rel).exists():
                    missing_on_remote.append({
                        "product_id": p.get("id"),
                        "brand": p.get("brand", ""),
                        "model": p.get("model", ""),
                        "image": norm_rel,
                    })

        for rel_in_img, rinfo in remote_images.items():
            local_img_path = KATALOG_IMAGE_DIR / rel_in_img
            cache_entry = opt_cache.get(f"image/{rel_in_img}", {})
            if not local_img_path.exists():
                new_images.append({
                    "path": f"image/{rel_in_img}",
                    "size_kb": round(rinfo["size"] / 1024, 1),
                })
            else:
                local_size = local_img_path.stat().st_size
                # Eğer daha önce optimize ettiysek ve uzak sunucudaki orijinal boyut değişmediyse tekrar indirme
                if local_size != rinfo["size"]:
                    if cache_entry.get("remote_size") == rinfo["size"] and cache_entry.get("local_size") == local_size:
                        continue
                    updated_images.append({
                        "path": f"image/{rel_in_img}",
                        "remote_kb": round(rinfo["size"] / 1024, 1),
                        "local_kb": round(local_size / 1024, 1),
                    })

        sftp.close()
        ssh.close()

        return jsonify({
            "ok": True,
            "diff": diff,
            "new_images": new_images,
            "updated_images": updated_images,
            "missing_on_remote": missing_on_remote,
            "remote_total_images": len(remote_images),
        })
    except Exception as e:
        try:
            sftp.close()
            ssh.close()
        except Exception:
            pass
        return jsonify({"ok": False, "error": f"İç ağ kontrolü sırasında hata: {e}"}), 500


@app.route("/api/pull-local-server", methods=["POST"])
def api_pull_local_server():
    """İç ağ sunucusundaki (192.168.178.170) katalog verisini ve görselleri lokale çeker, eşitler ve optimize eder."""
    body = request.get_json(silent=True) or {}
    auto_optimize = body.get("auto_optimize", True)

    cfg_all = get_config()
    cfg = cfg_all.get("local_server", {})
    opt_cfg = cfg_all.get("image_optimization", {})

    try:
        ssh, sftp = connect_sftp(cfg)
    except Exception as e:
        return jsonify({"ok": False, "error": f"İç ağ sunucusuna bağlanılamadı: {e}"}), 500

    try:
        # 1. Mevcut lokal catalog_data.json yedeğini al
        if CATALOG_JSON_PATH.exists():
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            shutil.copy2(CATALOG_JSON_PATH, BACKUP_LOCAL_DIR / f"catalog_local_{ts}.json")

        # 2. Uzak catalog_data.json indir
        with sftp.open(cfg["remote_catalog_json"], "r") as rf:
            remote_catalog = json.loads(rf.read().decode("utf-8"))

        # 3. Uzak görselleri kontrol et ve yeni/değişenleri indir
        remote_images = sftp_walk_files(sftp, cfg["remote_image_dir"])
        opt_cache = load_json(OPT_CACHE_PATH, {})

        downloaded_images = []
        optimized_results = []

        for rel_in_img, rinfo in remote_images.items():
            local_img_path = KATALOG_IMAGE_DIR / rel_in_img
            cache_entry = opt_cache.get(f"image/{rel_in_img}", {})
            need_download = False

            if not local_img_path.exists():
                need_download = True
            else:
                local_size = local_img_path.stat().st_size
                if local_size != rinfo["size"]:
                    if not (cache_entry.get("remote_size") == rinfo["size"] and cache_entry.get("local_size") == local_size):
                        need_download = True

            if need_download:
                local_img_path.parent.mkdir(parents=True, exist_ok=True)
                sftp.get(rinfo["remote_path"], str(local_img_path))
                downloaded_images.append(f"image/{rel_in_img}")

                # Panel klasörü varsa oraya da kopyala (orijinal haliyle)
                if PANEL_ROOT.exists():
                    panel_img_path = PANEL_ROOT / "public" / "katalog" / "image" / rel_in_img
                    panel_img_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(local_img_path, panel_img_path)

                if auto_optimize:
                    res = optimize_single_image(
                        local_img_path,
                        max_dim=opt_cfg.get("max_dimension", 1600),
                        jpeg_q=opt_cfg.get("jpeg_quality", 85),
                        webp_q=opt_cfg.get("webp_quality", 85),
                        png_thresh_kb=opt_cfg.get("png_quantize_threshold_kb", 250),
                    )
                    if res:
                        res["path"] = f"image/{rel_in_img}"
                        optimized_results.append(res)

                opt_cache[f"image/{rel_in_img}"] = {
                    "remote_size": rinfo["size"],
                    "remote_mtime": rinfo["mtime"],
                    "local_size": local_img_path.stat().st_size,
                }

        save_json(OPT_CACHE_PATH, opt_cache)

        # 4. catalog_data.json ve catalog_data.js dosyalarını kaydet
        save_json(CATALOG_JSON_PATH, remote_catalog)
        generate_catalog_js(remote_catalog)

        if PANEL_ROOT.exists():
            save_json(PANEL_ROOT / "catalog_data.json", remote_catalog)

        sftp.close()
        ssh.close()

        validation = validate_local_catalog()
        return jsonify({
            "ok": True,
            "downloaded_count": len(downloaded_images),
            "downloaded_images": downloaded_images,
            "optimized_results": optimized_results,
            "validation": validation,
        })
    except Exception as e:
        try:
            sftp.close()
            ssh.close()
        except Exception:
            pass
        return jsonify({"ok": False, "error": f"İç ağdan çekme hatası: {e}"}), 500


@app.route("/api/optimize-images", methods=["POST"])
def api_optimize_images():
    """Lokaldeki büyük boyutlu katalog görsellerini görüntü kalitesini bozmadan küçültür."""
    body = request.get_json(silent=True) or {}
    only_used = body.get("only_used", False)

    cfg = get_config().get("image_optimization", {})
    max_dim = int(body.get("max_dimension", cfg.get("max_dimension", 1600)))
    jpeg_q = int(body.get("jpeg_quality", cfg.get("jpeg_quality", 85)))
    webp_q = int(body.get("webp_quality", cfg.get("webp_quality", 85)))
    png_thresh = int(body.get("png_quantize_threshold_kb", cfg.get("png_quantize_threshold_kb", 250)))

    catalog = load_json(CATALOG_JSON_PATH, {})
    referenced = set()
    for p in catalog.get("products", []):
        for img in (p.get("images") or []):
            referenced.add(img.replace("\\", "/").lstrip("/"))

    opt_cache = load_json(OPT_CACHE_PATH, {})
    results = []
    total_saved_kb = 0.0

    if KATALOG_IMAGE_DIR.exists():
        for root, _, files in os.walk(KATALOG_IMAGE_DIR):
            for fname in files:
                fpath = Path(root) / fname
                rel = fpath.relative_to(KATALOG_DIR).as_posix()
                if only_used and rel not in referenced:
                    continue
                before_size = fpath.stat().st_size
                res = optimize_single_image(
                    fpath,
                    max_dim=max_dim,
                    jpeg_q=jpeg_q,
                    webp_q=webp_q,
                    png_thresh_kb=png_thresh,
                )
                if res:
                    res["path"] = rel
                    results.append(res)
                    total_saved_kb += res["saved_kb"]
                    entry = opt_cache.get(rel, {})
                    if "remote_size" not in entry:
                        entry["remote_size"] = before_size
                    entry["local_size"] = fpath.stat().st_size
                    opt_cache[rel] = entry

    save_json(OPT_CACHE_PATH, opt_cache)
    results.sort(key=lambda x: x["saved_kb"], reverse=True)

    return jsonify({
        "ok": True,
        "optimized_count": len(results),
        "total_saved_mb": round(total_saved_kb / 1024, 2),
        "results": results,
        "validation": validate_local_catalog(),
    })


@app.route("/api/check-live-server", methods=["POST"])
def api_check_live_server():
    """Canlı Strato sunucusuna bağlanıp lokal ile canlı arasındaki ürün, dosya ve görsel farklarını çıkarır."""
    cfg = get_config().get("live_server", {})
    web_root = cfg.get("remote_web_root", "/STRATO-apps/kassen.berlin").rstrip("/")

    try:
        ssh, sftp = connect_sftp(cfg)
    except Exception as e:
        return jsonify({"ok": False, "error": f"Canlı sunucuya ({cfg.get('host')}) bağlanılamadı: {e}"}), 500

    try:
        # 1. Canlıdaki catalog_data.json oku
        live_catalog = {}
        try:
            with sftp.open(f"{web_root}/katalog/catalog_data.json", "r") as rf:
                live_catalog = json.loads(rf.read().decode("utf-8"))
        except Exception:
            live_catalog = {}

        local_catalog = load_json(CATALOG_JSON_PATH, {})
        catalog_diff = compare_catalogs(live_catalog, local_catalog)

        # 2. Web çekirdek dosyalarını kontrol et
        deploy_state = load_json(DEPLOY_STATE_PATH, {})
        changed_web_files = []

        for rel_path in TRACKED_WEB_FILES:
            local_f = WEB_ROOT / rel_path
            if not local_f.exists():
                continue
            local_size = local_f.stat().st_size
            local_hash = file_sha256(local_f)
            remote_f = f"{web_root}/{rel_path}"

            status = None
            remote_size = 0
            try:
                rattr = sftp.stat(remote_f)
                remote_size = rattr.st_size
                if remote_size != local_size:
                    status = "boyut_farkli"
                elif deploy_state.get(rel_path, {}).get("sha256") != local_hash:
                    # Aynı boyutta olsa bile içerik değişmiş olabilir (örn. favicon linki)
                    with sftp.open(remote_f, "rb") as rf:
                        r_hash = hashlib.sha256(rf.read()).hexdigest()
                    if r_hash != local_hash:
                        status = "icerik_degisti"
                    else:
                        deploy_state[rel_path] = {"sha256": local_hash, "size": local_size}
            except IOError:
                status = "canlida_yok"

            if status:
                changed_web_files.append({
                    "path": rel_path,
                    "status": status,
                    "local_kb": round(local_size / 1024, 1),
                    "remote_kb": round(remote_size / 1024, 1),
                })

        save_json(DEPLOY_STATE_PATH, deploy_state)

        # 3. Görsel klasörünü karşılaştır
        remote_images = sftp_walk_files(sftp, f"{web_root}/katalog/image")

        referenced_images = set()
        for p in local_catalog.get("products", []):
            for img in (p.get("images") or []):
                referenced_images.add(img.replace("\\", "/").lstrip("/"))

        missing_live_images = []
        changed_live_images = []

        if KATALOG_IMAGE_DIR.exists():
            for root, _, files in os.walk(KATALOG_IMAGE_DIR):
                for fname in files:
                    fpath = Path(root) / fname
                    rel_from_img = fpath.relative_to(KATALOG_IMAGE_DIR).as_posix()
                    rel_from_katalog = f"image/{rel_from_img}"
                    local_size = fpath.stat().st_size
                    is_used = rel_from_katalog in referenced_images

                    if rel_from_img not in remote_images:
                        missing_live_images.append({
                            "path": f"katalog/{rel_from_katalog}",
                            "size_kb": round(local_size / 1024, 1),
                            "used_in_catalog": is_used,
                        })
                    else:
                        r_size = remote_images[rel_from_img]["size"]
                        if r_size != local_size:
                            changed_live_images.append({
                                "path": f"katalog/{rel_from_katalog}",
                                "local_kb": round(local_size / 1024, 1),
                                "remote_kb": round(r_size / 1024, 1),
                                "used_in_catalog": is_used,
                            })

        sftp.close()
        ssh.close()

        return jsonify({
            "ok": True,
            "catalog_diff": catalog_diff,
            "changed_web_files": changed_web_files,
            "missing_live_images": missing_live_images,
            "changed_live_images": changed_live_images,
        })
    except Exception as e:
        try:
            sftp.close()
            ssh.close()
        except Exception:
            pass
        return jsonify({"ok": False, "error": f"Canlı sunucu kontrolü hatası: {e}"}), 500


@app.route("/api/deploy-live", methods=["POST"])
def api_deploy_live():
    """Doğrulamadan geçen tüm katalog verisini, görselleri ve seçilen web dosyalarını canlı Strato SFTP'ye yükler."""
    body = request.get_json(silent=True) or {}
    include_web_files = body.get("include_web_files", True)
    include_optimized_images = body.get("include_optimized_images", True)

    # 1. Önce lokal doğrulama!
    catalog = load_json(CATALOG_JSON_PATH, {})
    generate_catalog_js(catalog)
    val = validate_local_catalog()
    if val["missing_images"]:
        return jsonify({
            "ok": False,
            "error": f"Lokalde {len(val['missing_images'])} adet eksik ürün görseli var! Hatalı görünmemesi için yayın durduruldu.",
            "validation": val,
        }), 400

    cfg = get_config().get("live_server", {})
    web_root = cfg.get("remote_web_root", "/STRATO-apps/kassen.berlin").rstrip("/")

    try:
        ssh, sftp = connect_sftp(cfg)
    except Exception as e:
        return jsonify({"ok": False, "error": f"Canlı sunucuya bağlanılamadı: {e}"}), 500

    try:
        # 2. Canlıdaki mevcut catalog_data.json dosyasını yedekle
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = BACKUP_LIVE_DIR / f"catalog_live_{ts}.json"
        try:
            sftp.get(f"{web_root}/katalog/catalog_data.json", str(backup_path))
        except Exception:
            pass

        uploaded_files = []
        remote_images = sftp_walk_files(sftp, f"{web_root}/katalog/image")

        # 3. Önce yeni veya değişmiş görselleri yükle (JSON güncellenmeden önce resimler hazır olsun)
        if KATALOG_IMAGE_DIR.exists():
            for root, _, files in os.walk(KATALOG_IMAGE_DIR):
                for fname in files:
                    fpath = Path(root) / fname
                    rel_from_img = fpath.relative_to(KATALOG_IMAGE_DIR).as_posix()
                    local_size = fpath.stat().st_size

                    need_upload = False
                    if rel_from_img not in remote_images:
                        need_upload = True
                    elif include_optimized_images and remote_images[rel_from_img]["size"] != local_size:
                        need_upload = True

                    if need_upload:
                        remote_target = f"{web_root}/katalog/image/{rel_from_img}"
                        sftp_mkdir_p(sftp, os.path.dirname(remote_target).replace("\\", "/"))
                        sftp.put(str(fpath), remote_target)
                        uploaded_files.append(f"katalog/image/{rel_from_img}")

        # 4. Web dosyalarını ve catalog_data.json + catalog_data.js ikilisini yükle
        deploy_state = load_json(DEPLOY_STATE_PATH, {})
        files_to_check = TRACKED_WEB_FILES if include_web_files else ["katalog/catalog_data.json", "katalog/catalog_data.js"]

        for rel_path in files_to_check:
            local_f = WEB_ROOT / rel_path
            if not local_f.exists():
                continue
            local_size = local_f.stat().st_size
            local_hash = file_sha256(local_f)
            remote_f = f"{web_root}/{rel_path}"

            need_upload = False
            if rel_path in ("katalog/catalog_data.json", "katalog/catalog_data.js"):
                need_upload = True
            else:
                try:
                    rattr = sftp.stat(remote_f)
                    if rattr.st_size != local_size or deploy_state.get(rel_path, {}).get("sha256") != local_hash:
                        need_upload = True
                except IOError:
                    need_upload = True

            if need_upload:
                sftp_mkdir_p(sftp, os.path.dirname(remote_f).replace("\\", "/"))
                sftp.put(str(local_f), remote_f)
                uploaded_files.append(rel_path)
                deploy_state[rel_path] = {"sha256": local_hash, "size": local_size}

        save_json(DEPLOY_STATE_PATH, deploy_state)

        sftp.close()
        ssh.close()

        return jsonify({
            "ok": True,
            "uploaded_count": len(uploaded_files),
            "uploaded_files": uploaded_files,
            "backup_file": backup_path.name if backup_path.exists() else None,
        })
    except Exception as e:
        try:
            sftp.close()
            ssh.close()
        except Exception:
            pass
        return jsonify({"ok": False, "error": f"Canlıya yükleme hatası: {e}"}), 500


@app.route("/api/backups", methods=["GET"])
def api_backups():
    live_backups = []
    for f in sorted(BACKUP_LIVE_DIR.glob("*.json"), reverse=True)[:15]:
        cat = load_json(f, {})
        live_backups.append({
            "filename": f.name,
            "type": "live",
            "date": datetime.datetime.fromtimestamp(f.stat().st_mtime).strftime("%d.%m.%Y %H:%M:%S"),
            "product_count": len(cat.get("products", [])),
        })
    local_backups = []
    for f in sorted(BACKUP_LOCAL_DIR.glob("*.json"), reverse=True)[:15]:
        cat = load_json(f, {})
        local_backups.append({
            "filename": f.name,
            "type": "local",
            "date": datetime.datetime.fromtimestamp(f.stat().st_mtime).strftime("%d.%m.%Y %H:%M:%S"),
            "product_count": len(cat.get("products", [])),
        })
    return jsonify({"ok": True, "live_backups": live_backups, "local_backups": local_backups})


@app.route("/api/rollback", methods=["POST"])
def api_rollback():
    body = request.get_json(silent=True) or {}
    filename = body.get("filename", "")
    btype = body.get("type", "live")
    folder = BACKUP_LIVE_DIR if btype == "live" else BACKUP_LOCAL_DIR
    target = folder / os.path.basename(filename)
    if not target.exists():
        return jsonify({"ok": False, "error": "Yedek dosyası bulunamadı!"}), 404

    cat = load_json(target, {})
    save_json(CATALOG_JSON_PATH, cat)
    generate_catalog_js(cat)
    return jsonify({
        "ok": True,
        "message": f"{filename} yedeği lokale başarıyla geri yüklendi. İsterseniz şimdi Canlıya Gönder butonuyla canlıya da uygulayabilirsiniz.",
        "validation": validate_local_catalog(),
    })


if __name__ == "__main__":
    port = 5055
    print("=" * 62)
    print("  KASSEN.BERLIN - KATALOG & WEB YAYIN MERKEZİ")
    print(f"  Arayüz Adresi : http://127.0.0.1:{port}")
    print(f"  Lokal Önizleme: http://127.0.0.1:{port}/site/katalog/index.html")
    print("=" * 62)
    if "--no-browser" not in sys.argv:
        threading.Timer(1.0, lambda: webbrowser.open(f"http://127.0.0.1:{port}")).start()
    app.run(host="127.0.0.1", port=port, debug=False)
