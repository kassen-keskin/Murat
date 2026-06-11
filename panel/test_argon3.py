import argon2
from argon2 import PasswordHasher

ph = PasswordHasher()

hash_str = "$argon2id$v=19$m=65536,t=3,p=4$bF6th7c220y+AgjcOxHXng==$DVM1r47OQ40+bSHgyBaRD7oNQtpEkD33y46E3e+sUio="

parts = hash_str.split("$")
# parts[0] is empty, parts[1] is argon2id, parts[2] is v=19, parts[3] is m=65536,t=3,p=4, parts[4] is salt, parts[5] is hash
parts[4] = parts[4].rstrip("=")
parts[5] = parts[5].rstrip("=")
hash_str_clean = "$".join(parts)

print("Cleaned hash:", hash_str_clean)

password = "0420"

try:
    if ph.verify(hash_str_clean, password):
        print("Success! Password verified.")
except argon2.exceptions.VerifyMismatchError:
    print("Failed: Password does not match.")
except Exception as e:
    print(f"Error parsing hash: {e}")
