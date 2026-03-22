import { chromium, type Browser } from "playwright-core";

let browserPromise: Promise<Browser> | null = null;

function resolveChromePath(): string {
  const override = process.env.CHROME_EXECUTABLE_PATH;
  if (override) {
    return override;
  }

  return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
}

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      executablePath: resolveChromePath(),
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });
  }

  return browserPromise;
}
