(function () {
  "use strict";

  var guidance = {
    1: {
      title: "The URL must point directly to a table-of-contents file",
      summary: "The import field expects a URL whose path ends in .html or .htm, with no extra text after the extension.",
      steps: ["Open the table-of-contents page you intend to import.", "Copy its direct page address and check that it ends in .html or .htm.", "Remove any trailing text after the extension, then enter the URL again."],
      visual: { src: "../content/nodoc/images/create_article_options_3_import_livelabs_url_1_import.png", alt: "NoDoc Import LiveLabs URL form with a table-of-contents address entered", caption: "Enter the direct table-of-contents URL in the Import LiveLabs URL form." },
      keywords: "import address extension url",
    },
    2: {
      title: "The selected text could not be attached to a comment",
      summary: "The selection no longer maps to text inside the editor.",
      steps: ["Return to the editor and select the intended text again.", "Confirm the selection is inside the editable content.", "Open the comment action and try again."],
      visual: { src: "../content/nodoc/images/how_to_add_comment_1_add_comment.png", alt: "NoDoc comment dialog opened from the editor toolbar", caption: "The comment action opens this dialog after text is selected in the editor." },
      guide: ["#nodoc:4:3", "Read the NoDoc commenting workflow"],
      keywords: "comment selection editor text range",
    },
    3: {
      title: "Turn on Edit before using the AI action",
      summary: "The AI action requires edit mode and a text selection.",
      steps: ["Select Edit to enter edit mode.", "Select the text you want the AI action to use.", "Run the action again."],
      visual: { src: "../content/nodoc/images/how_to_write_content_1_click_edit_button_to_enable_editing.png", alt: "NoDoc editor with the Edit button highlighted in the upper-right corner", caption: "Select Edit before choosing text for an AI action." },
      guide: ["#nodoc:3:2", "Read about editing and drafts"],
      keywords: "ai action edit save mode",
    },
    4: {
      title: "The comment control is unavailable",
      summary: "NoDoc could not open commenting because the expected control was not available on the page.",
      steps: ["Copy any unsaved edits somewhere safe.", "Reload the page and wait for it to finish loading.", "Open comments again. If the control is still missing, contact the application administrator."],
      visual: { src: "../content/nodoc/images/how_to_add_comment_1_add_comment.png", alt: "NoDoc comment control and comment dialog in the editor", caption: "This is the comment control and dialog to check after the page reloads." },
      guide: ["#nodoc:4:3", "Read the NoDoc commenting workflow"],
      keywords: "comment unavailable button reload",
    },
    5: {
      title: "Select an item before copying its path",
      summary: "This message can mean that nothing was selected or the browser blocked clipboard access.",
      steps: ["If no item was selected, choose the article or page in the table of contents first.", "Try Copy again.", "If copying still fails, allow clipboard access for the site in your browser and retry."],
      guide: ["#nodoc:1:2", "Read about the NoDoc workspace hierarchy"],
      keywords: "copy clipboard path table of contents selection",
    },
    6: {
      title: "The save result is uncertain",
      summary: "NoDoc did not return confirmation, so the save may or may not have completed.",
      steps: ["Keep a copy of your edits.", "Check the saved page or reopen it to see whether the changes are present.", "Retry the save only after you confirm the current saved state."],
      keywords: "save saved confirmation changes",
    },
    7: {
      title: "The deletion result needs to be checked",
      summary: "NoDoc could not confirm that the selected pages were deleted.",
      steps: ["Refresh the table of contents.", "Check which selected pages are still present.", "Delete only the pages that remain; do not repeat the deletion blindly."],
      visual: { src: "../content/nodoc/images/how_to_delete_2_page.png", alt: "NoDoc page deletion confirmation listing the selected page", caption: "Before confirming a deletion, verify the page named in the dialog." },
      guide: ["#nodoc:2:3", "Read about deleting an article or page"],
      keywords: "delete selected pages fallback",
    },
    8: {
      title: "A comment action did not return confirmation",
      summary: "The message depends on whether you were deleting a comment, saving a comment, or saving a reply.",
      steps: ["Use the action you just performed to choose where to check: reopen the comment list after a deletion, the list after saving a comment, or the thread after saving a reply.", "Check whether the comment or reply is already present or absent as intended.", "Retry only after checking the current state; keep a copy of any unsaved text."],
      visual: { src: "../content/nodoc/images/how_to_manage_existing_comment.png", alt: "NoDoc editor with a saved comment thread and comment actions visible", caption: "Reopen the comment thread and verify its current state before retrying." },
      guide: ["#nodoc:4:3", "Read the NoDoc commenting workflow"],
      keywords: "comment reply delete save confirmation",
    },
    9: {
      title: "The comment action may have completed without confirmation",
      summary: "Check the comment list or thread to determine whether the delete or reply action completed.",
      steps: ["If you deleted a comment, reopen the comment list and check whether it remains.", "If you saved a reply, reopen its thread and check whether the reply appears.", "Keep a copy of unsaved text and retry only after checking the result."],
      guide: ["#nodoc:4:3", "Read the NoDoc commenting workflow"],
      keywords: "comment reply delete result confirmation",
    },
    10: {
      title: "The page is unavailable in the selected version",
      summary: "The fallback message means the selected article version does not contain an available page row.",
      steps: ["Refresh the version list.", "Select a version that is available for the page.", "Reopen the page from that version."],
      visual: { src: "../content/nodoc/images/page_history_5_history_page_preview_and_restore_option.png", alt: "NoDoc Page History panel with Preview and Restore expanded and a history point selected", caption: "Use the history panel to select an available page version." },
      guide: ["#nodoc:4:1", "Read about managing versions"],
      keywords: "version edit fallback row page",
    },
    11: {
      title: "The editing lock could not be renewed",
      summary: "Your session could not confirm that it still has the lock needed to edit this page.",
      steps: ["Keep a copy of your changes.", "Reopen the page and check its checkout or editing status.", "Continue or save only after the page shows that editing is available to you."],
      keywords: "editing lock checkout expired renew",
    },
    12: {
      title: "Article ingestion did not complete",
      summary: "The server returned an ingestion message, but the message alone does not identify a specific correction.",
      steps: ["Keep the full server message, including any details shown with it.", "Check the article and correct any issue identified by that message.", "Retry ingestion once the reported issue is resolved. If the message does not explain the cause, contact the application administrator."],
      keywords: "article ingestion server message",
    },
    13: {
      title: "This heading needs a link anchor",
      summary: "NoDoc cannot create a direct link for a heading that has no ID (anchor).",
      steps: ["Identify the heading whose link you need.", "Ask the article author to add a link anchor to that heading.", "Reload the article and copy the heading link again."],
      guide: ["#nodoc:3:4", "Read about writing structured content"],
      keywords: "heading id anchor link",
    },
    14: {
      title: "Enter both the article title and version",
      summary: "The form is missing a required title or version.",
      steps: ["Enter the article title.", "Enter or select the article version.", "Check both fields, then continue."],
      guide: ["#nodoc:2:1", "Read about creating an article"],
      keywords: "article title version required",
    },
    15: {
      title: "The generation request has no reference to check",
      summary: "The server response did not include the request reference needed to confirm that generation started.",
      steps: ["Open the current generation status and look for the request you just submitted.", "If a request is listed, follow its status instead of submitting another one.", "If no request can be found, contact the application administrator with the message and time of the attempt."],
      keywords: "generation request reference invalid response server",
    },
    16: {
      title: "Generation is taking longer than expected",
      summary: "A timeout does not show whether the request stopped; it may still be running.",
      steps: ["Keep the request ID shown in the message.", "Check the status of that same request.", "Wait for its status before submitting another request."],
      keywords: "generation timeout request id running",
    },
    17: {
      title: "The generation request has no reference to check",
      summary: "The server response did not include the request reference needed to confirm that generation started.",
      steps: ["Keep the request ID shown in the message.", "Check the current generation status for that request.", "Submit another request only after you know whether the first one was created."],
      keywords: "generation request reference invalid response server",
    },
    18: {
      title: "The generation request may not have been queued",
      summary: "NoDoc could not confirm that the request entered the generation queue.",
      steps: ["Keep the request ID shown in the message.", "Check the current generation status for that request.", "Submit again only after checking whether the first request is already active."],
      keywords: "generation queue submission request failed",
    },
    19: {
      title: "NoDoc could not prepare a new article ID",
      summary: "The application could not create a unique identifier for the new article.",
      steps: ["Try preparing the new article again.", "If the same message returns, stop retrying and contact the application administrator."],
      guide: ["#nodoc:2:1", "Read about creating an article"],
      keywords: "article unique guid identifier",
    },
    20: {
      title: "The draft was not confirmed as reviewed",
      summary: "NoDoc could not mark the draft as reviewed; the response details may explain why.",
      steps: ["Keep the response details shown in the message.", "Check the saved page and the draft's current status.", "Continue with a merge only after confirming the correct draft and saved page."],
      keywords: "draft reviewed merge response delete failed",
    },
    21: {
      title: "The image description was not confirmed as saved",
      summary: "The save response does not confirm whether the image description was stored.",
      steps: ["Reopen the image details.", "Check whether the description is present.", "If it is missing, enter it again and save; then reopen the details to confirm."],
      keywords: "image description save",
    },
    22: {
      title: "Import generation may not have started",
      summary: "The import request failed to return confirmation that article generation started.",
      steps: ["Open the import's current generation status.", "Check whether a request is already running.", "Do not submit the import again until you know the first request's status."],
      keywords: "import generation request failed start",
    },
    23: {
      title: "The import status could not be checked",
      summary: "The status lookup failed, but the import may still be running.",
      steps: ["Keep the import details from the message.", "Check the same import's status again after a short wait.", "Do not submit another import while the first one may still be running. Contact the administrator if status remains unavailable."],
      keywords: "import status request failed details",
    },
    24: {
      title: "Select text inside the editor before commenting",
      summary: "There was no selected editor text for the comment.",
      steps: ["Click inside the editor.", "Select the words or passage you want to discuss.", "Choose the comment action."],
      visual: { src: "../content/nodoc/images/how_to_add_comment_2_output_highlighted_content.png", alt: "NoDoc editor showing the selected passage before adding a comment", caption: "Select the passage in the editor before opening the comment action." },
      guide: ["#nodoc:4:3", "Read the NoDoc commenting workflow"],
      keywords: "comment select text editor",
    },
    25: {
      title: "Select the comment text again inside the editor",
      summary: "NoDoc could not attach the comment to the selected text.",
      steps: ["Select the intended words again inside the editor.", "Confirm the selected text remains highlighted.", "Add the comment again."],
      guide: ["#nodoc:4:3", "Read the NoDoc commenting workflow"],
      keywords: "comment attach select word text",
    },
    26: {
      title: "NoDoc could not highlight the selected content",
      summary: "The selected content could not be marked as the comment's anchor.",
      steps: ["Select the content again in the editor.", "Check that the selection is still visible.", "Try adding the comment again."],
      visual: { src: "../content/nodoc/images/how_to_manage_existing_comment.png", alt: "NoDoc editor showing a highlighted passage linked to an existing comment", caption: "The selected passage should remain visibly linked to its comment." },
      guide: ["#nodoc:4:3", "Read the NoDoc commenting workflow"],
      keywords: "comment highlight container selection",
    },
    27: {
      title: "The comment save result is uncertain",
      summary: "This fallback appears when the application cannot confirm that the comment was saved. A server message may provide more detail.",
      steps: ["Keep a copy of the comment text.", "Open the comment list and check whether the comment is already present.", "Retry only if it is missing; if a specific server message appeared, follow that message."],
      guide: ["#nodoc:4:3", "Read the NoDoc commenting workflow"],
      keywords: "comment save fallback browser console",
    },
    28: {
      title: "NoDoc could not load the original comment details",
      summary: "The reply form is missing comment details that it needs before it can save your reply.",
      steps: ["Keep a copy of your reply.", "Close or leave the incomplete reply form and reopen the original comment.", "Try replying again after the comment details load."],
      guide: ["#nodoc:4:3", "Read the NoDoc commenting workflow"],
      keywords: "reply comment required fields details",
    },
    29: {
      title: "Wait for the editor to finish loading",
      summary: "The editor content is not available yet, so commenting cannot start.",
      steps: ["Wait for the page and editor to finish loading.", "Try opening comments again.", "If the editor remains unavailable, keep any local edits and reload the page."],
      guide: ["#nodoc:4:3", "Read the NoDoc commenting workflow"],
      keywords: "comment rich text editor loading content",
    },
    30: {
      title: "Reopen Rename and enter the new page name",
      summary: "The rename form did not retain all of the details needed to continue.",
      steps: ["Close the Rename dialog.", "Open Rename again and enter the new page name.", "Continue only after the name is visible in the form."],
      guide: ["#nodoc:2:2", "Read about adding and managing pages"],
      keywords: "rename preparation page name",
    },
    31: {
      title: "NoDoc could not identify exactly one page version to rename",
      summary: "The rename matched an unexpected number of version records, so the update was not safe to confirm.",
      steps: ["Reopen the selected page and its version.", "Check that the intended page and version are selected.", "Try again once. If the same message returns, contact the application administrator and include the matching-record count."],
      guide: ["#nodoc:4:1", "Read about managing versions"],
      keywords: "rename toc versions row count update matching records",
    },
    32: {
      title: "The notification email is missing an application image",
      summary: "NoDoc could not prepare the comment notification because an application image, such as its configured logo, is unavailable.",
      steps: ["Keep the message details and note which comment action triggered it.", "Contact the application administrator; this is an application configuration issue.", "Retry the action only after the administrator confirms the configuration is corrected."],
      keywords: "notification email logo static application file",
    },
    33: {
      title: "The notification email was queued, but delivery is not confirmed",
      summary: "This is a status message: the comment notification entered the mail queue. It does not confirm delivery to the recipient.",
      steps: ["Record the Mail ID and App ID from the message.", "Do not repeat the comment action just to resend the notification.", "If the recipient does not receive the email, contact the application administrator with those IDs."],
      kind: "status",
      keywords: "email queued successfully mail id app id delivered exception 20999",
    },
    34: {
      title: "Select or create an import archive first",
      summary: "The import did not receive an archive ID.",
      steps: ["Generate the article archive or upload the archive you intend to import.", "Select that archive in the import form.", "Start the import again."],
      keywords: "import archive zip id upload",
    },
    35: {
      title: "Sign in again so NoDoc can identify your account",
      summary: "The import could not find a signed-in account for this session.",
      steps: ["Sign out if the page shows a stale session, then sign in again.", "Confirm you are using the intended account.", "Retry the import."],
      guide: ["#nodoc:1:1", "Read about opening NoDoc and confirming access"],
      keywords: "account app user null sign in import",
    },
    36: {
      title: "Refresh the article list and set its order again",
      summary: "NoDoc did not receive the new article order to save.",
      steps: ["Refresh the article list.", "Arrange the articles in the intended order.", "Save the order again."],
      guide: ["#nodoc:2:1", "Read about creating and managing article structure"],
      keywords: "article order json missing save",
    },
    37: {
      title: "Run the content conversion again before saving",
      summary: "No converted page content was available to save.",
      steps: ["Return to the content-conversion step.", "Run the conversion again and confirm that it produces content.", "Retry the save."],
      keywords: "converted content json empty save",
    },
    38: {
      title: "Replace the unsupported embedded image data",
      summary: "NoDoc could not read the embedded image data because it is incomplete or in an unsupported format.",
      steps: ["Remove the affected embedded image from the page.", "Insert the original image file again.", "Preview the page to confirm that the image loads."],
      keywords: "image data uri embedded invalid unsupported",
    },
    39: {
      title: "Refresh the page list and set its order again",
      summary: "NoDoc did not receive a new page order to save.",
      steps: ["Refresh the page list.", "Arrange the pages in the intended order.", "Save the order again."],
      guide: ["#nodoc:2:2", "Read about adding and managing pages"],
      keywords: "page order json missing save",
    },
    40: {
      title: "Select an article before changing page order",
      summary: "NoDoc cannot apply the page-order change without knowing which article contains the pages.",
      steps: ["Select the intended article.", "Open its page list and arrange the pages.", "Save the order."],
      guide: ["#nodoc:2:2", "Read about adding and managing pages"],
      keywords: "article guid missing page order select",
    },
    41: {
      title: "Re-select the Focus Version before saving",
      summary: "The Focus Version selection is not valid for this save.",
      steps: ["Keep a copy of your edits.", "Open the version selector and choose a valid Focus Version.", "Save again and confirm the result."],
      guide: ["#nodoc:4:1", "Read about managing versions"],
      keywords: "focus version validation save",
    },
    42: {
      title: "Select a page and both required versions",
      summary: "The message can indicate that no page is selected or that the article version or Focus Version is missing.",
      steps: ["Keep a copy of your current edits.", "Select the page you intend to save.", "Check that both the article version and Focus Version are selected, then save."],
      guide: ["#nodoc:4:1", "Read about managing versions"],
      keywords: "page selected version context article focus version save",
    },
    43: {
      title: "The selected page version no longer matches one record",
      summary: "NoDoc could not confirm exactly one version record for this save, so it did not confirm that the page was saved.",
      steps: ["Keep a copy of your edits.", "Reopen the page and select its version again.", "Check the saved page before reapplying changes. If the same message returns, contact the application administrator."],
      guide: ["#nodoc:4:1", "Read about managing versions"],
      keywords: "toc version record selected save exact match",
    },
    44: {
      title: "The article import could not be completed",
      summary: "The import failed. The appended details may contain the specific server reason; those details can be empty.",
      steps: ["Keep the complete error text, including any details after “Details:”.", "Check the article and address any issue identified by those details.", "Retry the import only after you understand or correct the reported issue; contact the administrator if the details are empty or unclear."],
      keywords: "article import failure details error",
    },
    45: {
      title: "Check the generation status before submitting again",
      summary: "The generation request or its results could not be found.",
      steps: ["Open the current generation status.", "Check whether the request or its results are still available.", "Submit another request only after checking the first request's state."],
      keywords: "generation initiate request results could not found",
    },
    46: {
      title: "The deletion succeeded; the follow-up refresh failed",
      summary: "The page says the deletion was saved but the content refresh did not complete. Repeating the deletion could remove more content.",
      steps: ["Do not repeat the deletion.", "Check the table of contents to confirm the current state.", "Contact the application administrator and ask them to retry the content refresh."],
      guide: ["#nodoc:2:3", "Read about deleting an article or page"],
      keywords: "refresh deletion failed downstream content do not repeat",
    },
    47: {
      title: "Check OraHub before retrying the table-of-contents update",
      summary: "NoDoc could not confirm that the table of contents was updated in OraHub.",
      steps: ["Keep the service status shown in the message.", "Open the current OraHub table of contents and check whether the update is already present.", "If it is missing or the problem continues, contact the application administrator before retrying."],
      visual: { src: "../content/nodoc/images/how_to_upload_from_orahub.png", alt: "NoDoc Upload From OraHub dialog with branch, folder, and file selectors", caption: "Check the selected OraHub branch, folder, and file before retrying an update." },
      guide: ["#nodoc:5:2", "Read about exporting reviewed content to OraHub"],
      keywords: "orahub toc api status service update",
    },
    48: {
      title: "Refresh the version list and reopen the page",
      summary: "NoDoc could not find the selected page in the selected version.",
      steps: ["Refresh the version list.", "Select a version that is available for the page.", "Reopen the page from that version."],
      guide: ["#nodoc:4:1", "Read about managing versions"],
      keywords: "toc versions row selected page version",
    },
    49: {
      title: "Refresh the draft list and check the saved page",
      summary: "NoDoc could not find the draft to mark as reviewed.",
      steps: ["Refresh the draft list.", "Check the saved page and current draft status.", "Continue with a merge only after confirming the intended draft is present."],
      keywords: "draft record found reviewed merge",
    },
    50: {
      title: "The generation error details could not be retrieved",
      summary: "NoDoc could not load the details for this generation error.",
      steps: ["Check the current status of the generation request.", "If the request is still active, continue checking that request rather than submitting another.", "Contact the application administrator if the details remain unavailable."],
      keywords: "generation unknown error details retrieve",
    },
    51: {
      title: "Reinsert the original image file",
      summary: "The editor could not load the image and will remove it from the editor content.",
      steps: ["Locate the original image file.", "Insert that file again in the editor.", "Confirm the image loads before saving or leaving the page."],
      keywords: "image fetch failed editor removed",
    },
    52: {
      title: "Select text in the editor before applying the AI action",
      summary: "The AI action received an empty text selection.",
      steps: ["Select the text you want the AI action to use inside the editor.", "Confirm the text is highlighted.", "Apply the AI action again."],
      guide: ["#nodoc:3:2", "Read about editing and drafts"],
      keywords: "ai action text selection empty",
    },
  };

  var MAX_RESULTS = 8;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalize(value) {
    return String(value || "")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function queryTerms(value) {
    var normalized = normalize(value)
      .replace(/\b(request|mail|app|application) id(?:\s+[a-z0-9]+)*$/g, "$1 id")
      .replace(/\bservice status(?:\s+[a-z0-9]+)*$/g, "service status")
      .replace(/\brow count(?:\s+[a-z0-9]+)*$/g, "row count");
    var terms = normalized.split(/\s+/).filter(function (term) {
      return term.length > 1;
    });
    var words = terms.filter(function (term) {
      return !/\d/.test(term);
    });

    return words.length ? words : terms;
  }

  function searchEntries(entries, query) {
    var terms = queryTerms(query);

    if (!terms.length) {
      return [];
    }

    return entries.map(function (entry) {
      var item = guidance[entry.id] || {};
      var fields = {
        title: normalize(item.title),
        area: normalize(entry.area),
        previous: normalize(entry.previous),
        updated: normalize(entry.updated),
        notes: normalize((entry.notes || []).join(" ")),
        other: normalize([item.summary, item.keywords, (item.steps || []).join(" ")].join(" ")),
      };
      var allText = Object.keys(fields).map(function (key) { return fields[key]; }).join(" ");
      var completeMatch = terms.every(function (term) { return allText.indexOf(term) >= 0; });

      if (!completeMatch) {
        return null;
      }

      var score = 0;
      terms.forEach(function (term) {
        if (fields.title.indexOf(term) >= 0) score += 9;
        if (fields.area.indexOf(term) >= 0) score += 6;
        if (fields.previous.indexOf(term) >= 0 || fields.updated.indexOf(term) >= 0) score += 4;
        if (fields.other.indexOf(term) >= 0) score += 2;
        if (fields.notes.indexOf(term) >= 0) score += 1;
      });

      return { entry: entry, item: item, score: score };
    }).filter(Boolean).sort(function (left, right) {
      return right.score - left.score || left.entry.id - right.entry.id;
    });
  }

  function renderVisual(item) {
    if (!item.visual) return "";
    return [
      '<figure class="nodoc-error-visual">',
      '  <a href="', escapeHtml(item.visual.src), '" target="_blank" rel="noopener">',
      '    <img src="', escapeHtml(item.visual.src), '" alt="', escapeHtml(item.visual.alt), '" loading="lazy" decoding="async">',
      '  </a>',
      '  <figcaption>', escapeHtml(item.visual.caption), '</figcaption>',
      '</figure>',
    ].join("");
  }

  function renderResult(result) {
    var entry = result.entry;
    var item = result.item;
    var steps = (item.steps || []).map(function (step) {
      return "<li>" + escapeHtml(step) + "</li>";
    }).join("");
    var notes = (entry.notes || []).map(function (note) {
      return '<p class="nodoc-error-source-note"><strong>Source note:</strong> ' + escapeHtml(note) + "</p>";
    }).join("");
    var guide = item.guide && item.guide[0].indexOf("#nodoc:") === 0
      ? '<p class="nodoc-error-related"><a href="' + escapeHtml(item.guide[0]) + '">' + escapeHtml(item.guide[1]) + "</a></p>"
      : "";

    return [
      '<article class="nodoc-error-result" role="listitem">',
      '  <div class="nodoc-error-result-topline"><span class="nodoc-error-number">Entry ', String(entry.id).padStart(2, "0"), '</span>',
      item.kind === "status" ? '<span class="nodoc-error-kind">Status message</span>' : "",
      '  </div>',
      '  <h3>', escapeHtml(item.title || entry.area), '</h3>',
      '  <p class="nodoc-error-area">', escapeHtml(entry.area), '</p>',
      '  <p class="nodoc-error-summary">', escapeHtml(item.summary || "No additional details are available."), '</p>',
      '  <h4>Steps to try</h4>',
      '  <ol>', steps, '</ol>',
      renderVisual(item),
      guide,
      notes,
      '</article>',
    ].join("");
  }

  window.NoDocTroubleshooting = {
    guidance: guidance,
    searchEntries: searchEntries
  };

  function init() {
    var form = document.getElementById("nodocErrorSearchForm");
    var input = document.getElementById("nodocErrorSearchInput");
    var clearButton = document.getElementById("nodocErrorClearButton");
    var status = document.getElementById("nodocErrorSearchStatus");
    var resultsNode = document.getElementById("nodocErrorSearchResults");
    var entries = window.NoDocErrorCatalog && window.NoDocErrorCatalog.entries;

    if (!form || !input || !clearButton || !status || !resultsNode) {
      return;
    }

    if (!Array.isArray(entries) || entries.length !== 52) {
      status.textContent = "The error catalog could not be loaded. Refresh the page and try again.";
      return;
    }

    function updateResults() {
      var query = input.value.trim();
      var matches;

      resultsNode.innerHTML = "";
      if (!query) {
        resultsNode.hidden = true;
        status.textContent = "Enter a message or a few distinctive words to search.";
        return;
      }

      matches = searchEntries(entries, query);
      if (!queryTerms(query).length) {
        resultsNode.hidden = true;
        status.textContent = "Search using words from the message. Changing numbers and request IDs are ignored.";
        return;
      }

      if (!matches.length) {
        resultsNode.hidden = true;
        status.textContent = "No matching message found. Try fewer words or a distinctive phrase; changing values such as request IDs are ignored.";
        return;
      }

      resultsNode.innerHTML = matches.slice(0, MAX_RESULTS).map(renderResult).join("");
      resultsNode.hidden = false;
      status.textContent = matches.length > MAX_RESULTS
        ? "Showing the top " + MAX_RESULTS + " of " + matches.length + " matches. Add another distinctive word to narrow the results."
        : matches.length + (matches.length === 1 ? " matching entry." : " matching entries.");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      updateResults();
    });
    input.addEventListener("input", updateResults);
    clearButton.addEventListener("click", function () {
      input.value = "";
      updateResults();
      input.focus();
    });

    status.textContent = "Search original or revised wording, error area, or suggested action. Changing values such as request IDs are ignored.";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}());
