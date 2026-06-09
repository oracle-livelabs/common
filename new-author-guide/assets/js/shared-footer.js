(function () {
  var footerText = "Powered by Oracle LiveLabs Team \u00A9 2026";
  var legalHref = "https://docs.oracle.com/pls/topic/lookup?ctx=en/legal&id=cpyr";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function legalLink(label) {
    return [
      '<a href="', legalHref, '" target="_blank"',
      ' aria-label="Open a new window to Oracle legal notices"',
      ' data-lbl="copyright">', escapeHtml(label), "</a>"
    ].join("");
  }

  function renderAppFooter(footer) {
    footer.innerHTML = '<div class="container">' + escapeHtml(footerText) + "</div>";
  }

  function renderSampleFooter(footer) {
    var description = footer.getAttribute("data-footer-description") || "";
    var linkHref = footer.getAttribute("data-footer-link-href") || "";
    var linkLabel = footer.getAttribute("data-footer-link-label") || "";
    var parts = ['<div class="sample-footer-shell">'];

    if (description) {
      parts.push("<p>", escapeHtml(description), "</p>");
    }
    parts.push("<p>", escapeHtml(footerText), "</p>");
    if (linkHref && linkLabel) {
      parts.push('<a class="sample-button is-secondary" href="', escapeHtml(linkHref), '">', escapeHtml(linkLabel), "</a>");
    }
    parts.push("</div>");
    footer.innerHTML = parts.join("");
  }

  function renderHolFooter(footer) {
    footer.innerHTML = [
      '<a class="hol-Footer-topLink" href="#top">Return to Top</a>',
      '<div id="footer-banner"><div class="footer-row">',
      '<div class="footer-content"><ul class="footer-links">',
      "<li>", legalLink(footerText), "</li>",
      '<li><a href="https://www.oracle.com/corporate/index.html" target="_blank" aria-label="Open a new window to learn more about oracle" data-lbl="about-oracle">About Oracle</a></li>',
      '<li><a href="https://www.oracle.com/corporate/contact/" target="_blank" aria-label="Open a new window to contact oracle" data-lbl="contact-us">Contact Us</a></li>',
      '<li class="footer-links-break"></li>',
      '<li><a href="https://docs.oracle.com/en/browseall.html" target="_blank" aria-label="Open a new window to products a-z" data-lbl="products-a-z">Products A-Z</a></li>',
      '<li><a href="https://www.oracle.com/legal/privacy/" target="_blank" aria-label="Open a new window to read more about Oracle terms of use and privacy" data-lbl="terms-of-use-and-privacy">Terms of Use & Privacy</a></li>',
      '<li><a href="https://www.oracle.com/legal/privacy/privacy-policy.html#11" target="_blank" aria-label="Open a new window to read more about managing Oracle cookie preferences" data-lbl="cookie-preferences">Cookie Preferences</a></li>',
      '<li><a href="https://www.oracle.com/legal/privacy/marketing-cloud-data-cloud-privacy-policy.html#adchoices" target="_blank" aria-label="Open a new window to ad choices" data-lbl="ad-choices">Ad Choices</a></li>',
      '<li class="footer-links-break"></li><li class="last">', legalLink(footerText), "</li>",
      "</ul></div></div></div>"
    ].join("");
  }

  function renderPlainFooter(footer) {
    footer.textContent = footerText;
  }

  function renderFooter(footer) {
    var variant = footer.getAttribute("data-footer-variant") || "plain";

    if (variant === "app") {
      renderAppFooter(footer);
    } else if (variant === "sample") {
      renderSampleFooter(footer);
    } else if (variant === "hol") {
      renderHolFooter(footer);
    } else {
      renderPlainFooter(footer);
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-shared-footer]"), renderFooter);
}());
