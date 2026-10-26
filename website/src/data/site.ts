// Facts shared by every page. The version comes from the extension manifest,
// so the site never states a version the extension doesn't have.
import manifest from "../../../extension/manifest.json";

export const siteUrl = "https://mail-warmer.rheav.dev";
export const storeUrl =
  "https://chromewebstore.google.com/detail/mail-warmer/ikibedkcbfcilgignjobgdlioninmige";
export const repoUrl = "https://github.com/rheav/mail-warmer";
export const extensionVersion: string = manifest.version;
