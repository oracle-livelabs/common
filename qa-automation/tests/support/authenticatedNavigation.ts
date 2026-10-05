import type { Page } from "@playwright/test";

import { OracleSignInPage } from "../../pages/platform/oracleSignInPage.js";
import type { AuthRuntimeConfig } from "./authRuntime.js";

export async function signInIfRequired(
  page: Page,
  authRuntime: AuthRuntimeConfig,
  contextName: string,
): Promise<boolean> {
  const signInPage = new OracleSignInPage(page);

  if (!signInPage.isCurrentPage()) {
    return false;
  }

  if (!authRuntime.hasCredentials || !authRuntime.username || !authRuntime.password) {
    throw new Error(
      `${contextName} requires Oracle sign-in. Add QA_LIVELABS_USERNAME and QA_LIVELABS_PASSWORD to qa-automation/.env.`,
    );
  }

  await signInPage.signIn(authRuntime.username, authRuntime.password);
  return true;
}
