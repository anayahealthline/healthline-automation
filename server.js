const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json());

// Add a root route
app.get('/', (req, res) => {
  res.send('Healthline Automation Service is running!');
});

// Existing /process-urls route
app.post('/process-urls', async (req, res) => {
  const urls = req.body.urls;
  const results = [];

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Extract the article ID
      const articleId = await page.evaluate(() => {
        return HL.ga.articleId;
      });

      if (!articleId) {
        throw new Error('Article ID not found');
      }

      // Navigate to the editor URL
      const editorUrl = `https://post.${new URL(url).host.replace('www.', '')}/wp-admin/post.php?post=${articleId}&action=edit`;
      await page.goto(editorUrl, { waitUntil: 'networkidle2' });

      // Remove Microsite ID
      await page.evaluate(() => {
        const micrositeIdField = document.querySelector("input[name='acf[field_hl_post_settings_meta-microsite_id]']");
        if (micrositeIdField) micrositeIdField.value = '';
      });

      // Remove Program
      await page.evaluate(() => {
        const programSelect = document.querySelector("select[name='acf[field_program_taxonomy_meta-field_program_tax]']");
        if (programSelect) programSelect.selectedIndex = -1;
      });

      // Click the Update button
      await page.evaluate(() => {
        const updateButton = document.querySelector("button.editor-post-publish-button");
        if (updateButton) updateButton.click();
      });

      results.push({ url, status: 'Completed', error: null });
    } catch (error) {
      results.push({ url, status: 'Failed', error: error.message });
    }
  }

  await browser.close();
  res.json(results);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
