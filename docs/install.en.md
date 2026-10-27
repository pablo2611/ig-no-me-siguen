# Step-by-step installation

[Home](../README.en.md) · [Español](instalacion.es.md)

## 1. Download the project

1. On the repository page select **Code**, then **Download ZIP**.
2. Extract it to a folder you intend to keep. Moving or deleting it after installation can prevent the browser from finding the extension.
3. Open the extracted folder and locate `manifest.json`, `background.js` and `popup.html`. If folders are nested, select the one containing `manifest.json`.

## 2. Load it in Microsoft Edge

1. Open Edge and enter `edge://extensions` in the address bar.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Select the folder containing `manifest.json`.
5. Confirm **IG - Quién no me sigue** appears. Pin it from the extensions menu if you wish.

## 3. Load it in Google Chrome

1. Open Chrome and visit `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**, then choose the folder containing `manifest.json`.
4. Find the extension in the extensions menu and optionally pin it.

## 4. Analyze the live account

1. Open Instagram in the same browser profile and sign in normally.
2. Open the extension and select **Analizar cuenta** (Analyze account).
3. Watch the status and wait for results. **Parar** stops the process; a continue option appears when saved progress is available.
4. Use **Exportar HTML** or **Exportar TXT** when confirmed results are available.

Live analysis uses unofficial interfaces, can fail or be limited, and has not been verified end to end for this version. Respect verification requests or limits. No request interval guarantees that an account will avoid restrictions.

## 5. Analyze a local export

1. In Instagram open **Accounts Center → Your information and permissions → Export your information**. Labels may vary.
2. Request **Followers and following** for all available time in **JSON** format, then download the archive when Instagram makes it available.
3. Extract the ZIP. Find the follower and following files, commonly in `connections/followers_and_following/`.
4. Open the extension and select **Analizar exportación local**.
5. Select all `followers_*.json` files under Followers and `following.json` or all its parts under Following, from the same export.
6. Select **Analizar archivos** and optionally **Descargar informe HTML**.

The extension cannot reliably detect missing parts or an incomplete date range. Results reflect the export date.

## 6. Update

Update the files in the same folder, then select **Reload** on the extension card in `edge://extensions` or `chrome://extensions`. If you download a new ZIP, replace the contents of the folder you originally loaded; loading a different folder may create a separate installation. Keep the extension and browser profile if you need to retain their local data.

See [Architecture and troubleshooting](how-it-works.en.md) for common issues.
