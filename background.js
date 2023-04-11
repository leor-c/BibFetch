// background.js

// Listen for clicks on the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  isArxivPage = tab.url.startsWith('https://arxiv.org/');

  if (!isArxivPage) {
    return null;
  }

  const bibtex = await getBibtexFromGoogleScholar(tab);
  // const bibtex = null;

  if (bibtex) {

    // Show a notification
    chrome.notifications.create({
      type: 'basic',
      title: 'BibTeX citation copied (Google Scholar)',
      message: 'The BibTeX citation code from Google Scholar has been copied to the clipboard.',
      iconUrl: 'icons/icon_128x128.png',
    });
  } else {
    // Show an error message
    chrome.notifications.create({
      type: 'basic',
      title: 'Error',
      message: "The BibTeX citation code couldn't be retrieved from Google Scholar.\nYou possibly got blocked. Try searching Google Scholar to verify you're not a bot.",
      iconUrl: 'icons/icon_128x128.png',
    });

    bibtexCode = await getArxivBibtex(tab);
    if (bibtexCode) {
      chrome.notifications.create({
        type: 'basic',
        title: 'Arxiv BibTeX citation copied instead',
        message: 'The BibTeX citation code from Arxiv has been copied to the clipboard.',
        iconUrl: 'icons/icon_128x128.png',
      });
    }
  }

});


async function copyToClipboard(bibtexCode) {
  await navigator.clipboard.writeText(bibtexCode);
}


function setBibtexLinkObserver() {
  let observer = new MutationObserver(() => {
    const bibtexLink = document.querySelector('a[href*=".bib"]');

    (async () => {
      const response = chrome.runtime.sendMessage({href: bibtexLink.href});
    })();

    
  });

  observer.observe(document.getElementById('gs_cit'), {childList: true, subtree: true});

  let observer2 = new MutationObserver(() => {
    (async () => {
      const response = chrome.runtime.sendMessage({href: null});
    })();
  });

  observer2.observe(document.getElementById('gs_alrt'), {subtree: true, childList: true});
}

// Find the "cite" button on the Google Scholar page
function findCiteButton() {
  const citeButton = document.querySelector('.gs_or_cit');
  if (citeButton) {
    // Click the "cite" button to open (generate) the popup with the bibtex link
    citeButton.click();
  } else {
    console.log('error: could not find the cite button.');
  }
}



function generateBibtexLink(argument) {
  return new Promise((resolve) => {
    const listener = (request, sender, sendResponse) => {
      // console.log('listener got "' + request.href + '"');
      resolve(request.href);
    }

    chrome.runtime.onMessage.addListener(listener);
    let results = chrome.scripting.executeScript(
      {
        target: {tabId: tmpTab.id},
        func: findCiteButton
      }
    );
  })
}







async function getBibtexFromGoogleScholar(tab) {
  tabURL = tab.url;
  isArxivPage = tabURL.startsWith('https://arxiv.org/');

  if (!isArxivPage) {
    return null;
  }

  const arxivId = tabURL.match(/(\d{4}\.\d{4,5})(\.pdf)?$/)[1];
  const googleScholarUrl = `https://scholar.google.com/scholar_lookup?arxiv_id=${encodeURIComponent(arxivId)}`

  try{
    tmpTab = await chrome.tabs.create({
      url:googleScholarUrl
    });

    await chrome.scripting.executeScript(
      {
        target: {tabId: tmpTab.id},
        func: setBibtexLinkObserver
      }
    );
    

    let results1 = await generateBibtexLink();

    if (!results1) {
      // failed! probably got blocked...
      await chrome.tabs.remove(tmpTab.id);
      return null;
    }

    bib_response = await fetch(results1);
    bibtexCode = await bib_response.text();
    
    await chrome.scripting.executeScript(
      {
        target: {tabId: tmpTab.id},
        func: copyToClipboard,
        args: [bibtexCode]
      }
    );

    await chrome.tabs.remove(tmpTab.id);

    chrome.tabs.update(tab.id, {active: true});

    return bibtexCode;

  } catch(err) {
    console.log('Got an error: ' + err);
  }
}










async function fetchFromArxivAbsPage() {
  return new Promise((resolve) => {
      tb = document.getElementById('bib-cite-target');
      if (tb.value.startsWith('@')) {
        resolve(tb.value);
      } else {
        // assume 'loading...'
        let m = new MutationObserver(() => {
          bibtexCode = document.getElementById('bib-cite-target').value;
          document.getElementsByClassName('bib-modal-close')[0].click();
          resolve(bibtexCode);
        });
        m.observe(document.getElementById('bib-cite-modal'), {attrubutes: true, attributeFilter: ['style']});
        document.getElementById('bib-cite-trigger').click();
      }
  })

}


async function getArxivBibtex(tab) {
  tabURL = tab.url;
  isArxivPage = tabURL.startsWith('https://arxiv.org/');

  if (!isArxivPage) {
    return null;
  }

  const arxivId = tabURL.match(/(\d{4}\.\d{4,5})(\.pdf)?$/)[1];
  
  if (tabURL.startsWith('https://arxiv.org/abs/')) {
    // handle this easier case without a new tab
    // await fetchFromArxivAbsPage();
    bibtexCodeRes = await chrome.scripting.executeScript(
      {
        target: {tabId: tab.id},
        func: fetchFromArxivAbsPage
      }
    );
    bibtexCode = bibtexCodeRes[0].result;
    await chrome.scripting.executeScript(
      {
        target: {tabId: tab.id},
        func: copyToClipboard,
        args: [bibtexCode]
      }
    );
    return bibtexCode;
  } else {
    // assume pdf
    const arxivAbsLink = `https://arxiv.org/abs/${encodeURIComponent(arxivId)}`;
    try{
      tmpTab = await chrome.tabs.create({
        url:arxivAbsLink
      });

      bibtexCodeRes = await chrome.scripting.executeScript(
        {
          target: {tabId: tmpTab.id},
          func: fetchFromArxivAbsPage
        }
      );
      bibtexCode = bibtexCodeRes[0].result;
      await chrome.scripting.executeScript(
        {
          target: {tabId: tmpTab.id},
          func: copyToClipboard,
          args: [bibtexCode]
        }
      );

      await chrome.tabs.remove(tmpTab.id);

      chrome.tabs.update(tab.id, {active: true});

      return bibtexCode;

    } catch(err) {
      console.log('Got an error: ' + err);
    }

  }

}


