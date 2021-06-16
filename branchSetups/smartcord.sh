#!/bin/sh
# This script clones (via Git) EnhancedDiscord (their main repo) and cleans it for use in an update

injectorDir="../branches/mod/smartcord/smartcord"

# Remove current / old Injector
echo "Removing old injector..."

rm -rf "$injectorDir"

# Git clone (with no history for less data transfer / storage usage)
echo "Cloning new injector..."

git clone --depth=1 https://github.com/smartfrigde/smartcord.git "$injectorDir"

# Remove extra unneeded files to save package size space
echo "Removing extra unneeded files..."

unneededFiles=(".git" ".eslintrc.json" "installer" ".github" "README.md" ".gitignore" "LICENSE")

for f in ${unneededFiles[@]}; do
  echo $f
  rm -rf "$injectorDir/$f"
done
