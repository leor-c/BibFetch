![The BibFetch Icon](icons/icon_128x128.png)
# BibFetch
A Chrome extension for one-click BibTeX citation fetching to clipboard on arXiv pages.

On an arXiv paper page (abs or pdf), simply click the BibFetch extension icon to retrieve the BibTeX citation code of the current paper.
The extension first tries to obtain the citation code from Google Scholar.
In case of failure, an arXiv citation would be copied instead (provided by the arXiv API).

A typical failure case is that Google Scholar blocks the access to the citation codes as it detects a bot-like behavior.
A temporary fix is to run a search query in Google Scholar, which triggers an authentication form (I'm not a bot).
Upon completion, the problem should be solved (temporarily).
