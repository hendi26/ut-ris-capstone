import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

conn = sqlite3.connect('utris.db')

users = [
    ('admin', 'admin123'),
    ('patient', 'Patient123!'),
    ('radiologist_1', 'radio123'),
    ('radiologist_2', 'radio123'),
    ('dokter', 'dokter123'),
    ('resepsionis', 'resep123'),
    ('hendrisusilo', 'hendi123'),
]

for username, password in users:
    h = pwd_context.hash(password)
    conn.execute('UPDATE users SET hashed_password = ? WHERE username = ?', (h, username))
    print(f'Reset: {username} -> {password}')

conn.commit()
conn.close()
print('Selesai!')