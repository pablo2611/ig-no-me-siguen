# Architecture and troubleshooting

[Home](../README.en.md) · [Español](funcionamiento.es.md)

## Architecture

`popup.html` and `popup.js` provide the interface. `background.js` runs the background process, contacts Instagram in live mode, stores available progress in session storage, and manages pauses and exports. `local.html`, `local.js` and `local-core.js` compare selected JSON files in the browser. HTML reports can contain usernames and links: treat them as private.

In live mode the extension reads followed accounts and tries to determine reciprocity; only responses interpreted as a confirmed negative are listed. Accounts without relationship data remain unresolved. Changes or partial responses can make the result incomplete.

## Permissions

| Permission | Use in the code |
|---|---|
| `cookies` | Identify the signed-in session and prepare Instagram requests. |
| `storage` | Save state, progress, settings and pauses in the browser. |
| `downloads` | Save reports. |
| `notifications` | Show process notifications. |
| `tabs` | Open profiles and obtain the active-tab context. |
| `alarms` | Schedule automatic unfollow steps. |
| Instagram and image domains | Request live information and load available photos. |

## Troubleshooting

- **No session:** sign in to Instagram in the same Edge or Chrome profile and retry.
- **Limit, verification or block:** stop retrying, open Instagram and follow its instructions. The displayed 48 hours are an extension pause, not necessarily Instagram’s own restriction period.
- **Incomplete or unresolved results:** responses may be partial or interfaces may have changed. Do not treat unresolved accounts as confirmed.
- **Browser interrupted the process:** reopen the popup and continue if a checkpoint exists; otherwise start again.
- **Service worker fails:** reload the extension and inspect its error page. Passing a syntax check does not prove that a live session works.
- **Missing pictures:** local exports may not contain them; live picture URLs can expire.
- **Invalid JSON:** select the correct followers and following files and all parts. Do not share the exported file in a bug report.

The support contact is a placeholder. Live analysis and automatic unfollow may be subject to Instagram’s policies and do not guarantee protection against restrictions.
