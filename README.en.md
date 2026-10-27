# IG · Who does not follow me back

[Español](README.md) · [English](README.en.md)

An Edge and Chrome extension for reviewing an Instagram account’s connections and comparing local exports. This independent project is not affiliated with Instagram or Meta.

![Extension popup with no signed-in account](docs/popup.png)

> **Status:** live analysis uses internal Instagram interfaces that may change or impose limits. End-to-end live analysis has not been verified against a real account in this version. See the [observed real-world case](docs/real-case.en.md).

## Features

- **Live analysis:** detects the signed-in session, checks relationships and retains available progress. Results depend on Instagram’s responses.
- **Official export:** compares exported followers and following JSON files in the browser and creates an HTML report.
- **Review:** shows profile links and exports results. Profile-photo availability depends on the data received.
- **Control:** stops on signs of rate limiting or verification. Pauses do not guarantee that an account will avoid restrictions.

![Local analysis screen without personal data](docs/analisis-local.png)

## Guides

- [English installation guide](docs/install.en.md)
- [Guía de instalación en español](docs/instalacion.es.md)
- [Architecture, permissions and troubleshooting](docs/how-it-works.en.md)
- [Funcionamiento, permisos y resolución de problemas](docs/funcionamiento.es.md)
- [Observed real-world case](docs/real-case.en.md) · [Caso real observado](docs/caso-real.es.md)

## Development

This repository contains a Manifest V3 extension with no build step. Run `node --check background.js`, `node --check popup.js`, `node --check local-core.js` and `node --check local.js` to check syntax. These checks do not validate Instagram’s internal interfaces.

Do not commit exports, cookies, tokens, passwords, personal results or screenshots containing account data. `soporte@example.invalid` is a placeholder; configure a support channel before distributing the project.
