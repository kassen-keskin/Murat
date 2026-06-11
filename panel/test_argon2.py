import argon2
from argon2 import PasswordHasher

ph = PasswordHasher()

hash_str = "$argon2id$v=19$m=65536,t=3,p=4$bF6th7c220y+AgjcOxHXng==$DVM1r47OQ40+bSHgyBaRD7oNQtpEkD33y46E3e+sUio="
# Remove '=' padding from base64 strings in the hash
hash_str_clean = hash_str.replace("=", "")

password = "0420"

try:
    if ph.verify(hash_str_clean, password):
        print("Success! Password verified.")
except argon2.exceptions.VerifyMismatchError:
    print("Failed: Password does not match.")
except Exception as e:
    print(f"Error parsing hash: {e}")
