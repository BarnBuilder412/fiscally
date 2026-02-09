#!/usr/bin/env python3
"""
Production environment setup helper for Fiscally.
Generates secure secrets and validates configuration.
"""

import secrets
import os
import sys

def generate_secret_key():
    """Generate a cryptographically secure secret key."""
    return secrets.token_urlsafe(32)

def check_env_file(env_path: str) -> dict:
    """Read and parse an environment file."""
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars

def main():
    print("=" * 60)
    print("Fiscally Production Environment Setup")
    print("=" * 60)
    print()
    
    # Generate secrets
    print("📦 Generated Secrets")
    print("-" * 40)
    secret_key = generate_secret_key()
    print(f"SECRET_KEY={secret_key}")
    print()
    
    # Check current .env
    backend_env = os.path.join(os.path.dirname(__file__), '.env')
    current_env = check_env_file(backend_env)
    
    print("🔍 Current Configuration Check")
    print("-" * 40)
    
    # Check required variables
    required_vars = [
        ('SECRET_KEY', 'JWT signing key (use generated value above)'),
        ('DATABASE_URL', 'PostgreSQL connection string'),
        ('OPENAI_API_KEY', 'OpenAI API key for AI features'),
    ]
    
    optional_vars = [
        ('ENVIRONMENT', 'production'),
        ('DEBUG', 'false'),
        ('ALGORITHM', 'HS256'),
        ('ACCESS_TOKEN_EXPIRE_MINUTES', '15'),
        ('REFRESH_TOKEN_EXPIRE_DAYS', '7'),
        ('OPENAI_MODEL', 'gpt-4o-mini'),
    ]
    
    missing = []
    for var, desc in required_vars:
        value = current_env.get(var, '')
        if not value or 'your-' in value.lower() or 'change' in value.lower():
            status = "❌ MISSING/PLACEHOLDER"
            missing.append(var)
        else:
            status = "✅ Set"
        print(f"  {var}: {status}")
    
    print()
    
    if missing:
        print("⚠️  Action Required:")
        print(f"   Set these environment variables before deployment: {', '.join(missing)}")
        print()
    
    # Production .env template
    print("📋 Production .env Template")
    print("-" * 40)
    print(f"""
# Copy this to your deployment platform's environment variables

# Required
SECRET_KEY={secret_key}
DATABASE_URL=postgresql://user:password@host:5432/fiscally
OPENAI_API_KEY=sk-your-openai-key

# App Settings
ENVIRONMENT=production
DEBUG=false

# JWT Settings
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI Settings
OPENAI_MODEL=gpt-4o-mini

# Optional - Observability
# OPIK_API_KEY=your-opik-key
# OPIK_PROJECT_NAME=fiscally
# OPIK_WORKSPACE=your-workspace
""")
    
    print()
    print("=" * 60)
    print("Next Steps:")
    print("1. Copy the SECRET_KEY above to your deployment platform")
    print("2. Set DATABASE_URL from your PostgreSQL provider")
    print("3. Add your OPENAI_API_KEY")
    print("4. Deploy! See docs/DEPLOYMENT_GUIDE.md for full instructions")
    print("=" * 60)

if __name__ == "__main__":
    main()
