# HR Workspace Sans — web subsets

Original: Noto Sans CJK SC by the Noto Project Authors, SIL Open Font License 1.1.
Official sources:
- https://github.com/notofonts/noto-cjk/tree/main/Sans/OTF/SimplifiedChinese
- https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE

The Regular (400) and Medium (500) masters are converted to WOFF2 Unicode subsets and renamed HR Workspace Sans. Outlines are unchanged; original copyright/license metadata are retained. See LICENSE.txt. Source hashes and complete Unicode coverage are recorded in manifest.json.

Generated with scripts/build_web_fonts.py. A small common subset is used for the existing site; all remaining original codepoints are available in lazy-loaded parts for future articles, city names and visitor input. Each CSS range occurs only once per weight. The modified font remains under SIL OFL 1.1; it is not sold separately.

Inter, bundled separately in ../inter, is used for Latin text and lining/tabular numeric values. All web font files are served by this website, without a third-party font CDN or reliance on fonts installed on visitors' computers.
