#!/bin/bash
# resolve-self.sh

echo "Resolving self-contained package structure..."

# 1. Create lib directory in dist
mkdir -p dist/lib

# 2. Copy library compiled files (assuming we are in packages/tempo)
cp -r ../library/dist/* dist/lib/

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
        perl -i -pe "s|#library/|${lib_prefix}|g" "$file"
    else
        # Standard case for tempo files
        perl -i -pe "s|#library/|${prefix}lib/|g" "$file"
    fi
    
    # Replace #tempo/ with ./ (or relative equivalent)
    perl -i -pe "s|#tempo/|${prefix}|g" "$file"
done

# 4. Pristine package.json (Clean up for publication)
# We use a backup pattern so your local environment stays intact
if [[ "$*" == *"--publish"* ]]; then
    echo "Creating pristine package.json for publication..."
    cp package.json package.json.backup
    
    # Use perl -0777 to slurp the whole file for multi-line matching
    # Strip internal devDependencies and imports
    perl -0777 -i -pe 's/"\@magmacomputing\/library": ".*",?\s*//g' package.json
    perl -0777 -i -pe 's/"#library\/\*": \{.*?\},\s*//sg' package.json
    
    # Cleanup trailing commas before }
    perl -0777 -i -pe 's/,\s*\}/ \}/g' package.json
    
    echo "Pristine manifest ready. Remember to restore with: cp package.json.backup package.json"
fi

echo "Resolution complete."
