#!/bin/sh
# This script clones (via Git) GM's extension and cleans it for use in an update

extDir="../branches/mod/goosemod/GMExt"

# Remove current / old extension
echo "Removing old extension"

rm -rf "$extDir"

# Git clone (with no history for less data transfer / storage usage)
echo "Cloning new injector..."

git clone --depth=1 https://github.com/GooseMod/Extension.git "$extDir"

# Remove extra unneeded files to save package size space
echo "Removing extra unneeded files..."

unneededFiles=(".git" ".github" "README.md" ".gitignore" "LICENSE")

for f in ${unneededFiles[@]}; do
  echo $f
  rm -rf "$extDir/$f"
done 