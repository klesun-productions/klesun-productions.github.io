## Analysis for the company name deduplication solution by Alex Daniel
                               author: Artur Klesun

### Abstract
In this document I will write down my thoughts about the https://gist.github.com/AlexDaniel/86ff68e14333baf61a0d3a8b606ee25a

My task is to think about how this solution can be improved and optimised, check the quality of code.

### Performance
(To Be Added)

### Code Quality
- First thing catching my eye is that code is inlined on the script level. Considering how straightforward the task is, it would really be logical to define a pure function `deduplicate(names: string[]): string[][]` rather than write `for` loops right at the script level.

### Alternative Approaches
- ChatGPT is pretty good at finding similar names in a list, especially considering that false positives are acceptable.
