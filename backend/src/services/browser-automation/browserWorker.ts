import path from 'path';
import fs from 'fs';
import { validateSafeUrl } from './urlSafety';
import { analyzeFormHtml, DetectedFormStructure } from './formDetector';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

export interface AutomationExecutionResult {
  success: boolean;
  requiresHumanAction: boolean;
  status: 'Ready to Submit' | 'Awaiting Human Verification' | 'Submitted' | 'Submission Unconfirmed' | 'Failed';
  message: string;
  screenshotPath?: string;
  confirmationReference?: string;
  detectedStructure?: DetectedFormStructure;
  fieldsFilled?: string[];
  error?: string;
}

class BrowserAutomationWorker {
  private isAvailable: boolean = false;
  private workerInitialized: boolean = false;
  private screenshotsDir: string;

  constructor() {
    this.screenshotsDir = path.resolve(__dirname, '../../../screenshots');
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  public async checkAvailability(): Promise<boolean> {
    try {
      const { chromium } = await import('playwright');
      this.isAvailable = true;
      this.workerInitialized = true;
      return true;
    } catch (err: any) {
      logger.warn(`Playwright browser automation unavailable: ${err.message}`);
      this.isAvailable = false;
      return false;
    }
  }

  public getStatus() {
    return {
      workerOnline: this.isAvailable,
      headless: env.PLAYWRIGHT_HEADLESS,
      timeoutMs: env.BROWSER_TIMEOUT_MS,
      screenshotsPath: this.screenshotsDir
    };
  }

  /**
   * Safe inspection of application page without filling or submitting.
   */
  public async inspectPage(url: string): Promise<{
    safe: boolean;
    reason?: string;
    detected?: DetectedFormStructure;
    screenshotFile?: string;
  }> {
    const safety = await validateSafeUrl(url);
    if (!safety.isSafe) {
      return { safe: false, reason: safety.reason };
    }

    const available = await this.checkAvailability();
    if (!available) {
      return {
        safe: true,
        reason: 'Browser automation worker is offline. Please install Playwright browser binaries (npx playwright install chromium).'
      };
    }

    const { chromium } = await import('playwright');
    let browser = null;
    try {
      browser = await chromium.launch({
        headless: env.PLAYWRIGHT_HEADLESS,
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 }
      });

      const page = await context.newPage();
      page.setDefaultTimeout(env.BROWSER_TIMEOUT_MS);

      // Revalidate target after any redirect
      page.on('response', async (response) => {
        const dest = response.url();
        const destCheck = await validateSafeUrl(dest);
        if (!destCheck.isSafe) {
          logger.warn(`Prohibited redirect detected to ${dest}. Aborting navigation.`);
          await page.close();
        }
      });

      await page.goto(safety.normalizedUrl!, { waitUntil: 'domcontentloaded', timeout: env.BROWSER_TIMEOUT_MS });

      const content = await page.content();
      const detected = analyzeFormHtml(content);

      // Capture screenshot evidence
      const screenshotFilename = `inspect-${Date.now()}.png`;
      const screenshotFilePath = path.join(this.screenshotsDir, screenshotFilename);
      await page.screenshot({ path: screenshotFilePath, fullPage: false });

      await browser.close();

      return {
        safe: true,
        detected,
        screenshotFile: `/screenshots/${screenshotFilename}`
      };
    } catch (err: any) {
      if (browser) await browser.close();
      logger.error('Failed to inspect application page:', err.message);
      return { safe: false, reason: err.message };
    }
  }

  /**
   * Fill application form with verified profile and CV, capture preview screenshot,
   * but do not submit unless explicitly approved in Mode C.
   */
  public async prepareAndFillApplication(params: {
    applicationUrl: string;
    profile: {
      fullName: string;
      email: string;
      phone: string;
      portfolioUrl: string;
      linkedinUrl: string;
      githubUrl: string;
    };
    cvFilePath?: string;
    coverLetterText?: string;
    shouldSubmit: boolean;
  }): Promise<AutomationExecutionResult> {
    const { applicationUrl, profile, cvFilePath, coverLetterText, shouldSubmit } = params;

    const safety = await validateSafeUrl(applicationUrl);
    if (!safety.isSafe) {
      return {
        success: false,
        requiresHumanAction: true,
        status: 'Failed',
        message: `Safety check rejected URL: ${safety.reason}`
      };
    }

    const available = await this.checkAvailability();
    if (!available) {
      return {
        success: false,
        requiresHumanAction: true,
        status: 'Awaiting Human Verification',
        message: 'Browser worker is offline. Cannot automate form fill. Please open link manually.'
      };
    }

    // Verify CV exists if a CV path was passed
    if (cvFilePath && !fs.existsSync(cvFilePath)) {
      return {
        success: false,
        requiresHumanAction: true,
        status: 'Failed',
        message: `CV file does not exist on disk at "${cvFilePath}". Please upload a valid CV first.`
      };
    }

    const { chromium } = await import('playwright');
    let browser = null;

    try {
      browser = await chromium.launch({
        headless: env.PLAYWRIGHT_HEADLESS,
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 850 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();
      page.setDefaultTimeout(env.BROWSER_TIMEOUT_MS);

      await page.goto(safety.normalizedUrl!, { waitUntil: 'networkidle', timeout: env.BROWSER_TIMEOUT_MS }).catch(() => {
        // Fallback if networkidle hangs on tracking scripts
        return page.goto(safety.normalizedUrl!, { waitUntil: 'domcontentloaded' });
      });

      const htmlContent = await page.content();
      const detected = analyzeFormHtml(htmlContent);

      // Check for CAPTCHA, Cloudflare, or OTP
      if (detected.hasCaptchaOrCloudflare) {
        const screenshotFilename = `captcha-${Date.now()}.png`;
        const screenshotPath = path.join(this.screenshotsDir, screenshotFilename);
        await page.screenshot({ path: screenshotPath });
        await browser.close();

        return {
          success: false,
          requiresHumanAction: true,
          status: 'Awaiting Human Verification',
          message: `Security challenge (${detected.captchaType || 'CAPTCHA'}) detected on application page. Manual human verification required.`,
          screenshotPath: `/screenshots/${screenshotFilename}`,
          detectedStructure: detected
        };
      }

      const fieldsFilled: string[] = [];

      // Safe resilient locators
      // Name
      const nameLocator = page.locator('input[name*="name" i], input[id*="name" i], input[autocomplete="name"]').first();
      if (await nameLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
        await nameLocator.fill(profile.fullName);
        fieldsFilled.push('Full Name');
      }

      // Email
      const emailLocator = page.locator('input[type="email" i], input[name*="email" i], input[id*="email" i]').first();
      if (await emailLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
        await emailLocator.fill(profile.email);
        fieldsFilled.push('Email');
      }

      // Phone
      const phoneLocator = page.locator('input[type="tel" i], input[name*="phone" i], input[id*="phone" i]').first();
      if (await phoneLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
        await phoneLocator.fill(profile.phone);
        fieldsFilled.push('Phone');
      }

      // LinkedIn
      const linkedinLocator = page.locator('input[name*="linkedin" i], input[id*="linkedin" i]').first();
      if (await linkedinLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
        await linkedinLocator.fill(profile.linkedinUrl);
        fieldsFilled.push('LinkedIn URL');
      }

      // Portfolio / Website
      const portfolioLocator = page.locator('input[name*="portfolio" i], input[name*="website" i], input[id*="portfolio" i]').first();
      if (await portfolioLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
        await portfolioLocator.fill(profile.portfolioUrl);
        fieldsFilled.push('Portfolio URL');
      }

      // GitHub
      const githubLocator = page.locator('input[name*="github" i], input[id*="github" i]').first();
      if (await githubLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
        await githubLocator.fill(profile.githubUrl);
        fieldsFilled.push('GitHub URL');
      }

      // Cover Letter
      if (coverLetterText) {
        const coverLocator = page.locator('textarea[name*="cover" i], textarea[id*="cover" i], textarea').first();
        if (await coverLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
          await coverLocator.fill(coverLetterText);
          fieldsFilled.push('Cover Letter');
        }
      }

      // CV Upload
      if (cvFilePath && fs.existsSync(cvFilePath)) {
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(cvFilePath);
          fieldsFilled.push('Resume File Uploaded');
        }
      }

      // Capture screenshot of filled form
      const screenshotFilename = `filled-${Date.now()}.png`;
      const screenshotPath = path.join(this.screenshotsDir, screenshotFilename);
      await page.screenshot({ path: screenshotPath });

      // If shouldSubmit is false (Mode A or Mode B awaiting approval)
      if (!shouldSubmit) {
        await browser.close();
        return {
          success: true,
          requiresHumanAction: false,
          status: 'Ready to Submit',
          message: 'Application form successfully filled and previewed. Awaiting your explicit approval to submit.',
          screenshotPath: `/screenshots/${screenshotFilename}`,
          fieldsFilled,
          detectedStructure: detected
        };
      }

      // If authorized to submit (Mode C or user-clicked Submit in Mode B)
      const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Apply")').first();
      if (!(await submitBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
        await browser.close();
        return {
          success: false,
          requiresHumanAction: true,
          status: 'Awaiting Human Verification',
          message: 'Submit button not clearly identifiable or obscured. Manual review needed.',
          screenshotPath: `/screenshots/${screenshotFilename}`,
          fieldsFilled
        };
      }

      // Click submit
      await submitBtn.click();
      await page.waitForTimeout(3000);

      // Verify post-submission confirmation
      const postHtml = (await page.content()).toLowerCase();
      const confirmed =
        postHtml.includes('thank you for applying') ||
        postHtml.includes('application received') ||
        postHtml.includes('successfully submitted') ||
        postHtml.includes('application has been submitted') ||
        page.url().includes('success') ||
        page.url().includes('confirmation') ||
        page.url().includes('thank-you');

      const finalScreenshotFilename = `outcome-${Date.now()}.png`;
      const finalScreenshotPath = path.join(this.screenshotsDir, finalScreenshotFilename);
      await page.screenshot({ path: finalScreenshotPath });
      await browser.close();

      if (confirmed) {
        return {
          success: true,
          requiresHumanAction: false,
          status: 'Submitted',
          message: 'Application successfully verified and submitted to company.',
          screenshotPath: `/screenshots/${finalScreenshotFilename}`,
          confirmationReference: `REF-${Date.now()}`,
          fieldsFilled
        };
      } else {
        return {
          success: false,
          requiresHumanAction: true,
          status: 'Submission Unconfirmed',
          message: 'Form submit clicked, but explicit confirmation message could not be reliably verified. Please review screenshot evidence.',
          screenshotPath: `/screenshots/${finalScreenshotFilename}`,
          fieldsFilled
        };
      }

    } catch (err: any) {
      if (browser) await browser.close();
      logger.error('Browser worker execution error:', err.message);
      return {
        success: false,
        requiresHumanAction: true,
        status: 'Failed',
        message: `Browser automation execution error: ${err.message}`,
        error: err.message
      };
    }
  }
}

export const browserWorker = new BrowserAutomationWorker();
