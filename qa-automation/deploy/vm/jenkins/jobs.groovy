def gitUrl = System.getenv("QA_GIT_URL") ?: "https://github.com/oracle-livelabs/common.git"
def gitBranch = System.getenv("QA_GIT_BRANCH") ?: "*/main"
def gitCredentialId = System.getenv("QA_GIT_CREDENTIAL_ID") ?: ""
def publicUrl = System.getenv("QA_PUBLIC_URL").replaceAll('/+$', '')
def nightlyCron = System.getenv("QA_NIGHTLY_CRON")
def parCron = System.getenv("QA_PAR_CRON")
def authTargetUrl = System.getenv("QA_AUTH_TARGET_URL") ?: ""
def baseUrl = System.getenv("QA_BASE_URL") ?: ""

pipelineJob("livelabs-qa-engine") {
  displayName("LiveLabs QA engine")
  description("Managed execution job. Start normal work from LiveLabs PAR audit or LiveLabs overall regression.")
  parameters {
    choiceParam("RUN_PROFILE", ["pr-slice", "nightly-full", "manual-items", "par-audit"], "Execution profile")
    stringParam("BASE_URL", "", "Optional LiveLabs base URL")
    stringParam("BROWSER_CHANNEL", "", "Optional browser channel")
    booleanParam("INSTALL_PLAYWRIGHT_BROWSERS", false, "Install browser binaries before the run")
    stringParam("AUTH_TARGET_URL", "", "Optional private LiveLabs URL used to create auth state")
    stringParam("LIVELABS_USERNAME_CREDENTIAL_ID", "", "Jenkins username credential ID")
    stringParam("LIVELABS_SECRET_CREDENTIAL_ID", "", "Jenkins sign-in secret credential ID")
    stringParam("CATALOG_MAX_PAGES", "", "Catalog page cap")
    stringParam("CATALOG_MAX_ITEMS", "", "Catalog item cap")
    stringParam("CATALOG_ITEM_IDS", "", "Comma-separated targeted item IDs")
    stringParam("SHARD_TOTAL", "1", "Generated test shards")
    stringParam("TEST_WORKERS", "5", "Playwright workers")
    stringParam("TEST_RETRIES", "1", "Playwright retries")
    stringParam("CATALOG_RETRIES", "3", "Catalog crawler retries")
    stringParam("CATALOG_RETRY_DELAY_MS", "5000", "Catalog retry delay")
    stringParam("CONTENT_LINK_LIMIT", "50", "Visible links checked per page; 0 checks all")
    stringParam("PAR_WORKERS", "2", "Parallel PAR catalog items")
    stringParam("PAR_DISCOVERY_CONCURRENCY", "3", "Parallel source files per item")
    stringParam("PAR_SOURCE_TIMEOUT_MS", "45000", "Source fetch timeout")
    stringParam("PAR_RETRIES", "2", "PAR probe retries")
    stringParam("PAR_RETRY_DELAY_MS", "1500", "PAR retry delay")
    stringParam("PAR_TIMEOUT_MS", "20000", "PAR probe timeout")
    stringParam("PAR_CHECK_CONCURRENCY", "4", "Parallel PAR probes per item")
  }
  definition {
    cpsScm {
      scm {
        git {
          remote {
            url(gitUrl)
            if (gitCredentialId) {
              credentials(gitCredentialId)
            }
          }
          branch(gitBranch)
          extensions {
            cloneOptions {
              shallow(true)
              depth(1)
              noTags(true)
              timeout(20)
            }
          }
        }
      }
      scriptPath("qa-automation/Jenkinsfile")
      lightweight(true)
    }
  }
}

def parPipeline = '''
pipeline {
  agent none
  options {
    disableConcurrentBuilds()
    timestamps()
    timeout(time: 12, unit: "HOURS")
  }
  stages {
    stage("Run PAR audit") {
      steps {
        script {
          def downstream = build(
            job: "livelabs-qa-engine",
            wait: true,
            propagate: false,
            parameters: [
              string(name: "RUN_PROFILE", value: "par-audit"),
              string(name: "BASE_URL", value: params.BASE_URL),
              string(name: "BROWSER_CHANNEL", value: ""),
              booleanParam(name: "INSTALL_PLAYWRIGHT_BROWSERS", value: false),
              string(name: "AUTH_TARGET_URL", value: params.AUTH_TARGET_URL),
              string(name: "LIVELABS_USERNAME_CREDENTIAL_ID", value: "livelabs-username"),
              string(name: "LIVELABS_SECRET_CREDENTIAL_ID", value: "livelabs-secret"),
              string(name: "CATALOG_MAX_PAGES", value: params.CATALOG_MAX_PAGES),
              string(name: "CATALOG_MAX_ITEMS", value: params.CATALOG_MAX_ITEMS),
              string(name: "CATALOG_ITEM_IDS", value: params.CATALOG_ITEM_IDS?.trim() ?: ""),
              string(name: "SHARD_TOTAL", value: "1"),
              string(name: "TEST_WORKERS", value: "1"),
              string(name: "TEST_RETRIES", value: "1"),
              string(name: "CATALOG_RETRIES", value: "3"),
              string(name: "CATALOG_RETRY_DELAY_MS", value: "5000"),
              string(name: "CONTENT_LINK_LIMIT", value: "0"),
              string(name: "PAR_WORKERS", value: params.PAR_WORKERS),
              string(name: "PAR_DISCOVERY_CONCURRENCY", value: params.PAR_DISCOVERY_CONCURRENCY),
              string(name: "PAR_SOURCE_TIMEOUT_MS", value: params.PAR_SOURCE_TIMEOUT_MS),
              string(name: "PAR_RETRIES", value: params.PAR_RETRIES),
              string(name: "PAR_RETRY_DELAY_MS", value: params.PAR_RETRY_DELAY_MS),
              string(name: "PAR_TIMEOUT_MS", value: params.PAR_TIMEOUT_MS),
              string(name: "PAR_CHECK_CONCURRENCY", value: params.PAR_CHECK_CONCURRENCY)
            ]
          )
          currentBuild.description = "Engine #${downstream.number}: ${downstream.result}"
          if (downstream.result == "UNSTABLE") {
            unstable("The audit ran, but report publishing or another post-run operation needs attention.")
          } else if (downstream.result != "SUCCESS") {
            error("PAR audit failed in engine build #${downstream.number}.")
          }
        }
      }
    }
  }
}
'''.stripIndent()

pipelineJob("livelabs-par-audit") {
  displayName("LiveLabs PAR audit")
  description("Weekly specialist scan for stale PAR links. Reports: ${publicUrl}/par/")
  parameters {
    stringParam("BASE_URL", baseUrl, "Optional LiveLabs base URL override")
    stringParam("AUTH_TARGET_URL", authTargetUrl, "Optional private content sign-in target")
    stringParam("CATALOG_MAX_PAGES", "250", "Catalog pages to crawl")
    stringParam("CATALOG_MAX_ITEMS", "", "Leave blank for every catalog item")
    stringParam("CATALOG_ITEM_IDS", "", "Optional comma-separated WMS IDs for a targeted PAR retest")
    stringParam("PAR_WORKERS", "2", "Catalog items checked in parallel")
    stringParam("PAR_DISCOVERY_CONCURRENCY", "3", "Workshop files scanned in parallel per item")
    stringParam("PAR_SOURCE_TIMEOUT_MS", "45000", "Source fetch timeout")
    stringParam("PAR_RETRIES", "2", "Retries for temporary PAR responses")
    stringParam("PAR_RETRY_DELAY_MS", "1500", "Delay between PAR retries")
    stringParam("PAR_TIMEOUT_MS", "20000", "Timeout for each PAR probe")
    stringParam("PAR_CHECK_CONCURRENCY", "4", "PAR probes in parallel per item")
  }
  triggers {
    cron(parCron)
  }
  definition {
    cps {
      script(parPipeline)
      sandbox(true)
    }
  }
}

def regressionPipeline = '''
pipeline {
  agent none
  options {
    disableConcurrentBuilds()
    timestamps()
    timeout(time: 12, unit: "HOURS")
  }
  stages {
    stage("Run overall regression") {
      steps {
        script {
          def targeted = params.CATALOG_ITEM_IDS?.trim()
          def profile = targeted ? "manual-items" : "nightly-full"
          def downstream = build(
            job: "livelabs-qa-engine",
            wait: true,
            propagate: false,
            parameters: [
              string(name: "RUN_PROFILE", value: profile),
              string(name: "BASE_URL", value: params.BASE_URL),
              string(name: "BROWSER_CHANNEL", value: ""),
              booleanParam(name: "INSTALL_PLAYWRIGHT_BROWSERS", value: false),
              string(name: "AUTH_TARGET_URL", value: params.AUTH_TARGET_URL),
              string(name: "LIVELABS_USERNAME_CREDENTIAL_ID", value: "livelabs-username"),
              string(name: "LIVELABS_SECRET_CREDENTIAL_ID", value: "livelabs-secret"),
              string(name: "CATALOG_MAX_PAGES", value: params.CATALOG_MAX_PAGES),
              string(name: "CATALOG_MAX_ITEMS", value: params.CATALOG_MAX_ITEMS),
              string(name: "CATALOG_ITEM_IDS", value: targeted ?: ""),
              string(name: "SHARD_TOTAL", value: "1"),
              string(name: "TEST_WORKERS", value: params.TEST_WORKERS),
              string(name: "TEST_RETRIES", value: params.TEST_RETRIES),
              string(name: "CATALOG_RETRIES", value: "3"),
              string(name: "CATALOG_RETRY_DELAY_MS", value: "5000"),
              string(name: "CONTENT_LINK_LIMIT", value: params.CONTENT_LINK_LIMIT),
              string(name: "PAR_WORKERS", value: "2"),
              string(name: "PAR_DISCOVERY_CONCURRENCY", value: "3"),
              string(name: "PAR_SOURCE_TIMEOUT_MS", value: "45000"),
              string(name: "PAR_RETRIES", value: "2"),
              string(name: "PAR_RETRY_DELAY_MS", value: "1500"),
              string(name: "PAR_TIMEOUT_MS", value: "20000"),
              string(name: "PAR_CHECK_CONCURRENCY", value: "4")
            ]
          )
          currentBuild.description = "Engine #${downstream.number}: ${downstream.result}"
          if (downstream.result == "UNSTABLE") {
            unstable("The regression ran, but report publishing or another post-run operation needs attention.")
          } else if (downstream.result != "SUCCESS") {
            error("Regression failed in engine build #${downstream.number}.")
          }
        }
      }
    }
  }
}
'''.stripIndent()

pipelineJob("livelabs-overall-regression") {
  displayName("LiveLabs overall regression")
  description("Nightly full regression. Enter item IDs for a targeted rerun instead. Reports: ${publicUrl}/regression/")
  parameters {
    stringParam("BASE_URL", baseUrl, "Optional LiveLabs base URL override")
    stringParam("AUTH_TARGET_URL", authTargetUrl, "Optional private content sign-in target")
    stringParam("CATALOG_MAX_PAGES", "250", "Catalog pages to crawl")
    stringParam("CATALOG_MAX_ITEMS", "", "Leave blank for every catalog item")
    stringParam("CATALOG_ITEM_IDS", "", "Optional comma-separated IDs for a targeted rerun")
    stringParam("TEST_WORKERS", "5", "Playwright workers in the single combined report run")
    stringParam("TEST_RETRIES", "1", "Retry count for temporary failures")
    stringParam("CONTENT_LINK_LIMIT", "50", "Visible links checked per page; use 0 for all")
  }
  triggers {
    cron(nightlyCron)
  }
  definition {
    cps {
      script(regressionPipeline)
      sandbox(true)
    }
  }
}
