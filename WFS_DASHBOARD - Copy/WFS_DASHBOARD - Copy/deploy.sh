#!/bin/bash

# Deploy script for REPORT Dashboard

echo "🚀 Starting REPORT Dashboard deployment setup..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Create folders if they don't exist
echo "📂 Checking folder structure..."
mkdir -p templates static

# Check required files
echo "✅ Checking required files..."
required_files=("server.py" "requirements.txt" "templates/index.html" "templates/login.html" "static/app.js" "static/style.css")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing: $file"
        exit 1
    fi
done

echo "✅ All files present!"

# Add to git
echo "📤 Adding files to git..."
git add .
git commit -m "Deploy REPORT Dashboard with authentication"

echo "✅ Ready for deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Create repository on GitHub"
echo "2. Add remote: git remote add origin https://github.com/your-username/your-repo.git"
echo "3. Push code: git push -u origin main"
echo "4. Connect to Render.com and deploy"
echo ""
echo "🔑 Don't forget to set SECRET_KEY in Render.com environment variables!"
