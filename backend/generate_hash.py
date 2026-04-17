from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Generate hash for a simple test password
test_password = "Password123"
hashed = pwd_context.hash(test_password)

print(f"Plain password: {test_password}")
print(f"Bcrypt hash: {hashed}")
