/**
 * Kassen Keskin - Katalog Güvenlik & Yetkilendirme Yapılandırması
 * 
 * GÜVENLİK BİLGİSİ:
 * Şifre dosyada KESİNLİKLE açık metin olarak bulunmaz.
 * Kriptografik tuzlanmış (salted) SHA-256 tek yönlü hash olarak saklanmaktadır.
 * Bu dosyayı ve kodları açan hiç kimse şifreyi geri çözemez (irreversible).
 */
(function() {
  window.KATALOG_AUTH_CONFIG = {
    // Kriptografik tuzlama (Salt)
    salt: "kassen_berlin_catalog_salt_2026_sec",
    // Salted SHA-256 hash değeri
    hash: "767e9a7d6023647e217f000f903ba4ebc3628829323931301e6aeea365b22dce",
    // Oturum depolama anahtarı
    sessionKey: "kassen_catalog_authorized_session",
    // Oturum geçerlilik süresi: 12 saat (ms)
    sessionDurationMs: 12 * 60 * 60 * 1000
  };

  // Pure JS SHA-256 (Fallback for older engines or non-secure contexts)
  function fallbackSha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;
    var result = '';
    var words = [];
    var asciiBitLength = ascii[lengthProperty] * 8;
    var hash = [1779033703, -1150833019, 1013904242, -1521486534, 1359893119, -1694144372, 528734635, 1541459225];
    var k = [
      1116353280, 1444125468, 1792617664, -2053788210, -1999289677, 654659198,
      1314988455, 1604494140, 1782401494, 1947052620, -1989588235, -1832949541,
      -1796776669, -1657805175, 412891962, 808187881, 1038285503, 1310611726,
      1484197825, 1704257912, 1870446758, 2111997232, -2065188642, -1935214616,
      -1678954759, -1550501434, -1343731048, -440866649, 39515814, 262330251,
      430638599, 502772365, 823863024, 987190673, 1051523455, 1326947076,
      1737205615, 2095866493, -1886887282, -1756372075, -1679415473, -1607509526,
      -1420881944, -1024718465, -819958179, -53383014, 180460360, 480271449,
      606105819, 811248931, 984194217, 1238635518, 1406597075, 1636054868,
      1930433985, 2143983254, -2026576378, -2009315347, -1843258603, -1781570910,
      -1617734867, -1533509079, -1185358000, -835160533
    ];

    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength);
    for (j = 0; j < words[lengthProperty];) {
      var w = words.slice(j, j += 16);
      var oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          );
        var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  // Asynchronous or Synchronous Password Verification
  window.verifyCatalogPassword = async function(inputPassword) {
    if (!window.KATALOG_AUTH_CONFIG) return false;
    var cfg = window.KATALOG_AUTH_CONFIG;
    var cleanPass = (inputPassword || '').trim();
    if (!cleanPass) return false;
    var combined = cfg.salt + cleanPass;

    if (window.crypto && window.crypto.subtle) {
      try {
        var msgUint8 = new TextEncoder().encode(combined);
        var hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
        var hashArray = Array.from(new Uint8Array(hashBuffer));
        var hex = hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
        return hex.toLowerCase() === cfg.hash.toLowerCase();
      } catch(e) {
        // Fallback to pure JS if subtle.digest encounters any issue
      }
    }
    return fallbackSha256(combined).toLowerCase() === cfg.hash.toLowerCase();
  };

  // Check if current browser session is authorized
  window.isCatalogAuthorized = function() {
    if (!window.KATALOG_AUTH_CONFIG) return false;
    try {
      var raw = sessionStorage.getItem(window.KATALOG_AUTH_CONFIG.sessionKey);
      if (!raw) return false;
      var session = JSON.parse(raw);
      if (session && session.auth && (Date.now() - session.time < window.KATALOG_AUTH_CONFIG.sessionDurationMs)) {
        return true;
      }
    } catch(e) {}
    return false;
  };

  // Grant session authorization
  window.setCatalogAuthorized = function() {
    if (!window.KATALOG_AUTH_CONFIG) return;
    try {
      sessionStorage.setItem(window.KATALOG_AUTH_CONFIG.sessionKey, JSON.stringify({
        auth: true,
        time: Date.now()
      }));
    } catch(e) {}
  };
})();
