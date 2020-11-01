#!/bin/sh

echo "Copying original..."
bash copyOriginal.sh

echo "Patching..."
node patch.js

echo "Creating zip..."

rm module.zip

cd module
zip ../module.zip -r .

cd ..
