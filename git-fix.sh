#!/bin/bash

echo "🔍 Git Durumu Kontrol Ediliyor..."
cd /workspace

# Git status kontrolü
echo "📊 Git Status:"
git status --porcelain

echo ""
echo "📝 Son 3 Commit:"
git log --oneline -3 --no-pager

echo ""
echo "🌐 Branch Bilgisi:"
git branch --show-current

echo ""
echo "📤 Remote Push:"
if git push --dry-run origin HEAD:main 2>/dev/null; then
    echo "✅ Push yapılabilir"
    git push origin main
else
    echo "❌ Push problemi var"
fi

echo ""
echo "🎉 İşlem tamamlandı!"