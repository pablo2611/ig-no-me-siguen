# Real-world case: rate-limit message during analysis

[Home](../README.en.md) · [Español](caso-real.es.md)

## Observed context

On October 27, 2026, a person opened extension version **2.9.4** in Edge and supplied a screenshot. The interface said Instagram had asked the extension to slow down and that it had paused until October 29. No results list appeared in that screenshot.

## Outcome and limits

- The interface displayed a pause message and did not show a completed analysis.
- The 48-hour period comes from the extension’s logic; the screenshot does not establish the duration of any restriction set by Instagram.
- The screenshot does not identify the specific request, confirm the account’s status or establish whether the detection was correct or a false positive.
- No usernames, lists, cookies, account screenshots or authentication data are published.

This documents an **observed failure or limitation**, not a successful live analysis. A complete test with an authorized account, a reliable comparison and permission to publish anonymized evidence is needed before claiming end-to-end live functionality. The repository’s popup and local-analysis screenshots were captured in a clean profile and show no real results.
