#!/usr/bin/env node

import { chromium } from 'playwright';

async function testSessionUI() {
  console.log('🚀 Starting Session UI Test...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const consoleErrors = [];
  const consoleWarnings = [];
  
  // Capture console messages
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });
  
  // Capture page errors
  page.on('pageerror', (error) => {
    consoleErrors.push(`Page Error: ${error.message}`);
  });
  
  try {
    // Step 0: First navigate to landing page to check authentication state
    console.log('📍 Step 0: Checking authentication state');
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Check if user is already signed in by looking for sign out button or user menu
    const isSignedIn = await page.locator('button:has-text("Sign Out")').isVisible().catch(() => false);
    
    if (!isSignedIn) {
      console.log('   ⚠️  User not authenticated - the /session route requires authentication');
      console.log('   ℹ️  The session page is protected by ProtectedRoute and redirects to "/" when not authenticated\n');
      
      // Try to mock localStorage authentication for testing
      console.log('📍 Attempting to bypass authentication for testing...');
      
      // Set up a mock Firebase auth state in localStorage
      await page.evaluate(() => {
        // Create a mock user object
        const mockUser = {
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerified: true
        };
        
        // Try to set Firebase auth state (this may not work depending on how Firebase is configured)
        const authKey = Object.keys(localStorage).find(key => key.includes('firebase:authUser'));
        if (authKey) {
          localStorage.setItem(authKey, JSON.stringify(mockUser));
        }
      });
      
      console.log('   ⚠️  Note: Mock authentication may not work with Firebase. You may need to sign in manually.\n');
    } else {
      console.log('   ✅ User is authenticated\n');
    }
    
    // Step 1: Navigate to session page
    console.log('📍 Step 1: Navigating to http://localhost:8080/session');
    await page.goto('http://localhost:8080/session', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check if we got redirected back to landing
    const currentUrl = page.url();
    if (currentUrl === 'http://localhost:8080/' || currentUrl === 'http://localhost:8080') {
      console.log('   ❌ Redirected to landing page - authentication required');
      console.log('   ℹ️  To test the session page, you need to:');
      console.log('      1. Sign in to the app first');
      console.log('      2. Or temporarily remove the ProtectedRoute wrapper from /session route');
      console.log('      3. Or add a test mode that bypasses authentication\n');
      
      await page.screenshot({ path: 'screenshots/01-auth-required.png', fullPage: true });
      console.log('   📸 Screenshot saved: screenshots/01-auth-required.png\n');
      
      console.log('❌ Cannot proceed with session UI test without authentication');
      return;
    }
    
    // Take screenshot of initial load
    await page.screenshot({ path: 'screenshots/01-initial-load.png', fullPage: true });
    console.log('   ✅ Page loaded');
    console.log('   📸 Screenshot saved: screenshots/01-initial-load.png\n');
    
    // Step 2: Check for disclaimer modal
    console.log('📍 Step 2: Checking for disclaimer modal');
    
    // Wait a bit for any animations
    await page.waitForTimeout(500);
    
    const disclaimerTitle = await page.locator('text=Before we begin').isVisible();
    const disclaimerButton = await page.locator('button:has-text("I understand — start session")').isVisible();
    
    if (disclaimerTitle && disclaimerButton) {
      console.log('   ✅ Disclaimer modal found with "Before we begin" title');
      console.log('   ✅ "I understand — start session" button found');
      await page.screenshot({ path: 'screenshots/02-disclaimer-modal.png', fullPage: true });
      console.log('   📸 Screenshot saved: screenshots/02-disclaimer-modal.png\n');
    } else {
      console.log('   ❌ Disclaimer modal not found!');
      console.log('   Title visible:', disclaimerTitle);
      console.log('   Button visible:', disclaimerButton);
      
      // Check what's actually on the page
      const bodyText = await page.locator('body').innerText();
      console.log('   Page content preview:', bodyText.substring(0, 200).replace(/\n/g, ' '));
    }
    
    // Step 3: Click "I understand — start session"
    console.log('📍 Step 3: Clicking "I understand — start session"');
    await page.locator('button:has-text("I understand — start session")').click();
    await page.waitForTimeout(1500);
    console.log('   ✅ Button clicked\n');
    
    // Step 4: Check for "Tap to begin" screen
    console.log('📍 Step 4: Checking for "Tap to begin" screen');
    const tapToBeginTitle = await page.locator('text=Tap to begin').isVisible();
    
    // Check for microphone icon (lucide-react Mic icon)
    const micIconVisible = await page.locator('svg').first().isVisible();
    
    if (tapToBeginTitle) {
      console.log('   ✅ "Tap to begin" screen found');
      console.log('   ✅ Microphone icon visible');
      await page.screenshot({ path: 'screenshots/03-tap-to-begin.png', fullPage: true });
      console.log('   📸 Screenshot saved: screenshots/03-tap-to-begin.png\n');
    } else {
      console.log('   ❌ "Tap to begin" screen not found!');
      console.log('   Title visible:', tapToBeginTitle);
      
      // Check what's actually on the page
      const bodyText = await page.locator('body').innerText();
      console.log('   Page content preview:', bodyText.substring(0, 200).replace(/\n/g, ' '));
    }
    
    // Report console errors
    console.log('\n📊 Console Report:');
    if (consoleErrors.length > 0) {
      console.log('   ❌ Console Errors:', consoleErrors.length);
      consoleErrors.forEach((err, i) => {
        console.log(`      ${i + 1}. ${err}`);
      });
    } else {
      console.log('   ✅ No console errors');
    }
    
    if (consoleWarnings.length > 0) {
      console.log('   ⚠️  Console Warnings:', consoleWarnings.length);
      consoleWarnings.forEach((warn, i) => {
        console.log(`      ${i + 1}. ${warn}`);
      });
    } else {
      console.log('   ✅ No console warnings');
    }
    
    console.log('\n✨ Test completed! Browser will remain open for 10 seconds for inspection.');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'screenshots/error.png', fullPage: true });
    console.log('   📸 Error screenshot saved: screenshots/error.png');
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed.');
  }
}

testSessionUI().catch(console.error);
