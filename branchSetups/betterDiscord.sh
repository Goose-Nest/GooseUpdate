#!/bin/sh
# This script clones (via Git) BetterDiscord's Injector into the correct directory for the branch automatically, then cleans it for use in an update

injectorDir="../branches/betterdiscord/injector"

# Remove current / old Injector
echo "Removing old injector..."

rm -rf "$injectorDir"

# Git clone (with no history for less data transfer / storage usage)
echo "Cloning new injector..."

git clone --depth=1 --branch=injector https://github.com/rauenzi/BetterDiscordApp.git "$injectorDir"

# Remove Git data in the directory
echo "Removing Git data..."

rm -rf "$injectorDir/.git"

# Remove extra unneeded files to save package size space
echo "Removing extra unneeded files..."

unneededFiles=("package.json" "README.md" ".gitignore" "LICENSE")

for f in ${unneededFiles[@]}; do
  echo $f
  rm "$injectorDir/$f"
done
