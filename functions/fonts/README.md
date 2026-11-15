# Fonts for the link-preview picture

TrueType copies of the site's own fonts (`src/assets/fonts/*.woff2`, latin subset), converted with fontTools because the renderer can't read woff2. Space Grotesk and JetBrains Mono are under the SIL Open Font License 1.1 (https://openfontlicense.org), which allows this.

Regenerate after a font change:

```bash
python3 -c "from fontTools.ttLib import TTFont; f=TTFont('src/assets/fonts/NAME.woff2'); f.flavor=None; f.save('functions/fonts/NAME.ttf')"
```
