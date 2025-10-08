## Analysis for the company name deduplication solution by Alex Daniel
                               author: Artur Klesun

### Abstract
In this document I will write down my thoughts about the https://gist.github.com/AlexDaniel/86ff68e14333baf61a0d3a8b606ee25a

My task is to think about how this solution can be improved and optimised, check the quality of code.

### Performance
(To Be Added)

### Code Quality
- First thing catching my eye is that code is inlined on the script level. Considering how straightforward the task is, it would really be logical to define a pure function `deduplicate(names: string[]): string[][]` rather than write `for` loops right at the script level. 620257f9561fe0a9d647307cf0c09857f6c41ac7
- The companies retrieval code should also definitely be isolated into a function. 143a31f89f2cddc86b8774d2626694615d31a467
- I would define a function `lookSame(companyA: Company, companyB: Company): boolean` where we would isolate the logic. Considering how sophisticated it may get to get rid of the false positives and that the data set is not too large, I believe we can neglect the performance in favour of straightforwardness SoC, at least in the initial solution.
- The length early check optimization can be isolated into the `lookSame()` as well. cd3a29b0e04ceb043920bba4b07031978c57d255

### Conceptual Suggestions
- ChatGPT is pretty good at finding similar names in a list, especially considering that false positives are acceptable.
- I would maybe suggest to split each name into words and to compare words rather than the whole name string with Levenstein. Most discrepancies are about extra words or missing words and the difference in spelling in the source data is pretty rare. In my personal practice Levenstein tends to give extremely many false positives for very different strings, and it gets worse the longer strings are.

### Nitpicks
- We are using `companies[i]` and `companies[j]` many times which may possibly be prone to typos so I would suggest to go with `for (const companyA of ...)` loop instead of `for (let i = 0; ...)`
- Depending on environment, we can probably get use of `Map.groupBy()` instead of manyally looging. Would also get us rid of the nasty `!`. 3816f9121e602955c35c2c0776ac77302a97d47b
