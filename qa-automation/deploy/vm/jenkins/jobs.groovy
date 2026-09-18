def gitUrl = System.getenv("QA_GIT_URL") ?: "https://github.com/oracle-livelabs/common.git"
def gitBranch = System.getenv("QA_GIT_BRANCH") ?: "*/main"
def gitCredentialId = System.getenv("QA_GIT_CREDENTIAL_ID") ?: ""
def publicUrl = System.getenv("QA_PUBLIC_URL").replaceAll('/+$', '')
def nightlyCron = System.getenv("QA_NIGHTLY_CRON")
def authTargetUrl = System.getenv("QA_AUTH_TARGET_URL") ?: ""
def baseUrl = System.getenv("QA_BASE_URL") ?: ""

def oldParJob = jenkins.model.Jenkins.get().getItem("livelabs-par-audit")
if (oldParJob != null) oldParJob.delete()

pipelineJob("livelabs-qa-engine") {
  displayName("LiveLabs QA engine")
  description("Managed execution job for the unified LiveLabs overall regression.")
  parameters {
    choiceParam("RUN_PROFILE", ["pr-slice", "nightly-full", "manual-items"], "Execution profile")
    stringParam("BASE_URL", "", "Optional LiveLabs base URL")
    stringParam("BROWSER_CHANNEL", "", "Optional browser channel")
    booleanParam("INSTALL_PLAYWRIGHT_BROWSERS", false, "Install browser binaries before the run")
    stringParam("AUTH_TARGET_URL", "", "Optional private LiveLabs URL used to create auth state")
    stringParam("LIVELABS_USERNAME_CREDENTIAL_ID", "", "Jenkins username credential ID")
    stringParam("LIVELABS_SECRET_CREDENTIAL_ID", "", "Jenkins sign-in secret credential ID")
    stringParam("CATALOG_MAX_PAGES", "", "Catalog page cap")
    stringParam("CATALOG_MAX_ITEMS", "", "Catalog item cap")
    stringParam("CATALOG_ITEM_IDS", "", "Comma-separated targeted item IDs")
    stringParam("TEST_WORKERS", "5", "Playwright workers")
    stringParam("TEST_RETRIES", "1", "Playwright retries")
    stringParam("CATALOG_RETRIES", "3", "Catalog crawler retries")
    stringParam("CATALOG_RETRY_DELAY_MS", "5000", "Catalog retry delay")
    stringParam("CONTENT_LINK_LIMIT", "50", "Visible links checked per page; 0 checks all")
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
              string(name: "TEST_WORKERS", value: params.TEST_WORKERS),
              string(name: "TEST_RETRIES", value: params.TEST_RETRIES),
              string(name: "CATALOG_RETRIES", value: "3"),
              string(name: "CATALOG_RETRY_DELAY_MS", value: "5000"),
              string(name: "CONTENT_LINK_LIMIT", value: params.CONTENT_LINK_LIMIT),
              string(name: "PAR_DISCOVERY_CONCURRENCY", value: "3"),
              string(name: "PAR_SOURCE_TIMEOUT_MS", value: "45000"),
              string(name: "PAR_RETRIES", value: "2"),
              string(name: "PAR_RETRY_DELAY_MS", value: "1500"),
              string(name: "PAR_TIMEOUT_MS", value: "20000"),
              string(name: "PAR_CHECK_CONCURRENCY", value: "4")
            ]
          )
          if (downstream.result == "UNSTABLE") {
            currentBuild.description = "Completed with issues - Engine #${downstream.number}"
            unstable("Completed with issues. Open the unified QA report to see what needs to be changed.")
          } else if (downstream.result != "SUCCESS") {
            currentBuild.description = "Run stopped - Engine #${downstream.number}"
            error("Regression failed in engine build #${downstream.number}.")
          } else {
            currentBuild.description = "Completed - Engine #${downstream.number}"
          }
        }
      }
    }
  }
}
'''.stripIndent()

pipelineJob("livelabs-overall-regression") {
  displayName("LiveLabs overall regression")
  description("All regression and PAR checks in one report. Enter item IDs for a targeted rerun. Reports: ${publicUrl}/regression/")
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
