#!/bin/bash
# resolve-self.sh

echo "Resolving self-contained package structure..."

# 1. Create lib directory in dist
rm -rf dist/lib
mkdir -p dist/lib

# 2. Copy only common library compiled files
cp -r ../library/dist/common dist/lib/

# 3. Rewrite imports in JS and D.TS files
find dist -type f \( -name "*.js" -o -name "*.d.ts" \) | while read -r file; do
    # Calculate depth relative to dist
    rel_path=${file#dist/}
    depth=$(echo "$rel_path" | grep -o "/" | wc -l)
    
    prefix="./"
    for ((i=0; i<depth; i++)); do prefix="../$prefix"; done
    
    # Special case: if we are inside dist/lib, the prefix needs to stay relative to lib
    if [[ "$rel_path" == lib/* ]]; then
        # lib_prefix is just "./" if it's a direct file in lib
        lib_depth=$((depth - 1))
        lib_prefix="./"
        for ((i=0; i<lib_depth; i++)); do lib_prefix="../$lib_prefix"; done
        
        # #library/ -> common/ (since #library alias maps to common)
        perl -i -pe "s|#library/|${lib_prefix}common/|g; s|#library(['\"])|${lib_prefix}common/index.js\$1|g" "$file"
    else
        # Standard case for tempo files
        perl -i -pe "s|#library/|${prefix}lib/common/|g; s|#library(['\"])|${prefix}lib/common/index.js\$1|g" "$file"
    fi
    
    # Replace #tempo/ with ./ (or relative equivalent)
    perl -i -pe "s|#tempo/|${prefix}|g; s|#tempo(['\"])|${prefix}index.js\$1|g" "$file"
done

echo "Resolution complete."
