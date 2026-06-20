import json
import math
import os
import urllib.request
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# ══════════════════════════════════════════════
#  LOGIKA ASLI (tidak diubah)
# ══════════════════════════════════════════════

def pertambahan(a, b):  return a + b
def pengurangan(a, b):  return a - b
def perkalian(a, b):    return a * b
def pembagian(a, b):
    if b == 0: raise ValueError("Pembagian dengan nol tidak diperbolehkan.")
    return a / b

def konversi_panjang(nilai, dari, ke):
    satuan = {"km":0,"hm":1,"dam":2,"m":3,"dm":4,"cm":5,"mm":6}
    if dari not in satuan or ke not in satuan:
        raise ValueError("Satuan tidak valid.")
    return nilai * (10 ** (satuan[ke] - satuan[dari]))

def konversi_suhu(nilai, dari):
    hasil = {}
    dari = dari.lower()
    if dari == "celcius":
        hasil["reamur"]     = (4/5) * nilai
        hasil["fahrenheit"] = ((9/5) * nilai) + 32
        hasil["kelvin"]     = nilai + 273
    elif dari == "reamur":
        hasil["celcius"]    = (5/4) * nilai
        hasil["fahrenheit"] = ((9/4) * nilai) + 32
        hasil["kelvin"]     = ((5/4) * nilai) + 273
    elif dari == "fahrenheit":
        c = (5/9) * (nilai - 32)
        hasil["celcius"]    = c
        hasil["reamur"]     = (4/9) * (nilai - 32)
        hasil["kelvin"]     = c + 273
    elif dari == "kelvin":
        c = nilai - 273
        hasil["celcius"]    = c
        hasil["reamur"]     = (4/5) * (nilai - 275)
        hasil["fahrenheit"] = (9/5) * c + 32
    else:
        raise ValueError("Satuan suhu tidak valid.")
    return hasil

def konversi_berat(berat, asal, tujuan):
    faktor = {"kg":1,"g":0.001,"ons":0.1,"lb":0.453592}
    asal = asal.lower(); tujuan = tujuan.lower()
    if asal not in faktor or tujuan not in faktor:
        raise ValueError("Satuan berat tidak valid.")
    return (berat * faktor[asal]) / faktor[tujuan]

# ══════════════════════════════════════════════
#  FITUR BARU
# ══════════════════════════════════════════════

# ── Mata Uang (Frankfurter API - ECB) ─────────
# --- Mata Uang (Frankfurter API - ECB) --------
def konversi_mata_uang(jumlah, dari, ke):
    url = f"https://api.frankfurter.app/latest?amount={jumlah}&from={dari}&to={ke}"
    
    # Bikin request khusus buat nambahin 'User-Agent' biar gak dikira bot
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    
    # Pake 'req' (yang udah dipakein header), bukan 'url' mentahan lagi
    with urllib.request.urlopen(req, timeout=5) as r:
        data = json.loads(r.read())
        return data["rates"][ke], data["date"]

# ── Tekanan ───────────────────────────────────
def konversi_tekanan(nilai, dari, ke):
    # Sumber: NIST / SI units
    to_pascal = {
        "pa": 1, "kpa": 1e3, "mpa": 1e6,
        "bar": 1e5, "atm": 101325,
        "psi": 6894.757, "mmhg": 133.322,
        "torr": 133.322
    }
    if dari not in to_pascal or ke not in to_pascal:
        raise ValueError("Satuan tekanan tidak valid.")
    pascal = nilai * to_pascal[dari]
    return pascal / to_pascal[ke]

# ── Diskon ────────────────────────────────────
def hitung_diskon(harga_asli, persen_diskon):
    if not (0 <= persen_diskon <= 100):
        raise ValueError("Diskon harus antara 0–100%.")
    nilai_diskon = harga_asli * (persen_diskon / 100)
    harga_akhir  = harga_asli - nilai_diskon
    return {"nilai_diskon": nilai_diskon, "harga_akhir": harga_akhir, "hemat": nilai_diskon}

# ── Bunga (Bunga Majemuk - compound interest) ─
# Rumus: A = P(1 + r/n)^(nt)  | Sumber: Investopedia
def hitung_bunga(pokok, bunga_persen, tahun, frekuensi=12):
    r = bunga_persen / 100
    n = frekuensi
    t = tahun
    A = pokok * ((1 + r/n) ** (n*t))
    total_bunga = A - pokok
    return {"total": A, "bunga": total_bunga, "pokok": pokok}

# ── Target Nabung ─────────────────────────────
def hitung_nabung(target, bulan):
    if bulan <= 0: raise ValueError("Bulan harus lebih dari 0.")
    per_bulan = target / bulan
    per_minggu = target / (bulan * 4)
    per_hari   = target / (bulan * 30)
    return {"per_bulan": per_bulan, "per_minggu": per_minggu, "per_hari": per_hari}

# ── BMI ───────────────────────────────────────
# Sumber: WHO Body Mass Index Classification
def hitung_bmi(berat_kg, tinggi_cm):
    tinggi_m = tinggi_cm / 100
    bmi = berat_kg / (tinggi_m ** 2)
    if bmi < 18.5:   kategori = "Kurus (Underweight)"
    elif bmi < 25.0: kategori = "Normal"
    elif bmi < 30.0: kategori = "Gemuk (Overweight)"
    else:            kategori = "Obesitas"
    bmi_ideal_min = 18.5 * (tinggi_m ** 2)
    bmi_ideal_max = 24.9 * (tinggi_m ** 2)
    return {"bmi": round(bmi, 2), "kategori": kategori,
            "bb_ideal_min": round(bmi_ideal_min, 1),
            "bb_ideal_max": round(bmi_ideal_max, 1)}

# ── Kalori Harian (BMR) ───────────────────────
# Sumber: Mifflin-St Jeor Equation (Journal of the American Dietetic Association, 1990)
def hitung_kalori(berat, tinggi, usia, jenis_kelamin, aktivitas):
    if jenis_kelamin == "pria":
        bmr = 10*berat + 6.25*tinggi - 5*usia + 5
    else:
        bmr = 10*berat + 6.25*tinggi - 5*usia - 161
    faktor = {"santai":1.2,"ringan":1.375,"sedang":1.55,"berat":1.725,"sangat_berat":1.9}
    if aktivitas not in faktor: raise ValueError("Level aktivitas tidak valid.")
    tdee = bmr * faktor[aktivitas]
    return {"bmr": round(bmr,1), "tdee": round(tdee,1),
            "diet": round(tdee-500,1), "bulking": round(tdee+300,1)}

# ══════════════════════════════════════════════
#  ROUTES LAMA
# ══════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/kalkulator", methods=["POST"])
def api_kalkulator():
    data = request.get_json()
    try:
        a = float(data["a"]); b = float(data["b"]); op = data["operasi"]
        ops = {"tambah": pertambahan, "kurang": pengurangan, "kali": perkalian, "bagi": pembagian}
        if op not in ops: return jsonify({"error": "Operasi tidak dikenal."}), 400
        return jsonify({"hasil": ops[op](a, b), "operasi": op, "a": a, "b": b})
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/panjang", methods=["POST"])
def api_panjang():
    data = request.get_json()
    try:
        nilai = float(data["nilai"]); dari = data["dari"].lower(); ke = data["ke"].lower()
        return jsonify({"hasil": konversi_panjang(nilai, dari, ke), "dari": dari, "ke": ke, "nilai": nilai})
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/suhu", methods=["POST"])
def api_suhu():
    data = request.get_json()
    try:
        return jsonify({"hasil": konversi_suhu(float(data["nilai"]), data["dari"]), "dari": data["dari"], "nilai": float(data["nilai"])})
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/berat", methods=["POST"])
def api_berat():
    data = request.get_json()
    try:
        return jsonify({"hasil": konversi_berat(float(data["berat"]), data["asal"], data["tujuan"]), "asal": data["asal"], "tujuan": data["tujuan"], "berat": float(data["berat"])})
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

# ══════════════════════════════════════════════
#  ROUTES BARU
# ══════════════════════════════════════════════

@app.route("/api/mata-uang", methods=["POST"])
def api_mata_uang():
    data = request.get_json()
    try:
        jumlah = float(data["jumlah"]); dari = data["dari"].upper(); ke = data["ke"].upper()
        hasil, tanggal = konversi_mata_uang(jumlah, dari, ke)
        return jsonify({"hasil": hasil, "dari": dari, "ke": ke, "jumlah": jumlah, "tanggal": tanggal})
    except Exception as e:
        return jsonify({"error": f"Gagal mengambil kurs: {str(e)}"}), 400

@app.route("/api/tekanan", methods=["POST"])
def api_tekanan():
    data = request.get_json()
    try:
        nilai = float(data["nilai"]); dari = data["dari"].lower(); ke = data["ke"].lower()
        return jsonify({"hasil": konversi_tekanan(nilai, dari, ke), "dari": dari, "ke": ke, "nilai": nilai})
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/diskon", methods=["POST"])
def api_diskon():
    data = request.get_json()
    try:
        return jsonify(hitung_diskon(float(data["harga"]), float(data["diskon"])))
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/bunga", methods=["POST"])
def api_bunga():
    data = request.get_json()
    try:
        return jsonify(hitung_bunga(float(data["pokok"]), float(data["bunga"]), float(data["tahun"]), int(data.get("frekuensi", 12))))
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/nabung", methods=["POST"])
def api_nabung():
    data = request.get_json()
    try:
        return jsonify(hitung_nabung(float(data["target"]), int(data["bulan"])))
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/bmi", methods=["POST"])
def api_bmi():
    data = request.get_json()
    try:
        return jsonify(hitung_bmi(float(data["berat"]), float(data["tinggi"])))
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/kalori", methods=["POST"])
def api_kalori():
    data = request.get_json()
    try:
        return jsonify(hitung_kalori(float(data["berat"]), float(data["tinggi"]), int(data["usia"]), data["jenis_kelamin"], data["aktivitas"]))
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
