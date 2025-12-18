#!/bin/bash

# 🗂️ LGS PORTAL BETA YEDEKLEME SCRIPT
# Tarih: 19 Aralık 2025, 03:03

echo "🗂️  LGS PORTAL BETA YEDEKLEME BAŞLATILIYOR..."
echo "==============================================="
echo ""

# Yedek klasörü oluştur
BACKUP_DIR="backup_lgs_portal_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Yedek klasörü oluşturuldu: $BACKUP_DIR"
echo ""

# Ana dosyaları kopyala
echo "📄 Kaynak kodları yedekleniyor..."
cp -r src/ "$BACKUP_DIR/" 2>/dev/null || echo "src/ bulunamadı veya hata"

echo "🎨 Statik dosyalar yedekleniyor..."
cp -r public/ "$BACKUP_DIR/" 2>/dev/null || echo "public/ bulunamadı veya hata"

echo "🎯 Stiller yedekleniyor..."
cp -r styles/ "$BACKUP_DIR/" 2>/dev/null || echo "styles/ bulunamadı veya hata"

echo "🔧 Konfigürasyon dosyaları yedekleniyor..."
cp *.json "$BACKUP_DIR/" 2>/dev/null || echo "JSON dosyaları bulunamadı veya hata"
cp *.js "$BACKUP_DIR/" 2>/dev/null || echo "JS dosyaları bulunamadı veya hata"

echo "🏗️ Build çıktıları yedekleniyor..."
cp -r dist/ "$BACKUP_DIR/" 2>/dev/null || echo "dist/ bulunamadı veya hata"

# Dosya sayısını say
FILE_COUNT=$(find "$BACKUP_DIR" -type f 2>/dev/null | wc -l)
FOLDER_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

echo ""
echo "✅ YEDEKLEME TAMAMLANDI!"
echo "========================"
echo "📁 Klasör: $BACKUP_DIR"
echo "📊 Dosya Sayısı: $FILE_COUNT"
echo "💾 Klasör Boyutu: $FOLDER_SIZE"
echo ""
echo "🔍 Yedeklenen Ana Klasörler:"
ls -la "$BACKUP_DIR" 2>/dev/null | grep "^d" | awk '{print "   📁 " $9}'
echo ""
echo "🎯 Yedekleme Başarılı!"

# Git durumu
echo ""
echo "📊 Git Durumu:"
echo "Branch: $(git branch --show-current 2>/dev/null || echo 'Git bulunamadı')"
echo "Son Commit: $(git log --oneline -1 2>/dev/null | head -c 50 || echo 'Git log bulunamadı')"
echo ""
echo "✨ Sisteminiz güvenle yedeklendi!"