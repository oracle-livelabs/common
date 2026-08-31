(function () {
      var url = new URL(window.location.href);
      var experience = url.searchParams.get("experience");
      var lab = url.searchParams.get("lab");
      var fullGuideHref = "https://" + "oracle-livelabs" + ".github.io/common/sample-livelabs-templates/create-labs/labs/workshops/livelabs/";
      var workshopExampleHref = "https://oracle-livelabs.github.io/developer/dev-ai-app-dev-finance/workshops/sandbox/";
      var wmsHref = "https://apex.oraclecorp.com/pls/apex/f?p=LIVELABS";
      var markdownLabMap = {
        "start-here": "introduction",
        "core-workflow": "1-labs-wms",
        "core-workshop-flow": "1-labs-wms",
        "validation-publish": "5-labs-qa-checks",
        "reuse-enhancements": "11-create-freesql",
        "tools-productivity": "13-labs-capture-screens-best-practices",
        "specialized-workflows": "10-create-sprints-workflow",
        "help-faq": "introduction"
      };
      var target;

      window.authorGuideFullGuideHref = fullGuideHref;
      window.authorGuideWorkshopExampleHref = workshopExampleHref;
      window.authorGuideWmsHref = wmsHref;
      document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll("[data-full-guide-link]").forEach(function (link) {
          link.href = fullGuideHref;
        });
        document.querySelectorAll("[data-workshop-example-link]").forEach(function (link) {
          link.href = workshopExampleHref;
        });
        document.querySelectorAll("[data-wms-link]").forEach(function (link) {
          link.href = wmsHref;
        });
      });

      if (experience === "classic" || experience === "markdown") {
        target = new URL(fullGuideHref);
        window.location.replace(target.toString());
        return;
      }

      if (!lab) {
        return;
      }

      if (markdownLabMap[lab]) {
        url.searchParams.set("lab", markdownLabMap[lab]);
      }

      target = new URL(fullGuideHref);
      target.search = url.search;
      window.location.replace(target.toString());
    }());
