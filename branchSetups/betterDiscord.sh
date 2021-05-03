#!/bin/sh
# This script downloads BD's latest asar release

asarPath="../branches/betterdiscord/betterdiscord.asar"

# Remove current / old asar
echo "Removing old asar..."

rm -f "$asarPath"

# Download via latest GitHub release
echo "Downloading new asar..."

# Based on https://gist.github.com/steinwaywhw/a4cd19cda655b8249d908261a62687f8
curl -s https://api.github.com/repos/rauenzi/BetterDiscordApp/releases/latest \
| grep "browser_download_url.*betterdiscord.asar" \
| cut -d '"' -f 4 \
| wget -O "$asarPath" -qi -